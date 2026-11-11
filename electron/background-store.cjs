const path = require('node:path');
const { Worker } = require('node:worker_threads');
const { EventEmitter } = require('node:events');

// The main process owns the live snapshot; one worker serializes all disk writes
// and backups. set/delete acknowledge acceptance, not durable completion.
// flush is the durability boundary (closing, updating, restoring, exporting).
class BackgroundStore extends EventEmitter {
  constructor(initialStore, schema = {}) {
    super();
    this.path = initialStore.path;
    this.snapshot = initialStore.store;
    this.schema = schema;
    this.pending = new Map();
    this.requests = new Map();
    this.waiters = [];
    this.nextId = 0;
    this.revision = 0;
    this.error = null;
    this.inFlight = null;
    this.worker = null;
    this.closed = false;
  }

  get store() { return { ...this.snapshot }; }
  get(key, fallback) { return Object.hasOwn(this.snapshot, key) ? this.snapshot[key] : fallback; }
  has(key) { return Object.hasOwn(this.snapshot, key); }
  get status() {
    return { pending: !!(this.pending.size || this.inFlight), error: this.error?.message || null };
  }

  set(key, value) {
    if (this.maintenance) throw new Error('Aurora està optimitzant les dades. Espera i recarrega la finestra.');
    const entries = typeof key === 'object' && key !== null ? Object.entries(key) : [[key, value]];
    const cloned = entries.map(([name, item]) => {
      if (typeof name !== 'string' || ['__proto__', 'constructor', 'prototype', '__internal__'].includes(name)) {
        throw new Error('Clau de dades invàlida.');
      }
      if (item === undefined) throw new Error('Use delete() to clear values');
      const type = this.schema[name]?.type;
      if (type === 'array' ? !Array.isArray(item) : type && typeof item !== type) {
        throw new Error(`Tipus de dades invàlid: ${name}`);
      }
      return [name, structuredClone(item)];
    });
    if (this.closed) throw new Error('Storage is closed');
    for (const [name, item] of cloned) {
      this.snapshot[name] = item;
      this.pending.set(name, { value: item });
    }
    this.changed();
  }

  delete(key) {
    if (this.maintenance) throw new Error('Aurora està optimitzant les dades. Espera i recarrega la finestra.');
    if (this.closed) throw new Error('Storage is closed');
    if (typeof key !== 'string') throw new Error('Clau de dades invàlida.');
    delete this.snapshot[key];
    this.pending.set(key, { deleted: true });
    this.changed();
  }

  changed() {
    this.revision++;
    this.emit('status', this.status);
    // Batch changes from one save and coalesce newer values while a write runs.
    if (!this.scheduled) {
      this.scheduled = setImmediate(() => { this.scheduled = null; this.pump(); });
    }
  }

  startWorker() {
    if (this.worker) return;
    const worker = new Worker(path.join(__dirname, 'storage-worker.cjs'), {
      workerData: { path: this.path, schema: this.schema },
    });
    this.worker = worker;
    worker.on('message', result => {
      const request = this.requests.get(result.id);
      if (!request) return;
      this.requests.delete(result.id);
      if (result.success) request.resolve(result.data);
      else request.reject(new Error(result.error));
    });
    const failed = error => {
      if (this.worker !== worker) return;
      this.worker = null;
      this.error = error;
      for (const request of this.requests.values()) request.reject(error);
      this.requests.clear();
      this.settle();
    };
    worker.on('error', failed);
    worker.on('exit', code => {
      if (!this.closed) failed(new Error(`El procés de guardat s'ha aturat (${code}).`));
    });
  }

  request(operation, payload = {}) {
    if (this.closed) return Promise.reject(new Error('Storage is closed'));
    return new Promise((resolve, reject) => {
      try {
        this.startWorker();
        const id = ++this.nextId;
        this.requests.set(id, { resolve, reject });
        try { this.worker.postMessage({ id, operation, ...payload }); }
        catch (error) { this.requests.delete(id); reject(error); }
      } catch (error) { reject(error); }
    });
  }

  async pump() {
    if (this.inFlight || this.error || !this.pending.size) { this.settle(); return; }
    const changes = this.pending;
    this.pending = new Map();
    this.inFlight = changes;
    try {
      await this.request('commit', { changes: [...changes] });
    } catch (error) {
      // Retain failed changes, with newer edits taking precedence on retry.
      this.pending = new Map([...changes, ...this.pending]);
      this.error = error;
    } finally {
      this.inFlight = null;
      this.settle();
      if (!this.error && this.pending.size) this.pump();
    }
  }

  settle() {
    this.emit('status', this.status);
    if (!this.error && (this.inFlight || this.pending.size)) return;
    const waiters = this.waiters.splice(0);
    for (const { resolve, reject } of waiters) {
      if (this.error) reject(this.error);
      else resolve();
    }
  }

  flush({ retry = false } = {}) {
    if (retry) {
      this.error = null;
      this.emit('status', this.status);
    }
    if (this.error) return Promise.reject(this.error);
    if (!this.inFlight && !this.pending.size) return Promise.resolve();
    return new Promise((resolve, reject) => {
      this.waiters.push({ resolve, reject });
      this.pump();
    });
  }

  async backup(filePath, { skipUnchanged = false, appVersion = '' } = {}) {
    await this.flush();
    return this.request('backup', { filePath, skipUnchanged, appVersion, revision: this.revision });
  }

  async shutdown() {
    await this.flush();
    this.closed = true;
    if (this.worker) await this.worker.terminate();
  }

  async diagnose() {
    await this.flush();
    return this.request('diagnose');
  }

  async compact(rootPath, filePath) {
    if (this.maintenance) throw new Error('Ja hi ha una optimització pendent.');
    this.maintenance = true;
    let started = false;
    try {
      await this.flush();
      started = true;
      const { snapshot, ...result } = await this.request('compact', { rootPath, filePath });
      this.snapshot = snapshot;
      this.revision++;
      // Keep stale renderer forms from putting the removed binaries back.
      this.awaitingReload = true;
      return result;
    } catch (error) {
      if (started) {
        // A worker may have exited after committing but before acknowledging.
        // Reconcile with disk before allowing any further writes.
        this.snapshot = await this.request('snapshot');
        this.error = null;
      }
      this.maintenance = false;
      throw error;
    }
  }

  finishMaintenance() {
    if (this.awaitingReload) {
      this.awaitingReload = false;
      this.maintenance = false;
    }
  }
}

module.exports = { BackgroundStore };

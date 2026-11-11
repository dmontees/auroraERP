const fs = require('node:fs');

function fileRevision(filePath) {
  try {
    const stat = fs.statSync(filePath, { bigint: true });
    return `${stat.ino}:${stat.size}:${stat.mtimeNs}:${stat.ctimeNs}`;
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

// Conf's default getter reads and parses the entire JSON file on every get/has/set.
// Keep the last committed snapshot in the main process. Writes still use Conf's
// validation and atomic persistence, and only update the snapshot after success.
function withCachedReads(Store) {
  return class CachedStore extends Store {
    get store() {
      // A cheap metadata check also detects changes from another app instance or
      // an external restore. Never overwrite those with an outdated snapshot.
      const revision = fileRevision(this.path);
      if (!this._committedSnapshot || revision !== this._snapshotRevision) {
        this._committedSnapshot = super.store;
        this._snapshotRevision = revision;
      }
      // Conf mutates this object in set/delete; isolate the committed top level
      // so a failed disk write cannot expose an uncommitted value.
      return { ...this._committedSnapshot };
    }

    set store(value) {
      super.store = value;
      this._committedSnapshot = { ...value };
      this._snapshotRevision = fileRevision(this.path);
    }
  };
}

module.exports = { withCachedReads };

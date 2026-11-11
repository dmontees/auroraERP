# Desktop storage

The main process owns a `BackgroundStore` live snapshot. The renderer's existing
synchronous get/set/delete bridge operates on that snapshot, without reading or
serializing the complete JSON file. Only one application instance owns the queue.

**set/delete acknowledge acceptance, not disk completion.** `store.flush()` (main)
or `window.electron.flushStore()` (renderer) is the durability boundary. The global
storage status shows pending writes or errors. A failed write retains its changes;
retry combines them with newer edits, giving the newest value for each key priority.

One Node worker serializes commits and backups. Changes are batched by top-level
key while a commit runs. Persistence still uses Conf's validation and atomic writes,
with the same `aurora-data.json` format and electron-store 8 dependency. Periodic
backups skip unchanged revisions; JSON serialization and hashing run in the worker.

Closing (including quitting on macOS and installing updates) flushes form debounces,
waits for the queue and finishes backups before exiting. A disk failure keeps the
app open. The cloud-sync timeout never bypasses pending local persistence.

The snapshot is application-owned; do not edit the JSON externally while Aurora is
running. Restore/import through the application instead. Do not mutate objects
returned by the main-process store in place; submit changes through set/delete.

Validation:

- `npm run check`: regression checks, 56 MB cache and background queue tests.
- `npm run test:electron`: builds and runs hidden Electron tests using temporary
  profiles only. Tests exercise input/navigation during 56 MB writes/backups, disk
  failures/retry, and closing the real React app before its debounce fires.

## Storage diagnosis and compaction

Settings → Salut de dades can request a worker-side size breakdown and scan for
embedded data-URL attachments. Sizes by category are compact-JSON estimates; total
file size is read from disk. Profile images/logos and unknown binary fields are
reported but never removed. Candidate counts include attachments that may fail
validation, so estimated savings are an upper bound.

Compaction flushes outstanding writes and temporarily prevents other mutations.
It exclusively creates a full original JSON backup under userData (outside rolling
backup retention), verifies it, then copies supported project/provider documents
and fiscal attachments into `Aurora/00_Sistema/adjunts-migrats`. Existing copies are
reused only after matching actual file bytes. Every copy is verified by length and
SHA-256 before replacing embedded content with a DocumentFileRef. Missing,
conflicting or invalid attachments retain their original content and are reported.
Business records and audit histories are preserved. The reduced JSON is committed
atomically in one operation; an unsuccessful commit leaves the original intact.

The maintenance lock stays active until the user reloads, preventing stale React
forms from reintroducing removed blobs. The JSON and document folder must both be
backed up. The original full backup allows restoration through the existing data
import flow. Future embedded uploads can be diagnosed and compacted again.

`test-storage-maintenance.cjs` covers failures, safe paths, verified reuse and
idempotency. `test-app-close.cjs --maintenance` runs diagnosis, compaction and reload
from the actual React settings UI with a 56 MB attachment and an isolated profile.

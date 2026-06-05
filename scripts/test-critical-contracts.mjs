import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const preload = read('electron/preload.js');
assert.match(preload, /ALLOWED_STORE_KEYS/);
assert.doesNotMatch(preload, /clear:\s*\(/);
assert.doesNotMatch(preload, /store:\s*\(/);
assert.match(preload, /dataSchemaVersion/);
assert.match(preload, /onUpdateError/);

const main = read('electron/main.cjs');
assert.match(main, /export-cloud-backup-data/);
assert.match(main, /aurora-pre-import-backup/);
assert.match(main, /https:/);
assert.match(main, /mailto:/);
assert.match(main, /GITHUB_LATEST_MAC_YML/);
assert.match(main, /parseLatestMacYml/);
assert.match(main, /update-error/);

const sync = read('web/api/sync.php');
assert.match(sync, /esDepesaGeneral'\]\s*\?\?\s*\$f\['esDesepsaGeneral/);
assert.match(sync, /dryRun/);
assert.match(sync, /rollBack/);
assert.match(sync, /sync_id/);

const webSync = read('src/utils/webSync.ts');
assert.match(webSync, /_syncMeta/);
assert.match(webSync, /syncId/);
assert.match(webSync, /dataSchemaVersion/);
assert.match(webSync, /dryRunSyncToWeb/);

const settingsModal = read('src/components/common/SettingsModal.tsx');
assert.match(settingsModal, /Salut de dades/);
assert.match(settingsModal, /getStorePath/);
assert.match(settingsModal, /normalizeBackupForImport/);
assert.match(settingsModal, /importData/);
assert.match(settingsModal, /aurora:update-error/);
assert.doesNotMatch(settingsModal, /storage\.setClients\(backup\.clients/);

const backupImport = read('src/utils/backupImport.ts');
assert.match(backupImport, /IMPORTABLE_BACKUP_KEYS/);
assert.match(backupImport, /plateaClients/);
assert.match(backupImport, /normalizeBackupForImport/);

const cloudBackup = read('src/utils/cloudBackup.ts');
assert.match(cloudBackup, /googleCalendarToken/);
assert.match(cloudBackup, /verifactuCertificatP12/);
assert.match(cloudBackup, /apiKey/);
assert.match(cloudBackup, /dataSchemaVersion/);

const docs = read('docs/auditoria-2026-06-05/08-canvis-aplicats.md');
assert.match(docs, /dataSchemaVersion/);
assert.match(docs, /Actualitzacions macOS/);

console.log('test-critical-contracts: ok');

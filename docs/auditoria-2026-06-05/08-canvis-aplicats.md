# Canvis aplicats i estat actual

Data de registre: 2026-06-05

## Principi de seguretat adoptat

El projecte ja esta instal·lat en un Mac d'usuari amb dades reals i sensibles. Per tant, els canvis aplicats fins ara segueixen aquests criteris:

- No executar migracions destructives en arrencar.
- No esborrar ni reescriure dades locals existents.
- Crear snapshots locals abans de qualsevol import/restauracio.
- Mantenir compatibilitat amb camps antics quan es corregeixen typos.
- Fer que els errors de sync/backup siguin visibles i no deixin estats infinits.

## Canvis aplicats

### Backup cloud i documents

Fitxers:

- `src/hooks/useWebSync.ts`
- `src/utils/cloudBackup.ts`
- `src/utils/pdfSync.ts`
- `src/components/common/WebSyncModal.tsx`
- `web/api/backup.php`
- `web/api/pdf-sync.php`
- `web/api/.htaccess`

Canvis:

- Afegits timeouts a peticions de backup i documents per evitar estats infinits com `Guardant...`.
- Separat el backup JSON dels documents/adjunts: si fallen PDFs/imatges, la copia de dades principals pot completar-se igual.
- Afegits endpoints `backup.php` i `pdf-sync.php` sota `web/api/`, que es la ruta que configura l'app (`https://.../api`).
- Afegida proteccio `.htaccess` per bloquejar acces directe a carpetes generades `backups/` i `pdfs/`.
- El modal ara explica que els documents son opcionals i delta.
- La restauracio cloud restaura dades principals encara que el sync de documents no estigui disponible.

Estat:

- Compila.
- Pendent de prova en servidor real quan hi hagi acces web.

### Proteccio de dades i secrets

Fitxers:

- `electron/main.cjs`
- `electron/preload.js`
- `src/utils/cloudBackup.ts`
- `src/types/electron.d.ts`

Canvis:

- Eliminats `electronStore.store()` i `electronStore.clear()` del preload.
- `electronStore.get/set/delete` continuen disponibles per compatibilitat, pero ara nomes accepten claus d'una allowlist coneguda.
- Substituit `exportAllData` per `exportCloudBackupData`, que exporta dades sanejades.
- El backup cloud exclou:
  - `googleCalendarToken`
  - `webSyncConfig.apiKey`
  - `verifactuCertificatP12`
  - PDFs, imatges i adjunts base64.
- `import-data` crea abans un snapshot local `aurora-pre-import-backup-*.json`.
- `import-data` nomes accepta claus conegudes.
- `restoreFromBackup` comprova `success` del main process abans de donar per bona la restauracio.
- `openExternal` nomes permet `https:` i `mailto:`.

Estat:

- Compila.
- No toca dades existents de l'usuari.

### Restauracio local automatica

Fitxer:

- `electron/main.cjs`

Canvi:

- `restoreBackupIfNeeded()` ja no decideix que el store esta buit nomes mirant `clients`.
- Ara comprova entitats critiques: clients, proveidors, projectes, factures, pressupostos, obligacions fiscals, albarans i parts de treball.
- Tambe comprova si `parametres` te contingut.

Motiu:

- Evitar que un usuari amb dades reals pero sense clients pugui veure dades sobreescrites per un backup antic.

### Versio visible

Fitxer:

- `src/App.tsx`
- `src/utils/storageManager.ts`
- `electron/main.cjs`
- `electron/preload.js`

Canvi:

- La UI ja no mostra `v3.0.0` hardcoded.
- En Electron llegeix `app.getVersion()`.
- En web/dev usa `__APP_VERSION__` injectat per Vite des de `package.json`.
- Afegit `dataSchemaVersion: 5` com a metadada separada de la versio d'app.

### Actualitzacions macOS

Fitxers:

- `electron/main.cjs`
- `src/components/common/UpdateNotification.tsx`

Canvis:

- El checker macOS ja no depen nomes de `/releases/latest`.
- Llegeix les ultimes releases de GitHub i selecciona la versio semver mes alta.
- Ignora drafts.
- Accepta tags/noms amb prefixos o sufixos compatibles amb semver.
- Prefereix un DMG "normal" si existeix, evitant `x64`, `arm64` o `universal` quan hi ha alternativa.
- Si no troba DMG, obre la pagina de release.
- La notificacio mostra el nom de l'asset seleccionat i informa si no pot obrir l'enllac.

Estat:

- Compila.
- `node --check electron/main.cjs` passa.
- Pendent de prova en app empaquetada a Mac amb una release GitHub superior a la versio instal·lada.

## Verificacions executades despres dels canvis

```powershell
npm.cmd run build
npm.cmd run check
npm.cmd run test:critical
node --check electron\main.cjs
node --check electron\preload.js
```

Resultat:

- Build principal correcte.
- Check complet correcte.
- Tests critics correctes.
- Validacio sintactica de `electron/main.cjs` correcta.
- Validacio sintactica de `electron/preload.js` correcta.
- Persisteix l'avis conegut de Vite sobre chunk gran.

## Checks afegits en Fase 2

Fitxers:

- `electron/updater-utils.cjs`
- `scripts/test-updater-utils.mjs`
- `scripts/test-critical-contracts.mjs`
- `package.json`

Canvis:

- Extreta logica pura de l'updater macOS a `electron/updater-utils.cjs`.
- Afegits tests Node sense dependencies externes per:
  - parsing/comparacio semver;
  - seleccio de DMG normal;
  - contractes de seguretat del preload;
  - export cloud sanejat;
  - backup pre-import;
  - compatibilitat `esDepesaGeneral`/`esDesepsaGeneral`.
- Afegits scripts `typecheck`, `check:electron`, `test:critical` i `check`.

## Fase 4: operacio i dades

Fitxers:

- `src/utils/webSync.ts`
- `web/api/sync.php`
- `src/components/common/SettingsModal.tsx`
- `scripts/test-critical-contracts.mjs`

Canvis:

- El payload de sync web inclou `_syncMeta` amb `syncId`, `appVersion`, `dataSchemaVersion` i `createdAt`.
- Afegit `dryRunSyncToWeb()` i suport `?dryRun=1` al client.
- `web/api/sync.php` accepta dry-run, calcula estadistiques dins la transaccio i fa `rollBack()` abans de respondre.
- El log `aurora_sync_log` no s'escriu durant dry-run.
- La resposta del sync retorna `dry_run`, `sync_id` i `schema_version`.
- Afegida vista local `Salut de dades` a la configuracio amb comptadors locals, `dataSchemaVersion`, ultima copia cloud i ruta del fitxer local Electron quan esta disponible.

Estat:

- Preparat per provar quan el servidor web torni a estar disponible.
- No canvia ni migra dades locals nomes per obrir la vista de salut.
- Persistir `sync_id` a la base de dades queda pendent d'una migracio SQL controlada.

## Importacio manual de backups

Fitxers:

- `src/components/common/SettingsModal.tsx`
- `src/utils/backupImport.ts`
- `scripts/test-critical-contracts.mjs`

Canvis:

- El boto `Importar copia de seguretat` ja no escriu directament modul per modul des del renderer quan l'app corre en Electron.
- Afegit normalitzador `normalizeBackupForImport()` per acceptar:
  - backups nous amb claus internes (`clients`, `projectes`, `facturesVenda`, etc.);
  - backups antics amb claus `platea*` serialitzades en JSON.
- En Electron, la importacio delega a `window.electron.importData()`, que crea abans un snapshot `aurora-pre-import-backup-*.json`.
- En web/dev es manté fallback local compatible.
- Afegida confirmacio explicita abans de substituir dades.
- El missatge final mostra quants moduls s'han restaurat i la ruta del snapshot previ quan existeix.
- Els tests critics comproven que el modal usa el normalitzador i el canal IPC segur.

Estat:

- Redueix el risc de perdua de dades en restauracions manuals.
- No modifica el format dels backups exportats.

## Rendiment i bundle inicial

Fitxers:

- `src/App.tsx`

Canvis:

- Les seccions principals passen a carregar-se amb `React.lazy`:
  - Dashboard
  - Projectes
  - Clients
  - Proveidors
  - Pressupostos
  - Factures venda
  - Factures compra
  - Gestio fiscal
  - Resultats
  - Calendari
  - Parametres
  - Parts de treball
- `SettingsModal` tambe es carrega sota demanda.
- Afegit `Suspense` per mostrar estat de carrega dins el cos principal.

Impacte mesurat:

- Abans: chunk inicial principal aproximat `2.237 MB` minificat, amb avis de Vite per chunk gran.
- Despres: chunk inicial principal aproximat `219 KB` minificat (`66 KB` gzip).
- Les dependencies pesades queden separades en chunks sota demanda, com `xlsx`, `jspdf-autotable`, `html2canvas`, `FileSaver` i `verifactuFirma`.
- `npm run build` ja no mostra l'avis de chunk superior a 500 KB per al bundle inicial.

Estat:

- `npm run check` correcte.
- `npm run build` correcte.

## DMG macOS i actualitzacions

Intent executat:

```powershell
npm.cmd run electron:build:mac
```

Resultat:

- TypeScript i Vite build correctes.
- `electron-builder` falla localment per limitacio de plataforma: construir DMG macOS nomes esta suportat en macOS.

Camí correcte:

- El workflow `.github/workflows/release.yml` ja construeix Mac en `macos-latest`.
- El workflow ja te `permissions: contents: write`.
- El workflow ja usa `npm install`.
- El pas Mac ja defineix `CSC_IDENTITY_AUTO_DISCOVERY: "false"`.
- El `package.json` ja configura Mac DMG x64.

Pendent per provar updater:

- Crear una release/tag GitHub amb versio superior a la instal·lada en el Mac de l'usuari.
- Deixar que GitHub Actions generi el DMG.
- Instal·lar una versio anterior i comprovar que Aurora detecta la nova release i obre/descarrega el DMG normal.

## Pendents immediats

1. Provar updater en Mac amb app empaquetada.
2. Crear release GitHub amb tag superior a `package.json`.
3. Confirmar que la targeta mostra el DMG correcte i obre el navegador.
4. Quan hi hagi acces web, desplegar `web/api/backup.php`, `web/api/pdf-sync.php`, `web/api/sync.php` i `.htaccess`.
5. Provar `sync.php?dryRun=1` contra una copia de la base de dades web abans d'activar sync real.
6. Afegir migracio SQL per guardar `sync_id` si es vol traçabilitat completa al servidor.
7. Afegir lint quan s'instal·lin dependencies ESLint necessaries.

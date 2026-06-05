# Pla d'accio prioritzat

## Fase 1: Enduriment immediat

Objectiu: reduir riscos de seguretat i corrupcio de dades sense canvis grans de producte.

1. Limitar API Electron exposada al renderer.
   - Treure `store`, `clear`, `delete` generic i `set` generic.
   - Crear IPCs especifics i validats.
   - Estat 2026-06-05: fet parcialment. S'han eliminat `store` i `clear`; `get/set/delete` es mantenen per compatibilitat amb `storageManager`, pero ara estan limitats a una allowlist de claus conegudes.

2. Validar `openExternal`.
   - Permetre nomes `https:` i `mailto:`.
   - Rebutjar protocols desconeguts.
   - Estat 2026-06-05: fet.

3. Corregir sync de `esDepesaGeneral`.
   - Canviar `web/api/sync.php`.
   - Afegir compatibilitat legacy amb `esDesepsaGeneral`.
   - Estat 2026-06-05: fet.

4. Excloure secrets dels backups cloud i locals quan sigui possible.
   - `googleCalendarToken`
   - `webSyncConfig.apiKey`
   - `verifactuCertificatP12`
   - Estat 2026-06-05: fet per backup cloud. Backups locals continuen complets per recuperacio d'emergencia.

5. Protegir restauracions manuals.
   - Fer que `Importar copia de seguretat` passi pel canal segur d'Electron.
   - Crear snapshot local abans de substituir dades.
   - Estat 2026-06-05: fet. El modal normalitza backups nous/antics i delega en `importData()` en Electron.

6. Unificar versions visibles.
   - UI llegint `getAppVersion()`.
   - `DATA_SCHEMA_VERSION` separat.
   - Estat 2026-06-05: fet. La versio visible llegeix `getAppVersion()`/`__APP_VERSION__` i s'ha afegit `dataSchemaVersion`.

7. Fer mes robust el flux d'actualitzacions macOS.
   - Llegir releases de GitHub, no nomes `/latest`.
   - Seleccionar DMG normal quan existeixi.
   - Mostrar asset seleccionat a la UI.
   - Estat 2026-06-05: fet pendent de prova en Mac empaquetat.

## Fase 2: Qualitat i regressions

Objectiu: tenir xarxa de seguretat abans de refactors.

1. Afegir script `lint`.
   - Estat 2026-06-05: pendent. No s'ha activat perque falten dependencies ESLint al lock/node_modules.
2. Afegir Vitest o equivalent per calculs purs.
   - Estat 2026-06-05: pendent. Cal instal·lacio controlada.
3. Crear tests de migracio V3/V4/V5.
   - Estat 2026-06-05: iniciat amb tests critics de contracte. Tests complets de migracio pendents.
4. Afegir smoke de build principal i web a CI.
   - Estat 2026-06-05: pendent.
5. Crear fixtures petites per clients, projectes, factures i gastos.
   - Estat 2026-06-05: pendent.
6. Afegir checks sense dependencies externes.
   - Estat 2026-06-05: fet amb `npm run check`, `test:critical` i `check:electron`.

## Fase 3: Rendiment i modularitat

Objectiu: reduir bundle inicial i fer el codi mes modificable.

1. Convertir exportacions PDF/Excel/ZIP a imports dinamics.
   - Estat 2026-06-05: parcial. Les seccions que contenen exports pesats ja no entren al bundle inicial perque es carreguen amb `React.lazy`.
2. Lazy-load de seccions grans amb `React.lazy`.
   - Estat 2026-06-05: fet a `App.tsx` per dashboard, projectes, clients, proveidors, pressupostos, factures, gestio fiscal, resultats, calendari, parametres i parts de treball. `SettingsModal` tambe es carrega sota demanda.
3. Dividir `ProjecteModal`, `ProjectesSection` i `exportResultats`.
   - Estat 2026-06-05: pendent.
4. Consolidar components duplicats de PDF i pagaments.
   - Estat 2026-06-05: pendent.
5. Separar migracions de `storageManager`.
   - Estat 2026-06-05: pendent.

## Fase 4: Operacio i dades

Objectiu: fer backups/sync/restauracio mes previsibles.

1. Crear pantalla de salut de dades.
   - Estat 2026-06-05: fet en `SettingsModal`. Mostra comptadors locals, `dataSchemaVersion`, ultima copia cloud i ruta del store Electron.
2. Afegir dry-run de sync web.
   - Estat 2026-06-05: fet al client i a `web/api/sync.php` amb `?dryRun=1` i rollback transaccional.
3. Afegir `schemaVersion` al payload de sync.
   - Estat 2026-06-05: fet com a `_syncMeta.dataSchemaVersion`, amb `syncId`, `appVersion` i `createdAt`.
4. Guardar logs de sync amb `sync_id`.
   - Estat 2026-06-05: parcial. El servidor torna `sync_id`; persistir-lo a `aurora_sync_log` queda pendent de migracio SQL quan hi hagi acces web.
5. Xifrar o protegir secrets amb `safeStorage`/keychain.
   - Estat 2026-06-05: pendent.

## Quick wins

- Afegir `"lint": "eslint ."` a `package.json`. Pendent: falten dependencies ESLint instal·lades.
- Actualitzar `AGENTS.md` amb versio i estats reals. Fet.
- Canviar `web/api/sync.php` per acceptar `esDepesaGeneral`. Fet.
- Eliminar `store: () => store.store` del preload. Fet.
- Validar `openExternal`. Fet.
- Fer `dynamic import('xlsx')` en exportacions Excel.

## Indicadors d'exit

- Build principal i web passen sense avisos critics.
- `npm run check` executa TypeScript, tests critics i sintaxi Electron.
- Lint executa en CI.
- Tests cobreixen calculs fiscals i migracions.
- Cap secret surt en backups cloud.
- Renderer no pot accedir al store complet.
- Sync web rebutja payloads incompatibles amb missatge clar.

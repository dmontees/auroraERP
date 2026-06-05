# Dades, migracions i sincronitzacio

## Persistencia local

`src/utils/storageManager.ts` centralitza lectura/escriptura entre `electron-store` i `localStorage`. Es una bona decisio arquitectonica, pero actualment tambe concentra defaults, migracions, helpers de Verifactu, web sync i resets.

## Hallazgos prioritaris

### P1: versions i schema version desalineats

Hi ha diferents versions hardcoded:

- `package.json:4`: `3.0.0`
- `src/App.tsx:85` i `src/App.tsx:236`: `3.0.0`
- `electron/main.cjs:34`: `1.3.0`
- `electron/preload.js:29`: `1.4.4`
- `src/utils/storageManager.ts:172`: `1.0.1`
- `AGENTS.md:21`: `1.0.1`

Risc:

- Diagnosticar migracions o incidencies per versio es confus.
- L'auto-updater usa `app.getVersion()`, pero la UI i el store tenen versions independents.

Recomanacio:

- Definir `APP_VERSION` des de `package.json`/Vite.
- Definir `DATA_SCHEMA_VERSION` separat i numeric.
- Migracions basades en `DATA_SCHEMA_VERSION`, no en text de versio d'app.

### P1: bug de sync en `esDepesaGeneral`

El tipus actual defineix `esDepesaGeneral`:

- `src/types/facturaCompra.ts:61`

La migracio V5 corregeix `esDesepsaGeneral` cap a `esDepesaGeneral`:

- `src/utils/storageManager.ts:208-219`

Pero `web/api/sync.php` encara llegeix el camp antic:

- `web/api/sync.php:292`: `boolToInt($f['esDesepsaGeneral'] ?? false)`

Impacte:

- Les despeses generals poden sincronitzar-se com a no generals.
- La web pot mostrar o agrupar incorrectament factures de compra/gastos.

Recomanacio:

```php
boolToInt($f['esDepesaGeneral'] ?? $f['esDesepsaGeneral'] ?? false)
```

I afegir una prova/smoke amb una factura de compra `esDepesaGeneral: true`.

### P1: maquina d'estats documentada vs real

Documentacio interna:

- `AGENTS.md:78` i `AGENTS.md:192`: `esborrany -> planificat -> en_curs -> post_produccio -> entregat -> facturat`

Codi actual:

- `src/types/projecte.ts:55`: `esborrany | planificat | rodatge | edicio | esperant_feedback | revisio | acabat | facturat`
- `web/api/sync.php:152` i `web/database/schema.sql:126-135` usen els valors actuals.

Impacte:

- Risc de regressio si un desenvolupador segueix la documentacio antiga.
- Possibles migracions incompletes si existeixen dades antigues amb `en_curs`, `post_produccio` o `entregat`.

Recomanacio:

- Actualitzar `AGENTS.md`.
- Afegir normalitzacio legacy en lectura/sync:
  - `en_curs` -> `rodatge` o estat equivalent.
  - `post_produccio` -> `edicio`/`revisio` segons decisio de producte.
  - `entregat` -> `acabat`.

### P1: restauracio local pot decidir per `clients` nomes

`electron/main.cjs:249-257` considera el store buit si `clients` esta buit.

Risc:

- Si un usuari encara no te clients pero si te projectes, parametres o factures, podria restaurar backup quan no toca.

Recomanacio:

- Calcular buidor per claus critiques: clients, proveidors, projectes, factures, pressupostos, parametres.
- Guardar metadada `_backupMeta` amb data i hash.
- Demanar confirmacio explicita per restauracions no trivials.

### P2: migracions lazy barrejades amb getters

`getFacturesCompra`, `getObligacionsFiscals` i `getAlbaransCompra` poden modificar dades en llegir.

Avantatge:

- Evita problemes d'ordre de `useEffect`.

Risc:

- Una lectura aparentment pura canvia dades.
- Es dificil provar migracions i reproduir errors.

Recomanacio:

- Mantenir temporalment per compatibilitat.
- Crear `runMigrations()` idempotent i versionat.
- Escriure tests de migracio amb snapshots petits.

## Sync web

La sync principal fa substitucio completa per entitat (`DELETE + INSERT`). Es coherent si l'escriptori es font de veritat, pero cal tenir present:

- Si falla a mitja operacio, la transaccio PHP protegeix la base.
- Si el payload omet una entitat, aquesta no es toca.
- Si el payload conte arrays buits, esborra l'entitat completa.

Recomanacions:

- Afegir `sync_id` i guardar un resum auditable.
- Enviar `schemaVersion` i rebutjar versions incompatibles.
- Afegir endpoint dry-run per validar payload sense escriure.

## Documents i backups cloud

La separacio entre dades estructurals (`sync.php`) i documents (`pdf-sync.php`) es una bona decisio. El backup cloud elimina binaris, cosa positiva per rendiment.

Punts a vigilar:

- Els documents no semblen tenir xifrat a servidor.
- El manifest es un fitxer JSON compartit; cal assegurar locking suficient en concurrencia.
- El backup cloud pot incloure secrets si provenen de `exportAllData()` i no son filtrats per `stripBinaries`.

Recomanacio:

- Excloure explicitament `googleCalendarToken`, `webSyncConfig.apiKey`, `verifactuCertificatP12`.
- Afegir verificacio d'integritat en restauracio de documents.


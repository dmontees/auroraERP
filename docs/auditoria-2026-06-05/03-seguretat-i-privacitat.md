# Seguretat i privacitat

## Superficie Electron

### P0: `electronStore` exposa massa capacitats al renderer

`electron/preload.js` exposa:

- `get`
- `set`
- `delete`
- `clear`
- `store`
- `getPath`
- `has`

Referencies: `electron/preload.js:41-49`.

Impacte:

- Un XSS, dependencia compromesa o bug de UI pot llegir totes les dades fiscals, clients, proveidors, projectes i secrets.
- Tambe pot esborrar o corrompre dades amb `clear`, `delete` o `set`.

Recomanacio:

- Eliminar `clear` i `store` del preload.
- Evitar exposar `get/set` generics.
- Crear metodes IPC especifics per domini: `getClients`, `setClients`, `exportBackup`, etc.
- Validar claus i esquemes al main process.

### P0: `openExternal` sense validacio

`electron/main.cjs:349-350` executa `shell.openExternal(url)` directament amb dades del renderer.

Impacte:

- Pot obrir esquemes no desitjats (`file:`, `ms-*`, custom protocols) si algun flux passa dades manipulades.

Recomanacio:

- Permetre nomes `https:` i, si cal, `mailto:`.
- Parsejar amb `new URL(url)` dins del main process.
- Rebutjar URLs relatives, `javascript:`, `file:` i protocols desconeguts.

### P1: `import-data` accepta qualsevol estructura

`electron/main.cjs:368-375` importa totes les entrades rebudes i les escriu al store.

Impacte:

- Pot escriure claus inesperades.
- Pot sobreescriure configuracions sensibles.
- Pot deixar dades en format incompatible.

Recomanacio:

- Acceptar nomes una allowlist de claus.
- Validar arrays/objectes per entitat.
- Fer backup previ automatic abans d'importar.
- Retornar resum d'elements importats i errors.

## Secrets i dades sensibles

### P0: secrets guardats sense proteccio especifica

S'emmagatzemen dades sensibles en `electron-store` o `localStorage`:

- Google Calendar: `access_token`, `refresh_token`, `client_id`, `client_secret` a `src/utils/storageManager.ts:46-52` i `electron/main.cjs:561-568`.
- Web sync: `apiKey` a `src/utils/storageManager.ts:53-58`.
- Verifactu: certificat P12 base64 a `src/utils/storageManager.ts:638-664`.
- PIN Verifactu queda en memoria de sessio a `src/utils/verifactuFirma.ts`.

Impacte:

- Si el fitxer `aurora-data.json` o backup local es copia, pot contenir secrets reutilitzables.
- En mode web dev, `localStorage` exposa secrets a qualsevol script de l'origen.

Recomanacio:

- Usar `safeStorage` d'Electron o keychain/credential manager per secrets.
- No incloure secrets en backups cloud per defecte.
- Separar backup de dades operatives i backup de credencials.
- Afegir opcio de "exportar sense credencials".

### P1: backup local sense xifrat

`electron/main.cjs:225-236` escriu `aurora-backup.json` cada 30 segons amb `store.store`.

Impacte:

- El backup pot contenir dades fiscals, personals i secrets.

Recomanacio:

- Excloure secrets del backup automatic.
- Oferir xifrat opcional amb contrasenya de backup.
- Documentar la ruta i sensibilitat del fitxer.

## Web/PHP

### Fortaleses

- Les consultes SQL principals usen PDO i prepared statements.
- `requireSyncKey()` usa `hash_equals`.
- `auth.php` usa `password_verify`, `random_bytes` i sessions amb expiracio.
- `pdf-sync.php` valida claus de document amb regex.

### Riscos

#### P1: CORS ampli en scripts de servidor

`server/backup.php` i `server/pdf-sync.php` usen `Access-Control-Allow-Origin: *`.

Impacte:

- Amb una API key filtrada, qualsevol origen podria enviar peticions des d'un navegador.

Recomanacio:

- Usar el mateix model que `web/api/helpers.php` amb `CORS_ORIGIN`.
- Separar endpoints desktop-only sense CORS o amb origen restringit.

#### P2: Fitxers de backup/documents dins del directori del script

`server/backup.php` desa `aurora-backup.json` al costat del script, i `pdf-sync.php` desa documents a `pdfs/`.

Impacte:

- La proteccio depen de configuracio externa (`.htaccess`).

Recomanacio:

- Desar fora del web root sempre que sigui possible.
- Afegir fitxers de proteccio generats automaticament (`.htaccess`, `index.html`) si es desplega en Apache.


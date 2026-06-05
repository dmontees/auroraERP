# Auditoria tecnica Aurora ERP

Data: 2026-06-05  
Repositori: `C:\Creaciones_desarrollo\Desarrollo Aurora\auroraERP`

## Abast

S'ha revisat l'aplicacio Electron/React principal, la variant web (`web/`), els scripts PHP de sincronitzacio (`server/` i `web/api/`), la configuracio de build, la persistencia local, els fluxos de sincronitzacio, i els moduls funcionals mes sensibles: projectes, facturacio, compres, fiscalitat, resultats, calendari i backups.

## Documents

1. [Resum executiu](./01-resum-executiu.md)
2. [Arquitectura i mantenibilitat](./02-arquitectura-i-mantenibilitat.md)
3. [Seguretat i privacitat](./03-seguretat-i-privacitat.md)
4. [Dades, migracions i sincronitzacio](./04-dades-migracions-i-sync.md)
5. [Qualitat, proves i build](./05-qualitat-proves-i-build.md)
6. [Producte, UX i operacio](./06-producte-ux-operacio.md)
7. [Pla d'accio prioritzat](./07-pla-accio.md)
8. [Canvis aplicats i estat actual](./08-canvis-aplicats.md)

## Verificacions executades

```powershell
npm.cmd run build
npm.cmd run build # dins de web/frontend
npm.cmd run lint
rg --files
rg -n "TODO|FIXME|console\.log|any|localStorage|innerHTML|dangerouslySetInnerHTML|openExternal|rejectUnauthorized|client_secret|apiKey|password|PIN|pin" src electron web server -S
```

Resultat:

- Build principal: correcte.
- Build web: correcte.
- Lint: no executable, falta el script `lint` a `package.json`.
- Vite avisa d'un chunk principal gran a l'app Electron/web principal: `2,230.79 kB` minificat, `624.00 kB` gzip.

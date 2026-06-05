# Resum executiu

## Estat general

Aurora ERP es troba en un estat funcionalment ampli i amb una arquitectura comprensible: React + TypeScript, persistencia local via `electron-store`, backups locals, exportacions PDF/Excel, sincronitzacio web i integracions amb Google Calendar i Verifactu. El build de produccio passa tant per l'app principal com per la variant web.

El projecte, pero, mostra signes clars de creixement organic: fitxers molt grans, duplicacio de logica, molts `any`, versions desalineades, configuracions parcials i una superficie Electron massa permissiva. La prioritat no hauria de ser reescriure, sino estabilitzar els contractes de dades i reduir riscos de seguretat i perdua/corrupcio de dades.

## Riscos principals

| Prioritat | Area | Risc |
| --- | --- | --- |
| P0 | Electron/seguretat | El renderer te acces directe a `electronStore` amb `get`, `set`, `delete`, `clear` i `store`. Qualsevol XSS o dependencia compromesa pot llegir/modificar totes les dades locals. |
| P0 | Electron/seguretat | `openExternal(url)` obre URLs sense validacio. Pot obrir esquemes no desitjats si algun flux del renderer passa dades no confiables. |
| P0 | Secrets | Tokens de Google Calendar, `client_secret`, API key de sync i certificat Verifactu P12 es guarden en store/localStorage sense proteccio especifica. |
| P1 | Dades | Versions desalineades: `package.json` es `3.0.0`, `App.tsx` mostra `3.0.0`, `electron/main.cjs` defineix `1.3.0`, `electron/preload.js` defineix `1.4.4`, `storageManager.ts` defineix `1.0.1`, i `AGENTS.md` diu `1.0.1`. |
| P1 | Sync web | `web/api/sync.php` encara llegeix `esDesepsaGeneral`, pero el tipus actual i la migracio V5 usen `esDepesaGeneral`. Les despeses generals poden sincronitzar-se malament. |
| P1 | Contracte de projecte | La documentacio interna descriu una maquina d'estats antiga (`en_curs`, `post_produccio`, `entregat`) mentre el tipus actual usa `rodatge`, `edicio`, `esperant_feedback`, `revisio`, `acabat`. |
| P1 | Backup/restauracio | `import-data` importa qualsevol clau rebuda del renderer i `restoreBackupIfNeeded` restaura si `clients` esta buit encara que altres dades existeixin. |
| P2 | Mantenibilitat | Hi ha components/utilitats molt grans: `ProjectesSection.tsx` 1069 linies, `ProjecteModal.tsx` 1007, `exportResultats.ts` 986, `ProjecteDetailView.tsx` 930. |
| P2 | Qualitat | No hi ha script de lint executable ni tests automatitzats visibles. |
| P2 | Rendiment | Bundle principal gran per imports estatics de `jspdf`, `xlsx`, `jszip` i fluxos de reporting/exportacio. |

## Fortaleses

- `npm run build` passa amb TypeScript i Vite.
- La variant `web/frontend` tambe compila.
- El domini funcional esta ben separat per carpetes.
- Hi ha una abstraccio central de persistencia (`src/utils/storageManager.ts`).
- Es fan backups locals periodics i backups web "slim".
- Les consultes PHP usen PDO preparat i helpers de sanejament basics.
- La sincronitzacio separa dades estructurals de documents binaris, una decisio correcta per volum.

## Recomanacio global

Fer una fase curta d'enduriment abans d'afegir funcionalitat gran:

1. Tancar la superficie Electron exposada al renderer.
2. Unificar versions i contractes de dades.
3. Corregir el bug `esDepesaGeneral`/`esDesepsaGeneral` a la sync web.
4. Afegir lint/test smoke automatitzats.
5. Extreure imports pesants amb `dynamic import()`.
6. Dividir els fitxers mes grans per hooks i serveis de domini.


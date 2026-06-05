# Arquitectura i mantenibilitat

## Arquitectura actual

L'app principal es una SPA React amb navegacio per seccions a `src/App.tsx`. Cada seccio carrega dades directament des de `storageManager`, sense Redux/Context global. Aquest patro es simple i adequat per una app d'escriptori monousuari, pero obliga cada component a gestionar coherencia, recarrega i efectes colaterals.

Eixos principals:

- UI: `src/components/**`
- Tipus de domini: `src/types/**`
- Persistencia i utilitats: `src/utils/**`
- Electron main/preload: `electron/main.cjs`, `electron/preload.js`
- Web read-only/sync: `web/**` i `server/**`

## Observacions

### Fitxers massa grans

Els fitxers mes grans concentren massa responsabilitat:

| Fitxer | Linies | Risc |
| --- | ---: | --- |
| `src/components/projectes/ProjectesSection.tsx` | 1069 | Estat, llistat, accions, modals i exportacions barrejats. |
| `src/components/projectes/ProjecteModal.tsx` | 1007 | Alta probabilitat de regressions en canvis petits. |
| `src/utils/exportResultats.ts` | 986 | Logica de reporting/exportacio molt acoblada. |
| `src/components/projectes/ProjecteDetailView.tsx` | 930 | Vista de detall amb molta logica de domini. |
| `src/components/common/SettingsModal.tsx` | 825 | Configuracio, importacio i UI en un sol fitxer. |
| `src/utils/storageManager.ts` | 737 | Persistencia, migracions i defaults en una unica classe. |

Recomanacio:

- Extreure hooks per estat de pantalla (`useProjectesSection`, `useProjecteForm`).
- Crear serveis de domini purs per calculs, generacio de codis i transicions.
- Separar migracions de `storageManager` en fitxers versionats.
- Moure exportacions a moduls lazy-loaded.

### Duplicacio funcional

Hi ha duplicacio visible entre:

- `src/components/common/PDFUploader.tsx`
- `src/components/factures-compra/shared/PDFUploader.tsx`
- `src/components/common/PagamentsManager.tsx`
- `src/components/factures-compra/shared/PagamentsManager.tsx`
- `src/components/factures-compra/ObligacioFiscalModal.tsx`
- `src/components/gestio-fiscal/ObligacioFiscalModal.tsx`

Recomanacio:

- Consolidar components compartits quan el comportament sigui identic.
- Quan hi hagi diferencies reals, extreure una base comuna i deixar adaptadors petits.

### Tipatge feble

`storageManager.ts` i molts components usen `any` per parametres, migracions, dades JSON i formularis. A curt termini es pragmatic, pero en una app de facturacio/fiscalitat redueix la capacitat del compilador per detectar errors de camp.

Exemples:

- `src/utils/storageManager.ts`: `parametres` amb arrays `any[]`, `electronStoreAPI: any`, migracions amb `any`.
- `src/components/factures-venda/FacturaVendaDetailView.tsx`: moltes operacions sobre `any`.
- `src/utils/importExcel.ts`: importacions flexibles, pero sense normalitzadors tipats per entitat.

Recomanacio:

- Crear tipus per `Parametres` complets.
- Afegir normalitzadors per entitat: `normalizeFacturaCompra`, `normalizeProjecte`, etc.
- Reduir `any` primer en persistencia i sync, no en tota la UI de cop.

### Contractes dispersos

La mateixa informacio de versio i defaults existeix en diversos llocs:

- `package.json`: `3.0.0`
- `src/App.tsx`: logs i footer `v3.0.0`
- `electron/main.cjs`: default store `version: '1.3.0'`
- `electron/preload.js`: default store `version: '1.4.4'`
- `src/utils/storageManager.ts`: default `version: '1.0.1'`
- `AGENTS.md`: `Version: 1.0.1`

Recomanacio:

- Fer que la UI llegeixi `window.electron.getAppVersion()`.
- Treure versions hardcoded del store o usar-les nomes com a `schemaVersion`.
- Separar `appVersion` de `dataSchemaVersion`.

## Valoracio

La base es bona per continuar evolucionant, pero el cost de canvi pujara rapidament si no es fan extraccions selectives. El millor retorn esta en estabilitzar contractes centrals abans de tocar pantalles grans.


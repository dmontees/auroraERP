# Qualitat, proves i build

## Resultats de build

### App principal

Comanda:

```powershell
npm.cmd run build
```

Resultat:

- TypeScript passa.
- Vite build passa.
- Avís: chunk gran.

Chunk principal:

- `dist/assets/index-DziWGC2o.js`: `2,230.79 kB` minificat, `624.00 kB` gzip.

### Web frontend

Comanda:

```powershell
npm.cmd run build
```

Directori:

```text
web/frontend
```

Resultat:

- TypeScript passa.
- Vite build passa.
- Avís menor: `The CJS build of Vite's Node API is deprecated`.

## Lint

Comanda:

```powershell
npm.cmd run lint
```

Resultat:

- Falla: falta script `lint`.

Tot i aixo existeix `eslint.config.js`, amb configuracio per TypeScript, React Hooks i React Refresh. El projecte te infraestructura parcial pero no esta connectada a `package.json`.

Actualitzacio 2026-06-05:

- No s'ha afegit encara un script `lint` perque `node_modules` i `package-lock.json` no contenen les dependencies `eslint`, `typescript-eslint` ni `eslint-plugin-react-hooks`.
- Afegir nomes el script deixaria un comandament trencat. Queda pendent instal·lar dependencies de lint de forma controlada.

Recomanacio:

```json
{
  "scripts": {
    "lint": "eslint ."
  }
}
```

Despres caldria ajustar ignores per `dist`, `web/frontend/dist`, backups i fitxers generats.

## Tests

No s'han trobat tests automatitzats ni scripts de test. Per una app amb facturacio, impostos, sync i migracions, aixo es el principal buit de qualitat.

Actualitzacio 2026-06-05:

- S'ha creat una primera xarxa de tests sense dependencies externes:
  - `scripts/test-updater-utils.mjs`
  - `scripts/test-critical-contracts.mjs`
- S'han afegit scripts:
  - `npm run typecheck`
  - `npm run check:electron`
  - `npm run test:critical`
  - `npm run check`
- `npm run check` executa TypeScript, tests critics i `node --check` dels fitxers Electron principals.

Cobertura inicial:

- Parsing i comparacio de versions semver per updater macOS.
- Seleccio de DMG normal sobre assets `x64`/`arm64`/`universal` quan existeix.
- Contractes de seguretat: preload sense `store`/`clear`, allowlist, export cloud sanejat, backup pre-import i fallback `esDepesaGeneral`.

Prioritat de proves recomanada:

1. Unit tests de calculs fiscals i totals:
   - `src/components/factures-venda/utils/facturaCalculations.ts`
   - `src/components/factures-compra/utils/facturesCalculations.ts`
   - `src/utils/resultatCalculs.ts`
2. Tests de migracio:
   - V3 obligacions fiscals.
   - V4 albarans.
   - V5 `esDesepsaGeneral` -> `esDepesaGeneral`.
3. Smoke tests de fluxos:
   - Crear client.
   - Crear projecte.
   - Crear pressupost/factura.
   - Exportar PDF.
   - Sync web amb payload minim.

## Rendiment i bundle

Imports pesants detectats:

- `jspdf` i `jspdf-autotable`
- `xlsx`
- `jszip`
- `file-saver`

S'importen estaticament en utilitats i components d'exportacio. En una SPA, aixo infla el chunk inicial encara que l'usuari no exporti res en la sessio.

Recomanacio:

- Fer `dynamic import()` en accions d'exportacio.
- Separar chunks manuals per:
  - PDF/reporting.
  - Excel/XLSX.
  - ZIP/export documents.
- Lazy-load seccions grans amb `React.lazy`.

## TypeScript

`tsconfig.app.json` te opcions bones:

- `noUnusedLocals`
- `noUnusedParameters`
- `noFallthroughCasesInSwitch`
- `verbatimModuleSyntax`

Pero no te:

- `strict`
- `noImplicitAny`
- `noUncheckedIndexedAccess`

Recomanacio:

- No activar `strict` de cop si genera massa soroll.
- Crear `tsconfig.strict.json` incremental per carpetes critiques: `utils`, `types`, calculs i sync.

## Observabilitat

Hi ha molts `console.log` en produccio, incloent logs de paths locals i processos sensibles.

Recomanacio:

- Crear logger amb nivells (`debug`, `info`, `warn`, `error`).
- Desactivar logs debug en produccio.
- No logar paths/secrets/respostes fiscals completes.

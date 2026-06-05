# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Project Overview

Aurora ERP is an Electron-based ERP system for audiovisual production management. It's a single-page React application with TypeScript, built with Vite, and packaged as a cross-platform desktop app (Windows and macOS).

**Key Purpose**: Manage clients, providers, projects, budgets, invoices, work hours, and financial reporting for audiovisual production companies.

**Language**: Catalan-first (user-facing), with English technical documentation.

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Custom CSS (no CSS-in-JS framework)
- **Desktop**: Electron 28 with electron-builder
- **Data Persistence**: electron-store (with localStorage fallback for web dev)
- **UI Icons**: lucide-react
- **Exports**: jsPDF, jsPDF-AutoTable, XLSX, file-saver, jszip
- **Version**: 3.0.5

## Build & Development Commands

```bash
npm run dev                   # Vite dev server with HMR (http://localhost:5173)
npm run build                 # TypeScript check + Vite build (output: dist/)
npm run preview               # Preview built app locally
npm run electron:dev          # Launch Electron in dev mode
npm run electron:build        # Full build for all platforms
npm run electron:build:win    # Windows NSIS installer only
npm run electron:build:mac    # macOS DMG only
```

**Development Workflow**: Use `npm run dev` for web dev. For Electron testing, run `npm run dev` in one terminal, then `set NODE_ENV=development && electron .` in another (hot reload via Vite dev server).

## Architecture & Data Flow

### Main App Structure

Tab-based navigation with 11 sections defined in App.tsx:

- **Dashboard**: KPIs and financial summary
- **Projectes**: Audiovisual production projects (main business entity)
- **Clients**: Customer database with special tariffs per service/unit
- **Proveïdors**: Suppliers/freelancers (categorized: audio, drone, photo, etc.)
- **Pressupostos**: Quotation/budget documents
- **Factures Venda**: Sales invoices (support rectificatives)
- **Factures Compra**: Purchase invoices with PDFs and payment tracking
- **Resultats**: Financial analysis (profit, margins, ROI)
- **Parts Treball**: Work log/time tracking with stopwatch widget
- **Calendari**: Event calendar
- **Paràmetres**: System configuration (services, units, materials, company info)

### Data Storage & State Management

**StorageManager** (src/utils/storageManager.ts):
- Singleton abstraction over electron-store vs localStorage
- In Electron: uses electron-store persisted to ~/.config/Aurora/aurora-data.json
- In web dev: uses localStorage with prefixed keys (platea* prefix)
- Auto-migrates localStorage to electron-store on first Electron startup (one-time, flagged by migrationCompleted)

**Backup & Recovery**:
- Electron process writes JSON backup to userData/aurora-backup.json every 30 seconds and on close
- HTML page can restore backup before React loads (fallback for data loss)

**State Communication**:
- No global state manager (Redux/Context)
- Direct storage API calls from components
- Cross-section navigation via localStorage event (plateaNavigateTo) and custom event (navigate-to)

### Core Entity Types

All defined in src/types/:

- **Client**: Commercial entity with VAT type, retention %, special tariffs per service/unit, contacts
- **Proveidor**: Supplier/freelancer with category, pricing, contact details
- **Projecte**: Production project with state machine (esborrany → planificat → rodatge → edicio → esperant_feedback → revisio → acabat → facturat). Tracks human resources, materials, tasks, financials, and audit trail
- **FacturaVenta**: Sales invoice with support for rectificatives (normal vs rectificativa type)
- **FacturaCompra**: Purchase invoice with optional PDF upload, payment tracking, expense categorization
- **Pressupost**: Budget document structured by task categories
- **PartTreball**: Work log entry with cronometre widget input
- **Parametres**: System configuration (services, units, materials, company data, templates, provider categories)

**Cost Calculations**: Projects separately track labor costs, material costs, and revenue. Margins and profit percentages are computed client-side, not persisted.

### Component Organization

```
src/components/
├── dashboard/              Dashboard.tsx
├── projectes/              ProjectesSection.tsx + ProjectModal.tsx + hooks/
├── clients/                ClientsSection.tsx + ClientModal.tsx + tabs/ + hooks/
├── proveidors/             ProveidorsSection.tsx + ProveidorModal.tsx + tabs/ + hooks/
├── pressupostos/           PressupostosSection.tsx + tabs/ + hooks/
├── factures-venda/         FacturesVendaSection.tsx + modals + tabs/ + hooks/
├── factures-compra/        FacturesCompraSection.tsx + modals + hooks/ + shared/
├── parts-treball/          PartsTreballSection.tsx + CronometreWidget.tsx + CronometreModal.tsx
├── calendar/               CalendarSection.tsx + CalendarGrid.tsx + EventModal.tsx + hooks/
├── resultats/              ResultatsSection.tsx + tabs/ + components/
├── parametres/             ParametresPage.tsx + tabs/ + hooks/
└── common/                 SearchableSelect.tsx, SettingsModal.tsx, UpdateNotification.tsx
```

Each section typically includes:
- Main *Section.tsx (page container)
- *Modal.tsx for create/edit dialogs
- hooks/ subfolder: data fetching, validation, calculations
- utils/ subfolder: domain-specific helpers
- tabs/ subfolder: multi-tab views

### Key Patterns

**useAutoSave Hook** (src/hooks/useAutoSave.ts):
- Debounces form data changes (default 500ms) and invokes onSave(data)
- Validates before saving: skips if entity is empty (projects, clients, providers have custom validation logic)
- Used in all modals to persist changes without explicit Save button

**useUnsavedChanges Hook** (src/hooks/useUnsavedChanges.ts):
- Warns user if closing unsaved form (beforeunload event)
- Used in large modals with significant data input

**PDF Generation**:
- generarFacturaVentaPDF.ts: Sales invoice to jsPDF + jsPDF-AutoTable
- generarPressupostPDF.ts: Budget to jsPDF + jsPDF-AutoTable
- Called on-demand; optionally embedded as base64 in data

**Navigable Modals**:
- Modals check plateaNavigateTo on mount
- If set, auto-fetch and display that record (e.g., FAV-00123)
- Clears after navigation

**Financial Calculations**:
- resultatCalculs.ts: Aggregates project margins, invoice status, costs, profit
- facturesCalculations.ts: Invoice totals (IVA, IRPF, pending)

## Electron Integration

**Main Process** (electron/main.cjs):
- Initializes electron-store with schema
- Manages backup/restore (every 30s, on close)
- Auto-updater (GitHub releases)
- Opens DevTools in dev mode
- IPC handlers: install-update, get-app-version, get-store-path, export-cloud-backup-data, import-data

**Preload Script** (electron/preload.js):
- Exposes window.electronStore API (get, set, delete, getPath)
- Context isolation enabled

**Auto-Updater**:
- Checks GitHub releases on startup and hourly
- Notifies user; installs on restart

## Development Guide

### Adding a New Entity/Section

1. Create type in src/types/newentity.ts
2. Add get/set methods to StorageManager
3. Create src/components/newentity/NewEntitySection.tsx and modal
4. Add nav item to App.tsx
5. Add utility functions in utils/ subfolder if needed

### Debugging

- **Web Dev**: Browser DevTools (Network, Console, Debugger)
- **Electron Dev**: DevTools opens automatically in dev mode
- **Storage**: Check console for migration logs (prefixed with emojis: 🚀 ✅ ❌)
- **Electron Store Path**: IPC handler get-store-path or main process logs

### Building for Release

1. Verify `npm run build` succeeds
2. Run `npm run electron:build:win` or `npm run electron:build:mac`
3. Installers output to dist/
4. Create GitHub release with version tag (triggers auto-updater)

### Updating Version

- Change version in package.json
- App.tsx reads the visible version from Electron (`getAppVersion`) or Vite's `__APP_VERSION__`; do not hardcode the footer version.
- Keep `dataSchemaVersion` separate from the user-facing app version. Do not use app version strings to decide data migrations.
- Create GitHub release with matching tag

## Notable Implementation Details

**Cronometre (Stopwatch) Widget**: Always-visible in sidebar footer; opens modal to create work log entry; state persists in storage.cronometre.

**PDF Upload (Purchase Invoices)**: Drag-drop or click to upload; stored as base64; persisted in electron-store.

**Rectificative Invoices**: Sales invoices have tipus field (normal | rectificativa); rectificatives reference original via facturaRectificada; include motivoRectificativa.

**Project State Machine**: Transitions esborrany → planificat → rodatge → edicio → esperant_feedback → revisio → acabat → facturat; each change logged in projecte.historial.

**Financial Reports**: resultats/ aggregates all projects, invoices, purchases; calculates revenue, costs, gross profit, ROI; exports to Excel and PDF.

**Project Historial (Audit Trail)**: Projects maintain historial array with data, tipus, descripcio, usuari; auto-populated on key changes.

## File Reference

| Path | Purpose |
|------|---------|
| src/utils/storageManager.ts | Central data access layer |
| src/types/*.ts | Entity type definitions |
| src/App.tsx | Main navigation and section switching |
| src/App.css + src/index.css | Global styles |
| electron/main.cjs | Electron main process |
| electron/preload.js | IPC bridge |
| vite.config.ts | Vite build configuration |
| tsconfig.app.json | TypeScript options |
| package.json | Electron builder configuration |

## Release & Distribution Constraints

### electron-store version
- **Must stay at `^8.x`** — v9+ is ESM-only and breaks `require()` in `main.cjs` and `preload.js`, which are CommonJS. Do not upgrade without converting those files to use dynamic `import()`.

### Mac build architecture
- **Build x64 only** (`"arch": ["x64"]`) for the Mac DMG. Do not use `arm64` or `universal`.
- Reason: arm64 builds from GitHub Actions (without an Apple Developer certificate) are blocked by macOS Tahoe (26) with "app is damaged" — the CSC workaround does not help. x64 builds work on all Macs including Apple Silicon via Rosetta 2, with only the standard "unidentified developer" prompt that users can bypass from System Settings > Privacy & Security.
- `universal` builds also fail due to a bug in `@electron/universal` (bundled with electron-builder 24.x) that mismatches LICENSE files between archs.

### GitHub Actions workflow
- Requires `permissions: contents: write` at workflow level for GITHUB_TOKEN to create releases.
- Use `npm install` (not `npm ci`) — `package-lock.json` is in `.gitignore`.
- Set `CSC_IDENTITY_AUTO_DISCOVERY: "false"` on the Mac build step to prevent the runner from applying an invalid ad-hoc signature.

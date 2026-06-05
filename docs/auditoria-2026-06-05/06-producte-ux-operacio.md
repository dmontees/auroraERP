# Producte, UX i operacio

## Cobertura funcional

L'app cobreix un cicle ERP molt complet per productores audiovisuals:

- Clients i proveidors.
- Projectes i recursos.
- Pressupostos.
- Factures de venda i compra.
- Fiscalitat.
- Resultats financers.
- Parts de treball.
- Calendari.
- Parametres.
- Sync web i backups.

La cobertura funcional es una fortalesa clara. El risc principal es que els fluxos critics depenen de molta logica client-side i persistencia local sense una capa transaccional forta.

## UX operativa

### Fortaleses

- Navegacio per seccions clara.
- Sidebar agrupada per Produccio, Relacions i Finances.
- Widget de cronometre persistent.
- Exportacions PDF/Excel integrades.
- Sync i estat de cloud visibles al footer.

### Riscos

#### Autosave en dades critiques

`useAutoSave` ajuda a no perdre feina, pero en facturacio i fiscalitat pot ser delicat si una modificacio parcial queda persistida sense una confirmacio clara.

Recomanacio:

- Diferenciar "esborrany auto-guardat" de "document emes/validat".
- Bloquejar edicio de camps fiscals clau quan una factura estigui emesa.
- Afegir historial d'accions per factures definitives, no nomes projectes.

#### Restauracio i sync no prou visibles

Hi ha backups locals, backups cloud i sync de documents. Son potents, pero operativament cal que l'usuari entengui:

- Que s'ha sincronitzat.
- Que no s'ha sincronitzat.
- Si els documents estan pendents.
- Si el backup inclou credencials o no.

Recomanacio:

- Pantalla de "Salut de dades" a Parametres:
  - Ultim backup local.
  - Ultim backup cloud.
  - Ultima sync estructural.
  - Ultima sync documents.
  - Nombre de documents pendents.
  - Ruta del store.

## Operacio i releases

### Constraints documentades correctament

`AGENTS.md` documenta decisions importants:

- `electron-store` ha de seguir en `^8.x`.
- Mac build x64 only.
- GitHub Actions necessita `contents: write`.
- Usar `npm install`, no `npm ci`.
- `CSC_IDENTITY_AUTO_DISCOVERY=false`.

### Riscos operatius

- La versio documentada esta obsoleta.
- `build.win.icon` apunta a `build/icon.ico`, pero en l'inventari inicial no s'ha vist `build/icon.ico`; si no existeix, el build Windows pot fallar o usar fallback.
- `package-lock.json` existeix al repositori tot i que `AGENTS.md` diu que esta a `.gitignore`; cal aclarir la politica real.

Recomanacio:

- Afegir checklist de release a `docs/release.md`.
- Fer un smoke manual post-build per Electron.
- Afegir validacio CI per existencia d'assets d'installer.

## Variant web

La web frontend compila i la API PHP esta estructurada per lectura/sync. Tot i aixo, sembla un subproducte amb contractes que poden quedar enrere respecte l'app desktop.

Recomanacio:

- Generar fixtures JSON compartides per desktop i web.
- Afegir una prova de sync end-to-end contra SQLite/MySQL de test o un validador PHP.
- Documentar quina part web es read-only i quines taules son font derivada.


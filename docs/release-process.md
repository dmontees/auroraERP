# Aurora ERP - proces de release

Aquest document recull el flux actual per publicar una versio nova i provar les actualitzacions a macOS.

## Abans de publicar

- Confirmar que no hi ha dades locals sensibles versionades: `.env`, `config.php`, certificats, backups, bases de dades locals o fitxers `aurora-data.json`.
- No incloure `_Bugs/` ni captures rebudes d'usuaris en commits publics.
- Mantenir el DMG de macOS en `x64`; no publicar `arm64` ni `universal` sense signatura/certificat Apple Developer.
- El repositori o, com a minim, les releases han de ser accessibles publicament para que la app instalada pueda leer `latest-mac.yml`.

## Actualizar version

Cambiar la version en:

- `package.json`
- `AGENTS.md`
- `electron/main.cjs`
- `electron/preload.js`

La UI lee la version real desde Electron (`getAppVersion`) o desde Vite (`__APP_VERSION__`). No debe hardcodearse en `App.tsx`.

## Comprobaciones locales

Ejecutar:

```bash
npm run check
npm run build
```

`npm run check` cubre TypeScript, contratos criticos, utilidades del updater y sintaxis Electron. `npm run build` confirma que Vite empaqueta correctamente la app.

## Publicacion

Crear commit y tag:

```bash
git add .
git commit -m "chore: release X.Y.Z"
git tag -a vX.Y.Z -m "Aurora ERP vX.Y.Z"
git push origin main
git push origin vX.Y.Z
```

El push del tag activa GitHub Actions y genera la release con el DMG y `latest-mac.yml`.

## Verificacion en GitHub

Comprobar el workflow:

```bash
gh run list --repo dmontees/auroraERP --limit 5
gh release view vX.Y.Z --repo dmontees/auroraERP
```

La release debe incluir como minimo:

- `Aurora-X.Y.Z.dmg`
- `latest-mac.yml`

## Prueba del updater en Mac

1. Instalar una version anterior, por ejemplo `3.0.4`.
2. Publicar una version superior, por ejemplo `3.0.5`.
3. Abrir Aurora y pulsar `Buscar actualitzacions disponibles`.
4. La app debe detectar la nueva version y descargarla.
5. Instalar al reiniciar y comprobar que los datos del usuario siguen presentes.

Si aparece `GitHub API HTTP 404` o `GitHub HTTP 404`, revisar primero que el repositorio/releases sean publicos y que `latest-mac.yml` exista en la ultima release.

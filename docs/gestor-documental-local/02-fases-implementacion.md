# Fases de implementacion

Este plan esta pensado para minimizar riesgo sobre usuarios que ya tienen datos y documentos guardados en Aurora.

## Fase 0: preparacion y contratos

Objetivo: definir contratos de datos antes de tocar flujos de subida o generacion.

Estado 2026-07-02: base implementada. Se han anadido los tipos documentales comunes y el modulo de rutas/versiones.

Tareas:

- Crear tipos comunes para referencias documentales:
  - `DocumentFileRef`
  - `DocumentVersion`
  - `DocumentOwner`
  - `DocumentMigrationStatus`
- Decidir si las referencias viven en cada entidad o en un indice documental central.
- Definir nombres de carpetas constantes en un modulo unico.
- Definir reglas de trimestre fiscal a partir de fecha.
- Definir normalizacion de nombres de carpeta y archivo para macOS.

Criterios de aceptacion:

- Hay un contrato TypeScript claro para documentos versionados.
- Hay una funcion unica para construir rutas relativas.
- No se han cambiado todavia los flujos existentes de usuario.

## Fase 1: capa Electron de filesystem

Objetivo: exponer operaciones seguras de sistema de archivos desde Electron.

Estado 2026-07-02: base implementada. Electron expone seleccion de raiz, creacion/verificacion de estructura, escritura/lectura, informacion de archivo y apertura en Finder mediante una API limitada.

Tareas en `electron/main.cjs`:

- Anadir IPC para seleccionar carpeta raiz mediante dialogo nativo.
- Crear/verificar estructura base.
- Escribir archivo desde base64 o buffer.
- Leer archivo como base64 o abrirlo externamente.
- Comprobar existencia de archivo.
- Calcular hash y tamano.
- Crear carpeta si falta.
- Abrir carpeta o revelar archivo en Finder.

Tareas en `electron/preload.js`:

- Exponer API limitada tipo `window.electronDocuments`.
- Evitar acceso arbitrario al filesystem desde React.
- Usar rutas relativas desde la raiz documental para las operaciones normales.

Consideraciones:

- En modo web dev sin Electron debe existir fallback no destructivo.
- No se debe permitir escribir fuera de la raiz documental salvo en la seleccion inicial.

Criterios de aceptacion:

- El usuario puede elegir raiz documental.
- Aurora crea `Aurora/` y la estructura minima.
- Se puede escribir y leer un archivo de prueba.
- Se puede revelar un archivo en Finder.

## Fase 2: configuracion en Parametres

Objetivo: permitir configurar, validar y reparar la raiz documental.

Estado 2026-07-02: base implementada. Se ha anadido una pestana `Gestor documental` en `Parametres` para seleccionar, verificar y abrir la carpeta documental.

Tareas:

- Anadir seccion en `Parametres` para gestor documental.
- Guardar configuracion:
  - `documentRootPath`
  - `documentRootConfiguredAt`
  - `documentSchemaVersion`
  - `lastDocumentHealthCheckAt`
- Botones:
  - Elegir carpeta documental.
  - Crear/verificar estructura.
  - Abrir carpeta Aurora en Finder.
  - Revisar documentos perdidos.

Criterios de aceptacion:

- Aurora detecta si no hay raiz configurada.
- Aurora detecta si la raiz falta o fue movida.
- El usuario puede reubicar la raiz sin romper rutas relativas.

## Fase 3: documentManager en frontend

Objetivo: centralizar reglas de rutas, nombres, versiones y metadatos.

Estado 2026-07-02: base implementada. `src/utils/documentManager.ts` centraliza carpetas, rutas relativas, nombres seguros, trimestre fiscal y versionado.

Nuevo modulo sugerido:

```text
src/utils/documentManager.ts
```

Responsabilidades:

- Construir rutas relativas para cliente, proyecto, proveedor y fiscal.
- Generar nombres seguros de archivo.
- Calcular siguiente version.
- Marcar documento actual.
- Resolver trimestre fiscal.
- Crear referencias `DocumentFileRef`.
- Distinguir documento generado vs documento subido.

Funciones clave:

- `buildClientDocumentPath(client, tipus, filename)`
- `buildProjectDocumentPath(client, projecte, tipus, filename)`
- `buildFiscalDocumentPath(date, tipus, filename)`
- `getNextDocumentVersion(existingRefs, documentCode)`
- `markCurrentVersion(refs, newRef)`
- `safeFileName(value)`

Criterios de aceptacion:

- Ningun componente construye rutas a mano.
- Los tests unitarios cubren nombres con acentos, barras, dos puntos y espacios.
- El trimestre fiscal se calcula de forma consistente.

## Fase 4: documentos de cliente

Objetivo: anadir documentacion de cliente sin tocar todavia facturas ni gastos.

Estado 2026-07-02: base implementada. La ficha de cliente tiene pestana `Documents`; los nuevos documentos se escriben en disco y el cliente guarda referencias documentales.

Tareas:

- Extender tipo `Client` con documentos.
- Crear pestana `Documents` en ficha de cliente.
- Tipos iniciales:
  - `contracte`
  - `fiscal`
  - `altres`
- Guardar nuevos documentos en:

```text
Clients/CLI-00001 - Nom Client/Documentacio client/
```

- Mostrar listado con:
  - nombre
  - tipo
  - fecha
  - version actual
  - abrir
  - revelar en Finder
  - reemplazar creando nueva version

Criterios de aceptacion:

- Un cliente puede tener documentos propios.
- Subir un documento crea archivo fisico.
- Reemplazar un documento conserva historial y marca actual.

## Fase 5: documentos manuales de proyecto

Objetivo: migrar el flujo actual de documentos de proyecto hacia archivos locales.

Estado 2026-07-02: base implementada. Los nuevos documentos manuales de proyecto se guardan en `02_Documents projecte` con `fileRef`; los documentos legacy con base64 siguen abriendo.

Tareas:

- Adaptar `DocumentProjecte` para soportar referencia documental.
- Los nuevos documentos se guardan en:

```text
Clients/CLI-00001 - Nom Client/Projectes/PRJ-00001 - Nom Projecte/02_Documents projecte/
```

- Mantener lectura legacy de `fitxer` base64 mientras exista.
- Actualizar descargas para abrir el archivo local si hay `relativePath`.

Criterios de aceptacion:

- Documentos nuevos de proyecto ya no se guardan como base64.
- Documentos antiguos siguen funcionando.
- El historial de proyecto sigue registrando altas y bajas de documentos.

## Fase 6: presupuestos generados

Objetivo: guardar cada PDF generado de presupuesto en su carpeta de proyecto, con versionado.

Estado 2026-07-02: base implementada. Si el presupuesto esta vinculado a un proyecto y existe raiz documental, el PDF se guarda versionado en `01_Pressupostos`; si falta vinculacion/configuracion, se mantiene la descarga directa.

Tareas:

- Modificar generacion de presupuesto PDF para devolver blob/base64 y metadatos.
- Guardar PDF en:

```text
Clients/CLI-00001 - Nom Client/Projectes/PRJ-00001 - Nom Projecte/01_Pressupostos/
```

- Crear version nueva cada vez que el usuario genere PDF.
- Marcar la ultima version como actual.
- Mostrar historial de PDFs generados en el presupuesto o proyecto.

Regla:

- Modificar el presupuesto no cambia ningun PDF.
- Generar PDF despues de modificar crea una nueva version.

Criterios de aceptacion:

- Dos generaciones del mismo presupuesto producen `v001` y `v002`.
- Aurora identifica cual es actual.
- La version anterior sigue accesible.

## Fase 7: facturas de venta en Fiscal

Objetivo: guardar PDFs de facturas de venta en la estructura fiscal.

Estado 2026-07-02: base implementada. Los PDFs de borrador y definitivos se guardan versionados en `Fiscal/AAAA/TX/Factures venda` si existe raiz documental; si no, se mantiene la descarga directa y el base64 legacy.

Tareas:

- Modificar generacion de factura venta PDF.
- Guardar en:

```text
Fiscal/AAAA/TX/Factures venda/
```

- Calcular `AAAA/TX` desde `dataFactura`.
- Versionar PDFs generados.
- Aplicar reglas por estado:
  - borrador: permitir reemplazo controlado o nueva version.
  - emitida/enviada/pagada: crear nueva version siempre.
  - cambios fiscales clave tras emision: advertir y orientar a rectificativa.
- En proyecto, mostrar facturas vinculadas como enlaces a documentos fiscales.

Criterios de aceptacion:

- Una factura vinculada a proyecto vive fisicamente en `Fiscal`.
- El proyecto puede abrir el PDF sin duplicarlo.
- Las versiones anteriores no se pierden.

## Fase 8: facturas de compra, gastos y obligaciones fiscales

Objetivo: mover documentos recibidos y fiscales a `Fiscal`.

Estado 2026-07-02: base implementada. Nuevos PDFs de facturas de compra, gastos generales y obligaciones fiscales se guardan versionados en `Fiscal/AAAA/TX/Despeses i obligacions fiscals`; se conserva `documentPDF` legacy para compatibilidad/exportaciones actuales.

Tareas:

- Adaptar uploaders de:
  - facturas de compra
  - gastos generales
  - obligaciones fiscales
- Guardar en:

```text
Fiscal/AAAA/TX/Despeses i obligacions fiscals/
```

- Calcular periodo desde fecha efectiva del documento.
- Si el documento esta vinculado a proyecto, mostrarlo en proyecto como enlace.
- Si el documento esta vinculado a proveedor, mostrarlo en proveedor como enlace.
- Reemplazar adjunto creando nueva version y marcandola como actual.

Criterios de aceptacion:

- Un gasto subido aparece fisicamente en fiscal.
- El proyecto y proveedor lo muestran sin duplicar archivo.
- El historial permite abrir versiones anteriores.

## Fase 9: documentos de proveedor

Objetivo: migrar documentos estables de proveedor a carpetas locales.

Estado 2026-07-02: base implementada. Los nuevos documentos manuales de proveedor se guardan en las carpetas locales del proveedor con `fileRef`; los documentos legacy en base64 siguen abriendo.

Tareas:

- Adaptar `DocumentProveidor` para soportar referencia documental.
- Guardar nuevos documentos en:

```text
Proveidors/PRO-00001 - Nom Proveidor/
```

- Mapear tipos:
  - `contracte` -> `01_Contracte`
  - `asseguranca` -> `02_Asseguranca`
  - `certificat` -> `03_Certificat`
  - `altres` -> `99_Altres`
- Para nominas, usar `04_Nomines` cuando el origen sea una obligacion fiscal o documento laboral.

Criterios de aceptacion:

- Documentos estables de proveedor viven en proveedor.
- Facturas recibidas siguen viviendo en fiscal.
- La UI diferencia documentacion de proveedor y documentos fiscales vinculados.

## Fase 10: migracion de base64 existente

Objetivo: migrar usuarios reales sin perdida de datos.

Estado 2026-07-02: base implementada. `Parametres > Gestor documental` permite analizar documentos legacy y copiarlos al gestor documental local con `fileRef`, sin eliminar los campos base64.

Documentos legacy a detectar:

- `Projecte.documents[].fitxer`
- `Projecte.imatgeReferencia` si se decide migrarla
- `Proveidor.documents[].urlFitxer`
- `Proveidor.imatgePerfil` si se decide migrarla
- `FacturaCompra.documentPDF`
- `GastoGeneral.documentPDF`
- `ObligacioFiscal.documentPDF`
- `FacturaVenta.documentPDF`

Flujo:

1. Crear snapshot de datos antes de migrar.
2. Escanear entidades y contar documentos.
3. Mostrar resumen al usuario.
4. Escribir archivos en ubicacion correspondiente.
5. Calcular `sha256`, tamano y ruta relativa.
6. Actualizar entidades con referencias.
7. Marcar `migratedFromBase64: true`.
8. Mantener base64 legacy temporalmente.
9. Ejecutar verificacion post-migracion.

Criterios de aceptacion:

- Ningun base64 se elimina durante la primera migracion.
- La migracion se puede reintentar sin duplicar versiones innecesarias.
- Aurora informa documentos migrados, omitidos y con error.

## Fase 11: limpieza opcional de base64

Objetivo: reducir peso de datos solo cuando la migracion este verificada.

Tareas:

- Crear herramienta "Liberar espacio".
- Antes de eliminar base64, comprobar:
  - archivo existe
  - tamano coincide
  - hash coincide si existe
  - referencia esta marcada como actual o historica valida
- Crear backup previo.
- Eliminar base64 de documentos migrados.

Criterios de aceptacion:

- El usuario decide cuando liberar espacio.
- No se elimina ningun binario sin verificacion.
- El backup previo queda accesible.

## Fase 12: backups y exportacion

Objetivo: que el usuario entienda y controle que se copia.

Tareas:

- Separar opciones:
  - Exportar datos Aurora.
  - Exportar documentos.
  - Exportar backup completo.
- Ajustar backup cloud:
  - mantener datos sin binarios.
  - documentar que documentos locales no suben automaticamente salvo flujo especifico.
- Ajustar importacion:
  - restaurar datos.
  - pedir raiz documental si faltan documentos.
  - permitir localizar carpeta Aurora existente.

Criterios de aceptacion:

- La UI no promete que un backup de datos incluye documentos.
- El backup completo incluye datos + documentos.
- Restaurar en otro Mac permite reubicar la raiz documental.

## Fase 13: salud documental y reparacion

Objetivo: detectar y corregir inconsistencias.

Estado 2026-07-02: diagnostico base implementado. `Parametres > Gestor documental` puede comprobar si las referencias `fileRef` apuntan a archivos existentes. La reparacion guiada queda pendiente.

Tareas:

- Pantalla de diagnostico:
  - documentos faltantes
  - documentos huerfanos
  - carpetas no creadas
  - documentos sin version actual
  - rutas fuera de raiz
- Acciones:
  - reconstruir carpetas
  - localizar archivo faltante
  - regenerar indice
  - abrir ubicacion en Finder

Criterios de aceptacion:

- Aurora puede explicar por que un documento no abre.
- El usuario puede relocalizar archivos sin editar JSON.
- Las carpetas base se pueden reconstruir.

## Fase 14: endurecimiento UX

Objetivo: pulir la experiencia diaria.

Tareas:

- Estados visibles:
  - archivo local OK
  - archivo no encontrado
  - pendiente de migrar
  - version antigua
  - version actual
- Acciones consistentes:
  - abrir
  - revelar en Finder
  - reemplazar
  - descargar/exportar copia
  - ver historial
- Confirmaciones especificas para facturas emitidas.
- Mensajes claros cuando la raiz documental no este configurada.

Criterios de aceptacion:

- El usuario entiende donde vive cada documento.
- No hay botones que parezcan guardar en Aurora cuando realmente guardan en disco sin explicarlo.
- El flujo de generar PDF deja claro si se ha creado una nueva version.

## Orden recomendado de entrega

Para reducir riesgo, no implementar todo de golpe:

1. Fases 0-3: infraestructura sin cambiar flujos existentes.
2. Fase 4: documentos de cliente como primer caso nuevo.
3. Fase 5: documentos manuales de proyecto.
4. Fase 6: presupuestos generados.
5. Fase 7: facturas de venta.
6. Fase 8: compras, gastos y obligaciones fiscales.
7. Fase 9: documentos de proveedor.
8. Fases 10-11: migracion y limpieza.
9. Fases 12-14: backup, reparacion y pulido.

## Riesgos principales

- Perdida de acceso si el usuario mueve la carpeta documental.
- Duplicados si la migracion se reintenta sin idempotencia.
- Confusion entre documento actual y versiones anteriores.
- Facturas emitidas modificadas sin trazabilidad suficiente.
- Backups incompletos si el usuario cree que el JSON incluye documentos.
- Diferencias entre Electron y modo web dev.

## Pruebas minimas

- Elegir raiz documental nueva en macOS.
- Crear cliente y verificar carpetas.
- Crear proyecto y verificar carpetas.
- Subir documento de cliente.
- Subir documento de proyecto.
- Generar presupuesto dos veces y comprobar versiones.
- Generar factura de venta vinculada a proyecto y comprobar que vive en `Fiscal`.
- Subir factura de compra vinculada a proyecto y proveedor y comprobar enlaces.
- Mover raiz documental y reconfigurarla.
- Simular archivo borrado y verificar diagnostico.
- Migrar datos legacy con base64 y comprobar que los documentos siguen abriendo.
- Exportar backup de datos y backup completo.

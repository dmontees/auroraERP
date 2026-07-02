# Gestor documental local

Este bloque documenta la estrategia acordada para convertir Aurora en un indice de documentos locales, manteniendo los archivos fisicos en una carpeta elegida por el usuario.

## Documentos

- [01-estrategia.md](01-estrategia.md): decisiones funcionales, estructura de carpetas y reglas de versionado.
- [02-fases-implementacion.md](02-fases-implementacion.md): plan tecnico por fases, migracion y criterios de validacion.

## Objetivo

Aurora debe permitir que el usuario trabaje con una carpeta local principal, creada donde elija, y que los documentos queden organizados en Finder de forma comprensible. La aplicacion seguira siendo el indice fiable: guardara rutas relativas, versiones, metadatos y relaciones con clientes, proyectos, proveedores, facturas, gastos y obligaciones fiscales.

## Principios acordados

- El usuario trabaja en macOS; la experiencia debe estar pensada para Finder.
- Los documentos fiscales viven en `Fiscal/`.
- Los proyectos muestran enlaces internos a facturas y gastos, pero no almacenan esos PDFs como ubicacion canonica.
- Los presupuestos viven dentro del proyecto y se versionan.
- Los documentos manuales de proyecto viven dentro del proyecto.
- Los documentos de cliente requieren una nueva pestana `Documents` en la ficha de cliente.
- Los documentos estables de proveedor viven dentro del proveedor.
- Aurora debe conservar historial y marcar cual es el documento actual.
- Los usuarios existentes ya tienen documentos en base64; la migracion debe ser guiada, reversible y conservadora.

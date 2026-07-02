# Estrategia funcional

## Decision principal

Aurora no debe tratar los documentos como simples adjuntos dentro de la base de datos. Debe tratarlos como archivos locales gestionados, con una ubicacion fisica estable y metadatos persistidos en Aurora.

La fuente de verdad del contenido binario sera el sistema de archivos local. La fuente de verdad de relaciones, versiones, documento actual y estado seguira siendo Aurora.

## Raiz documental

El usuario elegira una ubicacion en macOS donde Aurora creara una carpeta principal:

```text
Aurora/
```

La ruta absoluta solo se guardara en la configuracion local. Todas las entidades guardaran rutas relativas a esta raiz, para que la carpeta completa pueda moverse a otro disco o ubicacion y reconfigurarse despues.

## Estructura de carpetas

```text
Aurora/
  00_Sistema/
    index-documental.json
    paperera/
    pendents-de-revisar/

  Clients/
    CLI-00001 - Nom Client/
      Documentacio client/
        Contractes/
        Fiscal/
        Altres/
      Projectes/
        PRJ-00001 - Nom Projecte/
          01_Pressupostos/
          02_Documents projecte/
          03_Enllacos factures i despeses/

  Proveidors/
    PRO-00001 - Nom Proveidor/
      01_Contracte/
      02_Asseguranca/
      03_Certificat/
      04_Nomines/
      99_Altres/

  Fiscal/
    2026/
      T1/
        Despeses i obligacions fiscals/
        Factures venda/
      T2/
        Despeses i obligacions fiscals/
        Factures venda/
      T3/
        Despeses i obligacions fiscals/
        Factures venda/
      T4/
        Despeses i obligacions fiscals/
        Factures venda/
```

Los nombres fisicos se mantienen sin acentos en carpetas tecnicas para reducir problemas de normalizacion Unicode al copiar, comprimir o mover carpetas entre sistemas. La interfaz puede mostrar los nombres con acentos.

## Ubicacion canonica por tipo documental

### Cliente

Los documentos generales de cliente viviran en:

```text
Clients/CLI-00001 - Nom Client/Documentacio client/
```

Tipos iniciales:

- `Contractes`
- `Fiscal`
- `Altres`

Esto requiere una nueva pestana `Documents` dentro de la ficha de cliente.

### Proyecto

Los documentos propios de proyecto viviran en:

```text
Clients/CLI-00001 - Nom Client/Projectes/PRJ-00001 - Nom Projecte/
```

Subcarpetas:

- `01_Pressupostos`: PDFs generados de presupuestos, versionados.
- `02_Documents projecte`: documentos manuales subidos por el usuario.
- `03_Enllacos factures i despeses`: espacio opcional para indices o enlaces hacia documentos fiscales relacionados.

No se crean carpetas especificas para albaranes, briefings, guiones, entregables, contratos, permisos ni otros documentos de produccion. Si el usuario los necesita, los subira manualmente como documentos de proyecto.

### Proveedor

Los documentos estables del proveedor viviran en:

```text
Proveidors/PRO-00001 - Nom Proveidor/
```

Subcarpetas:

- `01_Contracte`
- `02_Asseguranca`
- `03_Certificat`
- `04_Nomines`
- `99_Altres`

Las facturas recibidas de proveedor no viven aqui. Viven en `Fiscal/` y Aurora las muestra desde el proveedor mediante relaciones internas.

### Fiscal

Los PDFs de facturas de venta, gastos, facturas recibidas y obligaciones fiscales viviran en:

```text
Fiscal/AAAA/TX/
```

Subcarpetas:

- `Despeses i obligacions fiscals`
- `Factures venda`

Reglas:

- Facturas de venta: `Fiscal/AAAA/TX/Factures venda/`.
- Facturas de compra, gastos generales y obligaciones fiscales: `Fiscal/AAAA/TX/Despeses i obligacions fiscals/`.
- Si una factura o gasto esta vinculado a proyecto, el proyecto lo muestra como documento enlazado.
- Si una factura o gasto esta vinculado a proveedor, el proveedor lo muestra como documento enlazado.

## Versionado

Aurora debe conservar historial de documentos generados o reemplazados y marcar cual es el actual.

### Presupuestos

Los presupuestos viven en el proyecto y se versionan cada vez que el usuario genera un PDF.

Ejemplo:

```text
01_Pressupostos/
  PRE-00023_v001.pdf
  PRE-00023_v002.pdf
```

Aurora marcara `v002` como version actual si es la ultima generada.

### Facturas de venta

Las facturas de venta viven en `Fiscal`. El comportamiento depende del estado:

- Factura en borrador: se puede reemplazar el PDF actual o crear una nueva version, segun decision de implementacion.
- Factura emitida, enviada, cobrada o registrada: nunca debe sobrescribirse sin historial.
- Si cambian datos fiscales clave despues de emitir, el flujo correcto debe tender a rectificativa, no a reemplazo silencioso.

Ejemplo:

```text
Fiscal/2026/T3/Factures venda/
  FAV-00235_v001_borrador.pdf
  FAV-00235_v002_emesa.pdf
```

### Facturas recibidas, gastos y obligaciones fiscales

Si el usuario sube un nuevo PDF para el mismo registro, Aurora crea una nueva version y marca la nueva como actual.

Ejemplo:

```text
Fiscal/2026/T3/Despeses i obligacions fiscals/
  FAC-00041_v001.pdf
  FAC-00041_v002.pdf
```

Esto cubre escaneos incorrectos, documentos corregidos o conversiones posteriores.

## Modelo de metadatos recomendado

Se recomienda introducir un modelo comun para documentos gestionados:

```ts
export interface DocumentFileRef {
  id: string;
  kind: 'client' | 'projecte' | 'pressupost' | 'factura-venda' | 'factura-compra' | 'gasto-general' | 'obligacio-fiscal' | 'proveidor';
  ownerType: 'client' | 'projecte' | 'proveidor' | 'fiscal';
  ownerCodi: string;
  displayName: string;
  originalName?: string;
  relativePath: string;
  mimeType?: string;
  size?: number;
  sha256?: string;
  version: number;
  current: boolean;
  generated: boolean;
  createdAt: string;
  replacedBy?: string;
  migratedFromBase64?: boolean;
}
```

Las entidades actuales pueden mantener campos legacy durante la migracion, pero los nuevos documentos deberian apuntar a `DocumentFileRef` o a un identificador equivalente.

## Enlaces desde proyectos

El proyecto no debe duplicar fisicamente facturas y gastos. Debe resolverlos desde Aurora:

- `FacturaVenta.projecte === Projecte.codi`
- `FacturaCompra.projectes.includes(Projecte.codi)`
- obligaciones fiscales o gastos con `projecteCodi` cuando aplique

La carpeta `03_Enllacos factures i despeses` queda como mejora opcional. La primera implementacion puede resolverlo solo en UI, sin crear aliases de Finder.

## Backups

Se deben separar claramente:

- Backup de datos: JSON de Aurora sin binarios pesados.
- Backup documental: copia o ZIP de la carpeta documental.
- Backup completo: datos + carpeta documental.

El usuario debe ver con claridad si su copia de seguridad incluye o no documentos.

## Migracion de usuarios existentes

La migracion no debe eliminar base64 al primer paso.

Flujo recomendado:

1. El usuario elige la raiz documental.
2. Aurora crea la estructura.
3. Aurora escanea documentos base64 existentes.
4. Aurora propone migrarlos.
5. Aurora escribe archivos fisicos y calcula metadatos.
6. Aurora actualiza entidades con referencias a archivo.
7. Aurora conserva base64 temporalmente como fallback.
8. En una fase posterior, Aurora ofrece liberar espacio eliminando base64 ya verificados.

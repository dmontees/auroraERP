# Model de dades

## Estat actual

El tipus principal es `FacturaCompra`, definit a `src/types/facturaCompra.ts`.

Una factura de compra conserva:

- `tipus: 'factura-compra'`;
- `proveidor: string`;
- `numFacturaProveidor: string`;
- `projectes: string[]`;
- `esDepesaGeneral: boolean`;
- `albaransVinculats?: string[]`;
- `documentPDF?: string`;
- `documentPDFName?: string`.

Els albarans de compra viuen a `src/types/albara.ts` i es vinculen amb una factura mitjancant:

- `AlbaraCompra.facturaCodi`;
- `FacturaCompra.albaransVinculats`.

## Canvi implementat

S'ha afegit un camp de tipus documental a `FacturaCompra`:

```ts
export type TipusDocumentCompra = 'factura' | 'factura_simplificada';
```

I s'ha ampliat `FacturaCompra` amb:

```ts
export interface FacturaCompra extends GastoBase {
  tipus: 'factura-compra';
  tipusDocument?: TipusDocumentCompra;
  emissorNom?: string;
  proveidor: string;
  numFacturaProveidor: string;
  projectes: string[];
  esDepesaGeneral: boolean;
  albaransVinculats?: string[];
}
```

També s'ha afegit `ivaDeduible?: boolean` a `GastoBase` per poder decidir si l'IVA forma part del cost real.

## Compatibilitat amb dades existents

Les factures existents no tindran `tipusDocument`. La lectura les tracta com:

```ts
tipusDocument: 'factura'
```

Si alguna dada antiga arriba amb `tipusDocument: 'ticket'`, es normalitza en lectura com:

```ts
tipusDocument: 'factura_simplificada'
```

Aixo evita una migracio destructiva i manté compatibilitat amb proves o dades guardades abans d'unificar el concepte.

## Regles de validacio

Per `tipusDocument === 'factura'`:

- `proveidor` obligatori;
- `numFacturaProveidor` obligatori;
- projecte o despesa general obligatori segons el flux actual.

Per `tipusDocument === 'factura_simplificada'`:

- `documentPDF` obligatori;
- `proveidor` opcional;
- `emissorNom` obligatori quan no hi ha `proveidor`;
- `numFacturaProveidor` opcional;
- `projectes` i `albaransVinculats` funcionen igual que en una factura completa;
- `ivaDeduible` es desmarca per defecte, pero l'usuari pot activar-lo.

## Relacio amb albarans

No s'ha de crear un identificador nou de despesa per detectar coincidencies. La relacio continua sent explicita:

- `FacturaCompra.albaransVinculats` guarda els codis `ALC-XXXXX`;
- cada `AlbaraCompra.facturaCodi` apunta a `FacturaCompra.codi`;
- l'estat de l'albara es calcula i sincronitza com ara.

Una factura simplificada no "coincideix" amb una despesa per heuristica. Queda vinculada per id quan l'usuari selecciona manualment albarans pendents dins del modal.

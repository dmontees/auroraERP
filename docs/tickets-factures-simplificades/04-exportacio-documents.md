# Exportacio de documents

## Context

La utilitat `src/components/factures-compra/utils/facturesExport.ts` genera ZIPs amb documents PDF per trimestre o any.

Actualment:

- filtra despeses amb `documentPDF`;
- usa `dataGasto` per factures de compra;
- per `factura-compra`, construeix el nom amb tipus documental, emissor i numero;
- per altres tipus, usa codi i concepte.

Les factures simplificades entren en aquest mateix export. El terme ticket no es fa servir com a tipus tecnic separat; si existeix en dades antigues, es normalitza com `factura_simplificada`.

## Regla funcional

Qualsevol `FacturaCompra` amb `documentPDF` ha d'exportar-se, independentment de:

- `tipusDocument`;
- si te `proveidor`;
- si nomes te `emissorNom`;
- si esta vinculada a projecte o es despesa general.

## Noms de fitxer

Factura normal:

```text
FAC-00001_Factura_Proveidor_X_F2026-001.pdf
```

Factura simplificada:

```text
FAC-00002_FacturaSimplificada_Restaurant_La_Placa_SN.pdf
```

Quan no hi hagi numero de document:

```text
SN
```

Quan no hi hagi proveidor pero hi hagi emissor lliure:

```ts
const emissor = proveidor?.nomComercial || proveidor?.nomFiscal || factura.emissorNom || 'Emissor';
```

## Ajustos tecnics implementats

`facturesExport.ts` normalitza el tipus documental:

```ts
const getTipusDocument = (gasto: FacturaCompra): TipusDocumentCompra =>
  (gasto.tipusDocument as string) === 'ticket'
    ? 'factura_simplificada'
    : gasto.tipusDocument ?? 'factura';
```

I construeix un nom comu per factures completes i simplificades:

```ts
const numFactura = gasto.numFacturaProveidor || 'SN';
const emissor = proveidor?.nomComercial || proveidor?.nomFiscal || gasto.emissorNom || 'Emissor';
return safeName(`${gasto.codi}_${TIPUS_DOCUMENT_LABELS[tipusDocument]}_${emissor}_${numFactura}.pdf`);
```

## Alertes i textos

Les alertes parlen de documents, no nomes de factures:

- `No hi ha documents PDF per Q1 2026`
- `No hi ha documents PDF per l'any 2026`

## Criteris d'acceptacio

- Export trimestral inclou factures simplificades amb `documentPDF` del trimestre.
- Export anual inclou factures simplificades amb `documentPDF` de l'any.
- El ZIP no falla si `proveidor` es buit.
- El ZIP no genera noms confusos com `Proveidor` quan hi ha `emissorNom`.
- Les obligacions fiscals i documents de Seguretat Social continuen sortint igual que abans.

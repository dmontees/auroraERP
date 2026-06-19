# Factures simplificades

## Objectiu

Permetre registrar factures simplificades dins del circuit actual de `Factures Compra`. A Espanya, el ticket de compra es tracta funcionalment com una factura simplificada, per tant no es crea un tercer tipus separat.

El flux ha de mantenir:

- vinculacio amb projectes;
- vinculacio opcional amb albarans de compra;
- seguiment de pagaments;
- calcul de costos i resultats;
- adjunt obligatori del document PDF;
- exportacio de documents des de `Factures Compra`.

## Decisio de producte

Les factures simplificades no son una seccio separada. Son una variant lleugera de `FacturaCompra`.

El motiu es que la despesa ha de continuar entrant al mateix sistema que ja alimenta:

- pagaments de proveidors del projecte;
- albarans pendents, vinculats o pagats;
- rendibilitat de projectes;
- resultats globals;
- exportacio documental.

## Documents d'aquest pla

- [01-model-dades.md](01-model-dades.md): canvis de tipus i persistencia.
- [02-fluxos-usuari.md](02-fluxos-usuari.md): fluxos esperats per l'usuari.
- [03-fases-implementacio.md](03-fases-implementacio.md): fases explicites d'implementacio.
- [04-exportacio-documents.md](04-exportacio-documents.md): impacte en `Exportar documents`.
- [05-validacio-proves.md](05-validacio-proves.md): validacions i proves recomanades.
- [06-guia-usuari.md](06-guia-usuari.md): guia curta per registrar factures simplificades.

## Resum funcional

Una compra pot tenir un tipus documental:

- `factura`: factura de compra completa, amb proveidor obligatori.
- `factura_simplificada`: factura simplificada, incloent els documents que l'usuari anomena tickets, amb proveidor opcional i emissor lliure obligatori si no hi ha proveidor.

Les factures simplificades poden tenir `projectes`, `albaransVinculats`, pagaments i `documentPDF`.

Per defecte, l'IVA de la factura simplificada es marca com a no deduible. L'usuari pot activar `IVA deduible` si el document compleix els requisits fiscals.

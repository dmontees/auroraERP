# Fases d'implementacio

## Estat actual

Actualitzat el 2026-06-19.

- Fase 1: implementada.
- Fase 2: implementada.
- Validacio de formulari: implementada amb missatges especifics per data, proveidor/numero, emissor, PDF, projecte i conceptes.
- Fase 3: implementada, incloent retorn a `pendent-factura` quan una factura es desvincula d'un albara.
- Fase 4: implementada. El llistat i la pestanya de pagaments de projecte mostren factures i factures simplificades amb emissor lliure.
- Fase 5: implementada.
- IVA deduible: implementat. En factures simplificades es desmarca per defecte, pero l'usuari pot activar-lo.
- Adjunt JPG/PNG: implementat per factures simplificades, convertint internament la imatge a PDF.
- Acces des del projecte: implementat a `DespesesTab`, amb boto `Factura` en recursos humans i logistica.
- Materials: sense boto de registre rapid; sempre entren per factura normal des de `Factures Compra`.
- Duplicats: el boto `Factura` s'oculta quan la linia ja te una factura o factura simplificada vinculada mitjancant el seu albara.
- Acces des d'albarans: retirat el boto especific de registre rapid per evitar duplicar fluxos.
- Fase 6: pendent de prova manual completa amb dades reals; `npm run build` executat correctament.

Fitxers tocats:

- `src/types/facturaCompra.ts`
- `src/components/factures-compra/FacturaCompraModal.tsx`
- `src/components/factures-compra/FacturesCompraSection.tsx`
- `src/components/factures-compra/TipusGastoModal.tsx`
- `src/components/factures-compra/shared/PDFUploader.tsx`
- `src/components/factures-compra/utils/facturesExport.ts`
- `src/components/projectes/tabs/DespesesTab.tsx`
- `src/components/projectes/tabs/PagamentsProveidorsTab.tsx`
- `src/components/resultats/tabs/ProjectesRendibilitat.tsx`
- `src/components/resultats/tabs/FiscalTab.tsx`

## Fase 1: model de dades i compatibilitat

Objectiu: preparar `FacturaCompra` per suportar factures completes i factures simplificades.

Tasques:

- Afegir `TipusDocumentCompra` a `src/types/facturaCompra.ts`.
- Afegir `tipusDocument?: 'factura' | 'factura_simplificada'`.
- Afegir `emissorNom?: string`.
- Afegir `ivaDeduible?: boolean`.
- Revisar els punts que assumeixen que sempre hi ha proveidor.
- Aplicar fallback `tipusDocument ?? 'factura'` per dades antigues.
- Normalitzar qualsevol valor legacy `ticket` com `factura_simplificada`.

Criteri d'acceptacio:

- Les factures existents continuen veient-se com factures normals.
- Els documents legacy marcats com `ticket` es mostren com `Factura simplificada`.
- El build TypeScript no te errors.

## Fase 2: modal de Factura Compra

Objectiu: permetre seleccionar el tipus documental i capturar emissor lliure.

Tasques:

- Afegir selector `Tipus document` a `FacturaCompraModal.tsx`.
- Opcions:
  - `Factura`;
  - `Factura simplificada`.
- Quan el tipus sigui `Factura`, mantenir el proveidor i numero de factura obligatoris.
- Quan el tipus sigui `Factura simplificada`, permetre:
  - proveidor opcional;
  - camp `Emissor` visible i obligatori si no hi ha proveidor;
  - numero de document opcional.
- Mantenir seleccio de projectes i vinculacio manual amb albarans.
- Fer `documentPDF` obligatori per `Factura simplificada`.
- Acceptar PDF, JPG i PNG en factures simplificades.
- Mostrar missatges de validacio concrets.

Criteri d'acceptacio:

- Es pot guardar una factura simplificada amb projecte, emissor, import i PDF sense crear proveidor.
- No es pot guardar una factura simplificada sense document adjunt.
- La factura normal continua exigint proveidor.

## Fase 3: sincronitzacio amb albarans

Objectiu: conservar la logica actual de vinculacio i estat dels albarans.

Tasques:

- Revisar `syncAlbaransAfterSave` dins de `FacturaCompraModal.tsx`.
- Garantir que no depen exclusivament de `proveidor` per marcar albarans vinculats.
- Mantenir `FacturaCompra.albaransVinculats`.
- Mantenir `AlbaraCompra.facturaCodi`.
- Si la factura simplificada te pagament complet, l'albara vinculat passa a `pagat`.
- Si queda pendent o parcial, l'albara passa a `factura-vinculada`.
- Evitar vinculacio automatica insegura quan no hi ha proveidor; prioritzar seleccio explicita d'albarans.

Criteri d'acceptacio:

- Una factura simplificada vinculada a un albara pendent actualitza l'estat de l'albara.
- El projecte mostra el canvi dins del seguiment de pagaments.
- Eliminar o editar la factura no deixa albarans en un estat inconsistent.

## Fase 4: vistes de llistat i projecte

Objectiu: mostrar factures simplificades amb noms comprensibles.

Tasques:

- Actualitzar el llistat de `Factures Compra` per mostrar:
  - tipus documental;
  - proveidor si existeix;
  - `emissorNom` si no hi ha proveidor.
- Actualitzar `PagamentsProveidorsTab` per mostrar factures simplificades vinculades a projecte.
- Afegir filtre per tipus documental (`Factura`, `Factura simpl.`) al llistat de `Factures Compra`.
- Revisar `ProjectesRendibilitat` i altres calculs que filtren `tipus === 'factura-compra'`.
- Assegurar que el cost es reparteix igual entre `projectes` quan hi ha mes d'un projecte vinculat.

Criteri d'acceptacio:

- Una factura simplificada de restaurant vinculada a un projecte apareix en el seguiment economic del projecte.
- Els calculs de rendibilitat no exclouen factures simplificades.

## Fase 5: exportacio de documents

Objectiu: que `Exportar documents` inclogui factures i factures simplificades amb PDF.

Tasques:

- Actualitzar `src/components/factures-compra/utils/facturesExport.ts`.
- Fer que `buildZip` generi noms de fitxer adequats per:
  - factura normal amb proveidor;
  - factura simplificada amb proveidor o emissor lliure.
- Mantenir els filtres per trimestre i any basats en `dataGasto`.
- Garantir que el filtre `documentPDF` inclou aquests documents.
- Revisar alertes per no parlar nomes de factures completes.

Criteri d'acceptacio:

- Una factura simplificada amb PDF apareix al ZIP anual i trimestral corresponent.
- El nom del PDF exportat identifica el codi, el tipus documental i l'emissor.

## Fase 6: proves manuals i regressio

Objectiu: comprovar que no es trenca el circuit actual.

Tasques:

- Crear factura normal amb proveidor i albara.
- Crear factura simplificada amb emissor lliure, projecte, PDF i albara.
- Crear factura simplificada amb emissor lliure, projecte i sense albara.
- Crear factura normal i factura simplificada des de `Despeses` del projecte.
- Crear factura simplificada amb proveidor existent.
- Exportar documents per trimestre i any.
- Revisar resultats i rendibilitat de projecte.
- Executar `npm run build`.

Criteri d'acceptacio:

- El build passa.
- Les factures antigues continuen funcionant.
- Els nous documents se sincronitzen amb projectes, albarans, pagaments i exportacio.

Estat:

- `npm run build` passa.
- Falta prova manual amb dades reals de creacio/edicio/exportacio.

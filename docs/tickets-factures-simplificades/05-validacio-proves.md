# Validacio i proves

## Validacions de formulari

Factura normal:

- `tipusDocument` efectiu: `factura`.
- `proveidor` obligatori.
- `numFacturaProveidor` obligatori.
- `projectes` opcional si `esDepesaGeneral` es `true`.
- `ivaDeduible` es marca per defecte.

Factura simplificada:

- `tipusDocument`: `factura_simplificada`.
- `proveidor` opcional.
- `emissorNom` obligatori si no hi ha `proveidor`.
- `numFacturaProveidor` opcional.
- `documentPDF` obligatori.
- `ivaDeduible` desmarcat per defecte, modificable per l'usuari.
- `projectes` obligatori si l'usuari indica que la despesa esta vinculada a projecte.
- els missatges de validacio indiquen el camp concret que falta: data, proveidor/numero, emissor, PDF, projecte o conceptes.

## Proves manuals principals

### Prova 0: entrada directa des del selector

1. Obrir `Factures Compra`.
2. Clicar `Nova Factura / Despesa`.
3. Seleccionar `Factura simplificada`.

Resultat esperat:

- s'obre el modal de compra;
- `Tipus document` queda preseleccionat com `Factura simplificada`;
- el camp `Proveidor` apareix com opcional;
- el camp `Emissor` apareix si no hi ha proveidor.

### Prova 1: regressio de factura normal

1. Crear factura normal amb proveidor.
2. Vincular albara pendent.
3. Adjuntar PDF.
4. Guardar.

Resultat esperat:

- factura visible al llistat;
- albara en `factura-vinculada` o `pagat`;
- document exportable.

### Prova 2: factura simplificada amb projecte i albara

1. Crear factura simplificada.
2. Informar `emissorNom`.
3. Seleccionar projecte.
4. Vincular albara pendent manualment dins del modal.
5. Adjuntar PDF.
6. Guardar.

Resultat esperat:

- no cal proveidor;
- el projecte mostra la despesa;
- l'albara queda vinculat a `facturaCodi`;
- `albaransVinculats` conte el codi de l'albara.

### Prova 2b: factura creada des de `Despeses`

1. Obrir un projecte.
2. Anar a `Despeses`.
3. Localitzar una linia de recursos humans o logistica amb cost.
4. Clicar `Factura`.
5. Seleccionar `Factura de Compra` o `Factura simplificada`.
6. Completar numero/proveidor o emissor segons el tipus triat i adjuntar document.
7. Guardar.

Resultat esperat:

- l'aplicacio navega a `Factures Compra`;
- s'obre el selector de tipus documental;
- el projecte queda preseleccionat;
- el proveidor queda preseleccionat si la linia en tenia;
- el concepte i l'import base es carreguen des de la linia.
- si la linia tenia albara pendent, queda preseleccionat i en guardar la linia ja no mostra el boto `Factura`.
- els materials no mostren aquest boto.

### Prova 2c: albarans sense registre rapid

1. Obrir `Factures Compra`.
2. Canviar a la vista `Albarans de Compra`.
3. Revisar un albara en estat `Pendent factura`.

Resultat esperat:

- no apareix el boto `Registrar ticket`;
- l'albara continua podent-se vincular des del modal de factura/factura simplificada.

### Prova 3: factura simplificada amb projecte sense albara

1. Crear factura simplificada.
2. Informar `emissorNom`.
3. Seleccionar projecte.
4. No vincular albara.
5. Adjuntar PDF.
6. Guardar.

Resultat esperat:

- compta com cost real del projecte;
- no canvia cap albara;
- apareix a resultats.

### Prova 4: validacio de PDF obligatori

1. Crear factura simplificada sense document.
2. Intentar guardar.

Resultat esperat:

- el formulari bloqueja el guardat;
- el missatge indica que cal adjuntar el document.

### Prova 4b: pujada d'imatge

1. Crear factura simplificada.
2. Adjuntar un JPG o PNG.
3. Guardar.
4. Exportar documents.

Resultat esperat:

- la imatge es converteix internament a PDF;
- el document queda guardat com PDF;
- el PDF apareix al ZIP exportat.

### Prova 4c: IVA deduible

1. Crear factura simplificada.
2. Verificar que `IVA deduible` esta desmarcat.
3. Activar-lo manualment.
4. Guardar.

Resultat esperat:

- el valor queda guardat;
- la rendibilitat i fiscalitat tracten l'IVA com a deduible nomes si esta activat.

### Prova 4d: validacions especifiques

1. Crear factura simplificada sense emissor ni proveidor.
2. Intentar guardar.
3. Crear factura simplificada vinculada a projecte sense seleccionar projecte.
4. Intentar guardar.
5. Crear factura completa sense proveidor o sense numero.
6. Intentar guardar.

Resultat esperat:

- cada bloqueig mostra un missatge concret del camp que falta;
- no es guarda cap document incomplet;
- l'autosave continua silenciosament sense desar fins que la compra sigui valida.

### Prova 5: exportacio trimestral i anual

1. Crear factura simplificada amb data dins del trimestre.
2. Adjuntar PDF.
3. Exportar documents del trimestre.
4. Exportar documents de l'any.

Resultat esperat:

- el PDF apareix en tots dos ZIP;
- el nom inclou `FacturaSimplificada` i l'emissor;
- no hi ha errors quan no existeix `proveidor`.

### Prova 6: filtre per tipus documental

1. Crear o tenir documents de compra de tipus `Factura` i `Factura simplificada`.
2. Obrir `Factures Compra`.
3. Aplicar el filtre `Tots documents`, `Factura` i `Factura simpl.`.

Resultat esperat:

- cada filtre mostra nomes els documents corresponents;
- les despeses generals no apareixen quan es filtra per tipus documental de factura;
- `Tots documents` torna a mostrar totes les factures de compra.

## Proves tecniques recomanades

Executar:

```bash
npm run build
```

Revisar especialment:

- errors TypeScript per tipus documental;
- errors en `facturesExport.ts`;
- calculs que accedeixen a `factura.proveidor` sense fallback;
- pantalles que mostren nom de proveidor sense comprovar `emissorNom`.

Estat actual:

- `npm run build` passa correctament.
- Falta executar les proves manuals anteriors amb dades locals representatives.

# Fluxos d'usuari

## Flux A: factura de compra normal

Aquest flux queda igual que ara.

1. L'usuari obre `Factures Compra`.
2. Crea una nova compra.
3. Selecciona `Tipus document: Factura`.
4. Selecciona un proveidor existent.
5. Selecciona projecte o marca despesa general.
6. Vincula albarans pendents si correspon.
7. Adjunta el PDF de la factura.
8. Desa.

Resultat esperat:

- la factura queda registrada;
- els albarans vinculats passen a `factura-vinculada` o `pagat` segons pagaments;
- el projecte veu la despesa dins del seguiment de pagaments i costos.

## Flux B: factura simplificada des de Factures Compra

1. L'usuari obre `Factures Compra`.
2. Clica `Nova Factura / Despesa`.
3. Selecciona `Factura simplificada`.
4. Escriu `Emissor`, per exemple `Restaurant La Placa`, si no selecciona proveidor.
5. Selecciona projecte.
6. Revisa concepte i imports.
7. Adjunta el PDF o una imatge JPG/PNG, que es converteix internament a PDF.
8. Vincula un o mes albarans si el document justifica una despesa prevista del projecte.
9. Decideix si l'IVA es deduible. Per defecte no ho es.
10. Desa.

Resultat esperat:

- no cal crear proveidor formal;
- la factura simplificada queda imputada al projecte;
- el document queda guardat a `documentPDF`;
- entra a resultats i rendibilitat com una `FacturaCompra`.

## Flux C: factura de compra des de `Despeses` del projecte

Aquest es el flux rapid per registrar una factura normal o una factura simplificada a partir d'una despesa de recursos humans o logistica ja prevista al projecte. Els materials no tenen aquest acces rapid, perque sempre han d'entrar per factura normal des de `Factures Compra`.

1. L'usuari entra al projecte.
2. Obre la pestanya `Despeses`.
3. Localitza una linia de recursos humans o logistica.
4. Clica `Factura`.
5. El sistema navega a `Factures Compra` i mostra el selector:
   - `Factura de Compra`;
   - `Factura simplificada`.
6. Despres de triar el tipus, obre una compra amb:
   - projecte preseleccionat;
   - proveidor preseleccionat si la linia en tenia;
   - concepte carregat des de la linia;
   - import base carregat des del cost de la linia;
   - albara de la linia preseleccionat si existeix.
7. L'usuari revisa imports, escriu emissor si cal i adjunta document.
8. Desa.

Resultat esperat:

- la despesa queda conectada al projecte sense duplicar feina;
- no cal entrar per la vista d'albarans;
- l'usuari pot completar el document amb PDF/JPG/PNG i pagaments.
- si la linia ja te una factura o factura simplificada vinculada, el boto `Factura` queda ocult.

## Flux D: factura simplificada sense albara previ

1. L'usuari crea una factura simplificada des de `Factures Compra` o des de `Despeses`.
2. Selecciona projecte pero no vincula albara.
3. Desa el document amb PDF.

Resultat esperat:

- queda com despesa real del projecte;
- no modifica cap albara;
- apareix en resultats i en els costos vinculats a projecte;
- queda disponible a l'exportacio documental.

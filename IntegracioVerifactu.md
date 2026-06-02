# Integració Verifactu — Aurora ERP

> **Audiència:** Développador (Daniel). Cap d'aquest document és visible per a l'usuari final fins que s'activi el mòdul.  
> **Última revisió:** 2026-05-30  
> **Estat:** Fases 0–6 implementades. Hash SHA-256 conforme a l'Ordre HAC/1177/2024. QR AEAT al PDF. Certificat P12 amb node-forge: càrrega, verificació PIN, firma RSA-SHA256, gestió de sessió en memòria. XML SOAP generat. Enviament mTLS via IPC al main process d'Electron. Badge d'estat (acceptada/error/pendent) + botó Reintentar al header de la factura. Pendent: proves amb certificat real a entorn preproducció AEAT.

---

## Màquina d'estats i model d'emissió (refactor 2026-05-30)

La gestió d'estats s'ha reescrit per ser compatible amb la immutabilitat de Verifactu i funcionar **igual amb o sense el mòdul actiu**.

### Estats (s'ha eliminat `cancelled`)

```
borrador → enviada → (pagada-parcial) → pagada
                  └──→ vencuda ──┘
```

| Estat | Com s'hi arriba | Editable? |
|---|---|---|
| `borrador` | Estat inicial | ✅ Tot editable |
| `enviada` | **Manual**: en generar el PDF definitiu (botó "Emetre factura") | 🔒 Contingut bloquejat |
| `pagada-parcial` | **Automàtic**: en registrar un pagament parcial | 🔒 |
| `pagada` | **Automàtic**: en cobrar el total | 🔒 |
| `vencuda` | **Automàtic**: `dataVenciment < avui` i pendent > 0 | 🔒 |

### Principis

1. **No hi ha selector d'estat manual.** L'estat és un badge de només lectura. L'usuari no canvia l'estat directament — el sistema el determina (emissió manual + transicions automàtiques per pagaments/venciment via `determinarEstat()` i `calcularNouEstat()`).
2. **L'emissió es materialitza en generar el PDF definitiu** (Model B). Botó "Emetre factura" → modal d'avís → selecció d'idioma → genera PDF + `estat: 'enviada'` + `fechaExpedicion`. Amb Verifactu actiu, el `useEffect` de Fase 3 genera el hash automàticament en detectar `estat !== 'borrador'`.
3. **Immutabilitat del grup de configuració complet.** Quan `estat !== 'borrador'`, les 3 pestanyes (Dades + Tasques + Notes) queden en només lectura, amb indicador 🔒 a la pestanya. Implementat via prop `esBloquejat`/`esBloquejatContenido` que es fusiona amb `tePagaments` dins de cada tab.
4. **El modal d'avís d'emissió** té text diferent segons el mode:
   - **Sense Verifactu:** avisa que el contingut es bloquejarà i que cal una rectificativa per corregir.
   - **Amb Verifactu:** afegeix que el registre s'enviarà a l'AEAT i no es podrà desfer.
   - Sempre ofereix descarregar un PDF de borrador per revisar abans d'emetre.
5. **Eliminació** només permesa en `borrador` sense pagaments. Un cop emesa, es corregeix amb factura rectificativa.

### Fitxers de la refactorització

- `types/facturaVenta.ts` — `cancelled` eliminat de `EstatFacturaVenta` i `ESTAT_FACTURA_COLORS`
- `utils/facturaCalculations.ts` — `determinarEstat()` sense `cancelled`; borrador no es promociona automàticament
- `tabs/PagamentTab.tsx` — `calcularNouEstat()` sense `cancelled`
- `tabs/DadesTab.tsx` / `TasquesTab.tsx` / `NotesTab.tsx` — prop de bloqueig `esBloquejat`
- `FacturaVendaDetailView.tsx` — badge read-only, `handleClickEmetre`, `generarPDFDefinitiu`, `generarBorradorPDF(idioma)`, modal d'avís d'emissió, modal d'idioma amb mode borrador/definitiu, 🔒 a les pestanyes
- `FacturaVendaModal.tsx` — **eliminat** (codi mort, substituït per la vista de detall)

---

## Índex

1. [Contexte regulatori](#1-contexte-regulatori)
2. [Anàlisi del sistema de facturació actual](#2-anàlisi-del-sistema-de-facturació-actual)
3. [Bretxes respecte a Verifactu](#3-bretxes-respecte-a-verifactu)
4. [Arquitectura del mòdul](#4-arquitectura-del-mòdul)
5. [Fase 0 — Fonaments invisibles](#fase-0--fonaments-invisibles)
6. [Fase 1 — PDF borrador i millores de flux](#fase-1--pdf-borrador-i-millores-de-flux)
7. [Fase 2 — Immutabilitat i numeració segura](#fase-2--immutabilitat-i-numeració-segura)
8. [Fase 3 — Cadena de hashes SHA-256](#fase-3--cadena-de-hashes-sha-256)
9. [Fase 4 — QR AEAT al PDF definitiu](#fase-4--qr-aeat-al-pdf-definitiu)
10. [Fase 5 — Firma digital amb certificat](#fase-5--firma-digital-amb-certificat)
11. [Fase 6 — Enviament a AEAT](#fase-6--enviament-a-aeat)
12. [Activació del mòdul a producció](#12-activació-del-mòdul-a-producció)
13. [Registre del software a AEAT](#13-registre-del-software-a-aeat)
14. [Taula de decisions i riscos](#14-taula-de-decisions-i-riscos)

---

## 1. Contexte regulatori

**Verifactu** (Real Decreto 1007/2023, desenvolupat per Ordre HAC/1177/2024) obliga els sistemes informàtics de facturació a:

- Generar **registres de facturació** encadenats i immutables per cada factura emesa.
- Calcular una **empremta digital (hash SHA-256)** que encadena cada registre amb l'anterior.
- Incloure un **codi QR** en totes les factures que apunti al portal de verificació de l'AEAT.
- **Enviar els registres a l'AEAT** en temps real (mode *Verifactu*) o conservar-los per a auditoria (mode *No-Verifactu*).
- Prohibir **modificar o eliminar** factures ja emeses — només es permeten factures rectificatives.

**Calendari d'obligatorietat (a 2026-05-29):**

| Col·lectiu | Obligatorietat prevista |
|---|---|
| Grans empreses (IS, facturació > 6M€) | Ja obligatori (2025) |
| Pimes i autònoms en IRPF | Pendent de data definitiva (previsió 2026) |
| Resta de contribuents | Posterior |

> **Conclusió:** És el moment idoni per implementar-ho de forma progressiva, sense precipitació.

---

## 2. Anàlisi del sistema de facturació actual

### 2.1 Tipus i estructura (`src/types/facturaVenda.ts`)

```
FacturaVenta
  ├── codi: string              → "FAV-00235" (seq. incremental)
  ├── tipus: 'normal' | 'rectificativa'
  ├── facturaRectificada?       → codi de la factura original (si rectificativa)
  ├── motivoRectificativa?      → motiu text
  ├── estat: EstatFacturaVenta  → borrador | enviada | pagada-parcial | pagada | vencuda | cancelled
  ├── client                    → codi del client
  ├── projecte?                 → codi del projecte (opcional)
  ├── dataFactura: string       → "YYYY-MM-DD"
  ├── dataVenciment: string     → "YYYY-MM-DD" (defecte: +30 dies)
  ├── dataEnviada?              → timestamp ISO quan es marca 'enviada'
  ├── ivaPercent + irpfPercent
  ├── tasques: TascaVenda[]     → categories amb línies de detall
  ├── baseImposable, ivaImport, irpfImport, totalFactura  → calculats
  ├── pagaments: PagamentClient[]
  ├── totalPagat, pendentCobrar → calculats
  ├── observacions, plantillesText (ca/es/en)
  ├── acciones: AccioFactura[]  → historial d'accions
  └── documentPDF?              → PDF en base64 (es regenera sota demanda)
```

### 2.2 Flux de creació i guardament

```
Nova Factura (FacturaVendaModal)
  ↓
[Inicialització] codi = nextCode, estat = 'borrador', dataFactura = avui
  ↓
[Edició per tabs] DadesTab → TasquesTab → NotesTab → PagamentTab
  ↓
[Autocalcle continu] calcularImpostos() → base, IVA, IRPF, total
  ↓
[Autodeterminació d'estat] determinarEstat() → pagada / pagada-parcial / vencuda
  ↓
[Autogravat] useAutoSave (debounce 500ms) → onSave() → storage.setFacturesVenda()
  ↓
[Guardament manual] Botó Acceptar → saveNow() → onClose()
```

**Punt clau:** El guardament és **immediat i continu**. No hi ha diferència entre "esborrany" i "factura emesa" a nivell de dades — l'`estat` és un camp com qualsevol altre i es pot canviar lliurement.

### 2.3 Generació de PDF (`src/utils/generarFacturaVentaPDF.ts`)

El PDF es genera sota demanda i conté:
- Capçalera empresa + client
- Títol: `"Factura: FAV-00235"` + data
- Taula de tasques (categories + línies)
- Totals (base, IVA, IRPF, total)
- Peu: mètode de pagament, IBAN, observacions, notes de plantilla

**Format de sortida:** base64 `data:application/pdf;base64,...`

No hi ha cap distinció entre "PDF provisional" i "PDF definitiu". Un mateix codi genera el PDF sempre.

### 2.4 Rectificatives (`src/components/factures-venda/RectificativaModal.tsx`)

Quan l'usuari crea una nota de crèdit:
1. Es genera una nova factura amb `tipus: 'rectificativa'`
2. Tots els imports s'inverteixen (negatiu)
3. Es vincula via `facturaRectificada = original.codi`
4. L'estat és `'borrador'` — editable fins que s'enviï

L'estructura ja és compatible amb el concepte Verifactu de rectificativa (tipus R1-R5).

### 2.5 Configuració avançada (`src/components/common/SettingsModal.tsx`)

El modal de configuració té la secció **"Opcions avançades"** que conté:
- Exportar/importar còpia de seguretat
- Restaurar el programa

Aquí és on afegim el toggle de Verifactu.

---

## 3. Bretxes respecte a Verifactu

| Requisit Verifactu | Estat actual | Gravetat |
|---|---|---|
| Cadena de hashes SHA-256 per factura | ❌ No existeix | Alta |
| Empremta (huella) per registre | ❌ No existeix | Alta |
| QR AEAT al PDF | ❌ No existeix | Alta |
| Immutabilitat: no modificar/eliminar factures emeses | ❌ Es poden eliminar lliurement | Alta |
| Firma electrònica del registre | ❌ No existeix | Alta |
| Enviament a AEAT (API REST) | ❌ No existeix | Alta |
| Registre del software a AEAT | ❌ No registrat | Alta |
| `fechaExpedicion` amb hora i zona horària | ✅ Implementat (Fase 0 + fix) | — |
| `tipoFactura` (F1/F2/R1-R5) | ⚠️ Parcial (normal/rectificativa) | Mitjana |
| Serie + número separat del codi | ⚠️ Fusionat ("FAV-00235") | Baixa |
| PDF esborrany vs PDF definitiu | ❌ No hi ha distinció | Baixa (però UX important) |
| Gestió de certificat digital | ❌ No existeix | Alta (per fase 5) |
| Diferenciació mode Verifactu / No-Verifactu | ❌ No existeix | Mitjana |

---

## 4. Arquitectura del mòdul

### Principi fonamental

> **Tot el codi nou és inactiu fins que `settings.verifactu.enabled === true`.** El toggle viu a `SettingsModal → Opcions Avançades`. Mentre estigui desactivat, l'usuari no veu res diferent.

### Fitxers nous a crear

```
src/
├── types/
│   └── verifactu.ts                    → Interfaces del mòdul
├── utils/
│   ├── verifactuHash.ts                → Càlcul d'empremtes SHA-256
│   ├── verifactuXML.ts                 → Generació de l'XML per AEAT
│   ├── verifactuQR.ts                  → Generació del QR
│   └── verifactuAPI.ts                 → Enviament a AEAT (fase 6)
└── components/
    └── common/
        └── VerifactuStatus.tsx         → Badge d'estat (fase 3+)
```

### Fitxers existents a modificar

```
src/types/facturaVenda.ts               → Afegir camp verifactu? opcional
src/utils/storageManager.ts             → Afegir getVerifactuSettings / setVerifactuSettings
src/utils/generarFacturaVentaPDF.ts     → Afegir QR (fase 4) + capçalera "ESBORRANY" (fase 1)
src/components/common/SettingsModal.tsx → Afegir secció Verifactu a Opcions Avançades
src/components/factures-venda/FacturaVendaModal.tsx → Botó PDF borrador (fase 1), bloqueig (fase 2)
```

---

## Convencions crítiques per al codi Verifactu

> Llegeix aquest apartat abans d'escriure qualsevol codi de les fases 3-6.

### Camp `preu` vs `tarifa` a les tasques de factura

Les tasques de **FacturaVenda** usen `preu` (no `tarifa`). Això és per disseny:

- `TascaVenda` (Projectes, Pressupostos) → camp `tarifa: number`
- `TascaFacturaVenda` (FacturaVenda) → camp `preu: number`

La conversió passa en el moment d'afegir una tasca a una factura (`preu: tasca.tarifa`). Les dades persistides a `electron-store` sota la clau `facturesVenda` contenen `preu`.

**Impacte per a Verifactu (Fase 3, XML):**
```typescript
// ✅ Correcte — llegir des de FacturaVenda
const preuUnitari = tasca.preu;

// ❌ Incorrecte — tarifa és undefined en tasques de factura
const preuUnitari = tasca.tarifa;
```

### Estructura anidada de `tasques`

`FacturaVenta.tasques` és `CategoriaFacturaVenda[]`, no un array pla:

```typescript
factura.tasques.forEach(categoria => {
  categoria.tasques.forEach(tasca => {
    // tasca.preu, tasca.quantitat, tasca.descripcio, tasca.importe
  });
});
```

### `fechaExpedicion` vs `dataFactura`

| Camp | Format | Quan s'assigna |
|---|---|---|
| `dataFactura` | `"YYYY-MM-DD"` | En crear la factura (editable) |
| `fechaExpedicion` | ISO 8601 complet `"2025-06-01T10:30:00.000Z"` | Automàticament quan `estat → 'enviada'` |

Per al `FechaExpedicionFactura` del XML de Verifactu, usar `dataFactura` (és la data oficial). Per a `FechaHoraHuella`, usar `fechaExpedicion`.

---

## Fase 0 — Fonaments invisibles

> **Objectiu:** Preparar l'estructura de dades i el toggle sense cap canvi visible a l'usuari.  
> **Quan fer-ho:** Ara mateix.  
> **Impacte en UX:** Zero.

### 0.1 Crear `src/types/verifactu.ts`

```typescript
export interface VerifactuConfig {
  enabled: boolean;
  mode: 'verifactu' | 'no-verifactu';
  // mode 'verifactu'    → envia registres a AEAT en temps real
  // mode 'no-verifactu' → conserva registres localment per auditoria
  idSistema: string;         // Assignat per AEAT en registrar el software
  nomSoftware: string;       // "Aurora ERP"
  versioSoftware: string;    // "2.1.0"
  entornTest: boolean;       // true = preproducció AEAT, false = producció
}

export type TipusFacturaVerifactu = 'F1' | 'F2' | 'R1' | 'R2' | 'R3' | 'R4' | 'R5';
// F1 = Factura completa
// F2 = Factura simplificada (tiquet < 400€)
// R1 = Rectificativa per error fundado en dret i art. 80.1,2,6 LIVA
// R2 = Rectificativa art. 80.3 LIVA
// R3 = Rectificativa art. 80.4 LIVA
// R4 = Rectificativa resta de casos
// R5 = Rectificativa registres de facturació simplificada

export interface RegistreVerifactu {
  // Identificació
  numSerieFactura: string;      // "FAV-00235"
  fechaExpedicion: string;      // ISO 8601: "2025-06-01T10:30:00+02:00"
  tipoFactura: TipusFacturaVerifactu;

  // Empremta
  huella: string;               // SHA-256 hex del registre
  fechaHoraHuella: string;      // ISO 8601 del moment de càlcul
  huellaAnterior: string | null;// null per al primer registre de la cadena

  // Enviament AEAT
  enviada: boolean;
  fechaEnviament?: string;
  csvAeat?: string;             // Codi Segur de Verificació retornat per AEAT
  estatEnviament: 'pendent' | 'acceptada' | 'rebutjada' | 'error';
  errorDetall?: string;
}

// Mapa de tipoFactura segons la combinació tipus + motiu de rectificativa
export function mapTipusToVerifactu(
  tipus: 'normal' | 'rectificativa',
  motivo?: string
): TipusFacturaVerifactu {
  if (tipus === 'normal') return 'F1';
  // Per defecte R4 si no s'especifica motiu concret
  return 'R4';
}
```

### 0.2 Afegir camp `verifactu?` a `FacturaVenta`

**Fitxer:** `src/types/facturaVenda.ts`  
**Acció:** Afegir al final de la interfície `FacturaVenta`:

```typescript
// Afegir al final de FacturaVenta:
verifactu?: RegistreVerifactu; // undefined = mòdul desactivat o factura pre-Verifactu
```

No trenca cap dada existent — el camp és opcional.

### 0.3 Afegir `VerifactuConfig` al sistema de configuració

**Fitxer:** `src/utils/storageManager.ts`  
**Acció:** Afegir métodes:

```typescript
getVerifactuConfig(): VerifactuConfig {
  return this.get('verifactuConfig', {
    enabled: false,
    mode: 'no-verifactu',
    idSistema: '',
    nomSoftware: 'Aurora ERP',
    versioSoftware: '2.1.0',
    entornTest: true,
  });
}

setVerifactuConfig(config: VerifactuConfig): void {
  this.set('verifactuConfig', config);
}
```

### 0.4 Toggle a SettingsModal — Opcions Avançades

**Fitxer:** `src/components/common/SettingsModal.tsx`  
**Acció:** Dins la secció "Opcions avançades" (després de l'export/import de còpia de seguretat), afegir:

```tsx
{/* ── VERIFACTU (Opcions avançades, visible sota toggle de dev) ── */}
{/* Afegir NOMÉS si la variable d'entorn DEV_MODE és true o si s'ha desbloquejat */}
<div style={{
  marginTop: '1.5rem',
  padding: '1rem',
  background: 'var(--color-bg-tertiary)',
  borderRadius: '8px',
  border: '1px solid var(--color-border)',
}}>
  <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase',
    letterSpacing: '0.5px', color: 'var(--color-text-tertiary)', marginBottom: '0.75rem' }}>
    Facturació Electrònica (Verifactu)
  </div>
  <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
    <input
      type="checkbox"
      checked={verifactuConfig.enabled}
      onChange={e => setVerifactuConfig({ ...verifactuConfig, enabled: e.target.checked })}
    />
    <span style={{ fontSize: '0.9rem' }}>Activar mòdul Verifactu</span>
  </label>
  {verifactuConfig.enabled && (
    <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--color-warning-dark)',
      background: 'var(--color-warning-bg)', padding: '0.5rem', borderRadius: '6px' }}>
      ⚠️ Mode de desenvolupament — no connectat a AEAT
    </div>
  )}
</div>
```

**Estratègia de visibilitat:** Per evitar que l'usuari final vegi aquesta opció prematurament, afegir una condició `{process.env.NODE_ENV === 'development' || verifactuConfig.enabled}` — quan el mòdul ja estigui actiu, es veu sempre; durant el desenvolupament, només apareix en mode dev.

### Comprovació Fase 0

- [ ] `src/types/verifactu.ts` creat sense errors de compilació
- [ ] `npm run build` passa sense errors
- [ ] `FacturaVenta.verifactu` és undefined en totes les factures existents
- [ ] `storage.getVerifactuConfig().enabled` retorna `false`
- [ ] El toggle apareix en mode dev però no altera cap comportament

---

## Fase 1 — PDF borrador i millores de flux

> **Objectiu:** Permetre descarregar un PDF provisional ("borrador") abans de finalitzar la factura. Preparar la distinció entre factura provisional i definitiva.  
> **Quan fer-ho:** Abans que el mòdul sigui obligatori.  
> **Impacte en UX:** Nou botó "Descarregar borrador" al modal (visible sempre, independent de Verifactu).

### 1.1 Concepte: Borrador vs Definitiu

| | PDF Borrador | PDF Definitiu |
|---|---|---|
| **Quan** | Qualsevol moment, estat `borrador` | Quan s'envia la factura (estat `enviada`) |
| **Marca d'aigua** | "ESBORRANY" en diagonal, vermell translúcid | Sense marca |
| **QR AEAT** | No | Sí (fase 4, quan Verifactu actiu) |
| **Guardament** | No es guarda al registre | Es guarda en `documentPDF` |
| **Numeració** | Pot canviar | Fixa i immutable |

### 1.2 Afegir marca d'aigua "ESBORRANY" al PDF

**Fitxer:** `src/utils/generarFacturaVentaPDF.ts`  
**Acció:** Afegir paràmetre `esBorrador?: boolean` i, si és `true`, dibuixar el text:

```typescript
// Afegir com a últim pas de la generació del PDF, just abans del return:
if (esBorrador) {
  const { width, height } = doc.internal.pageSize;
  doc.saveGraphicsState();
  doc.setGState(new doc.GState({ opacity: 0.12 }));
  doc.setTextColor(220, 38, 38); // Vermell
  doc.setFontSize(80);
  doc.setFont('helvetica', 'bold');
  // Rotar 45 graus centrat a la pàgina
  doc.text('ESBORRANY', width / 2, height / 2, {
    align: 'center',
    angle: 45,
    baseline: 'middle',
  });
  doc.restoreGraphicsState();
  doc.setTextColor(0, 0, 0); // Restaurar
}
```

**Signatura nova de la funció:**

```typescript
export function generarFacturaVentaPDF(
  formData: FacturaVenta,
  clients: Client[],
  projectes: Projecte[],
  idioma: 'ca' | 'es' | 'en' = 'ca',
  esBorrador: boolean = false  // ← NOU PARÀMETRE
): string
```

### 1.3 Botó "Descarregar borrador" al modal

**Fitxer:** `src/components/factures-venda/FacturaVendaModal.tsx`  
**Secció:** Header del modal, al costat del botó de generar PDF existent.  
**Acció:** Afegir botó que crida `generarFacturaVentaPDF(..., true)` i fa download directe sense guardar:

```typescript
const handleDescarregarBorrador = () => {
  const pdfBase64 = generarFacturaVentaPDF(formData, clients, projectes, 'ca', true);
  // Convertir base64 a blob i descarregar
  const base64Data = pdfBase64.split(',')[1];
  const byteChars = atob(base64Data);
  const byteNums = Array.from(byteChars, c => c.charCodeAt(0));
  const blob = new Blob([new Uint8Array(byteNums)], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `borrador-${formData.codi}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
};
```

**Posició del botó:** Al header del modal, a l'esquerra del botó "Acceptar", amb estil secundari discret:

```tsx
<button
  type="button"
  onClick={handleDescarregarBorrador}
  className="btn-secondary"
  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
  title="Descarregar PDF provisional amb marca d'aigua"
>
  <FileDown size={16} />
  Borrador PDF
</button>
```

### 1.4 Afegir `fechaExpedicion` amb hora

**Fitxer:** `src/types/facturaVenda.ts`  
**Acció:** Afegir camp opcional:

```typescript
fechaExpedicion?: string; // ISO 8601 complet: "2025-06-01T10:30:00+02:00"
                          // Es genera automàticament quan estat → 'enviada'
```

**Fitxer:** Hook o lògica de preparació de factura (`useFacturaVenda` o similar)  
**Acció:** Quan `estat` passa a `'enviada'` per primera vegada, establir:

```typescript
if (nouEstat === 'enviada' && !formData.fechaExpedicion) {
  formData.fechaExpedicion = new Date().toISOString();
}
```

### Comprovació Fase 1

- [ ] Botó "Borrador PDF" apareix al modal en totes les factures
- [ ] El PDF descarregat té marca d'aigua diagonal "ESBORRANY"
- [ ] El PDF definitiu (generat normalment) NO té marca d'aigua
- [ ] La funció `generarFacturaVentaPDF` accepta `esBorrador` i funciona bé amb `false` per defecte
- [ ] `fechaExpedicion` s'assigna automàticament en canviar a 'enviada'
- [ ] `npm run build` passa sense errors

---

## Fase 2 — Immutabilitat i numeració segura

> **Objectiu:** Implementar les regles d'immutabilitat que exigeix Verifactu. Actiu NOMÉS si `verifactu.enabled`.  
> **Quan fer-ho:** En paral·lel amb Fase 1, però el bloqueig només s'activa amb el toggle.

### 2.1 Regles d'immutabilitat

Verifactu prohibeix:
- **Eliminar** una factura un cop emesa (`estat !== 'borrador'`)
- **Modificar** els camps econòmics d'una factura emesa (imports, dates, client)
- **Reutilitzar** un número de factura

L'única via de correcció és una **factura rectificativa**.

### 2.2 Bloqueig d'eliminació

**Fitxer:** `src/components/factures-venda/FacturesVendaSection.tsx`  
**Acció:** A la funció d'eliminar, afegir guarda:

```typescript
const handleDelete = (codi: string) => {
  const factura = factures.find(f => f.codi === codi);
  const verifactu = storage.getVerifactuConfig();

  if (verifactu.enabled && factura && factura.estat !== 'borrador') {
    alert('No es pot eliminar una factura emesa. Crea una factura rectificativa per corregir-la.');
    return;
  }
  // Lògica d'eliminació existent...
};
```

### 2.3 Bloqueig d'edició de camps crítics

**Fitxer:** `src/components/factures-venda/tabs/DadesTab.tsx`  
**Acció:** Quan `verifactu.enabled && formData.estat !== 'borrador'`, fer readonly els camps:
- `client`
- `dataFactura`
- `ivaPercent`
- `irpfPercent`

```typescript
const esBloquejatPerVerifactu = verifactuConfig.enabled && formData.estat !== 'borrador';

// A cada camp crític, afegir:
disabled={esBloquejat || esBloquejatPerVerifactu}
```

Mostrar un avís visual discret:
```tsx
{esBloquejatPerVerifactu && (
  <div style={{ fontSize: '0.78rem', color: 'var(--color-warning-dark)',
    background: 'var(--color-warning-bg)', padding: '0.4rem 0.75rem',
    borderRadius: '6px', marginBottom: '0.75rem' }}>
    🔒 Factura emesa — els camps econòmics no es poden modificar (Verifactu)
  </div>
)}
```

### 2.4 Sèrie i número de factura

El format actual `"FAV-00235"` conté implícitament:
- **Sèrie:** `"FAV"` — suficient per a Verifactu
- **Número:** `"00235"` — seqüencial

Verifactu necessita `IDFactura = { IDEmisorFactura, NumSerieFactura, FechaExpedicionFactura }`.  
El camp `codi` actual pot mapear directament com a `NumSerieFactura`.

**Acció (cap canvi de UI):** Al generar el registre Verifactu, usar:

```typescript
const registre = {
  IDEmisorFactura: parametres.dadesEmpresa.nif,
  NumSerieFactura: formData.codi,               // "FAV-00235"
  FechaExpedicionFactura: formData.dataFactura, // "2025-06-01"
};
```

### Comprovació Fase 2

- [ ] Amb `verifactu.enabled = false`: eliminació i edició funcionen exactament igual que ara
- [ ] Amb `verifactu.enabled = true`: no es pot eliminar una factura no-borrador
- [ ] Amb `verifactu.enabled = true`: els camps crítics de DadesTab queden bloquejats si `estat !== 'borrador'`
- [ ] L'avís de bloqueig apareix en la posició correcta
- [ ] Les rectificatives continuen funcionant normalment

---

## Fase 3 — Cadena de hashes SHA-256

> **Objectiu:** Implementar el mecanisme criptogràfic central de Verifactu.  
> **Quan fer-ho:** Abans que el mòdul sigui obligatori.  
> **Impacte en UX:** Zero (operació de backend).

### 3.1 Especificació de l'empremta

Verifactu defineix la cadena de text a hashejar com parells `camp=valor` separats per `&`, codificats en UTF-8 (Ordre HAC/1177/2024, Annex IV):

```
IDEmisorFactura=<NIF>&NumSerieFactura=<SERIE>&FechaExpedicionFactura=<DD-MM-YYYY>&TipoFactura=<TIPUS>&CuotaTotal=<IVA>&ImporteTotal=<TOTAL>&Huella=<hash_anterior_o_buit>&FechaHoraHusoGenRegistro=<ISO8601_timezone>
```

**Detalls de format:**

| Camp | Format | Exemple |
|---|---|---|
| `FechaExpedicionFactura` | `DD-MM-YYYY` | `01-06-2025` |
| `FechaHoraHusoGenRegistro` | ISO 8601 amb offset local | `2025-06-01T10:30:00+02:00` |
| `CuotaTotal` / `ImporteTotal` | 2 decimals, separador `.` | `21.00` |
| `Huella` (primer registre) | **cadena buida** | `Huella=` |
| `Huella` (registres posteriors) | hash SHA-256 anterior | `Huella=3C464DAF...` |

> **Important:** El primer registre de la cadena usa `Huella=` (valor buit), **no** `Huella=0`.  
> Fonts: [implementació Delphi de referència AEAT](https://github.com/seccion31/verifactu-delphi-demo/blob/main/utiles.pas) · [exemple complet seoxan.es](https://seoxan.es/articulo/huella-hash-verifactu-calculo-sha256)

**Exemple de cadena completa (primer registre):**
```
IDEmisorFactura=89890001K&NumSerieFactura=FAV-00001&FechaExpedicionFactura=01-06-2025&TipoFactura=F1&CuotaTotal=21.00&ImporteTotal=121.00&Huella=&FechaHoraHusoGenRegistro=2025-06-01T10:30:00+02:00
```

### 3.2 `src/utils/verifactuHash.ts` — implementació actual

> **Estat:** ✅ Implementat i correcte. El fitxer conté:
> - `formatDateAEAT()` — `YYYY-MM-DD` → `DD-MM-YYYY`
> - `nowISOWithTimezone()` — timestamp ISO 8601 amb offset local
> - `calcularHuellaVerifactu()` — càlcul SHA-256 amb format `camp=valor`
> - `getHuellaAnterior()` — cerca l'última huella de la cadena
> - `generarRegistreVerifactu()` — genera el `RegistreVerifactu` complet
> - `verificarCadena()` — valida integritat de la cadena (eina dev)

**Tipus relacionat:** `RegistreVerifactu` a `src/types/verifactu.ts`
- El camp de timestamp s'anomena `fechaHoraHusoGenRegistro` (nom oficial AEAT)

### 3.3 Integrar al flux de guardament

**Fitxer:** `src/components/factures-venda/FacturaVendaDetailView.tsx`  
**Estat:** ✅ Implementat via `useEffect` que detecta `estat !== 'borrador'` i `!formData.verifactu`.

```typescript
// Ja implementat a FacturaVendaDetailView.tsx:
useEffect(() => {
  if (!verifactuConfig.enabled || formData.estat === 'borrador' || formData.verifactu) return;
  const run = async () => {
    const todesFactures = storage.getFacturesVenda() as FacturaVenta[];
    const registre = await generarRegistreVerifactu(formData, nif, todesFactures);
    setFormData(prev => ({ ...prev, verifactu: registre }));
  };
  run().catch(console.error);
}, [formData.estat, formData.codi, verifactuConfig.enabled]);
```

### 3.4 Verificació de la cadena des de consola (dev)

```javascript
// A la consola del navegador (npm run dev actiu):
const { verificarCadena } = await import('/src/utils/verifactuHash.ts');
const factures = JSON.parse(localStorage.getItem('plateafacturesVenda') || '[]');
verificarCadena(factures).then(console.log);
// → { valid: true, errors: [] }
```

Per verificar manualment un hash concret: construeix la cadena i comprova-la a https://emn178.github.io/online-tools/sha256.html (UTF-8, output uppercase).

### Comprovació Fase 3

- [x] `crypto.subtle.digest` funciona en Electron i en navegador (mode dev)
- [x] Format `camp=valor&camp=valor` conforme a l'Ordre HAC/1177/2024
- [x] `FechaExpedicionFactura` en format `DD-MM-YYYY`
- [x] `FechaHoraHusoGenRegistro` en ISO 8601 amb offset de timezone local
- [x] Primer registre: `Huella=` (buit), no `Huella=0`
- [ ] Crear una factura i canviar a 'enviada' → `formData.verifactu.huella` s'omple
- [ ] Crear una segona factura → `huellaAnterior` de la 2a = `huella` de la 1a
- [ ] `verificarCadena()` retorna `{ valid: true, errors: [] }`

---

## Fase 4 — QR AEAT al PDF definitiu

> **Objectiu:** Incloure el codi QR obligatori al PDF de la factura definitiva. Al borrador, mostrar un placeholder QR idèntic en mida i posició.  
> **Estat:** ✅ Implementat.  
> **Impacte en UX:** QR al peu del PDF (visible per al client final). Borrador mostra placeholder amb vorera puntejada i nota explicativa.

### 4.1 Dependències instal·lades

```bash
npm install qrcode @types/qrcode
```

### 4.2 `src/utils/verifactuQR.ts` — implementació actual

Conté:
- `urlVerificacioAEAT()` — construeix la URL de verificació AEAT (paràmetre `fecha` en `DD-MM-YYYY`)
- `generarQRVerifactu()` — QR real per al PDF definitiu
- `generarQRPlaceholder()` — QR de mostra per al borrador (mateixa mida/aspecte, contingut simulat)

**Format URL de verificació:**
```
https://www2.agenciatributaria.gob.es/wlpl/TIKE-CALC/index.zul?nif=...&numserie=FAV-00001&fecha=01-06-2025&importe=121.00
```
(Entorn test: `prewww2.aeat.es`)

### 4.3 Integració al PDF (`generarFacturaVentaPDF.ts`)

**Signatura actual (async):**
```typescript
export const generarFacturaVentaPDF = async (
  formData: FacturaVenta,
  clients: Client[],
  projectes: any[],
  idioma: 'ca' | 'es' | 'en',
  esBorrador: boolean = false,
  verifactuConfig?: VerifactuConfig
): Promise<string>
```

**Comportament del bloc QR:**

| Condició | Resultat |
|---|---|
| `verifactuConfig.enabled = false` | Sense QR |
| `enabled = true`, `esBorrador = true` | QR placeholder + vorera puntejada + nota "(QR de mostra)" |
| `enabled = true`, `esBorrador = false` | QR real amb URL AEAT + text "Factura verificable" + Ref |

**Posicionament:** després de les notes, detecta si hi ha prou espai (≥27mm fins al peu); si no, afegeix una nova pàgina. QR: 22×22mm, a la columna esquerra.

### 4.4 Call sites actualitzats

**`FacturaVendaDetailView.tsx`:**
- `generarBorradorPDF` → `async`, `await generarFacturaVentaPDF(..., true, verifactuConfig)`
- `generarPDFDefinitiu` → `async`, `await generarFacturaVentaPDF(..., false, verifactuConfig)`

### Comprovació Fase 4

- [x] `generarFacturaVentaPDF` és async i accepta `verifactuConfig`
- [x] Borrador amb Verifactu actiu → QR placeholder + vorera puntejada + nota
- [x] Definitiu amb Verifactu actiu → QR real URL AEAT
- [x] Borrador i definitiu: QR en la mateixa posició i mida (22×22mm)
- [x] Sense Verifactu actiu → cap QR en cap dels dos
- [ ] El QR real es pot llegir amb el mòbil i apunta a l'URL correcta
- [ ] En entorn de test, l'URL apunta a `prewww2.aeat.es`

---

## Fase 5 — Firma digital amb certificat

> **Objectiu:** Gestionar el certificat digital de l'autònom i signar registres amb RSA-SHA256.  
> **Estat:** ✅ Implementat.  
> **Dependència:** `node-forge` + `@types/node-forge` (instal·lats).

### 5.1 Estratègia d'emmagatzematge del certificat

El format P12/PFX **ja inclou xifrat propi** protegit pel PIN. Per tant, el P12 es desa en base64 directament a l'electron-store/localStorage sense capa de xifrat addicional. Desxifrar-lo requereix el PIN, que **mai es desa**.

**Clau d'emmagatzematge:** `verifactuCertificatP12` (separada de `verifactuConfig`)  
**Flag a `VerifactuConfig`:** `teCertificat: boolean` → indica si hi ha un P12 desat.

**Sessió en memòria:** un cop l'usuari introdueix el PIN correcte, la clau privada es manté en memòria (`_cert` a `verifactuFirma.ts`) fins que l'app es tanca o es crida `oblidarCertificat()`. En reiniciar l'app cal tornar a introduir el PIN.

### 5.2 Fitxers implementats

**`src/utils/verifactuFirma.ts`** — API pública:
- `carregarCertificatP12(p12Base64, pin): InfoCertificat` — parseja P12 amb node-forge, desa clau privada+cert en memòria, retorna info del titular.
- `teCertificatEnMemoria(): boolean` — comprova si el cert ja és accessible.
- `oblidarCertificat(): void` — esborra la clau de memòria.
- `obtenirInfoCertificat(): InfoCertificat | null` — retorna subject/issuer/dates del cert en memòria.
- `signarDataSHA256(data): string` — signa una cadena amb RSA-SHA256, retorna Base64.

**`src/utils/storageManager.ts`** — nous mètodes:
- `getVerifactuCertificatP12() / setVerifactuCertificatP12() / deleteVerifactuCertificatP12()`

### 5.3 UI de gestió del certificat (`SettingsModal.tsx`)

Dins la secció Verifactu (visible quan `verifactuEnabled`), nova subsecció "Certificat Digital":
- Indicador d'estat: ✓ Certificat desat (amb subject si en memòria) / Cap certificat
- Botó "Carregar certificat (.p12 / .pfx)" → obre selector de fitxers
- Quan es selecciona un fitxer: camp PIN inline + botó "Verificar i desar"
  - Èxit → desa P12, actualitza `teCertificat: true`, mostra subject i data de caducitat
  - Error → mostra missatge (PIN incorrecte / fitxer no vàlid)
- Botó "Eliminar certificat" (visible si `teCertificat`)

### 5.4 Modal de PIN en emetre factura (`VerifactuPINModal.tsx`)

Es mostra automàticament quan:
- `verifactuConfig.enabled && verifactuConfig.teCertificat && !teCertificatEnMemoria()`

Flux:
1. Usuari clica "Emetre factura"
2. Sistema detecta que cal PIN → mostra `VerifactuPINModal`
3. Usuari introdueix PIN → `carregarCertificatP12()` → èxit
4. Modal tanca, es mostra el modal de confirmació d'emissió normal
5. En sessions posteriors (cert ja en memòria), el modal no apareix

### Comprovació Fase 5

- [x] `npm install node-forge @types/node-forge`
- [x] `VerifactuConfig.teCertificat` afegit al tipus i al default
- [x] `storageManager` amb mètodes per al P12
- [x] `verifactuFirma.ts` amb càrrega P12, firma SHA256 i gestió de memòria
- [x] UI de gestió de certificat a `SettingsModal` (upload + PIN + estat + eliminar)
- [x] `VerifactuPINModal.tsx` — modal de PIN en emetre factura
- [x] `FacturaVendaDetailView` integra el modal de PIN abans de l'emissió
- [ ] Provar amb un certificat P12 real (FNMT o test)
- [ ] Verificar que `signarDataSHA256` produeix una signatura RSA-SHA256 vàlida

---

## Fase 6 — Enviament a AEAT

> **Objectiu:** Enviar els registres de facturació a l'API de l'AEAT en temps real.  
> **Estat:** ✅ Implementat.  
> **Fitxers nous:** `src/utils/verifactuXML.ts`, `src/utils/verifactuAPI.ts`  
> **Fitxers modificats:** `electron/main.cjs`, `electron/preload.js`, `src/utils/verifactuFirma.ts`, `FacturaVendaDetailView.tsx`

### 6.1 Endpoints de l'AEAT

| Entorn | URL |
|---|---|
| Pre-producció | `https://prewww1.aeat.es/wlpl/TIKE-CONT/ws/SistemaFacturacion/VerifactuSistemaFacturacion` |
| Producció | `https://www1.aeat.es/wlpl/TIKE-CONT/ws/SistemaFacturacion/VerifactuSistemaFacturacion` |

**Protocol:** SOAP sobre HTTPS, autenticació amb certificat client.

### 6.2 Estructura del payload XML

```xml
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
  <soapenv:Header/>
  <soapenv:Body>
    <sum:SuministroLRFacturasEmitidas>
      <sum:Cabecera>
        <sum:ObligadoEmision>
          <sum:NIF>12345678Z</sum:NIF>
          <sum:NombreRazon>Aurora Producció SL</sum:NombreRazon>
        </sum:ObligadoEmision>
      </sum:Cabecera>
      <sum:RegistroFactura>
        <sum:IDFactura>
          <sum:IDEmisorFactura>12345678Z</sum:IDEmisorFactura>
          <sum:NumSerieFactura>FAV-00235</sum:NumSerieFactura>
          <sum:FechaExpedicionFactura>01-06-2025</sum:FechaExpedicionFactura>
        </sum:IDFactura>
        <!-- ... rest of fields ... -->
        <sum:Huella>A1B2C3...</sum:Huella>
        <sum:FechaHoraHuella>01-06-2025 10:30:00</sum:FechaHoraHuella>
      </sum:RegistroFactura>
    </sum:SuministroLRFacturasEmitidas>
  </soapenv:Body>
</soapenv:Envelope>
```

### 6.3 Crear `src/utils/verifactuAPI.ts`

```typescript
export async function enviarRegistreAEAT(
  registre: RegistreVerifactu,
  factura: FacturaVenta,
  parametres: Parametres,
  verifactuConfig: VerifactuConfig
): Promise<{ ok: boolean; csv?: string; error?: string }> {
  const xmlPayload = generarXMLVerifactu(registre, factura, parametres);
  const xmlFirmat = await signarRegistre(xmlPayload, /* certificat */, /* pin */);

  const endpoint = verifactuConfig.entornTest
    ? 'https://prewww1.aeat.es/wlpl/...'
    : 'https://www1.aeat.es/wlpl/...';

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'text/xml; charset=utf-8' },
      body: xmlFirmat,
    });

    const xmlResponse = await response.text();
    const csv = parseCSVFromResponse(xmlResponse);

    return { ok: response.ok, csv };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}
```

### 6.4 Flux d'enviament amb reintentos

```
Factura canvia a 'enviada'
  ↓
Generar registre Verifactu (hash)
  ↓
Signar (certificat)
  ↓
POST a AEAT
  ├── OK → desar CSV, marcar enviada=true, mostrar badge ✅
  └── ERROR → marcar estatEnviament='error', reintentar en background (max 3x)
              → avís subtil a l'usuari (no bloqueig de flux)
```

### Comprovació Fase 6

- [x] `verifactuXML.ts` generat correctament (SOAP envelope, namespace AEAT, IVA, Contraparte, Huella)
- [x] `verifactuFirma.ts` desa `p12Base64` + `pin` en memòria → `getCredencialsEnMemoria()`
- [x] `verifactuAPI.ts` — orquestrador: genera XML → obté credencials de memòria → crida IPC
- [x] `electron/main.cjs` — handler `verifactu-enviar`: HTTPS mTLS amb `pfx`+`passphrase` de Node.js, timeout 30 s, parsing CSV de la resposta SOAP
- [x] `electron/preload.js` — exposa `verifactuEnviar` al renderer
- [x] `FacturaVendaDetailView.tsx` — el `useEffect` de Fase 3 ara encadena l'enviament si `mode='verifactu'`
- [x] Badge d'estat (acceptada ✓ / error ⚠ / pendent ⏳ / hash-ok ☁) al header de la factura
- [x] Botó "Reintentar" visible quan `estatEnviament` és `error` o `rebutjada`
- [ ] Provar amb certificat P12 real (FNMT) contra l'entorn de preproducció AEAT
- [ ] Verificar CSV retornat per AEAT i contrast amb el portal de verificació
- [ ] Activar `verifactuConfig.entornTest = false` per a producció

---

## 12. Activació del mòdul a producció

Quan totes les fases estiguin implementades i l'obligatorietat sigui imminent:

### 12.1 Checklist d'activació

- [ ] Software registrat a AEAT (veure secció 13)
- [ ] Certificat digital de l'autònom carregat
- [ ] Totes les fases 0-6 provades en entorn de pre-producció AEAT
- [ ] Cadena de hashes íntegra per a les factures existents (veure nota)
- [ ] Backup de totes les dades realitzat
- [ ] `verifactuConfig.entornTest = false`

> **Nota sobre factures existents:** Verifactu no exigeix registrar factures anteriors a l'activació. La cadena comença des de la primera factura emesa amb el mòdul actiu. Les factures anteriors queden fora de la cadena.

### 12.2 Fer visible el toggle a l'usuari

Un cop tot estigui llest, eliminar la condició `process.env.NODE_ENV === 'development'` del toggle a SettingsModal, de manera que l'usuari final pugui activar el mòdul des de Configuració → Opcions Avançades.

---

## 13. Registre del software a AEAT

Abans de poder enviar a l'entorn de producció, l'aplicació ha d'estar registrada.

### Passos

1. Accedir al portal de la AEAT per a proveïdors de software de facturació.
2. Registrar "Aurora ERP" amb les dades:
   - Nom del software: `Aurora ERP`
   - Versió: `2.1.0` (actualitzar a cada versió major)
   - NIF del desenvolupador: el NIF d'en Daniel
   - Tipus: Software per a autònoms i pimes
3. AEAT assigna un `IDSistema` que s'ha d'incloure en cada registre Verifactu.
4. Desar l'`IDSistema` a `verifactuConfig.idSistema`.

> El registre és **per software, no per usuari**. Cada client (autònom) que activi Verifactu usarà el seu propi certificat però el mateix `IDSistema` d'Aurora ERP.

---

## 14. Taula de decisions i riscos

| Decisió | Opció triada | Raó |
|---|---|---|
| Visibilitat del toggle | Només en mode dev fins a la fase 6 | Evitar confusió a l'usuari |
| Ubicació del toggle | SettingsModal → Opcions Avançades | Consistent amb l'arquitectura actual |
| Generació de hash | Web Crypto API (async) | Nativa, sense dependències externes |
| Gestió de certificat P12 | node-forge (fase 5) | La Web Crypto API no suporta P12 nativament |
| PDF borrador | Marca d'aigua "ESBORRANY" | Clar i estàndard al sector |
| Immutabilitat | Bloqueig per `verifactu.enabled` | No afecta l'usuari fins a l'activació |
| Factures existents | Fora de la cadena | Verifactu no exigeix retroactivitat |
| Protocol AEAT | SOAP (el que exigeix l'AEAT) | No hi ha alternativa |

| Risc | Impacte | Mitigació |
|---|---|---|
| `generarFacturaVentaPDF` passa a async | Alt — molta refactorització | Fer-ho en una sola PR focalitzada |
| Certificat P12 en Electron | Alt — complexitat criptogràfica | node-forge provat a Electron |
| Cadena de hashes trencada per error | Alt — incompliment legal | Funció `verificarCadena()` en dev |
| Canvis a l'API de l'AEAT | Mitjà — regulació en evolució | Seguir el BOE i l'Ordre HAC/1177/2024 |
| Latència d'enviament a AEAT | Baix — no bloqueja el flux | Enviament en background amb reintentos |

---

*Document generat per Aurora ERP — ús intern del desenvolupador.*

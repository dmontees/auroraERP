import type { RegistreVerifactu } from '../types/verifactu';
import type { FacturaVenta } from '../types/facturaVenta';

const NS_SOAP = 'http://schemas.xmlsoap.org/soap/envelope/';
const NS_SUM = 'https://www2.agenciatributaria.gob.es/static_files/common/internet/dep/aplicaciones/es/aeat/tike/cont/ws/SuministroLR.xsd';

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// "YYYY-MM-DD" → "DD-MM-YYYY" (format AEAT)
function aeatDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}-${m}-${y}`;
}

// ISO 8601 → "DD-MM-YYYY HH:MM:SS" (format FechaHoraHuella a l'XML AEAT)
function aeatDateTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  );
}

export interface DadesXMLVerifactu {
  nif: string;           // NIF del emissor (empresa)
  nomEmpresa: string;    // Nom de l'empresa
  nifClient?: string;    // NIF del client (Contraparte)
  nomClient?: string;    // Nom del client
  // SistemaInformatico — identificació del software davant l'AEAT
  idSistema?: string;    // Assignat per AEAT en registrar el software
  versioSoftware?: string; // p.ex. "2.1.0"
}

/**
 * Genera el payload XML SOAP per enviar un registre de facturació a l'AEAT.
 * Especificació: Ordre HAC/1177/2024 + SistemaFacturacion WSDL.
 */
export function generarXMLVerifactu(
  registre: RegistreVerifactu,
  factura: FacturaVenta,
  dades: DadesXMLVerifactu
): string {
  const ivaPercent = factura.ivaPercent ?? 21;
  const baseImposable = factura.baseImposable.toFixed(2);
  const cuotaTotal = factura.ivaImport.toFixed(2);
  const importeTotal = factura.totalFactura.toFixed(2);
  const fechaExpedicion = aeatDate(factura.dataFactura);
  const fechaHoraHuella = aeatDateTime(registre.fechaHoraHusoGenRegistro);

  // Bloc SistemaInformatico — inclòs només si hi ha IDSistema registrat
  const sistemaInformatico = dades.idSistema
    ? `
        <sum:SistemaInformatico>
          <sum:NombreSistemaInformatico>Aurora ERP</sum:NombreSistemaInformatico>
          <sum:IdSistemaInformatico>${esc(dades.idSistema)}</sum:IdSistemaInformatico>
          <sum:NumeroInstalacion>1</sum:NumeroInstalacion>
          <sum:TipoUsoPosibleSoloVerifactu>S</sum:TipoUsoPosibleSoloVerifactu>
          <sum:TipoUsoPosibleMultiOT>N</sum:TipoUsoPosibleMultiOT>
          <sum:IndicadorMultiplesOT>N</sum:IndicadorMultiplesOT>
          <sum:Version>${esc(dades.versioSoftware ?? '2.1.0')}</sum:Version>
        </sum:SistemaInformatico>`
    : '';

  // Bloc Contraparte (client) — només si tenim NIF del client
  const contraParte = dades.nifClient
    ? `
        <sum:Contraparte>
          <sum:NombreRazon>${esc(dades.nomClient ?? '')}</sum:NombreRazon>
          <sum:NIF>${esc(dades.nifClient)}</sum:NIF>
        </sum:Contraparte>`
    : '';

  // Bloc de desglosament IVA
  const desglossamentIVA = `
        <sum:TipoDesglose>
          <sum:DesgloseFactura>
            <sum:Sujeta>
              <sum:NoExenta>
                <sum:TipoNoExenta>S1</sum:TipoNoExenta>
                <sum:DesgloseIVA>
                  <sum:DetalleIVA>
                    <sum:TipoImpositivo>${ivaPercent.toFixed(2)}</sum:TipoImpositivo>
                    <sum:BaseImponible>${baseImposable}</sum:BaseImponible>
                    <sum:CuotaImpuesto>${cuotaTotal}</sum:CuotaImpuesto>
                  </sum:DetalleIVA>
                </sum:DesgloseIVA>
              </sum:NoExenta>
            </sum:Sujeta>
          </sum:DesgloseFactura>
        </sum:TipoDesglose>`;

  // Per a factures rectificatives, afegir el bloc de rectificació
  const blocRectificativa = factura.tipus === 'rectificativa'
    ? `
        <sum:TipoRectificativa>I</sum:TipoRectificativa>${
          factura.facturaRectificada
            ? `
        <sum:FacturasRectificadas>
          <sum:IDFacturaRectificada>
            <sum:IDEmisorFactura>${esc(dades.nif)}</sum:IDEmisorFactura>
            <sum:NumSerieFactura>${esc(factura.facturaRectificada)}</sum:NumSerieFactura>
            <sum:FechaExpedicionFactura>${fechaExpedicion}</sum:FechaExpedicionFactura>
          </sum:IDFacturaRectificada>
        </sum:FacturasRectificadas>`
            : ''
        }`
    : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="${NS_SOAP}" xmlns:sum="${NS_SUM}">
  <soapenv:Header/>
  <soapenv:Body>
    <sum:SuministroLRFacturasEmitidas>
      <sum:Cabecera>
        <sum:ObligadoEmision>
          <sum:NIF>${esc(dades.nif)}</sum:NIF>
          <sum:NombreRazon>${esc(dades.nomEmpresa)}</sum:NombreRazon>
        </sum:ObligadoEmision>${sistemaInformatico}
      </sum:Cabecera>
      <sum:RegistroFactura>
        <sum:IDFactura>
          <sum:IDEmisorFactura>${esc(dades.nif)}</sum:IDEmisorFactura>
          <sum:NumSerieFactura>${esc(registre.numSerieFactura)}</sum:NumSerieFactura>
          <sum:FechaExpedicionFactura>${fechaExpedicion}</sum:FechaExpedicionFactura>
        </sum:IDFactura>
        <sum:TipoFactura>${registre.tipoFactura}</sum:TipoFactura>
        <sum:ClaveRegimenEspecialOTrascendencia>01</sum:ClaveRegimenEspecialOTrascendencia>
        <sum:DescripcionOperacion>${esc(factura.observacions || 'Prestació de serveis')}</sum:DescripcionOperacion>${contraParte}${blocRectificativa}${desglossamentIVA}
        <sum:CuotaTotal>${cuotaTotal}</sum:CuotaTotal>
        <sum:ImporteTotal>${importeTotal}</sum:ImporteTotal>
        <sum:Huella>${registre.huella}</sum:Huella>
        <sum:FechaHoraHuella>${fechaHoraHuella}</sum:FechaHoraHuella>
      </sum:RegistroFactura>
    </sum:SuministroLRFacturasEmitidas>
  </soapenv:Body>
</soapenv:Envelope>`;
}

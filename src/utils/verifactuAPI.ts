import type { RegistreVerifactu, VerifactuConfig } from '../types/verifactu';
import type { FacturaVenta } from '../types/facturaVenta';
import { generarXMLVerifactu } from './verifactuXML';
import { getCredencialsEnMemoria } from './verifactuFirma';
import { storage } from './storageManager';

/**
 * Envia un registre de facturació a l'AEAT via SOAP/HTTPS amb certificat client (mTLS).
 * En mode web (sense Electron), retorna estatEnviament='pendent' amb nota explicativa.
 *
 * @returns Còpia actualitzada del RegistreVerifactu amb l'estat de l'enviament.
 */
export async function enviarRegistreAEAT(
  registre: RegistreVerifactu,
  factura: FacturaVenta,
  verifactuConfig: VerifactuConfig
): Promise<RegistreVerifactu> {
  const parametres = storage.getParametres();
  const nif = parametres?.dadesEmpresa?.nif ?? '';
  const nomEmpresa = parametres?.dadesEmpresa?.nom ?? '';

  if (!nif) {
    return {
      ...registre,
      estatEnviament: 'error',
      errorDetall: "NIF de l'empresa no configurat a Paràmetres → Empresa.",
    };
  }

  // Obtenir NIF del client per al bloc Contraparte
  const clients = storage.getClients() as any[];
  const client = clients.find((c: any) => c.codi === factura.client);
  const nifClient = client?.nif ?? client?.cif ?? undefined;
  const nomClient = client?.nom ?? client?.name ?? undefined;

  const xmlPayload = generarXMLVerifactu(registre, factura, {
    nif,
    nomEmpresa,
    nifClient,
    nomClient,
    idSistema: verifactuConfig.idSistema || undefined,
    versioSoftware: __APP_VERSION__,
  });

  // En mode web (sense Electron IPC) no enviem — mode no-verifactu o dev
  const electronAPI = (window as any).electron;
  if (!electronAPI?.verifactuEnviar) {
    return {
      ...registre,
      estatEnviament: 'pendent',
      errorDetall: 'Mode web: enviament a AEAT requereix Electron.',
    };
  }

  // Obtenir credencials P12 + PIN de la memòria de sessió
  const credencials = getCredencialsEnMemoria();
  if (!credencials) {
    const p12Emmagatzemat = storage.getVerifactuCertificatP12();
    return {
      ...registre,
      estatEnviament: 'error',
      errorDetall: p12Emmagatzemat
        ? 'PIN del certificat no disponible en memòria. Reobre la factura per introduir el PIN.'
        : 'No hi ha cap certificat P12 desat. Configura el certificat a Paràmetres → Verifactu.',
    };
  }

  try {
    const result: { ok: boolean; csv?: string; error?: string } =
      await electronAPI.verifactuEnviar({
        xmlPayload,
        p12Base64: credencials.p12Base64,
        pin: credencials.pin,
        entornTest: verifactuConfig.entornTest,
      });

    if (result.ok) {
      return {
        ...registre,
        enviada: true,
        fechaEnviament: new Date().toISOString(),
        csvAeat: result.csv,
        estatEnviament: 'acceptada',
        errorDetall: undefined,
      };
    } else {
      return {
        ...registre,
        estatEnviament: verifactuConfig.entornTest ? 'error' : 'rebutjada',
        errorDetall: result.error ?? 'Error desconegut en l\'enviament a l\'AEAT.',
      };
    }
  } catch (e) {
    return {
      ...registre,
      estatEnviament: 'error',
      errorDetall: String(e),
    };
  }
}

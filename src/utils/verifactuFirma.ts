import forge from 'node-forge';

export interface InfoCertificat {
  subject: string;
  issuer: string;
  validFrom: string;
  validTo: string;
}

interface CertificatEnMemoria {
  privateKey: forge.pki.rsa.PrivateKey;
  cert: forge.pki.Certificate;
  info: InfoCertificat;
  p12Base64: string; // necessari per a la petició mTLS via IPC
  pin: string;       // necessari per desxifrar el P12 a Node.js
}

// Certificat desxifrat mantingut en memòria durant la sessió (s'esborra en reiniciar l'app)
let _cert: CertificatEnMemoria | null = null;

export function teCertificatEnMemoria(): boolean {
  return _cert !== null;
}

export function oblidarCertificat(): void {
  _cert = null;
}

export function obtenirInfoCertificat(): InfoCertificat | null {
  return _cert?.info ?? null;
}

/**
 * Carrega i valida un certificat P12/PFX amb el PIN proporcionat.
 * Si és correcte, el desa en memòria per a la sessió.
 * Llança un Error amb missatge llegible si el PIN és incorrecte o el fitxer no és vàlid.
 */
export function carregarCertificatP12(p12Base64: string, pin: string): InfoCertificat {
  let p12: forge.pkcs12.Pkcs12Pfx;
  try {
    const p12Der = forge.util.decode64(p12Base64);
    const p12Asn1 = forge.asn1.fromDer(p12Der);
    p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, pin);
  } catch (e) {
    const msg = String(e).toLowerCase();
    if (msg.includes('mac') || msg.includes('password') || msg.includes('invalid')) {
      throw new Error('PIN incorrecte. Comprova el PIN del certificat i torna-ho a intentar.');
    }
    throw new Error('El fitxer no és un certificat P12/PFX vàlid o està malmès.');
  }

  const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
  const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });

  const privateKey = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0]?.key as forge.pki.rsa.PrivateKey | undefined;
  const cert = certBags[forge.pki.oids.certBag]?.[0]?.cert;

  if (!privateKey || !cert) {
    throw new Error("No s'ha pogut extreure la clau privada o el certificat del fitxer P12.");
  }

  const formatDate = (d: Date) =>
    `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;

  const info: InfoCertificat = {
    subject: cert.subject.getField('CN')?.value ?? cert.subject.getField('O')?.value ?? 'Desconegut',
    issuer:  cert.issuer.getField('CN')?.value  ?? cert.issuer.getField('O')?.value  ?? 'Desconegut',
    validFrom: formatDate(cert.validity.notBefore),
    validTo:   formatDate(cert.validity.notAfter),
  };

  _cert = { privateKey, cert, info, p12Base64, pin };
  return info;
}

/**
 * Retorna el P12 en base64 i el PIN del certificat en memòria.
 * Necessari per fer la petició HTTPS mTLS al main process d'Electron.
 * Retorna null si no hi ha cap certificat carregat.
 */
export function getCredencialsEnMemoria(): { p12Base64: string; pin: string } | null {
  if (!_cert) return null;
  return { p12Base64: _cert.p12Base64, pin: _cert.pin };
}

/**
 * Signa una cadena de text amb RSA-SHA256 usant el certificat en memòria.
 * Retorna la signatura en Base64.
 * Llança un error si no hi ha cap certificat carregat.
 */
export function signarDataSHA256(data: string): string {
  if (!_cert) throw new Error('Certificat no carregat. Introdueix el PIN primer.');

  const md = forge.md.sha256.create();
  md.update(data, 'utf8');

  const signature = _cert.privateKey.sign(md);
  return forge.util.encode64(signature);
}

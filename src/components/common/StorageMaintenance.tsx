import { useState } from 'react';
import type { StorageDiagnostic, StorageCompactionResult } from '../../types/documental';
import { storage } from '../../utils/storageManager';

const formatBytes = (bytes: number) => bytes >= 1_000_000
  ? `${(bytes / 1_000_000).toLocaleString('ca-ES', { maximumFractionDigits: 2 })} MB`
  : `${(bytes / 1_000).toLocaleString('ca-ES', { maximumFractionDigits: 1 })} kB`;
const labels: Record<string, string> = {
  projectes: 'Projectes', proveidors: 'Proveïdors', clients: 'Clients', facturesVenda: 'Factures de venda',
  facturesCompra: 'Compres i despeses', obligacionsFiscals: 'Obligacions fiscals', pressupostos: 'Pressupostos',
  parametres: 'Paràmetres', partsTreball: 'Parts de treball', settings: 'Configuració',
};

export default function StorageMaintenance() {
  const [diagnostic, setDiagnostic] = useState<StorageDiagnostic | null>(null);
  const [result, setResult] = useState<StorageCompactionResult | null>(null);
  const [busy, setBusy] = useState<'scan' | 'compact' | null>(null);
  const [error, setError] = useState('');
  const [rootPath] = useState(() => storage.getParametres().gestorDocumental?.rootPath);
  const api = window.electron;
  if (!api?.diagnoseStorage) return null;

  const flushForms = async () => {
    if (!window.dispatchEvent(new Event('aurora-flush-forms', { cancelable: true }))) {
      throw new Error('Revisa els canvis pendents dels formularis abans de continuar.');
    }
    const saved = await api.flushStore();
    if (!saved.success) throw new Error(saved.error);
  };
  const scan = async () => {
    setBusy('scan'); setError('');
    try { await flushForms(); setDiagnostic(await api.diagnoseStorage()); }
    catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { setBusy(null); }
  };
  const compact = async () => {
    if (!diagnostic || !rootPath) return;
    if (!window.confirm(`Es traslladaran fins a ${diagnostic.transferableCount} adjunts a la carpeta documental. Es crearà una còpia completa del JSON original i es verificarà cada fitxer abans de retirar el contingut incrustat. En acabar caldrà recarregar Aurora. Vols continuar?`)) return;
    setBusy('compact'); setError('');
    try { await flushForms(); setResult(await api.compactStorage()); }
    catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { setBusy(null); }
  };

  return (
    <div style={{ marginTop: '1rem', display: 'grid', gap: '0.75rem' }}>
      <strong>Mida del fitxer i adjunts incrustats</strong>
      <button type="button" className="btn-secondary" onClick={scan} disabled={!!busy}>
        {busy === 'scan' ? 'Analitzant…' : 'Analitzar l’espai ocupat'}
      </button>
      {error && <div role="alert" style={{ color: 'var(--color-error)' }}>{error}</div>}
      {diagnostic && <>
        <div>Mida real del JSON: <strong>{formatBytes(diagnostic.fileBytes)}</strong></div>
        <div>{diagnostic.embeddedCount} adjunts i imatges incrustats: {formatBytes(diagnostic.embeddedBytes)}.</div>
        <div>Adjunts que es poden revisar per traslladar: <strong>{diagnostic.transferableCount}</strong> ({formatBytes(diagnostic.transferableBytes)} incrustats). La reducció final dependrà dels fitxers verificats i les referències afegides.</div>
        <table style={{ width: '100%', textAlign: 'left' }}>
          <caption style={{ textAlign: 'left' }}>Volum aproximat per categoria</caption>
          <thead><tr><th>Categoria</th><th>Espai</th></tr></thead>
          <tbody>{diagnostic.rows.filter(row => row.bytes >= 1000).map(row => <tr key={row.key}>
            <td>{labels[row.key] || row.key}</td><td>{formatBytes(row.bytes)}</td>
          </tr>)}</tbody>
        </table>
        <p style={{ margin: 0 }}>Els documents externs no ocupen espai dins del JSON. Les imatges de perfil, logotips, historials i dades comptables es conservaran.</p>
        {!rootPath && <div>Configura primer la carpeta a Paràmetres → Gestor documental.</div>}
        <button type="button" className="btn-primary" onClick={compact} disabled={!!busy || !rootPath || !diagnostic.transferableCount}>
          Traslladar adjunts i reduir el JSON
        </button>
      </>}
      {(busy === 'compact' || result) && <div role="dialog" aria-modal="true" aria-label="Optimització de dades" style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'var(--color-bg-primary)', padding: '2rem', overflow: 'auto', display: 'grid', alignContent: 'center', gap: '1rem' }}>
        {result ? <>
          <strong>{result.migrated} adjunts verificats i traslladats</strong>
          <div>JSON: {formatBytes(result.beforeBytes)} → {formatBytes(result.afterBytes)}.</div>
          {result.backupFile && <div>Còpia del JSON original: <code style={{ overflowWrap: 'anywhere' }}>{result.backupFile}</code></div>}
          {result.errors.length > 0 && <details><summary>{result.errors.length} adjunts conservats perquè no s’han pogut verificar</summary>
            <ul>{result.errors.map((message, index) => <li key={index}>{message}</li>)}</ul>
          </details>}
          <div>Es conservaran tots els documents. Recarrega Aurora per continuar amb les referències actualitzades. La carpeta documental i el JSON s’han d’incloure en les còpies de seguretat.</div>
          <button type="button" className="btn-primary" onClick={() => window.location.reload()}>Recarregar Aurora i continuar</button>
        </> : <div role="status">Creant la còpia de seguretat i verificant els adjunts… Mantén Aurora obert.</div>}
      </div>}
    </div>
  );
}

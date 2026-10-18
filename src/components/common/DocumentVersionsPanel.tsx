import { ExternalLink, FolderOpen } from 'lucide-react';
import type { DocumentFileRef } from '../../types/documental';
import { storage } from '../../utils/storageManager';

interface DocumentVersionsPanelProps {
  title: string;
  documents?: DocumentFileRef[];
  compact?: boolean;
}

export default function DocumentVersionsPanel({ title, documents = [], compact = false }: DocumentVersionsPanelProps) {
  const rootPath = storage.getParametres().gestorDocumental?.rootPath;
  const electronDocuments = typeof window !== 'undefined' ? window.electronDocuments : undefined;
  const ordered = [...documents].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

  const openFile = async (ref: DocumentFileRef) => {
    if (!rootPath || !electronDocuments) return;
    const result = await electronDocuments.openFile({ rootPath, relativePath: ref.relativePath });
    if (!result.success) alert(result.error || 'No sha pogut obrir el document.');
  };

  const revealFile = async (ref: DocumentFileRef) => {
    if (!rootPath || !electronDocuments) return;
    const result = await electronDocuments.revealFile({ rootPath, relativePath: ref.relativePath });
    if (!result.success) alert(result.error || 'No s’ha pogut obrir la carpeta del document.');
  };

  if (compact) {
    const latest = ordered.find(ref => ref.current) || ordered[0];
    const tooltip = !electronDocuments
      ? 'Obrir carpeta — disponible a Aurora Desktop'
      : !rootPath
        ? 'Configura la carpeta a Paràmetres → Gestor documental'
        : !latest
          ? 'Genera primer un PDF al gestor documental'
          : 'Obrir la carpeta del PDF';
    const disabled = !latest || !rootPath || !electronDocuments;
    return (
      <span title={tooltip} style={{ display: 'inline-flex' }}>
        <button type="button" onClick={() => latest && revealFile(latest)} disabled={disabled}
          aria-label={`Obrir carpeta: ${title}`} title={tooltip}
          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 30, height: 30, padding: 0, background: 'transparent', border: 'none', borderRadius: 6,
            color: 'var(--color-text-secondary)', cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.4 : 1 }}>
          <FolderOpen size={17} />
        </button>
      </span>
    );
  }

  return (
    <div style={{
      margin: '0 1.5rem 1rem',
      padding: '0.75rem',
      border: '1px solid var(--color-border)',
      borderRadius: 8,
      background: 'var(--color-surface)',
      flexShrink: 0
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center', marginBottom: '0.5rem' }}>
        <strong>{title}</strong>
        <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>{ordered.length} versions</span>
      </div>
      {ordered.length === 0 && (
        <div>
          <p style={{ margin: '0 0 0.5rem', color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>
            Encara no hi ha PDFs al gestor documental. Genera un PDF per activar aquests accessos.
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-secondary" disabled title="Genera primer un PDF al gestor documental">
              <ExternalLink size={15} /> Obrir PDF
            </button>
            <button type="button" className="btn btn-secondary" disabled title="Genera primer un PDF al gestor documental">
              <FolderOpen size={15} /> Obrir carpeta
            </button>
          </div>
        </div>
      )}
      {!electronDocuments && (
        <p style={{ margin: '0.5rem 0 0', color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>
          Per obrir els fitxers i les carpetes locals, utilitza Aurora Desktop.
        </p>
      )}
      {electronDocuments && !rootPath && (
        <p style={{ margin: '0.5rem 0 0', color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>
          Configura la carpeta a Paràmetres → Gestor documental per guardar i obrir els PDFs.
        </p>
      )}
      <div style={{ display: 'grid', gap: '0.35rem' }}>
        {ordered.slice(0, 8).map(ref => (
          <div key={ref.id} style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.5rem',
            alignItems: 'center',
            padding: '0.45rem 0',
            borderTop: '1px solid var(--color-border)'
          }}>
            <div style={{ minWidth: 0, flex: '1 1 240px' }}>
              <div style={{ fontWeight: ref.current ? 700 : 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {ref.displayName} · v{String(ref.version).padStart(3, '0')}{ref.current ? ' · Actual' : ''}
              </div>
              <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {new Date(ref.createdAt).toLocaleString('ca-ES')} · {ref.relativePath}
              </div>
            </div>
            <button type="button" className="btn btn-secondary" onClick={() => openFile(ref)} disabled={!rootPath || !electronDocuments} title="Obrir PDF">
              <ExternalLink size={15} /> Obrir PDF
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => revealFile(ref)} disabled={!rootPath || !electronDocuments} title="Obrir la carpeta i seleccionar el document">
              <FolderOpen size={15} /> Obrir carpeta
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

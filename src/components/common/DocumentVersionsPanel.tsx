import { ExternalLink, FolderOpen } from 'lucide-react';
import type { DocumentFileRef } from '../../types/documental';
import { storage } from '../../utils/storageManager';

interface DocumentVersionsPanelProps {
  title: string;
  documents?: DocumentFileRef[];
}

export default function DocumentVersionsPanel({ title, documents = [] }: DocumentVersionsPanelProps) {
  const rootPath = storage.getParametres().gestorDocumental?.rootPath;
  const electronDocuments = typeof window !== 'undefined' ? window.electronDocuments : undefined;
  const ordered = [...documents].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

  if (ordered.length === 0) return null;

  const openFile = async (ref: DocumentFileRef) => {
    if (!rootPath || !electronDocuments) return;
    const result = await electronDocuments.openFile({ rootPath, relativePath: ref.relativePath });
    if (!result.success) alert(result.error || 'No sha pogut obrir el document.');
  };

  const revealFile = async (ref: DocumentFileRef) => {
    if (!rootPath || !electronDocuments) return;
    const result = await electronDocuments.revealFile({ rootPath, relativePath: ref.relativePath });
    if (!result.success) alert(result.error || 'No sha pogut mostrar el document al Finder.');
  };

  return (
    <div style={{
      margin: '0 1.5rem 1rem',
      padding: '0.75rem',
      border: '1px solid var(--color-border)',
      borderRadius: 8,
      background: 'var(--color-surface)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center', marginBottom: '0.5rem' }}>
        <strong>{title}</strong>
        <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>{ordered.length} versions</span>
      </div>
      <div style={{ display: 'grid', gap: '0.35rem' }}>
        {ordered.slice(0, 8).map(ref => (
          <div key={ref.id} style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto auto',
            gap: '0.5rem',
            alignItems: 'center',
            padding: '0.45rem 0',
            borderTop: '1px solid var(--color-border)'
          }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: ref.current ? 700 : 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {ref.displayName} · v{String(ref.version).padStart(3, '0')}{ref.current ? ' · Actual' : ''}
              </div>
              <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {new Date(ref.createdAt).toLocaleString('ca-ES')} · {ref.relativePath}
              </div>
            </div>
            <button type="button" className="btn btn-secondary" onClick={() => openFile(ref)} disabled={!rootPath || !electronDocuments} title="Obrir PDF">
              <ExternalLink size={15} />
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => revealFile(ref)} disabled={!rootPath || !electronDocuments} title="Mostrar al Finder">
              <FolderOpen size={15} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

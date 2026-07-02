import React, { useRef } from 'react';
import { Upload, FileText, Trash2, Download, FolderOpen } from 'lucide-react';
import type { DocumentProveidor } from '../../../types/proveidor';
import {
  buildProviderDocumentPath,
  createDocumentRef,
  safeFileName,
  type ProviderDocumentFolder
} from '../../../utils/documentManager';
import { storage } from '../../../utils/storageManager';

interface DocumentsTabProps {
  hook: {
    formData: any;
    afegirDocument: (document: Omit<DocumentProveidor, 'id'>) => void;
    eliminarDocument: (id: string) => void;
  };
}

const TIPUS_DOCUMENTS: Array<{ value: DocumentProveidor['tipus']; label: string; folder: ProviderDocumentFolder }> = [
  { value: 'contracte', label: 'Contracte', folder: 'contracte' },
  { value: 'assegurança', label: 'Assegurança', folder: 'asseguranca' },
  { value: 'certificat', label: 'Certificat', folder: 'certificat' },
  { value: 'altres', label: 'Altres', folder: 'altres' },
];

export default function DocumentsTab({ hook }: DocumentsTabProps) {
  const { formData, afegirDocument, eliminarDocument } = hook;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const rootPath = storage.getParametres().gestorDocumental?.rootPath;
  const electronDocuments = typeof window !== 'undefined' ? window.electronDocuments : undefined;
  const proveidorName = formData.nomComercial || formData.nomFiscal || 'Proveidor';

  const fileToDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = event => resolve(event.target?.result as string);
    reader.onerror = () => reject(reader.error || new Error('No sha pogut llegir el fitxer.'));
    reader.readAsDataURL(file);
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, tipus: DocumentProveidor['tipus'], folder: ProviderDocumentFolder) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!rootPath || !electronDocuments) {
      alert('Configura primer la carpeta documental a Parametres > Gestor documental.');
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      alert('El fitxer es massa gran. Maxim 25MB.');
      return;
    }

    try {
      const existingVersions = (formData.documents || [])
        .filter((doc: DocumentProveidor) => doc.nom === file.name && doc.tipus === tipus)
        .map((doc: DocumentProveidor) => doc.fileRef?.version || 0);
      const version = Math.max(0, ...existingVersions) + 1;
      const extension = file.name.includes('.') ? file.name.split('.').pop() || 'dat' : 'dat';
      const baseName = file.name.replace(/\.[^.]+$/, '');
      const filename = `${safeFileName(baseName)}_v${String(version).padStart(3, '0')}.${safeFileName(extension)}`;
      const relativePath = buildProviderDocumentPath(formData.codi, proveidorName, folder, filename);
      const dataBase64 = await fileToDataUrl(file);
      const result = await electronDocuments.writeFile({ rootPath, relativePath, dataBase64 });

      if (!result.success || !result.data) {
        alert(result.error || 'No sha pogut guardar el document.');
        return;
      }

      const fileRef = createDocumentRef({
        kind: 'proveidor',
        ownerType: 'proveidor',
        ownerCodi: formData.codi,
        displayName: file.name,
        originalName: file.name,
        relativePath,
        mimeType: file.type || undefined,
        size: result.data.size,
        sha256: result.data.sha256,
        version,
        generated: false,
      });

      afegirDocument({
        nom: file.name,
        tipus,
        dataCarrega: new Date().toISOString(),
        urlFitxer: relativePath,
        fileRef,
        mida: result.data.size || file.size,
      });
    } catch (error) {
      alert(error instanceof Error ? error.message : 'No sha pogut guardar el document.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDownload = async (doc: DocumentProveidor) => {
    if (doc.fileRef) {
      if (!rootPath || !electronDocuments) {
        alert('No sha trobat la configuracio del gestor documental.');
        return;
      }
      const result = await electronDocuments.openFile({ rootPath, relativePath: doc.fileRef.relativePath });
      if (!result.success) alert(result.error || 'No sha pogut obrir el document.');
      return;
    }

    const link = document.createElement('a');
    link.href = doc.urlFitxer;
    link.download = doc.nom;
    link.click();
  };

  const revealDocument = async (doc: DocumentProveidor) => {
    if (!doc.fileRef || !rootPath || !electronDocuments) return;
    const result = await electronDocuments.revealFile({ rootPath, relativePath: doc.fileRef.relativePath });
    if (!result.success) alert(result.error || 'No sha pogut mostrar el document al Finder.');
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getDocumentsByType = (tipus: DocumentProveidor['tipus']) => {
    return (formData.documents || []).filter((d: DocumentProveidor) => d.tipus === tipus);
  };

  return (
    <div style={{ maxWidth: '800px' }}>
      <input
        ref={fileInputRef}
        type="file"
        style={{ display: 'none' }}
        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
      />

      {!rootPath && (
        <div style={{ padding: '1rem', borderRadius: '6px', border: '1px solid var(--color-warning)', marginBottom: '1rem', color: 'var(--color-warning)' }}>
          Configura la carpeta documental a Parametres abans de pujar documents.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' }}>
        {TIPUS_DOCUMENTS.map(tipus => {
          const documents = getDocumentsByType(tipus.value);

          return (
            <div key={tipus.value} style={{ border: '1px solid var(--color-border)', borderRadius: '8px', overflow: 'hidden' }}>
              <div style={{
                padding: '1rem',
                background: '#f9fafb',
                borderBottom: '1px solid var(--color-border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{tipus.label}</span>
                  {documents.length > 0 && (
                    <span style={{ padding: '0.125rem 0.5rem', borderRadius: '12px', background: 'var(--color-info-bg)', color: 'var(--color-info-dark)', fontSize: '0.75rem', fontWeight: 600 }}>
                      {documents.length}
                    </span>
                  )}
                </div>

                <button
                  disabled={!rootPath || !electronDocuments}
                  onClick={() => {
                    if (fileInputRef.current) {
                      fileInputRef.current.onchange = (e: any) => void handleFileUpload(e, tipus.value, tipus.folder);
                      fileInputRef.current.click();
                    }
                  }}
                  className="btn-secondary"
                  style={{ padding: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem' }}
                >
                  <Upload size={14} />
                  Pujar
                </button>
              </div>

              <div style={{ padding: '1rem' }}>
                {documents.length === 0 ? (
                  <p style={{ textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: '0.875rem', padding: '1rem' }}>No hi ha documents</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {documents.map((doc: DocumentProveidor) => (
                      <div key={doc.id} style={{ padding: '0.75rem', background: '#fafafa', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                            <FileText size={16} style={{ color: 'var(--color-text-secondary)', flexShrink: 0 }} />
                            <span style={{ fontSize: '0.875rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.nom}</span>
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>
                            {new Date(doc.dataCarrega).toLocaleDateString('ca-ES')}
                            {doc.mida && ` · ${formatFileSize(doc.mida)}`}
                            {doc.fileRef && ` · v${String(doc.fileRef.version).padStart(3, '0')}`}
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                          <button onClick={() => handleDownload(doc)} style={iconButtonStyle} title="Obrir">
                            <Download size={16} />
                          </button>
                          {doc.fileRef && (
                            <button onClick={() => revealDocument(doc)} style={iconButtonStyle} title="Mostrar al Finder">
                              <FolderOpen size={16} />
                            </button>
                          )}
                          {!doc.id.startsWith('nomina-') && (
                            <button onClick={() => eliminarDocument(doc.id)} style={{ ...iconButtonStyle, color: 'var(--color-error-dark)' }} title="Eliminar">
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const iconButtonStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: 'var(--color-info-dark)',
  cursor: 'pointer',
  padding: '0.25rem',
};

import React, { useRef } from 'react';
import { AlertCircle, ExternalLink, FileText, FolderOpen, Upload } from 'lucide-react';
import type { Client } from '../../../types/client';
import type { DocumentFileRef } from '../../../types/documental';
import {
  buildClientDocumentPath,
  createDocumentRef,
  getNextDocumentVersion,
  safeFileName,
  versionedPdfName,
  type ClientDocumentFolder
} from '../../../utils/documentManager';
import { storage } from '../../../utils/storageManager';

interface DocumentsTabProps {
  formData: Client;
  setFormData: (data: Client) => void;
}

const DOCUMENT_TYPES: Array<{ value: ClientDocumentFolder; label: string; accept: string; folderName: string }> = [
  { value: 'contractes', label: 'Contractes', accept: '.pdf,.doc,.docx,.jpg,.jpeg,.png', folderName: 'Contractes' },
  { value: 'fiscal', label: 'Fiscal', accept: '.pdf,.doc,.docx,.jpg,.jpeg,.png,.xls,.xlsx', folderName: 'Fiscal' },
  { value: 'altres', label: 'Altres', accept: '.pdf,.doc,.docx,.jpg,.jpeg,.png,.xls,.xlsx,.zip', folderName: 'Altres' },
];

export default function DocumentsTab({ formData, setFormData }: DocumentsTabProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const rootPath = storage.getParametres().gestorDocumental?.rootPath;
  const electronDocuments = typeof window !== 'undefined' ? window.electronDocuments : undefined;
  const clientName = formData.nomComercial || formData.nomFiscal || 'Client';
  const documents = formData.documents || [];

  const fileToDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = event => resolve(event.target?.result as string);
    reader.onerror = () => reject(reader.error || new Error('No sha pogut llegir el fitxer.'));
    reader.readAsDataURL(file);
  });

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleUpload = async (file: File, folder: ClientDocumentFolder) => {
    if (!rootPath || !electronDocuments) {
      alert('Configura primer la carpeta documental a Parametres > Gestor documental.');
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      alert('El fitxer es massa gran. Maxim 25MB.');
      return;
    }

    try {
      const version = getNextDocumentVersion(documents, file.name);
      const extension = file.name.includes('.') ? file.name.split('.').pop() || 'dat' : 'dat';
      const baseName = file.name.replace(/\.[^.]+$/, '');
      const filename = extension.toLowerCase() === 'pdf'
        ? versionedPdfName(baseName, version)
        : `${safeFileName(baseName)}_v${String(version).padStart(3, '0')}.${safeFileName(extension)}`;
      const relativePath = buildClientDocumentPath(formData.codi, clientName, folder, filename);
      const dataBase64 = await fileToDataUrl(file);
      const result = await electronDocuments.writeFile({ rootPath, relativePath, dataBase64 });

      if (!result.success || !result.data) {
        alert(result.error || 'No sha pogut guardar el document.');
        return;
      }

      const docRef = createDocumentRef({
        kind: 'client',
        ownerType: 'client',
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

      setFormData({ ...formData, documents: [...documents, docRef] });
    } catch (error) {
      alert(error instanceof Error ? error.message : 'No sha pogut guardar el document.');
    } finally {
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const openDocument = async (doc: DocumentFileRef) => {
    if (!rootPath || !electronDocuments) return;
    const result = await electronDocuments.openFile({ rootPath, relativePath: doc.relativePath });
    if (!result.success) alert(result.error || 'No sha pogut obrir el document.');
  };

  const revealDocument = async (doc: DocumentFileRef) => {
    if (!rootPath || !electronDocuments) return;
    const result = await electronDocuments.revealFile({ rootPath, relativePath: doc.relativePath });
    if (!result.success) alert(result.error || 'No sha pogut mostrar el document al Finder.');
  };

  const docsByFolder = (folderName: string) =>
    documents.filter(doc => doc.relativePath.includes(`/Documentacio client/${folderName}/`));

  return (
    <div style={{ maxWidth: '820px' }}>
      <input ref={inputRef} type="file" style={{ display: 'none' }} />

      {!rootPath && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.85rem',
          border: '1px solid var(--color-warning)',
          borderRadius: '6px',
          color: 'var(--color-warning)',
          marginBottom: '1rem'
        }}>
          <AlertCircle size={18} />
          <span>Configura la carpeta documental a Parametres abans de pujar documents.</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
        {DOCUMENT_TYPES.map(type => {
          const typeDocs = docsByFolder(type.folderName);
          return (
            <div key={type.value} style={{ border: '1px solid var(--color-border)', borderRadius: '8px', overflow: 'hidden' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.75rem',
                padding: '0.85rem',
                borderBottom: '1px solid var(--color-border)',
                background: 'var(--color-bg-secondary)'
              }}>
                <strong>{type.label}</strong>
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={!rootPath || !electronDocuments}
                  onClick={() => {
                    if (!inputRef.current) return;
                    inputRef.current.accept = type.accept;
                    inputRef.current.onchange = (event: any) => {
                      const file = event.target.files?.[0];
                      if (file) void handleUpload(file, type.value);
                    };
                    inputRef.current.click();
                  }}
                  style={{ padding: '0.45rem 0.65rem' }}
                >
                  <Upload size={14} />
                  Pujar
                </button>
              </div>

              <div style={{ padding: '0.85rem', display: 'grid', gap: '0.5rem' }}>
                {typeDocs.length === 0 ? (
                  <p style={{ color: 'var(--color-text-tertiary)', margin: 0, fontSize: '0.875rem' }}>No hi ha documents</p>
                ) : typeDocs.map(doc => (
                  <div key={doc.id} style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.65rem',
                    border: '1px solid var(--color-border)',
                    borderRadius: '6px'
                  }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', minWidth: 0 }}>
                        <FileText size={16} style={{ flexShrink: 0 }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>
                          {doc.displayName}
                        </span>
                      </div>
                      <div style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>
                        v{String(doc.version).padStart(3, '0')} · {new Date(doc.createdAt).toLocaleDateString('ca-ES')} {formatFileSize(doc.size) && `· ${formatFileSize(doc.size)}`}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      <button type="button" title="Obrir" onClick={() => openDocument(doc)} style={iconButtonStyle}>
                        <ExternalLink size={16} />
                      </button>
                      <button type="button" title="Mostrar al Finder" onClick={() => revealDocument(doc)} style={iconButtonStyle}>
                        <FolderOpen size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const iconButtonStyle: React.CSSProperties = {
  border: 'none',
  background: 'transparent',
  color: 'var(--color-accent-primary)',
  cursor: 'pointer',
  padding: '0.25rem',
  display: 'inline-flex',
};

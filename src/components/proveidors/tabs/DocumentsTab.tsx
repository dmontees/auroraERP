import React, { useRef } from 'react';
import { Upload, FileText, Trash2, Download } from 'lucide-react';
import type { DocumentProveidor } from '../../../types/proveidor';

interface DocumentsTabProps {
  hook: {
    formData: any;
    afegirDocument: (document: Omit<DocumentProveidor, 'id'>) => void;
    eliminarDocument: (id: string) => void;
  };
}

export default function DocumentsTab({ hook }: DocumentsTabProps) {
  const { formData, afegirDocument, eliminarDocument } = hook;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const tipusDocuments = [
    { value: 'contracte', label: 'Contracte', icon: '📄' },
    { value: 'assegurança', label: 'Assegurança', icon: '🛡️' },
    { value: 'certificat', label: 'Certificat', icon: '✅' },
    { value: 'altres', label: 'Altres', icon: '📎' }
  ];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, tipus: DocumentProveidor['tipus']) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Limitar tamaño (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('El fitxer és massa gran. Màxim 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      
      afegirDocument({
        nom: file.name,
        tipus: tipus,
        dataCarrega: new Date().toISOString(),
        urlFitxer: base64,
        mida: file.size
      });
    };
    reader.readAsDataURL(file);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDownload = (document: DocumentProveidor) => {
    const link = document.createElement('a');
    link.href = document.urlFitxer;
    link.download = document.nom;
    link.click();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getDocumentsByType = (tipus: DocumentProveidor['tipus']) => {
    return formData.documents.filter((d: DocumentProveidor) => d.tipus === tipus);
  };

  return (
    <div style={{ maxWidth: '800px' }}>
      <input
        ref={fileInputRef}
        type="file"
        style={{ display: 'none' }}
        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
      />

      {/* INTRO */}
      <div style={{
        padding: '1rem',
        background: '#f0f9ff',
        borderRadius: '6px',
        border: '1px solid #bfdbfe',
        marginBottom: '2rem',
        fontSize: '0.875rem',
        color: '#1e40af'
      }}>
        <strong>📎 Gestió de documents</strong><br />
        Pots adjuntar contractes, assegurances, certificats i altres documents relacionats amb aquest proveïdor.
        Màxim 5MB per fitxer.
      </div>

      {/* GRID DE TIPOS DE DOCUMENTOS */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
        gap: '1.5rem'
      }}>
        {tipusDocuments.map(tipus => {
          const documents = getDocumentsByType(tipus.value as DocumentProveidor['tipus']);
          
          return (
            <div
              key={tipus.value}
              style={{
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                overflow: 'hidden'
              }}
            >
              {/* HEADER */}
              <div style={{
                padding: '1rem',
                background: '#f9fafb',
                borderBottom: '1px solid var(--color-border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <span style={{ fontSize: '1.25rem' }}>{tipus.icon}</span>
                  <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                    {tipus.label}
                  </span>
                  {documents.length > 0 && (
                    <span style={{
                      padding: '0.125rem 0.5rem',
                      borderRadius: '12px',
                      background: '#dbeafe',
                      color: '#1e40af',
                      fontSize: '0.75rem',
                      fontWeight: 600
                    }}>
                      {documents.length}
                    </span>
                  )}
                </div>

                <button
                  onClick={() => {
                    if (fileInputRef.current) {
                      fileInputRef.current.onchange = (e: any) => 
                        handleFileUpload(e, tipus.value as DocumentProveidor['tipus']);
                      fileInputRef.current.click();
                    }
                  }}
                  className="btn-secondary"
                  style={{
                    padding: '0.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    fontSize: '0.8rem'
                  }}
                >
                  <Upload size={14} />
                  Pujar
                </button>
              </div>

              {/* LISTA DE DOCUMENTOS */}
              <div style={{ padding: '1rem' }}>
                {documents.length === 0 ? (
                  <p style={{
                    textAlign: 'center',
                    color: 'var(--color-text-tertiary)',
                    fontSize: '0.875rem',
                    padding: '1rem'
                  }}>
                    No hi ha documents
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {documents.map((doc: DocumentProveidor) => (
                      <div
                        key={doc.id}
                        style={{
                          padding: '0.75rem',
                          background: '#fafafa',
                          borderRadius: '6px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            marginBottom: '0.25rem'
                          }}>
                            <FileText size={16} style={{ color: '#6b7280', flexShrink: 0 }} />
                            <span style={{
                              fontSize: '0.875rem',
                              fontWeight: 500,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}>
                              {doc.nom}
                            </span>
                          </div>
                          <div style={{
                            fontSize: '0.75rem',
                            color: 'var(--color-text-tertiary)'
                          }}>
                            {new Date(doc.dataCarrega).toLocaleDateString('ca-ES')}
                            {doc.mida && ` • ${formatFileSize(doc.mida)}`}
                          </div>
                          {doc.projecteCodi && (
                            <div style={{ marginTop: '0.25rem' }}>
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                fontSize: '0.7rem',
                                fontWeight: 600,
                                background: '#eff6ff',
                                color: '#1d4ed8',
                                border: '1px solid #bfdbfe',
                                borderRadius: '4px',
                                padding: '0.1rem 0.4rem',
                              }}>
                                📁 {doc.projecteNom || doc.projecteCodi}
                              </span>
                            </div>
                          )}
                        </div>

                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                          <button
                            onClick={() => handleDownload(doc)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#1e40af',
                              cursor: 'pointer',
                              padding: '0.25rem'
                            }}
                            title="Descarregar"
                          >
                            <Download size={16} />
                          </button>
                          {!doc.id.startsWith('nomina-') && (
                            <button
                              onClick={() => eliminarDocument(doc.id)}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#dc2626',
                                cursor: 'pointer',
                                padding: '0.25rem'
                              }}
                              title="Eliminar"
                            >
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
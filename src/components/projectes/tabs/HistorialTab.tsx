import { FileText, Upload, Download, Trash2 } from 'lucide-react';
import type { Projecte, DocumentProjecte } from '../../../types/projecte';
import { storage } from '../../../utils/storageManager';
import { obtenirHistorialOrdenat, obtenirIconaHistorial, obtenirColorHistorial } from '../../../utils/projecteHistorial';

interface Props {
  formData: Projecte;
  esBloquejat: boolean;
  onShowDocumentModal: () => void;
  onShowVincularPressupostModal: () => void;
  onShowVincularFacturaModal: () => void;
  onEliminarDocument: (id: string) => void;
  onDescarregarDocument: (doc: DocumentProjecte) => void;
  onClose: () => void;
}

export default function HistorialTab({
  formData,
  esBloquejat,
  onShowDocumentModal,
  onShowVincularPressupostModal,
  onShowVincularFacturaModal,
  onEliminarDocument,
  onDescarregarDocument,
  onClose
}: Props) {
  return (
    <div className="tab-content">
      {/* Documents Vinculats */}
      <div className="form-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
            Documents Vinculats
          </h3>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {!formData.pressupost && !esBloquejat && (
              <button
                type="button"
                onClick={onShowVincularPressupostModal}
                className="btn-secondary"
                style={{ fontSize: '0.85rem' }}
                title="Vincular pressupost existent"
              >
                <FileText size={16} />
                Vincular Pressupost
              </button>
            )}

            {!formData.facturaAssociada && !esBloquejat && (
              <button
                type="button"
                onClick={onShowVincularFacturaModal}
                className="btn-secondary"
                style={{ fontSize: '0.85rem' }}
                title="Vincular factura existent"
              >
                <FileText size={16} />
                Vincular Factura
              </button>
            )}

            <button
              type="button"
              onClick={onShowDocumentModal}
              className="btn-secondary"
              style={{ fontSize: '0.85rem' }}
            >
              <Upload size={16} />
              Afegir Document
            </button>
          </div>
        </div>

        <div style={{
          padding: '1rem',
          background: 'var(--color-bg-tertiary)',
          borderRadius: '6px',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem'
        }}>
          {/* Pressupost Vinculat */}
          {formData.pressupost && (
            <div
              onClick={() => {
                storage.setNavigateTo({ type: 'pressupost', codi: formData.pressupost as string });
                onClose();
                setTimeout(() => {
                  window.dispatchEvent(new CustomEvent('navigate-to', {
                    detail: { section: 'pressupostos', codi: formData.pressupost }
                  }));
                }, 100);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem',
                background: 'var(--color-bg-primary)',
                border: '1px solid var(--color-border)',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-bg-tertiary)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'var(--color-bg-primary)'}
            >
              <FileText size={20} style={{ color: 'var(--color-accent-primary)', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: 'var(--color-text-primary)', fontSize: '0.9rem' }}>
                  Pressupost Vinculat
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>
                  {formData.pressupost}
                </div>
              </div>
            </div>
          )}

          {/* Factura Associada */}
          {formData.facturaAssociada && (
            <div
              onClick={() => {
                storage.setNavigateTo({ type: 'factura', codi: formData.facturaAssociada as string });
                onClose();
                setTimeout(() => {
                  window.dispatchEvent(new CustomEvent('navigate-to', {
                    detail: { section: 'factures-venda', codi: formData.facturaAssociada }
                  }));
                }, 100);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem',
                background: 'var(--color-bg-primary)',
                border: '1px solid var(--color-border)',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-bg-tertiary)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'var(--color-bg-primary)'}
            >
              <FileText size={20} style={{ color: 'var(--color-accent-primary)', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: 'var(--color-text-primary)', fontSize: '0.9rem' }}>
                  Factura Associada
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>
                  {formData.facturaAssociada}
                </div>
              </div>
            </div>
          )}

          {/* Documents manuals */}
          {formData.documents && formData.documents.length > 0 && (
            formData.documents.map(doc => (
              <div
                key={doc.id}
                style={{
                  padding: '0.75rem',
                  background: 'white',
                  border: '1px solid var(--color-border)',
                  borderRadius: '6px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div><strong>{doc.tipus}:</strong> {doc.nom}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-tertiary)', marginTop: '0.25rem' }}>
                    {doc.nomFitxer} • {new Date(doc.dataAfegit).toLocaleDateString('ca-ES')}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => onDescarregarDocument(doc)}
                    style={{
                      padding: '0.25rem 0.5rem',
                      background: 'var(--color-info)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.85rem'
                    }}
                    title="Descarregar"
                  >
                    <Download size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onEliminarDocument(doc.id)}
                    style={{
                      padding: '0.25rem 0.5rem',
                      background: 'var(--color-error-dark)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.85rem'
                    }}
                    title="Eliminar"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          )}

          {!formData.pressupost && !formData.facturaAssociada && (!formData.documents || formData.documents.length === 0) && (
            <div style={{ textAlign: 'center', color: 'var(--color-text-tertiary)', padding: '1rem' }}>
              No hi ha documents vinculats
            </div>
          )}
        </div>
      </div>

      {/* Timeline */}
      <div>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--color-text-primary)' }}>
          Timeline del Projecte
        </h3>

        <div style={{
          padding: '1.5rem',
          background: 'var(--color-bg-secondary)',
          borderRadius: '8px',
          border: '1px solid var(--color-border)'
        }}>
          {formData.historial && formData.historial.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {obtenirHistorialOrdenat(formData).map((entrada) => (
                <div key={entrada.id} style={{ display: 'flex', gap: '1rem', alignItems: 'start' }}>
                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: obtenirColorHistorial(entrada.tipus),
                    marginTop: '0.5rem',
                    flexShrink: 0
                  }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text-tertiary)', marginBottom: '0.25rem' }}>
                      {new Date(entrada.data).toLocaleDateString('ca-ES', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                    <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span>{obtenirIconaHistorial(entrada)}</span>
                      <span>{entrada.descripcio}</span>
                    </div>
                    {entrada.detalls && (
                      <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>
                        {entrada.detalls}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{
              padding: '2rem',
              textAlign: 'center',
              color: 'var(--color-text-tertiary)',
              fontStyle: 'italic'
            }}>
              No hi ha esdeveniments registrats encara
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

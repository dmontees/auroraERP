import React from 'react';
import { X, FileText, CreditCard } from 'lucide-react';

interface TipusGastoModalProps {
  onClose: () => void;
  onSelect: (tipus: 'factura-compra' | 'gasto-general') => void;
}

export default function TipusGastoModal({ onClose, onSelect }: TipusGastoModalProps) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()} 
        style={{ maxWidth: '500px' }}
      >
        <div className="modal-header">
          <h2>Selecciona el tipus de despesa</h2>
          <button className="modal-close" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="modal-body">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Factura de Compra */}
            <button
              onClick={() => onSelect('factura-compra')}
              style={{
                padding: '1.5rem',
                background: 'var(--color-bg-secondary)',
                border: '2px solid var(--color-border)',
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                textAlign: 'left',
                display: 'flex',
                gap: '1rem',
                alignItems: 'flex-start'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-accent-primary)';
                e.currentTarget.style.background = 'var(--color-bg-tertiary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-border)';
                e.currentTarget.style.background = 'var(--color-bg-secondary)';
              }}
            >
              <div style={{
                width: '48px',
                height: '48px',
                background: 'var(--color-info-bg)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <FileText size={24} color="var(--color-info)" />
              </div>
              <div>
                <div style={{ 
                  fontSize: '1.1rem', 
                  fontWeight: 600, 
                  marginBottom: '0.5rem',
                  color: 'var(--color-text-primary)'
                }}>
                  📄 Factura de Compra
                </div>
                <div style={{ 
                  fontSize: '0.9rem', 
                  color: 'var(--color-text-secondary)',
                  lineHeight: '1.4'
                }}>
                  Factura d'un proveïdor o acreedor vinculada a projectes específics
                </div>
              </div>
            </button>

            {/* Gasto General */}
            <button
              onClick={() => onSelect('gasto-general')}
              style={{
                padding: '1.5rem',
                background: 'var(--color-bg-secondary)',
                border: '2px solid var(--color-border)',
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                textAlign: 'left',
                display: 'flex',
                gap: '1rem',
                alignItems: 'flex-start'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-accent-primary)';
                e.currentTarget.style.background = 'var(--color-bg-tertiary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-border)';
                e.currentTarget.style.background = 'var(--color-bg-secondary)';
              }}
            >
              <div style={{
                width: '48px',
                height: '48px',
                background: 'var(--color-warning-bg)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <CreditCard size={24} color="var(--color-warning)" />
              </div>
              <div>
                <div style={{ 
                  fontSize: '1.1rem', 
                  fontWeight: 600, 
                  marginBottom: '0.5rem',
                  color: 'var(--color-text-primary)'
                }}>
                  💳 Despesa General
                </div>
                <div style={{
                  fontSize: '0.9rem',
                  color: 'var(--color-text-secondary)',
                  lineHeight: '1.4'
                }}>
                  Assegurances, rebuts i despeses amb document físic que no són factura formal
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
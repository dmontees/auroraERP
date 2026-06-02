import React from 'react';
import { X } from 'lucide-react';

interface TipusModalProps {
  onClose: () => void;
  onSelect: (tipus: 'Proveïdor' | 'Acreedor' | 'Treballador') => void;
}

export default function TipusModal({ onClose, onSelect }: TipusModalProps) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
        <div className="modal-header">
          <h2>Selecciona el tipus</h2>
          <button className="modal-close" onClick={onClose}>
            <X size={24} />
          </button>
        </div>
        <div className="modal-body">
          <p style={{ marginBottom: '1.5rem', color: 'var(--color-text-secondary)' }}>
            Quin tipus de persona vols donar d'alta?
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <button
              className="btn-primary"
              onClick={() => onSelect('Proveïdor')}
              style={{ textAlign: 'left', padding: '0.75rem 1rem' }}
            >
              🏢 Proveïdor — empresa o professional extern
            </button>
            <button
              className="btn-secondary"
              onClick={() => onSelect('Acreedor')}
              style={{ textAlign: 'left', padding: '0.75rem 1rem' }}
            >
              🏦 Acreedor — proveïdor de serveis generals
            </button>
            <button
              className="btn-secondary"
              onClick={() => onSelect('Treballador')}
              style={{ textAlign: 'left', padding: '0.75rem 1rem', borderColor: 'var(--color-purple)', color: 'var(--color-purple)' }}
            >
              👷 Treballador — empleat ocasional (RRHH)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
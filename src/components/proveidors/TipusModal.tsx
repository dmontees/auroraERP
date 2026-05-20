import React from 'react';
import { X } from 'lucide-react';

interface TipusModalProps {
  onClose: () => void;
  onSelect: (tipus: 'Proveïdor' | 'Acreedor') => void;
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
            Vols donar d'alta un proveïdor o un acreedor?
          </p>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button 
              className="btn-primary" 
              onClick={() => onSelect('Proveïdor')}
              style={{ flex: 1 }}
            >
              Proveïdor
            </button>
            <button 
              className="btn-secondary" 
              onClick={() => onSelect('Acreedor')}
              style={{ flex: 1 }}
            >
              Acreedor
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
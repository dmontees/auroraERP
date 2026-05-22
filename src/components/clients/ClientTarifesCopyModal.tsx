import React from 'react';
import { X } from 'lucide-react';

interface ClientTarifesCopyModalProps {
  onClose: () => void;
  onCopyTarifes: () => void;
  onStartEmpty: () => void;
}

export default function ClientTarifesCopyModal({ 
  onClose, 
  onCopyTarifes, 
  onStartEmpty 
}: ClientTarifesCopyModalProps) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
        <div className="modal-header">
          <h2>Tarifes especials</h2>
          <button className="modal-close" onClick={onClose}>
            <X size={24} />
          </button>
        </div>
        <div className="modal-body">
          <p style={{ marginBottom: '1.5rem' }}>
            Vols copiar les tarifes generals actuals com a punt de partida?
          </p>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button 
              className="btn-primary" 
              onClick={onCopyTarifes}
              style={{ flex: 1 }}
            >
              Sí, copiar tarifes
            </button>
            <button 
              className="btn-secondary" 
              onClick={onStartEmpty}
              style={{ flex: 1 }}
            >
              No, començar buit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
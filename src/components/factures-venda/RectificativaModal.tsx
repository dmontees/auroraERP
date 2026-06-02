import React, { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import type { FacturaVenta } from '../../types/facturaVenta';

interface Props {
  factura: FacturaVenta;
  onClose: () => void;
  onCreate: (motivo: string) => void;
}

export default function RectificativaModal({ factura, onClose, onCreate }: Props) {
  const [motivo, setMotivo] = useState('');
  const [confirmacio, setConfirmacio] = useState(false);

  const handleCreate = () => {
    if (!motivo.trim()) {
      alert('Cal introduir un motiu per a la nota de crèdit');
      return;
    }

    if (!confirmacio) {
      alert('Cal confirmar que vols crear la nota de crèdit');
      return;
    }

    onCreate(motivo);
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 2000 }}>
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '600px' }}
      >
        <div className="modal-header">
          <h2>
            <AlertTriangle size={24} />
            Crear Nota de Crèdit (Factura Rectificativa)
          </h2>
          <button className="modal-close" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="modal-body">
          {/* Info factura original */}
          <div style={{
            background: 'var(--color-bg-tertiary)',
            padding: '1rem',
            borderRadius: '8px',
            marginBottom: '1.5rem'
          }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              Factura Original
            </h3>
            <div style={{ fontSize: '0.9rem' }}>
              <div><strong>Codi:</strong> {factura.codi}</div>
              <div><strong>Data:</strong> {factura.dataFactura}</div>
              <div><strong>Total:</strong> {factura.totalFactura.toFixed(2)}€</div>
            </div>
          </div>

          {/* Advertencia */}
          <div style={{
            background: 'var(--color-warning-bg)',
            border: '1px solid var(--color-warning-light)',
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '1.5rem',
            color: 'var(--color-warning-dark)'
          }}>
            <strong>⚠️ Atenció:</strong>
            <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
              <li>Es crearà una factura amb tots els imports en <strong>negatiu</strong></li>
              <li>Això restarà del total facturat i pendent de cobrar</li>
              <li>La nota de crèdit referenciarà aquesta factura original</li>
              <li>No es pot desfer aquesta acció</li>
            </ul>
          </div>

          {/* Motivo */}
          <div className="form-group">
            <label>Motiu de la Nota de Crèdit *</label>
            <textarea
              className="form-input"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={4}
              placeholder="Ex: Error en la facturació, devolució de material, descompte aplicat..."
              required
            />
          </div>

          {/* Confirmación */}
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '1rem',
            background: 'var(--color-bg-tertiary)',
            borderRadius: '8px',
            cursor: 'pointer'
          }}>
            <input
              type="checkbox"
              checked={confirmacio}
              onChange={(e) => setConfirmacio(e.target.checked)}
            />
            <span style={{ fontWeight: 600 }}>
              Confirmo que vull crear una nota de crèdit per aquesta factura
            </span>
          </label>
        </div>

        <div className="modal-footer">
          <button 
            type="button" 
            className="btn-secondary" 
            onClick={onClose}
          >
            Cancel·lar
          </button>
          <button 
            type="button" 
            className="btn-primary" 
            onClick={handleCreate}
            disabled={!motivo.trim() || !confirmacio}
            style={{
              opacity: (!motivo.trim() || !confirmacio) ? 0.5 : 1
            }}
          >
            Crear Nota de Crèdit
          </button>
        </div>
      </div>
    </div>
  );
}
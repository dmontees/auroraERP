import React, { useState } from 'react';
import { Clock } from 'lucide-react';
import type { FacturaVenta, AccioFactura } from '../../../types/facturaVenta';

interface Props {
  formData: FacturaVenta;
  setFormData: (data: FacturaVenta) => void;
}

export default function HistorialTab({
  formData,
  setFormData
}: Props) {
  
  const [novaAccio, setNovaAccio] = useState({
    data: new Date().toISOString().split('T')[0],
    descripcio: ''
  });

  const registrarAccio = () => {
    if (!novaAccio.descripcio.trim()) {
      alert('Introdueix una descripció per a l\'acció');
      return;
    }

    const accio: AccioFactura = {
      data: novaAccio.data,
      descripcio: novaAccio.descripcio,
      automatic: false
    };

    setFormData({
      ...formData,
      accions: [...formData.accions, accio]
    });

    setNovaAccio({
      data: new Date().toISOString().split('T')[0],
      descripcio: ''
    });
  };

  return (
    <div>
      {/* Historial */}
      <div style={{
        background: 'var(--color-bg-tertiary)',
        padding: '1.5rem',
        borderRadius: '8px',
        marginBottom: '1.5rem'
      }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>
          📅 Historial d'Accions
        </h3>

        <div style={{ 
          maxHeight: '300px', 
          overflow: 'auto',
          background: 'var(--color-bg-secondary)',
          padding: '1rem',
          borderRadius: '6px'
        }}>
          {[...formData.accions].reverse().map((accio, index) => (
            <div 
              key={index}
              style={{
                padding: '0.75rem',
                borderBottom: index < formData.accions.length - 1 ? '1px solid var(--color-border)' : 'none',
                display: 'flex',
                gap: '0.75rem'
              }}
            >
              <Clock size={16} style={{ 
                marginTop: '0.25rem',
                color: accio.automatic ? 'var(--color-accent-primary)' : 'var(--color-text-secondary)'
              }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-tertiary)' }}>
                  {new Date(accio.data).toLocaleString('ca-ES')}
                </div>
                <div style={{ marginTop: '0.25rem' }}>
                  {accio.descripcio}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Registrar Acció */}
      <div style={{
        background: 'var(--color-bg-tertiary)',
        padding: '1.5rem',
        borderRadius: '8px'
      }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>
          ➕ Registrar Acció
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr auto', gap: '0.75rem', alignItems: 'end' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label style={{ fontSize: '0.85rem' }}>Data</label>
            <input
              type="date"
              className="form-input"
              value={novaAccio.data}
              onChange={(e) => setNovaAccio({ ...novaAccio, data: e.target.value })}
            />
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label style={{ fontSize: '0.85rem' }}>Descripció</label>
            <input
              type="text"
              className="form-input"
              value={novaAccio.descripcio}
              onChange={(e) => setNovaAccio({ ...novaAccio, descripcio: e.target.value })}
              placeholder="Ex: Recordatori enviat per correu"
            />
          </div>

          <button
            type="button"
            onClick={registrarAccio}
            className="btn-secondary"
            style={{ height: 'fit-content' }}
          >
            Registrar
          </button>
        </div>
      </div>
    </div>
  );
}
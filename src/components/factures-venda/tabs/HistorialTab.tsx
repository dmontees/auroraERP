import React, { useState } from 'react';
import { Clock, CheckCircle, AlertCircle } from 'lucide-react';
import type { FacturaVenta, AccioFactura } from '../../../types/facturaVenta';

interface Props {
  formData: FacturaVenta;
  setFormData: (data: FacturaVenta) => void;
}

export default function HistorialTab({ formData, setFormData }: Props) {

  const [novaAccio, setNovaAccio] = useState({
    data: new Date().toISOString().split('T')[0],
    descripcio: ''
  });

  const registrarAccio = () => {
    if (!novaAccio.descripcio.trim()) { alert('Introdueix una descripció per a l\'acció'); return; }
    const accio: AccioFactura = { data: novaAccio.data, descripcio: novaAccio.descripcio, automatic: false };
    setFormData({ ...formData, accions: [...formData.accions, accio] });
    setNovaAccio({ data: new Date().toISOString().split('T')[0], descripcio: '' });
  };

  const sectionLabel: React.CSSProperties = {
    fontSize: '0.73rem', fontWeight: 700, textTransform: 'uppercase',
    letterSpacing: '0.5px', color: 'var(--color-text-tertiary)', marginBottom: '0.85rem',
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '60fr 40fr', gap: '1.25rem', alignItems: 'start' }}>

      {/* Col esquerra 60%: Registrar Acció */}
      <div className="placeholder-card" style={{ padding: '1.1rem' }}>
        <div style={sectionLabel}>➕ Registrar Acció</div>
        <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '0.75rem', marginBottom: '0.85rem' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label style={{ fontSize: '0.8rem' }}>Data</label>
            <input type="date" className="form-input" value={novaAccio.data}
              onChange={e => setNovaAccio({ ...novaAccio, data: e.target.value })} />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label style={{ fontSize: '0.8rem' }}>Descripció</label>
            <input type="text" className="form-input" value={novaAccio.descripcio}
              onChange={e => setNovaAccio({ ...novaAccio, descripcio: e.target.value })}
              onKeyDown={e => e.key === 'Enter' && registrarAccio()}
              placeholder="Ex: Recordatori enviat per correu" />
          </div>
        </div>
        <button type="button" onClick={registrarAccio} className="btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem' }}>
          ➕ Registrar
        </button>

        <p style={{ marginTop: '1.25rem', fontSize: '0.8rem', color: 'var(--color-text-tertiary)', fontStyle: 'italic' }}>
          Les accions manuals queden registrades al historial per traçabilitat. Les accions automàtiques es generen quan canvia l'estat o es registra un pagament.
        </p>
      </div>

      {/* Col dreta 40%: Historial */}
      <div className="placeholder-card" style={{ padding: '1.1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', ...sectionLabel }}>
          <Clock size={11} /> Historial d'Accions
          <span style={{ marginLeft: 'auto', fontSize: '0.75rem', fontWeight: 400 }}>
            {formData.accions.length} entrada{formData.accions.length !== 1 ? 'es' : ''}
          </span>
        </div>
        <div style={{ maxHeight: '420px', overflowY: 'auto' }}>
          {[...formData.accions].reverse().map((accio, i) => (
            <div key={i} style={{
              display: 'flex', gap: '0.6rem', padding: '0.55rem 0',
              borderBottom: i < formData.accions.length - 1 ? '1px solid var(--color-border)' : 'none'
            }}>
              {accio.automatic
                ? <CheckCircle size={14} style={{ color: 'var(--color-accent-primary)', flexShrink: 0, marginTop: '0.15rem' }} />
                : <AlertCircle size={14} style={{ color: 'var(--color-text-tertiary)', flexShrink: 0, marginTop: '0.15rem' }} />
              }
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.84rem' }}>{accio.descripcio}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginTop: '0.1rem' }}>
                  {new Date(accio.data).toLocaleString('ca-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))}
          {formData.accions.length === 0 && (
            <div style={{ fontSize: '0.875rem', color: 'var(--color-text-tertiary)', fontStyle: 'italic', textAlign: 'center', padding: '1rem 0' }}>
              Sense accions registrades
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

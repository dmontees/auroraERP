import React, { useState } from 'react';
import { Euro, Trash2, Download } from 'lucide-react';
import type { PagamentClient } from '../../../types/facturaVenta';
import { exportarCobrosExcel } from '../utils/facturaExport';

interface Props {
  pagaments: PagamentClient[];
  totalFactura: number;
  pendentCobrar: number;
  onAfegirPagament: (pagament: Omit<PagamentClient, 'codi'>) => void;
  onEliminarPagament: (codi: string) => void;
  disabled?: boolean;
  codiFactura: string;
}

export default function CobrosManager({
  pagaments, totalFactura, pendentCobrar,
  onAfegirPagament, onEliminarPagament,
  disabled = false, codiFactura
}: Props) {

  const [nouPagament, setNouPagament] = useState<Omit<PagamentClient, 'codi'>>({
    data: new Date().toISOString().split('T')[0],
    import: 0,
    metode: 'transferencia',
    referencia: ''
  });

  const totalCobrat = pagaments.reduce((s, p) => s + p.import, 0);

  const handleRegistrar = () => {
    if (nouPagament.import <= 0) { alert('L\'import ha de ser superior a 0'); return; }
    if (Math.round(nouPagament.import * 100) > Math.round(pendentCobrar * 100)) {
      alert(`L'import no pot ser superior al pendent (${pendentCobrar.toFixed(2)}€)`); return;
    }
    onAfegirPagament(nouPagament);
    setNouPagament({ data: new Date().toISOString().split('T')[0], import: 0, metode: 'transferencia', referencia: '' });
  };

  const sectionLabel: React.CSSProperties = {
    fontSize: '0.73rem', fontWeight: 700, textTransform: 'uppercase',
    letterSpacing: '0.5px', color: 'var(--color-text-tertiary)', marginBottom: '0.85rem',
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '70fr 30fr', gap: '1.25rem', alignItems: 'start' }}>

      {/* Col esquerra 70%: Formulari + Taula */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

        {/* Registrar Nou Pagament */}
        {Math.round(pendentCobrar * 100) > 0 && !disabled && (
          <div className="placeholder-card" style={{ padding: '1.1rem' }}>
            <div style={sectionLabel}>💳 Registrar Nou Pagament</div>
            <div style={{ display: 'grid', gridTemplateColumns: '140px 110px 150px 1fr', gap: '0.65rem', alignItems: 'end', marginBottom: '0.75rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '0.8rem' }}>Data</label>
                <input type="date" className="form-input" value={nouPagament.data}
                  onChange={e => setNouPagament({ ...nouPagament, data: e.target.value })} />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '0.8rem' }}>Import (€)</label>
                <input type="number" step="0.01" className="form-input" value={nouPagament.import || ''}
                  onChange={e => setNouPagament({ ...nouPagament, import: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00" />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '0.8rem' }}>Mètode</label>
                <select className="form-input" value={nouPagament.metode}
                  onChange={e => setNouPagament({ ...nouPagament, metode: e.target.value as any })}>
                  <option value="transferencia">Transferència</option>
                  <option value="efectiu">Efectiu</option>
                  <option value="targeta">Targeta</option>
                  <option value="domiciliacio">Domiciliació</option>
                  <option value="altres">Altres</option>
                </select>
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '0.8rem' }}>Referència</label>
                <input type="text" className="form-input" value={nouPagament.referencia}
                  onChange={e => setNouPagament({ ...nouPagament, referencia: e.target.value })}
                  placeholder="Opcional" />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.65rem' }}>
              <button type="button" onClick={handleRegistrar} className="btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem' }}>
                <Euro size={15} /> Registrar
              </button>
              <button type="button" onClick={() => setNouPagament({ ...nouPagament, import: Math.round(pendentCobrar * 100) / 100 })}
                className="btn-secondary" style={{ fontSize: '0.875rem' }}>
                💰 Cobrar tot el pendent ({pendentCobrar.toFixed(2)}€)
              </button>
            </div>
          </div>
        )}

        {/* Taula de pagaments existents */}
        {pagaments.length > 0 && (
          <div className="placeholder-card" style={{ padding: '1.1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
              <div style={sectionLabel}>📋 Pagaments Registrats</div>
              <button type="button" onClick={() => exportarCobrosExcel(pagaments, codiFactura)}
                className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', padding: '0.35rem 0.65rem' }}>
                <Download size={14} /> Excel
              </button>
            </div>
            <table style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                  {['Data', 'Import', 'Mètode', 'Referència', ''].map(h => (
                    <th key={h} style={{ textAlign: h === '' ? 'right' : 'left', padding: '0.45rem 0.5rem', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-tertiary)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pagaments.map(pag => (
                  <tr key={pag.codi} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '0.5rem' }}>{new Date(pag.data).toLocaleDateString('ca-ES')}</td>
                    <td style={{ padding: '0.5rem', fontWeight: 600 }}>{pag.import.toFixed(2)}€</td>
                    <td style={{ padding: '0.5rem' }}>{pag.metode}</td>
                    <td style={{ padding: '0.5rem', color: 'var(--color-text-tertiary)' }}>{pag.referencia || '—'}</td>
                    <td style={{ padding: '0.5rem', textAlign: 'right' }}>
                      <button type="button" onClick={() => onEliminarPagament(pag.codi)} disabled={disabled}
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-error)', padding: '0.2rem' }}>
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {Math.round(pendentCobrar * 100) === 0 && pagaments.length === 0 && (
          <div className="placeholder-card" style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--color-text-tertiary)', fontStyle: 'italic' }}>
            Sense pagaments registrats
          </div>
        )}
      </div>

      {/* Col dreta 30%: Resum */}
      <div className="placeholder-card" style={{ padding: '1.1rem' }}>
        <div style={sectionLabel}>💶 Resum</div>
        {[
          { label: 'Total Factura', value: `${totalFactura.toFixed(2)}€`, color: 'var(--color-text-primary)', bold: false },
          { label: 'Total Cobrat', value: `${totalCobrat.toFixed(2)}€`, color: 'var(--color-success)', bold: false },
        ].map(row => (
          <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0', borderBottom: '1px solid var(--color-border)' }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>{row.label}</span>
            <span style={{ fontWeight: 600, color: row.color, fontSize: '0.9rem' }}>{row.value}</span>
          </div>
        ))}
        <div style={{ paddingTop: '0.75rem', marginTop: '0.35rem', borderTop: '2px solid var(--color-border)' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-tertiary)', marginBottom: '0.3rem' }}>Pendent</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: pendentCobrar > 0.01 ? 'var(--color-error-dark)' : 'var(--color-success)' }}>
            {pendentCobrar.toFixed(2)}€
          </div>
          {pendentCobrar <= 0.01 && (
            <div style={{ fontSize: '0.8rem', color: 'var(--color-success)', fontWeight: 600, marginTop: '0.2rem' }}>✅ Cobrada</div>
          )}
        </div>
      </div>
    </div>
  );
}

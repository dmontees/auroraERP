import React, { useState } from 'react';
import type { Proveidor } from '../../../types/proveidor';

interface SimulacioTabProps {
  hook: {
    formData: Proveidor;
  };
}

export default function SimulacioTab({ hook }: SimulacioTabProps) {
  const { formData } = hook;

  const pctSSEmpresa = formData.percentatgeSSEmpresa ?? 30.2;
  const pctSSTreballador = formData.percentatgeSSTreballador ?? 6.35;
  const pctIRPF = formData.percentatgeIRPF ?? 15;

  const [dies, setDies] = useState<number>(1);
  const [salariDiari, setSalariDiari] = useState<number>(formData.salariDiari || 0);

  const salariTotalBrut = dies * salariDiari;
  const ssEmpresa = salariTotalBrut * pctSSEmpresa / 100;
  const ssTreballador = salariTotalBrut * pctSSTreballador / 100;
  const irpfRetingut = salariTotalBrut * pctIRPF / 100;
  const salariNet = salariTotalBrut - ssTreballador - irpfRetingut;
  const costTotalEmpresa = salariTotalBrut + ssEmpresa;
  const totalSS = ssEmpresa + ssTreballador;

  const fmt = (n: number) =>
    n.toLocaleString('ca-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

  const rowStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.5rem 0',
    borderBottom: '1px solid var(--color-border)',
    fontSize: '0.9rem'
  };

  return (
    <div>
      <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1.5rem', color: 'var(--color-text-primary)' }}>
        🧮 Simulador de Cost Laboral
      </h3>

      {/* Inputs de simulació */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '1rem',
        marginBottom: '1.5rem'
      }}>
        <div className="form-group">
          <label className="form-label">Dies treballats</label>
          <input
            type="number"
            className="form-input"
            value={dies}
            onChange={(e) => setDies(Math.max(0, parseFloat(e.target.value) || 0))}
            min="0"
            step="0.5"
          />
        </div>
        <div className="form-group">
          <label className="form-label">Salari brut diari (€)</label>
          <input
            type="number"
            className="form-input"
            value={salariDiari}
            onChange={(e) => setSalariDiari(Math.max(0, parseFloat(e.target.value) || 0))}
            min="0"
            step="0.01"
            placeholder="0.00"
          />
        </div>
      </div>

      {/* Taula de resultats */}
      <div style={{
        background: 'var(--color-bg-secondary)',
        borderRadius: '12px',
        padding: '1.5rem',
        border: '1px solid var(--color-border)'
      }}>
        {/* Secció cost empresa */}
        <div style={{ marginBottom: '1rem' }}>
          <div style={rowStyle}>
            <span style={{ color: 'var(--color-text-secondary)' }}>Salari brut total</span>
            <span style={{ fontWeight: 500 }}>{fmt(salariTotalBrut)}</span>
          </div>
          <div style={rowStyle}>
            <span style={{ color: 'var(--color-text-secondary)' }}>
              SS càrrec empresa ({pctSSEmpresa.toFixed(1)}%)
            </span>
            <span style={{ color: '#dc2626' }}>+{fmt(ssEmpresa)}</span>
          </div>
          <div style={{
            ...rowStyle,
            borderBottom: 'none',
            borderTop: '2px solid var(--color-border)',
            marginTop: '0.5rem',
            paddingTop: '0.75rem'
          }}>
            <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--color-text-primary)' }}>
              COST TOTAL EMPRESA
            </span>
            <span style={{
              fontWeight: 700,
              fontSize: '1.1rem',
              color: '#dc2626',
              background: '#fee2e2',
              padding: '0.25rem 0.75rem',
              borderRadius: '6px'
            }}>
              {fmt(costTotalEmpresa)}
            </span>
          </div>
        </div>

        {/* Secció detall intern */}
        <div style={{
          background: 'var(--color-bg-tertiary)',
          borderRadius: '8px',
          padding: '1rem',
          marginTop: '1rem'
        }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.75rem' }}>
            Detall intern (perspectiva del treballador)
          </div>
          <div style={rowStyle}>
            <span style={{ color: 'var(--color-text-secondary)' }}>
              SS treballador ({pctSSTreballador.toFixed(2)}%)
            </span>
            <span style={{ color: '#f59e0b' }}>-{fmt(ssTreballador)}</span>
          </div>
          <div style={rowStyle}>
            <span style={{ color: 'var(--color-text-secondary)' }}>
              IRPF retingut ({pctIRPF.toFixed(1)}%)
            </span>
            <span style={{ color: '#f59e0b' }}>-{fmt(irpfRetingut)}</span>
          </div>
          <div style={{ ...rowStyle, borderBottom: 'none', fontWeight: 600 }}>
            <span style={{ color: 'var(--color-text-primary)' }}>Salari net al treballador</span>
            <span style={{ color: '#10b981', fontSize: '1rem' }}>{fmt(salariNet)}</span>
          </div>
        </div>

        {/* Secció pagaments */}
        <div style={{
          marginTop: '1rem',
          padding: '1rem',
          background: 'var(--color-bg-primary)',
          borderRadius: '8px',
          border: '1px solid var(--color-border)'
        }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.75rem' }}>
            Pagaments a realitzar
          </div>
          <div style={rowStyle}>
            <span style={{ color: 'var(--color-text-secondary)' }}>→ Al treballador</span>
            <span style={{ fontWeight: 600, color: '#10b981' }}>{fmt(salariNet)}</span>
          </div>
          <div style={rowStyle}>
            <span style={{ color: 'var(--color-text-secondary)' }}>→ A SS (empresa + treballador)</span>
            <span style={{ fontWeight: 600, color: '#3b82f6' }}>{fmt(totalSS)}</span>
          </div>
          <div style={{ ...rowStyle, borderBottom: 'none' }}>
            <span style={{ color: 'var(--color-text-secondary)' }}>→ A Hisenda (IRPF retingut)</span>
            <span style={{ fontWeight: 600, color: '#f59e0b' }}>{fmt(irpfRetingut)}</span>
          </div>
        </div>

        {/* Nota percentatges */}
        <p style={{
          marginTop: '1rem',
          fontSize: '0.78rem',
          color: 'var(--color-text-tertiary)',
          fontStyle: 'italic'
        }}>
          Percentatges aplicats: SS empresa {pctSSEmpresa}% · SS treballador {pctSSTreballador}% · IRPF {pctIRPF}%.
          Modifica'ls a la pestanya "Dades".
        </p>
      </div>
    </div>
  );
}

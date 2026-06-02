import React, { useState } from 'react';
import { Euro, Unlock } from 'lucide-react';
import type { Pagament } from '../../types/facturaCompra';

interface PagamentsManagerProps {
  pagaments: Pagament[];
  pendentPagament: number;
  onAfegirPagament: (pagament: Omit<Pagament, 'codi'>) => void;
  onEliminarPagament: (codi: string) => void;
  disabled?: boolean;
}

export default function PagamentsManager({
  pagaments,
  pendentPagament,
  onAfegirPagament,
  onEliminarPagament,
  disabled = false
}: PagamentsManagerProps) {

  const [nouPagament, setNouPagament] = useState({
    data: new Date().toISOString().split('T')[0],
    import: 0,
    metode: 'transferencia' as const,
    referencia: ''
  });

  const handlePagarPendent = () => {
    setNouPagament({ ...nouPagament, import: Math.round(pendentPagament * 100) / 100 });
  };

  const registrarPagament = () => {
    if (nouPagament.import <= 0) {
      alert('L\'import ha de ser superior a 0');
      return;
    }

    if (Math.round(nouPagament.import * 100) > Math.round(pendentPagament * 100)) {
      alert('L\'import no pot ser superior al pendent');
      return;
    }

    onAfegirPagament(nouPagament);

    setNouPagament({
      data: new Date().toISOString().split('T')[0],
      import: 0,
      metode: 'transferencia',
      referencia: ''
    });
  };

  const handleEliminarPagament = (codi: string) => {
    if (!confirm('Estàs segur que vols eliminar aquest pagament? Això desbloquearà la factura.')) {
      return;
    }
    onEliminarPagament(codi);
  };

  return (
    <div style={{
      background: 'var(--color-bg-tertiary)',
      padding: '1.5rem',
      borderRadius: '8px'
    }}>
      <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>💰 Gestió de Pagaments</h3>

      {pagaments.length > 0 && (
        <div style={{ marginBottom: '1rem' }}>
          <table style={{ width: '100%', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ textAlign: 'left', padding: '0.5rem' }}>Data</th>
                <th style={{ textAlign: 'left', padding: '0.5rem' }}>Import</th>
                <th style={{ textAlign: 'left', padding: '0.5rem' }}>Mètode</th>
                <th style={{ textAlign: 'left', padding: '0.5rem' }}>Referència</th>
                <th style={{ textAlign: 'right', padding: '0.5rem' }}>Accions</th>
              </tr>
            </thead>
            <tbody>
              {pagaments.map(pag => (
                <tr key={pag.codi} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '0.5rem' }}>{pag.data}</td>
                  <td style={{ padding: '0.5rem', fontWeight: 600 }}>{pag.import.toFixed(2)}€</td>
                  <td style={{ padding: '0.5rem' }}>{pag.metode}</td>
                  <td style={{ padding: '0.5rem' }}>{pag.referencia || '-'}</td>
                  <td style={{ padding: '0.5rem', textAlign: 'right' }}>
                    <button
                      type="button"
                      onClick={() => handleEliminarPagament(pag.codi)}
                      className="btn-secondary"
                      style={{
                        padding: '0.25rem 0.5rem',
                        fontSize: '0.75rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                      }}
                    >
                      <Unlock size={12} />
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{
            marginTop: '1rem',
            display: 'flex',
            justifyContent: 'space-between',
            fontWeight: 600,
            padding: '0.75rem',
            background: 'var(--color-bg-secondary)',
            borderRadius: '6px'
          }}>
            <span>Pendent:</span>
            <span style={{ color: pendentPagament > 0 ? 'var(--color-error-dark)' : 'var(--color-success)' }}>
              {pendentPagament.toFixed(2)}€
            </span>
          </div>
        </div>
      )}

      {Math.round(pendentPagament * 100) > 0 && !disabled && (
        <div>
          <h4 style={{ fontSize: '0.9rem', marginBottom: '0.75rem', fontWeight: 600 }}>
            Registrar Nou Pagament
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: '0.5rem', alignItems: 'end' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: '0.8rem' }}>Data</label>
              <input
                type="date"
                className="form-input"
                value={nouPagament.data}
                onChange={(e) => setNouPagament({ ...nouPagament, data: e.target.value })}
                style={{ fontSize: '0.85rem' }}
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: '0.8rem' }}>Import</label>
              <input
                type="number"
                step="0.01"
                className="form-input"
                value={nouPagament.import}
                onChange={(e) => setNouPagament({ ...nouPagament, import: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
                style={{ fontSize: '0.85rem' }}
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: '0.8rem' }}>Mètode</label>
              <select
                className="form-input"
                value={nouPagament.metode}
                onChange={(e) => setNouPagament({ ...nouPagament, metode: e.target.value as any })}
                style={{ fontSize: '0.85rem' }}
              >
                <option value="transferencia">Transferència</option>
                <option value="efectiu">Efectiu</option>
                <option value="targeta">Targeta</option>
                <option value="domiciliacio">Domiciliació</option>
              </select>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: '0.8rem' }}>Referència</label>
              <input
                type="text"
                className="form-input"
                value={nouPagament.referencia}
                onChange={(e) => setNouPagament({ ...nouPagament, referencia: e.target.value })}
                placeholder="Opcional"
                style={{ fontSize: '0.85rem' }}
              />
            </div>

            <button
              type="button"
              onClick={registrarPagament}
              className="btn-primary"
              style={{
                padding: '0.5rem 1rem',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <Euro size={16} />
              Registrar
            </button>
          </div>

          <button
            type="button"
            onClick={handlePagarPendent}
            className="btn-secondary"
            style={{
              marginTop: '0.75rem',
              padding: '0.5rem 1rem',
              fontSize: '0.85rem',
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}
          >
            💰 Pagar Tot el Pendent ({(Math.round(pendentPagament * 100) / 100).toFixed(2)}€)
          </button>
        </div>
      )}
    </div>
  );
}

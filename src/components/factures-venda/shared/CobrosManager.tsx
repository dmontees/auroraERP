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
  pagaments,
  totalFactura,
  pendentCobrar,
  onAfegirPagament,
  onEliminarPagament,
  disabled = false,
  codiFactura
}: Props) {
  
  const [nouPagament, setNouPagament] = useState<Omit<PagamentClient, 'codi'>>({
    data: new Date().toISOString().split('T')[0],
    import: 0,
    metode: 'transferencia',
    referencia: ''
  });

  const totalCobrat = pagaments.reduce((sum, p) => sum + p.import, 0);

  const handleRegistrar = () => {
    // Validación 1: Import > 0
    if (nouPagament.import <= 0) {
      alert('L\'import ha de ser superior a 0');
      return;
    }

    // Validación 2: Import <= Pendent
    if (Math.round(nouPagament.import * 100) > Math.round(pendentCobrar * 100)) {
      alert(`L'import no pot ser superior al pendent (${pendentCobrar.toFixed(2)}€)`);
      return;
    }

    onAfegirPagament(nouPagament);

    // Reset form
    setNouPagament({
      data: new Date().toISOString().split('T')[0],
      import: 0,
      metode: 'transferencia',
      referencia: ''
    });
  };

  const handleCobrarPendent = () => {
    setNouPagament({
      ...nouPagament,
      import: Math.round(pendentCobrar * 100) / 100
    });
  };

  const handleExportExcel = () => {
    exportarCobrosExcel(pagaments, codiFactura);
  };

  return (
    <div style={{
      background: 'var(--color-bg-tertiary)',
      padding: '1.5rem',
      borderRadius: '8px'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1rem'
      }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>
          💰 Registre de Pagaments
        </h3>
        
        {pagaments.length > 0 && (
          <button
            type="button"
            onClick={handleExportExcel}
            className="btn-secondary"
            style={{
              padding: '0.5rem 0.75rem',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <Download size={16} />
            Excel
          </button>
        )}
      </div>

      {/* Resumen */}
      <div style={{
        background: 'var(--color-bg-secondary)',
        padding: '1rem',
        borderRadius: '6px',
        marginBottom: '1.5rem'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <span>Total Factura:</span>
          <span style={{ fontWeight: 600 }}>{totalFactura.toFixed(2)}€</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <span>Total Cobrat:</span>
          <span style={{ fontWeight: 600, color: '#10b981' }}>{totalCobrat.toFixed(2)}€</span>
        </div>
        <div style={{
          borderTop: '2px solid var(--color-border)',
          paddingTop: '0.75rem',
          marginTop: '0.75rem',
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '1.2rem',
          fontWeight: 700
        }}>
          <span>PENDENT:</span>
          <span style={{ color: pendentCobrar > 0 ? '#dc2626' : '#10b981' }}>
            {pendentCobrar.toFixed(2)}€
          </span>
        </div>
      </div>

      {/* Tabla de pagos existentes */}
      {pagaments.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.75rem' }}>
            Pagaments Registrats
          </h4>
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
                  <td style={{ padding: '0.5rem' }}>
                    {new Date(pag.data).toLocaleDateString('ca-ES')}
                  </td>
                  <td style={{ padding: '0.5rem', fontWeight: 600 }}>
                    {pag.import.toFixed(2)}€
                  </td>
                  <td style={{ padding: '0.5rem' }}>{pag.metode}</td>
                  <td style={{ padding: '0.5rem' }}>{pag.referencia || '-'}</td>
                  <td style={{ padding: '0.5rem', textAlign: 'right' }}>
                    <button
                      type="button"
                      onClick={() => onEliminarPagament(pag.codi)}
                      className="btn-secondary"
                      style={{
                        padding: '0.25rem 0.5rem',
                        fontSize: '0.75rem'
                      }}
                      disabled={disabled}
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Registrar nuevo pago */}
      {Math.round(pendentCobrar * 100) > 0 && !disabled && (
        <div>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.75rem' }}>
            Registrar Nou Pagament
          </h4>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '150px 120px 150px 1fr auto', 
            gap: '0.5rem', 
            alignItems: 'end',
            marginBottom: '0.75rem'
          }}>
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
                <option value="altres">Altres</option>
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
              onClick={handleRegistrar}
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

          {/* Botón Cobrar Pendent */}
          <button
            type="button"
            onClick={handleCobrarPendent}
            className="btn-secondary"
            style={{
              padding: '0.5rem 1rem',
              fontSize: '0.85rem',
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}
          >
            💰 Cobrar Tot el Pendent ({pendentCobrar.toFixed(2)}€)
          </button>
        </div>
      )}
    </div>
  );
}
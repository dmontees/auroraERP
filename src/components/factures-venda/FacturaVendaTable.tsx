import React from 'react';
import { FileText } from 'lucide-react';
import type { FacturaVenta } from '../../types/facturaVenta';
import type { Client } from '../../types/client';
import type { Projecte } from '../../types/projecte';
import { ESTAT_FACTURA_COLORS } from '../../types/facturaVenta';
import { getTipusComercialFactura } from '../../utils/facturaBestretes';

interface Props {
  factures: FacturaVenta[];
  clients: Client[];
  projectes: Projecte[];
  onEdit: (factura: FacturaVenta) => void;
  onCrearRectificativa: (factura: FacturaVenta) => void; // ← NUEVO
}

export default function FacturaVendaTable({ 
  factures, 
  clients, 
  projectes, 
  onEdit,
  onCrearRectificativa // ← NUEVO
}: Props) {
  const getClientName = (codiClient: string) => {
    const client = clients.find(c => c.codi === codiClient);
    return client ? (client.nomComercial || client.nomFiscal) : codiClient;
  };

  const getProjecteName = (codiProjecte?: string) => {
    if (!codiProjecte) return '-';
    const projecte = projectes.find(p => p.codi === codiProjecte);
    return projecte ? `${projecte.codi} - ${projecte.titol}` : codiProjecte;
  };

  return (
    <div className="placeholder-card">
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
            <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>
              Tipus {/* ← NUEVO */}
            </th>
            <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>
              Estat
            </th>
            <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>
              Codi
            </th>
            <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>
              Client
            </th>
            <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>
              Projecte
            </th>
            <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>
              Data Factura
            </th>
            <th style={{ textAlign: 'right', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>
              Total
            </th>
            <th style={{ textAlign: 'right', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>
              Pendent Cobrar
            </th>
            <th style={{ textAlign: 'center', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>
              Accions {/* ← NUEVO */}
            </th>
          </tr>
        </thead>
        <tbody>
          {factures.length === 0 ? (
            <tr>
              <td colSpan={9} style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-tertiary)' }}>
                No hi ha factures que coincideixin amb els filtres
              </td>
            </tr>
          ) : (
            factures.map(factura => {
              const estatInfo = ESTAT_FACTURA_COLORS[factura.estat] || ESTAT_FACTURA_COLORS['borrador'];
              const esRectificativa = factura.tipus === 'rectificativa';
              const tipusComercial = getTipusComercialFactura(factura);
              const potCrearRectificativa = factura.tipus !== 'rectificativa';
              
              return (
                <tr 
                  key={factura.codi}
                  style={{ 
                    borderBottom: '1px solid var(--color-border)',
                  }}
                  className="table-row-hover"
                >
                  {/* ← NUEVO: Columna tipo */}
                  <td style={{ padding: '0.75rem' }}>
                    {esRectificativa ? (
                      <span style={{
                        background: 'var(--color-error-dark)',
                        color: 'white',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        display: 'inline-block'
                      }}>
                        RECTIF.
                      </span>
                    ) : tipusComercial === 'bestreta' ? (
                      <span style={{
                        background: 'var(--color-warning)',
                        color: 'white',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        display: 'inline-block'
                      }}>
                        BESTRETA
                      </span>
                    ) : tipusComercial === 'final' ? (
                      <span style={{
                        background: 'var(--color-success)',
                        color: 'white',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        display: 'inline-block'
                      }}>
                        FINAL
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.85rem', color: 'var(--color-text-tertiary)' }}>
                        Normal
                      </span>
                    )}
                  </td>

                  <td 
                    style={{ padding: '0.75rem', cursor: 'pointer' }}
                    onClick={() => onEdit(factura)}
                  >
                    <span style={{
                      background: estatInfo.bg,
                      color: estatInfo.text,
                      padding: '0.35rem 0.75rem',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      display: 'inline-block'
                    }}>
                      {estatInfo.icon} {estatInfo.label}
                    </span>
                  </td>

                  <td 
                    style={{ padding: '0.75rem', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer' }}
                    onClick={() => onEdit(factura)}
                  >
                    {factura.codi}
                    {esRectificativa && factura.facturaRectificada && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginTop: '0.25rem' }}>
                        Rectifica: {factura.facturaRectificada}
                      </div>
                    )}
                  </td>

                  <td 
                    style={{ padding: '0.75rem', cursor: 'pointer' }}
                    onClick={() => onEdit(factura)}
                  >
                    {getClientName(factura.client)}
                  </td>

                  <td 
                    style={{ padding: '0.75rem', fontSize: '0.9rem', color: 'var(--color-text-secondary)', cursor: 'pointer' }}
                    onClick={() => onEdit(factura)}
                  >
                    {getProjecteName(factura.projecte)}
                  </td>

                  <td 
                    style={{ padding: '0.75rem', fontSize: '0.9rem', cursor: 'pointer' }}
                    onClick={() => onEdit(factura)}
                  >
                    {new Date(factura.dataFactura).toLocaleDateString('ca-ES')}
                  </td>

                  <td
                    style={{
                      padding: '0.75rem',
                      textAlign: 'right',
                      fontWeight: 600,
                      color: factura.totalFactura < 0 ? 'var(--color-error-dark)' : 'inherit',
                      cursor: 'pointer',
                      position: 'relative'
                    }}
                    onClick={() => onEdit(factura)}
                  >
                    {factura.avisFacturacio?.actiu && (
                      <span
                        title={factura.avisFacturacio.descripcio || 'Avís de facturació actiu'}
                        style={{ position: 'absolute', top: '6px', right: '4px', fontSize: '0.8rem', lineHeight: 1, cursor: 'help' }}
                      >
                        ⚠️
                      </span>
                    )}
                    {(factura.totalFactura || 0).toLocaleString('ca-ES', { minimumFractionDigits: 2 })}€
                  </td>

                  <td 
                    style={{ 
                      padding: '0.75rem', 
                      textAlign: 'right', 
                      fontWeight: 600,
                      color: factura.pendentCobrar > 0 ? 'var(--color-error-dark)' : 'var(--color-success)',
                      cursor: 'pointer'
                    }}
                    onClick={() => onEdit(factura)}
                  >
                    {(factura.pendentCobrar || 0).toLocaleString('ca-ES', { minimumFractionDigits: 2 })}€
                  </td>

                  {/* ← NUEVO: Columna acciones */}
                  <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                    {potCrearRectificativa && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onCrearRectificativa(factura);
                        }}
                        className="btn-secondary"
                        style={{
                          padding: '0.35rem 0.75rem',
                          fontSize: '0.75rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}
                        title="Crear nota de crèdit"
                      >
                        <FileText size={14} />
                        Nota Crèdit
                      </button>
                    )}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

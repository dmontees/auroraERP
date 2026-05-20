import React from 'react';
import type { FacturaVenta } from '../../types/facturaVenta';
import type { Client } from '../../types/client';
import type { Projecte } from '../../types/projecte';
import { ESTAT_FACTURA_COLORS } from '../../types/facturaVenta';

interface Props {
  factures: FacturaVenta[];
  clients: Client[];
  projectes: Projecte[];
  onEdit: (factura: FacturaVenta) => void;
}

export default function FacturaVendaTable({ factures, clients, projectes, onEdit }: Props) {
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
          </tr>
        </thead>
        <tbody>
          {factures.length === 0 ? (
            <tr>
              <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-tertiary)' }}>
                No hi ha factures que coincideixin amb els filtres
              </td>
            </tr>
          ) : (
            factures.map(factura => {
              const estatInfo = ESTAT_FACTURA_COLORS[factura.estat as EstatFacturaVenta] || ESTAT_FACTURA_COLORS['borrador'];              
              return (
                <tr 
                  key={factura.codi}
                  onClick={() => onEdit(factura)}
                  style={{ 
                    borderBottom: '1px solid var(--color-border)',
                    cursor: 'pointer'
                  }}
                  className="table-row-hover"
                >
                  <td style={{ padding: '0.75rem' }}>
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
                  <td style={{ padding: '0.75rem', fontWeight: 600, fontSize: '0.9rem' }}>
                    {factura.codi}
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    {getClientName(factura.client)}
                  </td>
                  <td style={{ padding: '0.75rem', fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
                    {getProjecteName(factura.projecte)}
                  </td>
                  <td style={{ padding: '0.75rem', fontSize: '0.9rem' }}>
                    {new Date(factura.dataFactura).toLocaleDateString('ca-ES')}
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600 }}>
                  {(factura.totalFactura || 0).toLocaleString('ca-ES', { minimumFractionDigits: 2 })}€                  </td>
                  <td style={{ 
                    padding: '0.75rem', 
                    textAlign: 'right', 
                    fontWeight: 600,
                    color: factura.pendentCobrar > 0 ? '#dc2626' : '#10b981'
                  }}>
{(factura.pendentCobrar || 0).toLocaleString('ca-ES', { minimumFractionDigits: 2 })}€
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
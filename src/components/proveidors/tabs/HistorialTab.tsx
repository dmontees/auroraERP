import React from 'react';
import { TrendingUp, FileText, Briefcase, Calendar } from 'lucide-react';

interface HistorialTabProps {
  hook: {
    formData: any;
    historial: {
      totalFacturat: number;
      numFactures: number;
      ultimaFactura: string | null;
      mitjanaFactura: number;
      factures: any[];
      pressupostos: any[];
      projectes: any[];
    } | null;
  };
}

export default function HistorialTab({ hook }: HistorialTabProps) {
  const { formData, historial } = hook;
  const isTreballador = formData.tipus === 'Treballador';

  if (!historial) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '4rem',
        color: 'var(--color-text-tertiary)'
      }}>
        <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>
          {isTreballador ? 'Aquest és un treballador nou' : 'Aquest és un proveïdor nou'}
        </p>
        <p style={{ fontSize: '0.9rem' }}>
          {isTreballador
            ? 'L\'historial es mostrarà quan estigui vinculat a projectes'
            : 'L\'historial es mostrarà quan hi hagi factures o projectes relacionats'}
        </p>
      </div>
    );
  }

  if (isTreballador) {
    return (
      <div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{ padding: '1.25rem', background: '#f0f9ff', borderRadius: '8px', border: '1px solid var(--color-info-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <Briefcase size={18} style={{ color: 'var(--color-info-dark)' }} />
              <span style={{ fontSize: '0.75rem', color: 'var(--color-info-dark)', fontWeight: 600 }}>PROJECTES VINCULATS</span>
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 600, color: 'var(--color-info-dark)' }}>
              {historial.projectes.length}
            </div>
          </div>
          <div style={{ padding: '1.25rem', background: '#f3f4f6', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <FileText size={18} style={{ color: 'var(--color-text-secondary)' }} />
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>PRESSUPOSTOS</span>
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
              {historial.pressupostos.length}
            </div>
          </div>
        </div>

        {historial.projectes.length > 0 ? (
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--color-text-primary)' }}>
              Projectes vinculats ({historial.projectes.length})
            </h3>
            <div style={{ border: '1px solid var(--color-border)', borderRadius: '8px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f9fafb', borderBottom: '1px solid var(--color-border)' }}>
                    <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600 }}>Codi</th>
                    <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600 }}>Nom</th>
                    <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600 }}>Estat</th>
                  </tr>
                </thead>
                <tbody>
                  {historial.projectes.map(projecte => (
                    <tr key={projecte.codi} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '0.75rem', fontWeight: 500 }}>{projecte.codi}</td>
                      <td style={{ padding: '0.75rem' }}>{projecte.nom || projecte.titol || '-'}</td>
                      <td style={{ padding: '0.75rem' }}>
                        <span style={{ padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, background: 'var(--color-info-bg)', color: 'var(--color-info-dark)' }}>
                          {projecte.estat?.toUpperCase() || 'ACTIU'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-tertiary)', border: '2px dashed var(--color-border)', borderRadius: '8px' }}>
            <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Encara no hi ha activitat</p>
            <p style={{ fontSize: '0.9rem' }}>Aquest treballador no té projectes vinculats</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      {/* STATS CARDS */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        <div style={{
          padding: '1.25rem',
          background: '#f0f9ff',
          borderRadius: '8px',
          border: '1px solid var(--color-info-border)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '0.5rem'
          }}>
            <TrendingUp size={18} style={{ color: 'var(--color-info-dark)' }} />
            <span style={{ fontSize: '0.75rem', color: 'var(--color-info-dark)', fontWeight: 600 }}>
              TOTAL FACTURAT
            </span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 600, color: 'var(--color-info-dark)' }}>
            {historial.totalFacturat.toFixed(2)}€
          </div>
        </div>

        <div style={{
          padding: '1.25rem',
          background: '#f0fdf4',
          borderRadius: '8px',
          border: '1px solid #bbf7d0'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '0.5rem'
          }}>
            <FileText size={18} style={{ color: '#15803d' }} />
            <span style={{ fontSize: '0.75rem', color: '#15803d', fontWeight: 600 }}>
              FACTURES
            </span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 600, color: '#15803d' }}>
            {historial.numFactures}
          </div>
        </div>

        <div style={{
          padding: '1.25rem',
          background: 'var(--color-warning-bg)',
          borderRadius: '8px',
          border: '1px solid var(--color-warning-border)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '0.5rem'
          }}>
            <Briefcase size={18} style={{ color: 'var(--color-warning-dark)' }} />
            <span style={{ fontSize: '0.75rem', color: 'var(--color-warning-dark)', fontWeight: 600 }}>
              MITJANA FACTURA
            </span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 600, color: 'var(--color-warning-dark)' }}>
            {historial.mitjanaFactura.toFixed(2)}€
          </div>
        </div>

        <div style={{
          padding: '1.25rem',
          background: '#f3f4f6',
          borderRadius: '8px',
          border: '1px solid var(--color-border)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '0.5rem'
          }}>
            <Calendar size={18} style={{ color: 'var(--color-text-secondary)' }} />
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
              ÚLTIMA FACTURA
            </span>
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
            {historial.ultimaFactura
              ? new Date(historial.ultimaFactura).toLocaleDateString('ca-ES')
              : 'Cap'}
          </div>
        </div>
      </div>

      {/* FACTURAS */}
      {historial.factures.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{
            fontSize: '1.1rem',
            fontWeight: 600,
            marginBottom: '1rem',
            color: 'var(--color-text-primary)'
          }}>
            Factures de compra ({historial.factures.length})
          </h3>

          <div style={{
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
            overflow: 'hidden'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '1px solid var(--color-border)' }}>
                  <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600 }}>
                    Número
                  </th>
                  <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600 }}>
                    Data
                  </th>
                  <th style={{ textAlign: 'right', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600 }}>
                    Base
                  </th>
                  <th style={{ textAlign: 'right', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600 }}>
                    IVA
                  </th>
                  <th style={{ textAlign: 'right', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600 }}>
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {historial.factures
                  .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
                  .map(factura => (
                    <tr
                      key={factura.id}
                      style={{ borderBottom: '1px solid var(--color-border)' }}
                    >
                      <td style={{ padding: '0.75rem', fontWeight: 500 }}>
                        {factura.numeroFactura}
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        {new Date(factura.data).toLocaleDateString('ca-ES')}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                        {factura.base?.toFixed(2)}€
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                        {factura.iva?.toFixed(2)}€
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600 }}>
                        {factura.total?.toFixed(2)}€
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PRESUPUESTOS */}
      {historial.pressupostos.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ 
            fontSize: '1.1rem', 
            fontWeight: 600, 
            marginBottom: '1rem',
            color: 'var(--color-text-primary)'
          }}>
            Pressupostos vinculats ({historial.pressupostos.length})
          </h3>
          
          <div style={{
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
            overflow: 'hidden'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '1px solid var(--color-border)' }}>
                  <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600 }}>
                    Codi
                  </th>
                  <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600 }}>
                    Projecte
                  </th>
                  <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600 }}>
                    Estat
                  </th>
                  <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600 }}>
                    Data
                  </th>
                </tr>
              </thead>
              <tbody>
                {historial.pressupostos.map(pressupost => (
                  <tr 
                    key={pressupost.codi}
                    style={{ borderBottom: '1px solid var(--color-border)' }}
                  >
                    <td style={{ padding: '0.75rem', fontWeight: 500 }}>
                      {pressupost.codi}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      {pressupost.nomProjecte || '-'}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <span style={{
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        background: pressupost.estat === 'acceptat' ? 'var(--color-success-bg)' : '#f3f4f6',
                        color: pressupost.estat === 'acceptat' ? 'var(--color-success-dark)' : 'var(--color-text-secondary)'
                      }}>
                        {pressupost.estat.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      {new Date(pressupost.data).toLocaleDateString('ca-ES')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PROYECTOS */}
      {historial.projectes.length > 0 && (
        <div>
          <h3 style={{ 
            fontSize: '1.1rem', 
            fontWeight: 600, 
            marginBottom: '1rem',
            color: 'var(--color-text-primary)'
          }}>
            Projectes vinculats ({historial.projectes.length})
          </h3>
          
          <div style={{
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
            overflow: 'hidden'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '1px solid var(--color-border)' }}>
                  <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600 }}>
                    Codi
                  </th>
                  <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600 }}>
                    Nom
                  </th>
                  <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600 }}>
                    Estat
                  </th>
                </tr>
              </thead>
              <tbody>
                {historial.projectes.map(projecte => (
                  <tr 
                    key={projecte.codi}
                    style={{ borderBottom: '1px solid var(--color-border)' }}
                  >
                    <td style={{ padding: '0.75rem', fontWeight: 500 }}>
                      {projecte.codi}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      {projecte.nom}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <span style={{
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        background: 'var(--color-info-bg)',
                        color: 'var(--color-info-dark)'
                      }}>
                        {projecte.estat?.toUpperCase() || 'ACTIU'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SIN ACTIVIDAD */}
      {historial.factures.length === 0 && 
       historial.pressupostos.length === 0 && 
       historial.projectes.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '3rem',
          color: 'var(--color-text-tertiary)',
          border: '2px dashed var(--color-border)',
          borderRadius: '8px'
        }}>
          <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>
            Encara no hi ha activitat
          </p>
          <p style={{ fontSize: '0.9rem' }}>
            Aquest proveïdor no té factures, pressupostos ni projectes vinculats
          </p>
        </div>
      )}
    </div>
  );
}
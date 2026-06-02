import React from 'react';
import { Users, TrendingUp, Award, Info } from 'lucide-react';
import type { Periode } from '../../../utils/resultatCalculs';
import { estaEnPeriode, formatCurrency, getProjecteIngressos } from '../../../utils/resultatCalculs';
import type { Client } from '../../../types/client';
import type { Projecte } from '../../../types/projecte';
import type { FacturaVenta } from '../../../types/facturaVenda';

interface AnalisiClientsProps {
  periode: Periode;
  clients: Client[];
  projectes: Projecte[];
  facturesVenda: FacturaVenda[];
}

export default function AnalisiClients({
  periode,
  clients,
  projectes,
  facturesVenda
}: AnalisiClientsProps) {
  
  // Calcular datos por cliente
  const clientsAmbDades = clients
  .map(client => {
    const projectesClient = projectes.filter(p => 
      p.client === client.codi && p.dataInici && estaEnPeriode(p.dataInici, periode)
    );
    
    // Calcular facturación y pendiente
    let facturacio = 0;
    let pendent = 0;
    
    projectesClient.forEach(p => {
      const factura = facturesVenda.find(f => f.projecte === p.codi);
      const ingressos = getProjecteIngressos(p, facturesVenda);

      facturacio += ingressos;

      if (factura) {
        pendent += factura.pendentCobrar;
      } else if (!p.facturaHistorica) {
        pendent += ingressos;
      }
    });
    
    const numProjectes = projectesClient.length;
    
    // Calcular margen promedio
    const projectesAmbDades = projectesClient.map(p => {
      const recursosHumans = p.recursosHumans?.reduce((sum, r) => sum + (r.cost || 0), 0) || 0;
      const materials = p.materials?.reduce((sum, m) => sum + (m.preuProveidor || 0) * (m.jornades ?? 1), 0) || 0;
      const despeses = recursosHumans + materials;
      const ingressos = getProjecteIngressos(p, facturesVenda);
      const benefici = ingressos - despeses;
      const marge = ingressos > 0 ? (benefici / ingressos * 100) : 0;
      return marge;
    });
      
      const margeMitja = projectesAmbDades.length > 0
        ? projectesAmbDades.reduce((sum, m) => sum + m, 0) / projectesAmbDades.length
        : 0;
      
      // Determinar segmento
      let segment = 'Nou';
      if (facturacio > 50000) segment = 'VIP';
      else if (numProjectes >= 3) segment = 'Habitual';
      else if (numProjectes === 0) segment = 'Inactiu';
      
      return {
        ...client,
        numProjectes,
        facturacio,
        pendent,
        margeMitja,
        segment
      };
    })
    .filter(c => c.facturacio > 0 || c.numProjectes > 0)
    .sort((a, b) => b.facturacio - a.facturacio);
  
  // Estadísticas generales
  const totalClients = clientsAmbDades.length;
  const facturacioTotal = clientsAmbDades.reduce((sum, c) => sum + c.facturacio, 0);
  const facturacioMitja = totalClients > 0 ? facturacioTotal / totalClients : 0;
  const projectesMitjos = totalClients > 0 
    ? clientsAmbDades.reduce((sum, c) => sum + c.numProjectes, 0) / totalClients 
    : 0;
  
  // Segmentación
  const segmentacio = {
    VIP: clientsAmbDades.filter(c => c.segment === 'VIP').length,
    Habitual: clientsAmbDades.filter(c => c.segment === 'Habitual').length,
    Nou: clientsAmbDades.filter(c => c.segment === 'Nou').length,
    Inactiu: clientsAmbDades.filter(c => c.segment === 'Inactiu').length
  };
  
  return (
    <div>
      {/* Explanation banner */}
      <div style={{
        background: 'var(--color-bg-secondary)',
        border: '1px solid var(--color-border)',
        borderLeft: '4px solid #8b5cf6',
        borderRadius: '8px',
        padding: '1rem 1.25rem',
        marginBottom: '2rem',
        display: 'flex',
        gap: '0.75rem',
        alignItems: 'flex-start',
      }}>
        <Info size={18} style={{ color: 'var(--color-purple)', flexShrink: 0, marginTop: '2px' }} />
        <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
          <strong style={{ color: 'var(--color-text-primary)' }}>Anàlisi de clients</strong>
          {' '}— Rànquing de clients per volum de facturació en el període. La columna <em>Pendent</em>{' '}
          indica quant d'aquell client no has cobrat encara. El <em>Marge mig</em> és la rendibilitat
          promig dels seus projectes (ingressos menys costos interns).
        </div>
      </div>

      {/* KPIs */}
      {(() => {
        const G_INDIGO = 'linear-gradient(135deg, #4338ca, #6366f1, #818cf8)';
        const G_GREEN  = 'linear-gradient(135deg, #059669, #10b981, #34d399)';
        const G_BLUE   = 'linear-gradient(135deg, #1d4ed8, #3b82f6, #60a5fa)';
        const G_AMBER  = 'linear-gradient(135deg, #d97706, #f59e0b, #fbbf24)';
        const gSpan = (v: React.ReactNode, g: string) => (
          <span style={{ background: g, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{v}</span>
        );
        return (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
            <div className="stat-card">
              <div className="stat-card-stripe" style={{ background: G_INDIGO }} />
              <div className="stat-card-body">
                <div className="stat-card-label"><Users size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.3rem' }} />Clients Actius</div>
                <div className="stat-card-value">{gSpan(totalClients, G_INDIGO)}</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-card-stripe" style={{ background: G_GREEN }} />
              <div className="stat-card-body">
                <div className="stat-card-label">Facturació Mitjana</div>
                <div className="stat-card-value">{gSpan(formatCurrency(facturacioMitja), G_GREEN)}</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-card-stripe" style={{ background: G_BLUE }} />
              <div className="stat-card-body">
                <div className="stat-card-label">Projectes Mitjans</div>
                <div className="stat-card-value">{gSpan(projectesMitjos.toFixed(1), G_BLUE)}</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-card-stripe" style={{ background: G_AMBER }} />
              <div className="stat-card-body">
                <div className="stat-card-label"><Award size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.3rem' }} />Clients VIP</div>
                <div className="stat-card-value">{gSpan(segmentacio.VIP, G_AMBER)}</div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Segmentación */}
      <div style={{
        background: 'var(--color-bg-secondary)',
        padding: '1.5rem',
        borderRadius: '12px',
        border: '1px solid var(--color-border)',
        marginBottom: '2rem'
      }}>
        <h3 style={{ 
          fontSize: '1rem', 
          fontWeight: 600, 
          marginBottom: '1rem',
          color: 'var(--color-text-primary)'
        }}>
          Segmentació de Clients
        </h3>
        
        {(() => {
          const segs = [
            { segment: 'VIP',     count: segmentacio.VIP,     gradient: 'linear-gradient(135deg, #d97706, #f59e0b, #fbbf24)', desc: '>50.000€' },
            { segment: 'Habitual',count: segmentacio.Habitual, gradient: 'linear-gradient(135deg, #1d4ed8, #3b82f6, #60a5fa)', desc: '3-10 projectes' },
            { segment: 'Nou',     count: segmentacio.Nou,      gradient: 'linear-gradient(135deg, #059669, #10b981, #34d399)', desc: '1-2 projectes' },
            { segment: 'Inactiu', count: segmentacio.Inactiu,  gradient: 'linear-gradient(135deg, #475569, #64748b, #94a3b8)', desc: 'Sense projectes' },
          ];
          const gSpan = (v: React.ReactNode, g: string) => (
            <span style={{ background: g, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{v}</span>
          );
          return (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
              {segs.map(s => (
                <div key={s.segment} className="stat-card">
                  <div className="stat-card-stripe" style={{ background: s.gradient }} />
                  <div className="stat-card-body">
                    <div className="stat-card-label">{s.desc}</div>
                    <div className="stat-card-value">{gSpan(s.count, s.gradient)}</div>
                    <div className="stat-card-sub" style={{ fontWeight: 600 }}>{s.segment}</div>
                  </div>
                </div>
              ))}
            </div>
          );
        })()}
      </div>

      {/* Tabla de clientes */}
      <div style={{
        background: 'var(--color-bg-secondary)',
        borderRadius: '12px',
        border: '1px solid var(--color-border)',
        overflow: 'hidden'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--color-border)', background: 'var(--color-bg-tertiary)' }}>
              <th style={{ textAlign: 'left', padding: '1rem', fontSize: '0.85rem', fontWeight: 600 }}>
                Client
              </th>
              <th style={{ textAlign: 'center', padding: '1rem', fontSize: '0.85rem', fontWeight: 600 }}>
                Núm. Projectes
              </th>
              <th style={{ textAlign: 'right', padding: '1rem', fontSize: '0.85rem', fontWeight: 600 }}>
                Facturació
              </th>
              <th style={{ textAlign: 'right', padding: '1rem', fontSize: '0.85rem', fontWeight: 600 }}>
                Pendent
              </th>
              <th style={{ textAlign: 'right', padding: '1rem', fontSize: '0.85rem', fontWeight: 600 }}>
                Marge Mitjà
              </th>
              <th style={{ textAlign: 'center', padding: '1rem', fontSize: '0.85rem', fontWeight: 600 }}>
                Segment
              </th>
            </tr>
          </thead>
          <tbody>
            {clientsAmbDades.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ 
                  textAlign: 'center', 
                  padding: '2rem',
                  color: 'var(--color-text-tertiary)'
                }}>
                  No hi ha clients en aquest període
                </td>
              </tr>
            ) : (
              clientsAmbDades.map(client => (
                <tr 
                  key={client.codi}
                  style={{ borderBottom: '1px solid var(--color-border)' }}
                  className="table-row-hover"
                >
                  <td style={{ padding: '0.75rem' }}>
                    <div style={{ fontWeight: 600 }}>
                      {client.nomComercial || client.nomFiscal}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>
                      {client.codi}
                    </div>
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 600 }}>
                    {client.numProjectes}
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600, color: 'var(--color-success)' }}>
                    {formatCurrency(client.facturacio)}
                  </td>
                  <td style={{ 
                    padding: '0.75rem', 
                    textAlign: 'right', 
                    fontWeight: 600,
                    color: client.pendent > 0 ? 'var(--color-warning)' : 'var(--color-text-tertiary)'
                  }}>
                    {formatCurrency(client.pendent)}
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600 }}>
                    {client.margeMitja.toFixed(1)}%
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                    <span style={{
                      padding: '0.25rem 0.75rem',
                      borderRadius: '12px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      background: 
                        client.segment === 'VIP' ? 'var(--color-warning-bg)' :
                        client.segment === 'Habitual' ? 'var(--color-info-bg)' :
                        client.segment === 'Nou' ? 'var(--color-success-bg)' : '#f3f4f6',
                      color:
                        client.segment === 'VIP' ? 'var(--color-warning-dark)' :
                        client.segment === 'Habitual' ? 'var(--color-info-dark)' :
                        client.segment === 'Nou' ? 'var(--color-success-dark)' : '#4b5563'
                    }}>
                      {client.segment}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
import React from 'react';
import { Users, TrendingUp, Award } from 'lucide-react';
import type { Periode } from '../../../utils/resultatCalculs';
import { estaEnPeriode, formatCurrency } from '../../../utils/resultatCalculs';
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
      // 1. Buscar factura vinculada
      const factura = facturesVenda.find(f => f.projecte === p.codi);
      
      if (factura) {
        // Proyecto con factura real
        facturacio += factura.totalFactura;
        pendent += factura.pendentCobrar;
      } else {
        // Proyecto sin factura: calcular desde tasques o campo directo
        let ingressos = 0;
        
        if (p.tasques && p.tasques.length > 0) {
          ingressos = p.tasques.reduce((sum, t) => sum + (t.importe || 0), 0);
        } else if (p.ingresSenseIVA) {
          ingressos = p.ingresSenseIVA;
        }
        
        facturacio += ingressos;
        // Proyectos importados con factura histórica se consideran cobrados
        if (!p.facturaHistorica) {
          pendent += ingressos; // Sin factura = todo pendiente
        }
        // Si tiene facturaHistorica, pendent += 0 (ya cobrado)
      }
    });
    
    const numProjectes = projectesClient.length;
    
    // Calcular margen promedio
    const projectesAmbDades = projectesClient.map(p => {
      const recursosHumans = p.recursosHumans?.reduce((sum, r) => sum + (r.cost || 0), 0) || 0;
      const materials = p.materials?.reduce((sum, m) => sum + (m.preuProveidor || 0), 0) || 0;
      const despeses = recursosHumans + materials;
      
      // Calcular ingressos con misma lógica
      const factura = facturesVenda.find(f => f.projecte === p.codi);
      let ingressos = factura?.totalFactura || 0;
      
      if (ingressos === 0 && p.tasques && p.tasques.length > 0) {
        ingressos = p.tasques.reduce((sum, t) => sum + (t.importe || 0), 0);
      }
      
      if (ingressos === 0 && p.ingresSenseIVA) {
        ingressos = p.ingresSenseIVA;
      }
      
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
      {/* KPIs */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(4, 1fr)', 
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        <div style={{
          background: 'var(--color-bg-secondary)',
          padding: '1rem',
          borderRadius: '8px',
          border: '1px solid var(--color-border)'
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem',
            marginBottom: '0.5rem',
            color: 'var(--color-text-tertiary)',
            fontSize: '0.75rem'
          }}>
            <Users size={16} />
            Clients Actius
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>
            {totalClients}
          </div>
        </div>
        
        <div style={{
          background: 'var(--color-bg-secondary)',
          padding: '1rem',
          borderRadius: '8px',
          border: '1px solid var(--color-border)'
        }}>
          <div style={{ 
            fontSize: '0.75rem',
            color: 'var(--color-text-tertiary)',
            marginBottom: '0.5rem'
          }}>
            Facturació Mitjana
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#10b981' }}>
            {formatCurrency(facturacioMitja)}
          </div>
        </div>
        
        <div style={{
          background: 'var(--color-bg-secondary)',
          padding: '1rem',
          borderRadius: '8px',
          border: '1px solid var(--color-border)'
        }}>
          <div style={{ 
            fontSize: '0.75rem',
            color: 'var(--color-text-tertiary)',
            marginBottom: '0.5rem'
          }}>
            Projectes Mitjans
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#3b82f6' }}>
            {projectesMitjos.toFixed(1)}
          </div>
        </div>
        
        <div style={{
          background: 'var(--color-bg-secondary)',
          padding: '1rem',
          borderRadius: '8px',
          border: '1px solid var(--color-border)'
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem',
            marginBottom: '0.5rem',
            color: 'var(--color-text-tertiary)',
            fontSize: '0.75rem'
          }}>
            <Award size={16} />
            Clients VIP
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f59e0b' }}>
            {segmentacio.VIP}
          </div>
        </div>
      </div>

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
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
          {[
            { segment: 'VIP', count: segmentacio.VIP, color: '#f59e0b', desc: '>50.000€' },
            { segment: 'Habitual', count: segmentacio.Habitual, color: '#3b82f6', desc: '3-10 projectes' },
            { segment: 'Nou', count: segmentacio.Nou, color: '#10b981', desc: '1-2 projectes' },
            { segment: 'Inactiu', count: segmentacio.Inactiu, color: '#6b7280', desc: 'Sense projectes' }
          ].map(s => (
            <div key={s.segment} style={{
              padding: '1rem',
              borderRadius: '8px',
              background: 'var(--color-bg-tertiary)',
              border: `2px solid ${s.color}`
            }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginBottom: '0.25rem' }}>
                {s.desc}
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: s.color, marginBottom: '0.25rem' }}>
                {s.count}
              </div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                {s.segment}
              </div>
            </div>
          ))}
        </div>
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
                  <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600, color: '#10b981' }}>
                    {formatCurrency(client.facturacio)}
                  </td>
                  <td style={{ 
                    padding: '0.75rem', 
                    textAlign: 'right', 
                    fontWeight: 600,
                    color: client.pendent > 0 ? '#f59e0b' : 'var(--color-text-tertiary)'
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
                        client.segment === 'VIP' ? '#fef3c7' :
                        client.segment === 'Habitual' ? '#dbeafe' :
                        client.segment === 'Nou' ? '#d1fae5' : '#f3f4f6',
                      color:
                        client.segment === 'VIP' ? '#92400e' :
                        client.segment === 'Habitual' ? '#1e40af' :
                        client.segment === 'Nou' ? '#065f46' : '#4b5563'
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
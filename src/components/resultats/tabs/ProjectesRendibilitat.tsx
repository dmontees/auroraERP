import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { Periode } from '../../../utils/resultatCalculs';
import { estaEnPeriode, formatCurrency } from '../../../utils/resultatCalculs';
import type { Projecte } from '../../../types/projecte';
import type { FacturaVenta } from '../../../types/facturaVenda';
import type { Client } from '../../../types/client';

interface ProjectesRendibilitatProps {
  periode: Periode;
  projectes: Projecte[];
  facturesVenda: FacturaVenta[];
  clients: Client[];
}

export default function ProjectesRendibilitat({
  periode,
  projectes,
  facturesVenda,
  clients
}: ProjectesRendibilitatProps) {
  const [expandit, setExpandit] = useState<string | null>(null);
  
  // Calcular datos de cada proyecto
  const projectesAmbDades = projectes
    .filter(p => p.dataInici && estaEnPeriode(p.dataInici, periode))
    .map(p => {
      // Calcular despeses
      const recursosHumans = p.recursosHumans?.reduce((sum, r) => sum + (r.cost || 0), 0) || 0;
      const materials = p.materials?.reduce((sum, m) => sum + (m.preuProveidor || 0), 0) || 0;
      const despeses = recursosHumans + materials;
      
// Calcular ingressos
// 1. Buscar factura vinculada
const factura = facturesVenda.find(f => f.projecte === p.codi);
let ingressos = factura?.totalFactura || 0;

// 2. Si no hay factura, calcular desde tasques (proyectos normales e importados)
if (ingressos === 0 && p.tasques && p.tasques.length > 0) {
  ingressos = p.tasques.reduce((sum, t) => sum + (t.importe || 0), 0);
}

// 3. Si tampoco hay tasques, usar campo directo (proyectos importados antiguos)
if (ingressos === 0 && p.ingresSenseIVA) {
  ingressos = p.ingresSenseIVA;
}
      
      const benefici = ingressos - despeses;
      const marge = ingressos > 0 ? (benefici / ingressos * 100) : 0;
      
      return {
        ...p,
        ingressos,
        despeses,
        recursosHumans,
        materials,
        benefici,
        marge
      };
    })
    .sort((a, b) => b.benefici - a.benefici);
  
  const toggleExpand = (codi: string) => {
    setExpandit(expandit === codi ? null : codi);
  };
  
  return (
    <div>
      {/* Estadísticas generales */}
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
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginBottom: '0.5rem' }}>
            Projectes Totals
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>
            {projectesAmbDades.length}
          </div>
        </div>
        
        <div style={{
          background: 'var(--color-bg-secondary)',
          padding: '1rem',
          borderRadius: '8px',
          border: '1px solid var(--color-border)'
        }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginBottom: '0.5rem' }}>
            Marge Mitjà
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#3b82f6' }}>
            {projectesAmbDades.length > 0
              ? (projectesAmbDades.reduce((sum, p) => sum + p.marge, 0) / projectesAmbDades.length).toFixed(1)
              : '0.0'
            }%
          </div>
        </div>
        
        <div style={{
          background: 'var(--color-bg-secondary)',
          padding: '1rem',
          borderRadius: '8px',
          border: '1px solid var(--color-border)'
        }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginBottom: '0.5rem' }}>
            Més Rendible
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#10b981' }}>
            {projectesAmbDades.length > 0
              ? formatCurrency(Math.max(...projectesAmbDades.map(p => p.benefici)))
              : '0.00€'
            }
          </div>
        </div>
        
        <div style={{
          background: 'var(--color-bg-secondary)',
          padding: '1rem',
          borderRadius: '8px',
          border: '1px solid var(--color-border)'
        }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginBottom: '0.5rem' }}>
            Menys Rendible
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ef4444' }}>
            {projectesAmbDades.length > 0
              ? formatCurrency(Math.min(...projectesAmbDades.map(p => p.benefici)))
              : '0.00€'
            }
          </div>
        </div>
      </div>

      {/* Tabla de proyectos */}
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
                Projecte
              </th>
              <th style={{ textAlign: 'left', padding: '1rem', fontSize: '0.85rem', fontWeight: 600 }}>
                Client
              </th>
              <th style={{ textAlign: 'center', padding: '1rem', fontSize: '0.85rem', fontWeight: 600 }}>
                Estat
              </th>
              <th style={{ textAlign: 'right', padding: '1rem', fontSize: '0.85rem', fontWeight: 600 }}>
                Ingressos
              </th>
              <th style={{ textAlign: 'right', padding: '1rem', fontSize: '0.85rem', fontWeight: 600 }}>
                Despeses
              </th>
              <th style={{ textAlign: 'right', padding: '1rem', fontSize: '0.85rem', fontWeight: 600 }}>
                Benefici
              </th>
              <th style={{ textAlign: 'right', padding: '1rem', fontSize: '0.85rem', fontWeight: 600 }}>
                Marge
              </th>
            </tr>
          </thead>
          <tbody>
            {projectesAmbDades.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ 
                  textAlign: 'center', 
                  padding: '2rem',
                  color: 'var(--color-text-tertiary)'
                }}>
                  No hi ha projectes en aquest període
                </td>
              </tr>
            ) : (
              projectesAmbDades.map(p => {
                const client = clients.find(c => c.codi === p.client);
                const estaExpandit = expandit === p.codi;
                
                return (
                  <React.Fragment key={p.codi}>
                    <tr 
                      style={{ 
                        borderBottom: '1px solid var(--color-border)',
                        cursor: 'pointer',
                        background: estaExpandit ? 'var(--color-bg-tertiary)' : 'transparent'
                      }}
                      className="table-row-hover"
                      onClick={() => toggleExpand(p.codi)}
                    >
                      <td style={{ padding: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {estaExpandit ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          <div>
                            <div style={{ fontWeight: 600 }}>{p.codi}</div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                              {p.titol}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '0.75rem', fontSize: '0.9rem' }}>
                        {client?.nomComercial || client?.nomFiscal || '-'}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                        <span style={{
                          padding: '0.25rem 0.75rem',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          background: 
                            p.estat === 'completat' ? '#d1fae5' :
                            p.estat === 'en_curs' ? '#dbeafe' :
                            p.estat === 'paused' ? '#fef3c7' : '#fee2e2',
                          color:
                            p.estat === 'completat' ? '#065f46' :
                            p.estat === 'en_curs' ? '#1e40af' :
                            p.estat === 'paused' ? '#92400e' : '#991b1b'
                        }}>
                          {p.estat === 'completat' ? '✓' : 
                           p.estat === 'en_curs' ? '⋯' :
                           p.estat === 'paused' ? '⏸' : '✕'}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600 }}>
                        {formatCurrency(p.ingressos)}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600 }}>
                        {formatCurrency(p.despeses)}
                      </td>
                      <td style={{ 
                        padding: '0.75rem', 
                        textAlign: 'right', 
                        fontWeight: 700,
                        color: p.benefici >= 0 ? '#10b981' : '#ef4444'
                      }}>
                        {formatCurrency(p.benefici)}
                      </td>
                      <td style={{ 
                        padding: '0.75rem', 
                        textAlign: 'right', 
                        fontWeight: 600,
                        color: p.marge >= 20 ? '#10b981' : p.marge >= 10 ? '#f59e0b' : '#ef4444'
                      }}>
                        {p.marge.toFixed(1)}%
                      </td>
                    </tr>
                    
                    {/* Detalle expandido */}
                    {estaExpandit && (
                      <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg-tertiary)' }}>
                        <td colSpan={7} style={{ padding: '1rem 2rem' }}>
                          <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: 'repeat(3, 1fr)', 
                            gap: '1rem',
                            fontSize: '0.9rem'
                          }}>
                            <div>
                              <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>
                                Recursos Humans
                              </div>
                              <div style={{ color: 'var(--color-text-secondary)' }}>
                                {formatCurrency(p.recursosHumans)}
                              </div>
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>
                                Materials
                              </div>
                              <div style={{ color: 'var(--color-text-secondary)' }}>
                                {formatCurrency(p.materials)}
                              </div>
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>
                                Dates
                              </div>
                              <div style={{ color: 'var(--color-text-secondary)' }}>
                                {p.dataInici} → {p.dataEntrega}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
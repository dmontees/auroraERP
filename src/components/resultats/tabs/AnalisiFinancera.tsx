import React from 'react';
import { Euro, TrendingUp, TrendingDown, Clock, AlertCircle } from 'lucide-react';
import type { Periode } from '../../../utils/resultatCalculs';
import { 
  estaEnPeriode, 
  calcularIngressos, 
  calcularDespeses,
  formatCurrency 
} from '../../../utils/resultatCalculs';
import type { FacturaVenta } from '../../../types/facturaVenda';
import type { Gasto } from '../../../types/facturaCompra';
import type { Projecte } from '../../../types/projecte';
import { CATEGORIES_GASTO_GENERAL } from '../../../types/facturaCompra';

interface AnalisiFinanceraProps {
  periode: Periode;
  facturesVenda: FacturaVenta[];
  gastos: Gasto[];
  projectes: Projecte[];
}

export default function AnalisiFinancera({
  periode,
  facturesVenda,
  gastos,
  projectes  // ← AÑADIR
}: AnalisiFinanceraProps) {
  
  // INGRESSOS - Calcular desde facturas Y proyectos
  let totalCobrat = 0;
  let totalPendentCobrar = 0;
  
  // 1. FACTURAS DE VENTA (proyectos con factura real)
  const facturesCobrades = facturesVenda.filter(f => 
    estaEnPeriode(f.dataFactura, periode) && f.estat === 'pagada'
  );
  const facturesPendents = facturesVenda.filter(f => 
    estaEnPeriode(f.dataFactura, periode) && 
    ['enviada', 'pagada-parcial', 'vencuda'].includes(f.estat)
  );
  
  totalCobrat += facturesCobrades.reduce((sum, f) => sum + f.totalFactura, 0);
  totalPendentCobrar += facturesPendents.reduce((sum, f) => sum + f.pendentCobrar, 0);
  
  // 2. PROYECTOS SIN FACTURA VINCULADA (importados u otros)
  const projectesEnPeriode = projectes.filter(p => 
    p.dataInici && estaEnPeriode(p.dataInici, periode)
  );
  
  projectesEnPeriode.forEach(p => {
    // Verificar si ya tiene factura vinculada
    const teFactura = facturesVenda.some(f => f.projecte === p.codi);
    
    // SOLO contar proyectos importados sin factura
    if (!teFactura && p.esImportat) {  // ← AÑADIR && p.esImportat
      // Calcular ingresos del proyecto
      let ingressos = 0;
      
      if (p.tasques && p.tasques.length > 0) {
        ingressos = p.tasques.reduce((sum, t) => sum + (t.importe || 0), 0);
      } else if (p.ingresSenseIVA) {
        ingressos = p.ingresSenseIVA;
      }
      
      if (ingressos > 0) {
        // Si tiene factura histórica, está cobrado
        if (p.facturaHistorica) {
          totalCobrat += ingressos;
        } else {
          // Sin factura histórica, está pendiente
          totalPendentCobrar += ingressos;
        }
      }
    }
  });
  
  const totalIngressos = totalCobrat + totalPendentCobrar;
  
  // DESPESES per categoria
  const despesesPerCategoria: { [key: string]: number } = {
    'Recursos Humans Interns': 0,
    'Recursos Humans Externs': 0,
    'Materials': 0
  };
  
  CATEGORIES_GASTO_GENERAL.forEach(cat => {
    despesesPerCategoria[cat.nom] = 0;
  });
  
  gastos.filter(g => estaEnPeriode(g.dataGasto, periode)).forEach(g => {
    if (g.tipus === 'factura-compra') {
      despesesPerCategoria['Recursos Humans Externs'] += g.totalGasto;
    } else if (g.tipus === 'gasto-general') {
      const cat = CATEGORIES_GASTO_GENERAL.find(c => c.codi === g.categoria);
      if (cat) {
        despesesPerCategoria[cat.nom] += g.totalGasto;
      }
    }
  });
  
  const totalDespeses = Object.values(despesesPerCategoria).reduce((sum, val) => sum + val, 0);
  const beneficiNet = totalIngressos - totalDespeses;
  const margeBrut = totalIngressos > 0 ? (beneficiNet / totalIngressos * 100) : 0;
  
  // RÀTIOS
  const ratioLiquiditat = totalPendentCobrar > 0 
    ? (gastos.filter(g => g.pendentPagament > 0).reduce((sum, g) => sum + g.pendentPagament, 0) / totalPendentCobrar)
    : 0;
  
  // Temps mitjà cobrament
  const diesCobrament = facturesCobrades.length > 0
    ? facturesCobrades.reduce((sum, f) => {
        const emisio = new Date(f.dataFactura);
        const venciment = new Date(f.dataVenciment || f.dataFactura);
        return sum + Math.floor((venciment.getTime() - emisio.getTime()) / (1000 * 60 * 60 * 24));
      }, 0) / facturesCobrades.length
    : 0;
  
  return (
    <div>
      {/* COMPTE DE RESULTATS */}
      <div style={{
        background: 'var(--color-bg-secondary)',
        padding: '1.5rem',
        borderRadius: '12px',
        border: '1px solid var(--color-border)',
        marginBottom: '1.5rem'
      }}>
        <h3 style={{ 
          fontSize: '1.1rem', 
          fontWeight: 600, 
          marginBottom: '1.5rem',
          color: 'var(--color-text-primary)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <Euro size={20} />
          Compte de Resultats (P&L)
        </h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
          {/* INGRESSOS */}
          <div>
            <div style={{ 
              fontSize: '0.9rem', 
              fontWeight: 700, 
              color: '#10b981',
              marginBottom: '1rem',
              textTransform: 'uppercase'
            }}>
              Ingressos
            </div>
            
            <table style={{ width: '100%', fontSize: '0.9rem' }}>
              <tbody>
                <tr>
                  <td style={{ padding: '0.5rem 0', color: 'var(--color-text-secondary)' }}>
                    Factures cobrades
                  </td>
                  <td style={{ 
                    padding: '0.5rem 0', 
                    textAlign: 'right',
                    fontWeight: 600
                  }}>
                    {formatCurrency(totalCobrat)}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '0.5rem 0', color: 'var(--color-text-secondary)' }}>
                    Factures pendents cobrar
                  </td>
                  <td style={{ 
                    padding: '0.5rem 0', 
                    textAlign: 'right',
                    fontWeight: 600
                  }}>
                    {formatCurrency(totalPendentCobrar)}
                  </td>
                </tr>
                <tr style={{ borderTop: '2px solid var(--color-border)' }}>
                  <td style={{ 
                    padding: '0.75rem 0', 
                    fontWeight: 700,
                    color: 'var(--color-text-primary)'
                  }}>
                    TOTAL INGRESSOS
                  </td>
                  <td style={{ 
                    padding: '0.75rem 0', 
                    textAlign: 'right',
                    fontWeight: 700,
                    fontSize: '1.1rem',
                    color: '#10b981'
                  }}>
                    {formatCurrency(totalIngressos)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          
          {/* DESPESES */}
          <div>
            <div style={{ 
              fontSize: '0.9rem', 
              fontWeight: 700, 
              color: '#ef4444',
              marginBottom: '1rem',
              textTransform: 'uppercase'
            }}>
              Despeses
            </div>
            
            <table style={{ width: '100%', fontSize: '0.9rem' }}>
              <tbody>
                {Object.entries(despesesPerCategoria)
                  .filter(([, valor]) => valor > 0)
                  .map(([categoria, valor]) => (
                    <tr key={categoria}>
                      <td style={{ padding: '0.5rem 0', color: 'var(--color-text-secondary)' }}>
                        {categoria}
                      </td>
                      <td style={{ 
                        padding: '0.5rem 0', 
                        textAlign: 'right',
                        fontWeight: 600
                      }}>
                        {formatCurrency(valor)}
                      </td>
                    </tr>
                  ))}
                <tr style={{ borderTop: '2px solid var(--color-border)' }}>
                  <td style={{ 
                    padding: '0.75rem 0', 
                    fontWeight: 700,
                    color: 'var(--color-text-primary)'
                  }}>
                    TOTAL DESPESES
                  </td>
                  <td style={{ 
                    padding: '0.75rem 0', 
                    textAlign: 'right',
                    fontWeight: 700,
                    fontSize: '1.1rem',
                    color: '#ef4444'
                  }}>
                    {formatCurrency(totalDespeses)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        
        {/* BENEFICI NET */}
        <div style={{ 
          marginTop: '2rem',
          paddingTop: '1.5rem',
          borderTop: '3px solid var(--color-border)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ 
                fontSize: '1rem', 
                fontWeight: 700,
                color: 'var(--color-text-primary)',
                marginBottom: '0.25rem'
              }}>
                BENEFICI NET
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--color-text-tertiary)' }}>
                Marge brut: {margeBrut.toFixed(1)}%
              </div>
            </div>
            <div style={{ 
              fontSize: '2rem', 
              fontWeight: 700,
              color: beneficiNet >= 0 ? '#10b981' : '#ef4444'
            }}>
              {formatCurrency(beneficiNet)}
            </div>
          </div>
        </div>
      </div>

      {/* RÀTIOS FINANCERES */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
        {/* Ràtio de Liquiditat */}
        <div style={{
          background: 'var(--color-bg-secondary)',
          padding: '1.5rem',
          borderRadius: '12px',
          border: '1px solid var(--color-border)'
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem',
            marginBottom: '1rem'
          }}>
            <TrendingUp size={20} color="#3b82f6" />
            <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>
              Ràtio de Liquiditat
            </span>
          </div>
          <div style={{ 
            fontSize: '2rem', 
            fontWeight: 700,
            color: ratioLiquiditat <= 1 ? '#10b981' : '#ef4444'
          }}>
            {ratioLiquiditat.toFixed(2)}
          </div>
          <div style={{ 
            fontSize: '0.75rem', 
            color: 'var(--color-text-tertiary)',
            marginTop: '0.5rem'
          }}>
            Pendent pagar / Pendent cobrar
          </div>
        </div>

        {/* Temps Mitjà Cobrament */}
        <div style={{
          background: 'var(--color-bg-secondary)',
          padding: '1.5rem',
          borderRadius: '12px',
          border: '1px solid var(--color-border)'
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem',
            marginBottom: '1rem'
          }}>
            <Clock size={20} color="#f59e0b" />
            <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>
              Temps Mitjà Cobrament
            </span>
          </div>
          <div style={{ 
            fontSize: '2rem', 
            fontWeight: 700,
            color: '#f59e0b'
          }}>
            {diesCobrament.toFixed(0)}
          </div>
          <div style={{ 
            fontSize: '0.75rem', 
            color: 'var(--color-text-tertiary)',
            marginTop: '0.5rem'
          }}>
            Dies des d'emissió fins venciment
          </div>
        </div>

        {/* Factures Vençudes */}
        <div style={{
          background: 'var(--color-bg-secondary)',
          padding: '1.5rem',
          borderRadius: '12px',
          border: '1px solid var(--color-border)'
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem',
            marginBottom: '1rem'
          }}>
            <AlertCircle size={20} color="#dc2626" />
            <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>
              Factures Vençudes
            </span>
          </div>
          <div style={{ 
            fontSize: '2rem', 
            fontWeight: 700,
            color: '#dc2626'
          }}>
            {facturesVenda.filter(f => f.estat === 'vencuda').length}
          </div>
          <div style={{ 
            fontSize: '0.75rem', 
            color: 'var(--color-text-tertiary)',
            marginTop: '0.5rem'
          }}>
            Total: {formatCurrency(
              facturesVenda
                .filter(f => f.estat === 'vencuda')
                .reduce((sum, f) => sum + f.pendentCobrar, 0)
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
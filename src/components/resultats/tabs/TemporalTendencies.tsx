import React from 'react';
import { Calendar, TrendingUp, Activity } from 'lucide-react';
import GraficLinies from '../components/GraficLinies';
import type { Periode } from '../../../utils/resultatCalculs';
import { 
  estaEnPeriode, 
  agruparPerMes, 
  formatCurrency,
  getPeriodeAnterior 
} from '../../../utils/resultatCalculs';
import type { FacturaVenda } from '../../../types/facturaVenda';
import type { Gasto } from '../../../types/facturaCompra';
import type { Projecte } from '../../../types/projecte';

interface TemporalTendenciesProps {
  periode: Periode;
  facturesVenda: FacturaVenda[];
  gastos: Gasto[];
  projectes: Projecte[];
}

export default function TemporalTendencies({
  periode,
  facturesVenda,
  gastos,
  projectes
}: TemporalTendenciesProps) {
  
  // Período anterior para comparación
  const periodeAnterior = getPeriodeAnterior(periode);
  
// Datos mensuales actual - incluir proyectos importados
const ingressosPerMes = agruparPerMes(facturesVenda, 'dataFactura', 'totalFactura', periode);

// Añadir ingresos de proyectos importados sin factura
projectes
  .filter(p => p.esImportat && p.dataInici && estaEnPeriode(p.dataInici, periode))
  .forEach(p => {
    // Verificar si ya tiene factura vinculada
    const teFactura = facturesVenda.some(f => f.projecte === p.codi);
    
    if (!teFactura) {
      // Calcular ingresos del proyecto
      let ingressos = 0;
      
      if (p.tasques && p.tasques.length > 0) {
        ingressos = p.tasques.reduce((sum, t) => sum + (t.importe || 0), 0);
      } else if (p.ingresSenseIVA) {
        ingressos = p.ingresSenseIVA;
      }
      
      if (ingressos > 0) {
        // Agrupar por mes
        const mes = p.dataInici.substring(0, 7); // YYYY-MM
        const mesExistente = ingressosPerMes.find(m => m.mes === mes);
        
        if (mesExistente) {
          mesExistente.valor += ingressos;
        } else {
          ingressosPerMes.push({ mes, valor: ingressos });
        }
      }
    }
  });

// Ordenar por mes
ingressosPerMes.sort((a, b) => a.mes.localeCompare(b.mes));

const despesesPerMes = agruparPerMes(gastos, 'dataGasto', 'totalGasto', periode);

// Datos mensuales anterior - incluir proyectos importados
const ingressosPerMesAnterior = agruparPerMes(facturesVenda, 'dataFactura', 'totalFactura', periodeAnterior);

// Añadir ingresos de proyectos importados sin factura (período anterior)
projectes
  .filter(p => p.esImportat && p.dataInici && estaEnPeriode(p.dataInici, periodeAnterior))
  .forEach(p => {
    const teFactura = facturesVenda.some(f => f.projecte === p.codi);
    
    if (!teFactura) {
      let ingressos = 0;
      
      if (p.tasques && p.tasques.length > 0) {
        ingressos = p.tasques.reduce((sum, t) => sum + (t.importe || 0), 0);
      } else if (p.ingresSenseIVA) {
        ingressos = p.ingresSenseIVA;
      }
      
      if (ingressos > 0) {
        const mes = p.dataInici.substring(0, 7);
        const mesExistente = ingressosPerMesAnterior.find(m => m.mes === mes);
        
        if (mesExistente) {
          mesExistente.valor += ingressos;
        } else {
          ingressosPerMesAnterior.push({ mes, valor: ingressos });
        }
      }
    }
  });

// Ordenar por mes
ingressosPerMesAnterior.sort((a, b) => a.mes.localeCompare(b.mes));

const despesesPerMesAnterior = agruparPerMes(gastos, 'dataGasto', 'totalGasto', periodeAnterior);
  
  // Totales
  const totalActual = ingressosPerMes.reduce((sum, m) => sum + m.valor, 0);
  const totalAnterior = ingressosPerMesAnterior.reduce((sum, m) => sum + m.valor, 0);
  const variacio = totalAnterior > 0 ? ((totalActual - totalAnterior) / totalAnterior * 100) : 0;
  
  // Calcular tendencia (regresión lineal simple)
  const calcularTendencia = (dades: { mes: string; valor: number }[]) => {
    const n = dades.length;
    if (n < 2) return 0;
    
    const sumX = dades.reduce((sum, _, i) => sum + i, 0);
    const sumY = dades.reduce((sum, d) => sum + d.valor, 0);
    const sumXY = dades.reduce((sum, d, i) => sum + i * d.valor, 0);
    const sumX2 = dades.reduce((sum, _, i) => sum + i * i, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return slope;
  };
  
  const tendenciaIngressos = calcularTendencia(ingressosPerMes);
  const tendenciaDespeses = calcularTendencia(despesesPerMes);
  
  // Detectar anomalías (variaciones >30%)
  const anomalies: { mes: string; tipus: string; variacio: number }[] = [];
  
  ingressosPerMes.forEach((mesActual, i) => {
    if (i > 0) {
      const mesAnterior = ingressosPerMes[i - 1];
      if (mesAnterior.valor > 0) {
        const var_mes = ((mesActual.valor - mesAnterior.valor) / mesAnterior.valor) * 100;
        if (Math.abs(var_mes) > 30) {
          anomalies.push({
            mes: mesActual.mes,
            tipus: 'Ingressos',
            variacio: var_mes
          });
        }
      }
    }
  });
  
// Calcular estacionalitat (promedio por mes del año)
const estacionalitat: { [key: string]: { ingressos: number; count: number } } = {};

['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'].forEach(mes => {
  estacionalitat[mes] = { ingressos: 0, count: 0 };
});

// Facturas de venta
facturesVenda.forEach(f => {
  const mesNum = f.dataFactura.substring(5, 7);
  estacionalitat[mesNum].ingressos += f.totalFactura;
  estacionalitat[mesNum].count += 1;
});

// AÑADIR proyectos importados sin factura
projectes
  .filter(p => p.esImportat && p.dataInici)
  .forEach(p => {
    const teFactura = facturesVenda.some(f => f.projecte === p.codi);
    
    if (!teFactura) {
      let ingressos = 0;
      
      if (p.tasques && p.tasques.length > 0) {
        ingressos = p.tasques.reduce((sum, t) => sum + (t.importe || 0), 0);
      } else if (p.ingresSenseIVA) {
        ingressos = p.ingresSenseIVA;
      }
      
      if (ingressos > 0 && p.dataInici.length >= 7) {  // ← VALIDAR longitud
        const mesNum = p.dataInici.substring(5, 7);
        
        // VALIDAR que el mes existe en el objeto
        if (estacionalitat[mesNum]) {
          estacionalitat[mesNum].ingressos += ingressos;
          estacionalitat[mesNum].count += 1;
        }
      }
    }
  });

const estacionalitatPromig = Object.entries(estacionalitat).map(([mes, data]) => ({
  mes,
  promig: data.count > 0 ? data.ingressos / data.count : 0
}));
  
  const nomsMesos = ['Gen', 'Feb', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Des'];
  
  return (
    <div>
      {/* KPIs de tendencia */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(3, 1fr)', 
        gap: '1rem',
        marginBottom: '2rem'
      }}>
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
            marginBottom: '1rem',
            color: 'var(--color-text-tertiary)',
            fontSize: '0.85rem'
          }}>
            <Activity size={18} />
            Variació vs Període Anterior
          </div>
          <div style={{ 
            fontSize: '2rem', 
            fontWeight: 700,
            color: variacio >= 0 ? '#10b981' : '#ef4444',
            marginBottom: '0.5rem'
          }}>
            {variacio >= 0 ? '+' : ''}{variacio.toFixed(1)}%
          </div>
          <div style={{ 
            fontSize: '0.85rem',
            color: 'var(--color-text-secondary)'
          }}>
            {formatCurrency(totalActual)} vs {formatCurrency(totalAnterior)}
          </div>
        </div>
        
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
            marginBottom: '1rem',
            color: 'var(--color-text-tertiary)',
            fontSize: '0.85rem'
          }}>
            <TrendingUp size={18} />
            Tendència Ingressos
          </div>
          <div style={{ 
            fontSize: '2rem', 
            fontWeight: 700,
            color: tendenciaIngressos >= 0 ? '#10b981' : '#ef4444'
          }}>
            {tendenciaIngressos >= 0 ? '↗' : '↘'}
          </div>
          <div style={{ 
            fontSize: '0.85rem',
            color: 'var(--color-text-secondary)'
          }}>
            {tendenciaIngressos >= 0 ? 'Creixent' : 'Decreixent'}
          </div>
        </div>
        
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
            marginBottom: '1rem',
            color: 'var(--color-text-tertiary)',
            fontSize: '0.85rem'
          }}>
            <Calendar size={18} />
            Anomalies Detectades
          </div>
          <div style={{ 
            fontSize: '2rem', 
            fontWeight: 700,
            color: anomalies.length > 0 ? '#f59e0b' : '#10b981'
          }}>
            {anomalies.length}
          </div>
          <div style={{ 
            fontSize: '0.85rem',
            color: 'var(--color-text-secondary)'
          }}>
            Variacions &gt;30%
          </div>
        </div>
      </div>

      {/* Gráfico comparativo períodos */}
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
          marginBottom: '1.5rem',
          color: 'var(--color-text-primary)'
        }}>
          📊 Comparativa de Períodes
        </h3>
        
        <GraficLinies
          series={[
            {
              nom: 'Període actual',
              color: '#10b981',
              dades: ingressosPerMes.map(d => ({
                label: new Date(d.mes + '-01').toLocaleDateString('ca', { month: 'short' }),
                valor: d.valor
              }))
            },
            {
              nom: 'Període anterior',
              color: '#94a3b8',
              dades: ingressosPerMesAnterior.map(d => ({
                label: new Date(d.mes + '-01').toLocaleDateString('ca', { month: 'short' }),
                valor: d.valor
              }))
            }
          ]}
          formatValue={(v) => formatCurrency(v)}
          height={300}
        />
      </div>

      {/* Estacionalitat */}
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
          marginBottom: '1.5rem',
          color: 'var(--color-text-primary)'
        }}>
          🌡️ Estacionalitat (Promig Històric)
        </h3>
        
        <GraficLinies
          series={[
            {
              nom: 'Ingressos mitjans',
              color: '#3b82f6',
              dades: estacionalitatPromig.map((e, i) => ({
                label: nomsMesos[i],
                valor: e.promig
              }))
            }
          ]}
          formatValue={(v) => formatCurrency(v)}
          height={250}
        />
      </div>

      {/* Anomalies */}
      {anomalies.length > 0 && (
        <div style={{
          background: 'var(--color-bg-secondary)',
          padding: '1.5rem',
          borderRadius: '12px',
          border: '1px solid var(--color-border)'
        }}>
          <h3 style={{ 
            fontSize: '1rem', 
            fontWeight: 600, 
            marginBottom: '1rem',
            color: 'var(--color-text-primary)'
          }}>
            ⚠️ Anomalies Detectades
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {anomalies.map((anomalia, i) => (
              <div key={i} style={{
                padding: '1rem',
                background: 'var(--color-bg-tertiary)',
                borderRadius: '8px',
                borderLeft: `4px solid ${anomalia.variacio >= 0 ? '#10b981' : '#ef4444'}`
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontWeight: 600 }}>{anomalia.tipus}</span>
                    <span style={{ 
                      marginLeft: '0.5rem',
                      fontSize: '0.85rem',
                      color: 'var(--color-text-secondary)'
                    }}>
                      {new Date(anomalia.mes + '-01').toLocaleDateString('ca', { month: 'long', year: 'numeric' })}
                    </span>
                  </div>
                  <div style={{ 
                    fontSize: '1.25rem',
                    fontWeight: 700,
                    color: anomalia.variacio >= 0 ? '#10b981' : '#ef4444'
                  }}>
                    {anomalia.variacio >= 0 ? '+' : ''}{anomalia.variacio.toFixed(1)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabla resumen trimestral */}
      <div style={{
        background: 'var(--color-bg-secondary)',
        padding: '1.5rem',
        borderRadius: '12px',
        border: '1px solid var(--color-border)',
        marginTop: '2rem'
      }}>
        <h3 style={{ 
          fontSize: '1rem', 
          fontWeight: 600, 
          marginBottom: '1rem',
          color: 'var(--color-text-primary)'
        }}>
          📅 Resum Mensual
        </h3>
        
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
              <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600 }}>
                Mes
              </th>
              <th style={{ textAlign: 'right', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600 }}>
                Ingressos
              </th>
              <th style={{ textAlign: 'right', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600 }}>
                Despeses
              </th>
              <th style={{ textAlign: 'right', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600 }}>
                Benefici
              </th>
              <th style={{ textAlign: 'right', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600 }}>
                Marge
              </th>
            </tr>
          </thead>
          <tbody>
            {ingressosPerMes.map((mes, i) => {
              const despeses = despesesPerMes[i]?.valor || 0;
              const benefici = mes.valor - despeses;
              const marge = mes.valor > 0 ? (benefici / mes.valor * 100) : 0;
              
              return (
                <tr key={mes.mes} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '0.75rem', fontWeight: 600 }}>
                    {new Date(mes.mes + '-01').toLocaleDateString('ca', { month: 'long', year: 'numeric' })}
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600, color: '#10b981' }}>
                    {formatCurrency(mes.valor)}
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600, color: '#ef4444' }}>
                    {formatCurrency(despeses)}
                  </td>
                  <td style={{ 
                    padding: '0.75rem', 
                    textAlign: 'right', 
                    fontWeight: 700,
                    color: benefici >= 0 ? '#10b981' : '#ef4444'
                  }}>
                    {formatCurrency(benefici)}
                  </td>
                  <td style={{ 
                    padding: '0.75rem', 
                    textAlign: 'right', 
                    fontWeight: 600,
                    color: marge >= 20 ? '#10b981' : marge >= 10 ? '#f59e0b' : '#ef4444'
                  }}>
                    {marge.toFixed(1)}%
                  </td>
                </tr>
              );
            })}
            
            {/* Fila total */}
            <tr style={{ borderTop: '2px solid var(--color-border)', background: 'var(--color-bg-tertiary)' }}>
              <td style={{ padding: '0.75rem', fontWeight: 700 }}>
                TOTAL
              </td>
              <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 700, color: '#10b981' }}>
                {formatCurrency(ingressosPerMes.reduce((sum, m) => sum + m.valor, 0))}
              </td>
              <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 700, color: '#ef4444' }}>
                {formatCurrency(despesesPerMes.reduce((sum, m) => sum + m.valor, 0))}
              </td>
              <td style={{ 
                padding: '0.75rem', 
                textAlign: 'right', 
                fontWeight: 700,
                color: (ingressosPerMes.reduce((sum, m) => sum + m.valor, 0) - despesesPerMes.reduce((sum, m) => sum + m.valor, 0)) >= 0 ? '#10b981' : '#ef4444'
              }}>
                {formatCurrency(ingressosPerMes.reduce((sum, m) => sum + m.valor, 0) - despesesPerMes.reduce((sum, m) => sum + m.valor, 0))}
              </td>
              <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 700 }}>
                {ingressosPerMes.reduce((sum, m) => sum + m.valor, 0) > 0 
                  ? (((ingressosPerMes.reduce((sum, m) => sum + m.valor, 0) - despesesPerMes.reduce((sum, m) => sum + m.valor, 0)) / ingressosPerMes.reduce((sum, m) => sum + m.valor, 0)) * 100).toFixed(1)
                  : '0.0'
                }%
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
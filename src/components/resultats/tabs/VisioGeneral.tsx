import React from 'react';
import { Euro, TrendingDown, TrendingUp, Briefcase } from 'lucide-react';
import KPICard from '../components/KPICard';
import type { Periode } from '../../../utils/resultatCalculs';
import {
  calcularIngressos,
  calcularDespeses,
  calcularDespesesProjectes,
  calcularBenefici,
  calcularMarge,
  getPeriodeAnterior,
  calcularVariacio,
  formatCurrency,
  formatPercentage
} from '../../../utils/resultatCalculs';
import type { FacturaVenta } from '../../../types/facturaVenda';
import type { Gasto } from '../../../types/facturaCompra';
import type { Projecte } from '../../../types/projecte';
import GraficLinies from '../components/GraficLinies';
import GraficDonut from '../components/GraficDonut';
import { agruparPerMes } from '../../../utils/resultatCalculs';
import { CATEGORIES_GASTO_GENERAL } from '../../../types/facturaCompra';
import { estaEnPeriode } from '../../../utils/resultatCalculs';

interface VisioGeneralProps {
  periode: Periode;
  compararAmb: string;
  facturesVenda: FacturaVenta[];
  gastos: Gasto[];
  projectes: Projecte[];
}

export default function VisioGeneral({
  periode,
  compararAmb,
  facturesVenda,
  gastos,
  projectes
}: VisioGeneralProps) {
  
// Calcular métricas período actual
let ingressosActual = calcularIngressos(facturesVenda, periode);

// AÑADIR ingresos de proyectos importados sin factura
projectes
  .filter(p => p.esImportat && p.dataInici && estaEnPeriode(p.dataInici, periode))
  .forEach(p => {
    const teFactura = facturesVenda.some(f => f.projecte === p.codi);
    
    if (!teFactura) {
      let ingressos = 0;
      
      if (p.tasques && p.tasques.length > 0) {
        ingressos = p.tasques.reduce((sum, t) => sum + (t.importe || 0), 0);
      } else if (p.ingresSenseIVA) {
        ingressos = p.ingresSenseIVA;
      }
      
      ingressosActual += ingressos;
    }
  });

const despesesGastosActual = calcularDespeses(gastos, periode);
const despesesProjectesActual = calcularDespesesProjectes(projectes, periode);
const despesesTotalsActual = despesesGastosActual + despesesProjectesActual;
const beneficiActual = calcularBenefici(ingressosActual, despesesTotalsActual);
const margeActual = calcularMarge(beneficiActual, ingressosActual);

// Calcular meses en el período
const dataInici = new Date(periode.dataInici);
const dataFi = new Date(periode.dataFi);
const mesesEnPeriode = Math.max(1, Math.round((dataFi.getTime() - dataInici.getTime()) / (1000 * 60 * 60 * 24 * 30.44)));
const beneficiMitjaMensual = beneficiActual / mesesEnPeriode;

const projectesActius = projectes.filter(p => p.estat === 'en-curs').length;
  
  // Calcular métricas período anterior (si comparamos)
  let variacioIngressos, variacioDespeses, variacioBenefici, variacioMarge;
  
  if (compararAmb !== 'sense-comparar') {
    const periodeComparacio = compararAmb === 'periode-anterior' 
      ? getPeriodeAnterior(periode)
      : {
          dataInici: new Date(new Date(periode.dataInici).getFullYear() - 1, new Date(periode.dataInici).getMonth(), new Date(periode.dataInici).getDate()).toISOString().split('T')[0],
          dataFi: new Date(new Date(periode.dataFi).getFullYear() - 1, new Date(periode.dataFi).getMonth(), new Date(periode.dataFi).getDate()).toISOString().split('T')[0]
        };
    
        let ingressosAnterior = calcularIngressos(facturesVenda, periodeComparacio);

        // AÑADIR ingresos de proyectos importados sin factura (período anterior)
        projectes
          .filter(p => p.esImportat && p.dataInici && estaEnPeriode(p.dataInici, periodeComparacio))
          .forEach(p => {
            const teFactura = facturesVenda.some(f => f.projecte === p.codi);
            
            if (!teFactura) {
              let ingressos = 0;
              
              if (p.tasques && p.tasques.length > 0) {
                ingressos = p.tasques.reduce((sum, t) => sum + (t.importe || 0), 0);
              } else if (p.ingresSenseIVA) {
                ingressos = p.ingresSenseIVA;
              }
              
              ingressosAnterior += ingressos;
            }
          });
        
        const despesesGastosAnterior = calcularDespeses(gastos, periodeComparacio);
    const despesesProjectesAnterior = calcularDespesesProjectes(projectes, periodeComparacio);
    const despesesTotalsAnterior = despesesGastosAnterior + despesesProjectesAnterior;
    const beneficiAnterior = calcularBenefici(ingressosAnterior, despesesTotalsAnterior);
    const margeAnterior = calcularMarge(beneficiAnterior, ingressosAnterior);
    
    variacioIngressos = calcularVariacio(ingressosActual, ingressosAnterior);
    variacioDespeses = calcularVariacio(despesesTotalsActual, despesesTotalsAnterior);
    variacioBenefici = calcularVariacio(beneficiActual, beneficiAnterior);
    variacioMarge = calcularVariacio(margeActual, margeAnterior);
  }
  
  return (
    <div>
      {/* KPIs */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '1.5rem',
        marginBottom: '2rem'
      }}>
        <KPICard
          titol="Ingressos Totals"
          valor={formatCurrency(ingressosActual)}
          icon={<Euro size={24} color="#10b981" />}
          color="#10b981"
          variacio={variacioIngressos}
          comparativa={compararAmb === 'any-anterior' ? 'any anterior' : 'període anterior'}
        />
        
        <KPICard
          titol="Despeses Totals"
          valor={formatCurrency(despesesTotalsActual)}
          icon={<TrendingDown size={24} color="#ef4444" />}
          color="#ef4444"
          variacio={variacioDespeses}
          comparativa={compararAmb === 'any-anterior' ? 'any anterior' : 'període anterior'}
        />
        
        <KPICard
  titol="Benefici Net"
  valor={formatCurrency(beneficiActual)}
  icon={<TrendingUp size={24} color={beneficiActual >= 0 ? '#10b981' : '#ef4444'} />}
  color={beneficiActual >= 0 ? '#10b981' : '#ef4444'}
  variacio={variacioBenefici}
  comparativa={compararAmb === 'any-anterior' ? 'any anterior' : 'període anterior'}
  subtitol={`Mitjana mensual: ${formatCurrency(beneficiMitjaMensual)}`}
/>
        
        <KPICard
          titol="Marge de Benefici"
          valor={formatPercentage(margeActual)}
          icon={<Briefcase size={24} color="#3b82f6" />}
          color="#3b82f6"
          variacio={variacioMarge}
          comparativa={compararAmb === 'any-anterior' ? 'any anterior' : 'període anterior'}
        />
      </div>

{/* Gráficos */}
<div style={{ 
  display: 'grid', 
  gridTemplateColumns: '2fr 1fr',
  gap: '1.5rem',
  marginBottom: '1.5rem'
}}>
  {/* Evolución Temporal */}
  <div style={{
    background: 'var(--color-bg-secondary)',
    padding: '1.5rem',
    borderRadius: '12px',
    border: '1px solid var(--color-border)'
  }}>
    <h3 style={{ 
      fontSize: '1rem', 
      fontWeight: 600, 
      marginBottom: '1.5rem',
      color: 'var(--color-text-primary)'
    }}>
      📊 Evolució Ingressos vs Despeses
    </h3>
    
    <GraficLinies
  series={[
    {
      nom: 'Ingressos',
      color: '#10b981',
      dades: (() => {
        const ingressosPerMes = agruparPerMes(facturesVenda, 'dataFactura', 'totalFactura', periode);
        
        // Añadir proyectos importados sin factura
        projectes
          .filter(p => p.esImportat && p.dataInici && estaEnPeriode(p.dataInici, periode))
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
                const mesExistente = ingressosPerMes.find(m => m.mes === mes);
                
                if (mesExistente) {
                  mesExistente.valor += ingressos;
                } else {
                  ingressosPerMes.push({ mes, valor: ingressos });
                }
              }
            }
          });
        
        ingressosPerMes.sort((a, b) => a.mes.localeCompare(b.mes));
        
        return ingressosPerMes.map(d => ({
          label: new Date(d.mes + '-01').toLocaleDateString('ca', { month: 'short' }),
          valor: d.valor
        }));
      })()
    },
    {
      nom: 'Despeses',
      color: '#ef4444',
      dades: (() => {
        const despesesPerMes = agruparPerMes(gastos, 'dataGasto', 'totalGasto', periode);
        
        // Añadir despesas de proyectos importados
        projectes
          .filter(p => p.esImportat && p.dataInici && estaEnPeriode(p.dataInici, periode))
          .forEach(p => {
            const recursosHumans = p.recursosHumans?.reduce((sum, r) => sum + (r.cost || 0), 0) || 0;
            const materials = p.materials?.reduce((sum, m) => sum + (m.preuProveidor || 0), 0) || 0;
            const despesesProjecte = recursosHumans + materials;
            
            if (despesesProjecte > 0) {
              const mes = p.dataInici.substring(0, 7);
              const mesExistente = despesesPerMes.find(m => m.mes === mes);
              
              if (mesExistente) {
                mesExistente.valor += despesesProjecte;
              } else {
                despesesPerMes.push({ mes, valor: despesesProjecte });
              }
            }
          });
        
        despesesPerMes.sort((a, b) => a.mes.localeCompare(b.mes));
        
        return despesesPerMes.map(d => ({
          label: new Date(d.mes + '-01').toLocaleDateString('ca', { month: 'short' }),
          valor: d.valor
        }));
      })()
    },
    {
      nom: 'Benefici',
      color: '#3b82f6',
      dades: (() => {
        // Calcular ingressos con proyectos importados
        const ingressosPerMes = agruparPerMes(facturesVenda, 'dataFactura', 'totalFactura', periode);
        
        projectes
          .filter(p => p.esImportat && p.dataInici && estaEnPeriode(p.dataInici, periode))
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
                const mesExistente = ingressosPerMes.find(m => m.mes === mes);
                
                if (mesExistente) {
                  mesExistente.valor += ingressos;
                } else {
                  ingressosPerMes.push({ mes, valor: ingressos });
                }
              }
            }
          });
        
        // Calcular despeses con proyectos importados
        const despesesPerMes = agruparPerMes(gastos, 'dataGasto', 'totalGasto', periode);
        
        projectes
          .filter(p => p.esImportat && p.dataInici && estaEnPeriode(p.dataInici, periode))
          .forEach(p => {
            const recursosHumans = p.recursosHumans?.reduce((sum, r) => sum + (r.cost || 0), 0) || 0;
            const materials = p.materials?.reduce((sum, m) => sum + (m.preuProveidor || 0), 0) || 0;
            const despesesProjecte = recursosHumans + materials;
            
            if (despesesProjecte > 0) {
              const mes = p.dataInici.substring(0, 7);
              const mesExistente = despesesPerMes.find(m => m.mes === mes);
              
              if (mesExistente) {
                mesExistente.valor += despesesProjecte;
              } else {
                despesesPerMes.push({ mes, valor: despesesProjecte });
              }
            }
          });
        
        ingressosPerMes.sort((a, b) => a.mes.localeCompare(b.mes));
        despesesPerMes.sort((a, b) => a.mes.localeCompare(b.mes));
        
        // Calcular benefici
        return ingressosPerMes.map(ing => {
          const desp = despesesPerMes.find(d => d.mes === ing.mes);
          return {
            label: new Date(ing.mes + '-01').toLocaleDateString('ca', { month: 'short' }),
            valor: ing.valor - (desp?.valor || 0)
          };
        });
      })()
    }
      ]}
      formatValue={(v) => v.toFixed(0) + '€'}
    />
  </div>

  {/* Distribución de Ingresos */}
  <div style={{
    background: 'var(--color-bg-secondary)',
    padding: '1.5rem',
    borderRadius: '12px',
    border: '1px solid var(--color-border)'
  }}>
    <h3 style={{ 
      fontSize: '1rem', 
      fontWeight: 600, 
      marginBottom: '1.5rem',
      color: 'var(--color-text-primary)'
    }}>
      💰 Distribució d'Ingressos
    </h3>
    
    <GraficDonut
  dades={(() => {
    // Agrupar por proyecto
    const projectesAmbIngressos: { [key: string]: number } = {};
    
    // Facturas de venta
    facturesVenda
      .filter(f => estaEnPeriode(f.dataFactura, periode))
      .forEach(f => {
        const proj = projectes.find(p => p.codi === f.projecte);
        const nom = proj?.titol || 'Sense projecte';
        projectesAmbIngressos[nom] = (projectesAmbIngressos[nom] || 0) + f.totalFactura;
      });
    
    // Proyectos importados sin factura
    projectes
      .filter(p => p.esImportat && p.dataInici && estaEnPeriode(p.dataInici, periode))
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
            const nom = p.titol || p.codi;
            projectesAmbIngressos[nom] = (projectesAmbIngressos[nom] || 0) + ingressos;
          }
        }
      });

        const colors = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];
        
        return Object.entries(projectesAmbIngressos)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 6)
          .map(([label, valor], i) => ({
            label,
            valor,
            color: colors[i % colors.length]
          }));
      })()}
      formatValue={(v) => v.toFixed(0) + '€'}
    />
  </div>
</div>

{/* Segunda fila de gráficos */}
<div style={{ 
  display: 'grid', 
  gridTemplateColumns: '1fr 1fr',
  gap: '1.5rem'
}}>
  {/* Distribución de Gastos */}
  <div style={{
    background: 'var(--color-bg-secondary)',
    padding: '1.5rem',
    borderRadius: '12px',
    border: '1px solid var(--color-border)'
  }}>
    <h3 style={{ 
      fontSize: '1rem', 
      fontWeight: 600, 
      marginBottom: '1.5rem',
      color: 'var(--color-text-primary)'
    }}>
      💸 Distribució de Despeses
    </h3>
    
    <GraficDonut
  dades={(() => {
    // Agrupar por categoría
    const gastosPerCategoria: { [key: string]: number } = {};
    
    gastos
      .filter(g => estaEnPeriode(g.dataGasto, periode))
      .forEach(g => {
        if (g.tipus === 'gasto-general') {
          const cat = CATEGORIES_GASTO_GENERAL.find(c => c.codi === g.categoria);
          const nom = cat ? `${cat.icon} ${cat.nom}` : 'Altres';
          gastosPerCategoria[nom] = (gastosPerCategoria[nom] || 0) + g.totalGasto;
        } else {
          gastosPerCategoria['📄 Factures'] = (gastosPerCategoria['📄 Factures'] || 0) + g.totalGasto;
        }
      });
    
    // Añadir despesas de proyectos importados
    projectes
      .filter(p => p.esImportat && p.dataInici && estaEnPeriode(p.dataInici, periode))
      .forEach(p => {
        const recursosHumans = p.recursosHumans?.reduce((sum, r) => sum + (r.cost || 0), 0) || 0;
        const materials = p.materials?.reduce((sum, m) => sum + (m.preuProveidor || 0), 0) || 0;
        
        if (recursosHumans > 0) {
          gastosPerCategoria['👥 Recursos Humans (Importats)'] = 
            (gastosPerCategoria['👥 Recursos Humans (Importats)'] || 0) + recursosHumans;
        }
        
        if (materials > 0) {
          gastosPerCategoria['📦 Materials (Importats)'] = 
            (gastosPerCategoria['📦 Materials (Importats)'] || 0) + materials;
        }
      });

        const colors = ['#ef4444', '#f59e0b', '#fbbf24', '#fb923c', '#f87171'];
        
        return Object.entries(gastosPerCategoria)
          .sort(([, a], [, b]) => b - a)
          .map(([label, valor], i) => ({
            label,
            valor,
            color: colors[i % colors.length]
          }));
      })()}
      formatValue={(v) => v.toFixed(0) + '€'}
      size={180}
    />
  </div>

  {/* Estados de Proyectos */}
  <div style={{
    background: 'var(--color-bg-secondary)',
    padding: '1.5rem',
    borderRadius: '12px',
    border: '1px solid var(--color-border)'
  }}>
    <h3 style={{ 
      fontSize: '1rem', 
      fontWeight: 600, 
      marginBottom: '1.5rem',
      color: 'var(--color-text-primary)'
    }}>
      📁 Projectes per Estat
    </h3>
    
    <GraficDonut
      dades={[
        {
          label: 'En curs',
          valor: projectes.filter(p => p.estat === 'en-curs').length,
          color: '#3b82f6'
        },
        {
          label: 'Completats',
          valor: projectes.filter(p => p.estat === 'completat').length,
          color: '#10b981'
        },
        {
          label: 'Pausats',
          valor: projectes.filter(p => p.estat === 'paused').length,
          color: '#f59e0b'
        },
        {
          label: 'Cancel·lats',
          valor: projectes.filter(p => p.estat === 'cancelat').length,
          color: '#ef4444'
        }
      ].filter(d => d.valor > 0)}
      formatValue={(v) => v.toString()}
      showPercentage={false}
      size={180}
    />
  </div>
</div>
    </div>
  );
}
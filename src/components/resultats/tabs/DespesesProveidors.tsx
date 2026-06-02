import React from 'react';
import { Package, TrendingDown, Info } from 'lucide-react';
import type { Periode } from '../../../utils/resultatCalculs';
import { estaEnPeriode, formatCurrency } from '../../../utils/resultatCalculs';
import type { Gasto } from '../../../types/facturaCompra';
import type { Proveidor } from '../../../types/proveidor';
import type { Projecte } from '../../../types/projecte';
import { CATEGORIES_GASTO_GENERAL } from '../../../types/facturaCompra';

interface DespesesProveidorsProps {
  periode: Periode;
  gastos: Gasto[];
  proveidors: Proveidor[];
  projectes: Projecte[];
}

export default function DespesesProveidors({
  periode,
  gastos,
  proveidors,
  projectes  // ← AÑADIR
}: DespesesProveidorsProps) {
  
  // Agrupar por categoría
  const despesesPerCategoria: { categoria: string; total: number; numFactures: number; icon: string }[] = [];
  
  CATEGORIES_GASTO_GENERAL.forEach(cat => {
    const gastosCategoria = gastos.filter(g => 
      g.tipus === 'gasto-general' && 
      g.categoria === cat.codi &&
      estaEnPeriode(g.dataGasto, periode)
    );
    
    const total = gastosCategoria.reduce((sum, g) => sum + g.totalGasto, 0);
    
    if (total > 0) {
      despesesPerCategoria.push({
        categoria: cat.nom,
        total,
        numFactures: gastosCategoria.length,
        icon: cat.icon
      });
    }
  });
  
  // Facturas de compra
  const facturesCompra = gastos.filter(g => 
    g.tipus === 'factura-compra' && 
    estaEnPeriode(g.dataGasto, periode)
  );
  
  if (facturesCompra.length > 0) {
    despesesPerCategoria.push({
      categoria: 'Factures de Compra',
      total: facturesCompra.reduce((sum, g) => sum + g.totalGasto, 0),
      numFactures: facturesCompra.length,
      icon: '📄'
    });
  }
  
  // AÑADIR despesas de proyectos importados
  const projectesImportats = projectes.filter(p => 
    p.esImportat && p.dataInici && estaEnPeriode(p.dataInici, periode)
  );
  
  let totalRecursosHumansImportats = 0;
  let totalMaterialsImportats = 0;
  
  projectesImportats.forEach(p => {
    const recursosHumans = p.recursosHumans?.reduce((sum, r) => sum + (r.cost || 0), 0) || 0;
    const materials = p.materials?.reduce((sum, m) => sum + (m.preuProveidor || 0) * (m.jornades ?? 1), 0) || 0;
    
    totalRecursosHumansImportats += recursosHumans;
    totalMaterialsImportats += materials;
  });
  
  if (totalRecursosHumansImportats > 0) {
    despesesPerCategoria.push({
      categoria: 'Recursos Humans (Importats)',
      total: totalRecursosHumansImportats,
      numFactures: projectesImportats.length,
      icon: '👥'
    });
  }
  
  if (totalMaterialsImportats > 0) {
    despesesPerCategoria.push({
      categoria: 'Materials (Importats)',
      total: totalMaterialsImportats,
      numFactures: projectesImportats.length,
      icon: '📦'
    });
  }
  
  despesesPerCategoria.sort((a, b) => b.total - a.total);
  
  const totalDespeses = despesesPerCategoria.reduce((sum, d) => sum + d.total, 0);
  
  // Datos por proveedor
  const proveidorsAmbDades = proveidors
    .map(prov => {
      const gastosProveidor = gastos.filter(g => 
        g.tipus === 'factura-compra' &&
        g.proveidor === prov.codi &&
        estaEnPeriode(g.dataGasto, periode)
      );
      
      const volum = gastosProveidor.reduce((sum, g) => sum + g.totalGasto, 0);
      const numFactures = gastosProveidor.length;
      
      // Calcular tiempo medio de pago
      const facturesPagades = gastosProveidor.filter(g => g.estat === 'pagada');
      const tempsMitjaPagament = facturesPagades.length > 0
        ? facturesPagades.reduce((sum, g) => {
            const emisio = new Date(g.dataGasto);
            const venciment = new Date(g.dataVenciment || g.dataGasto);
            return sum + Math.floor((venciment.getTime() - emisio.getTime()) / (1000 * 60 * 60 * 24));
          }, 0) / facturesPagades.length
        : 0;
      
      return {
        ...prov,
        volum,
        numFactures,
        tempsMitjaPagament
      };
    })
    .filter(p => p.volum > 0)
    .sort((a, b) => b.volum - a.volum);
  
  return (
    <div>
      {/* Explanation banner */}
      <div style={{
        background: 'var(--color-bg-secondary)',
        border: '1px solid var(--color-border)',
        borderLeft: '4px solid var(--color-warning)',
        borderRadius: '8px',
        padding: '1rem 1.25rem',
        marginBottom: '2rem',
        display: 'flex',
        gap: '0.75rem',
        alignItems: 'flex-start',
      }}>
        <Info size={18} style={{ color: 'var(--color-warning)', flexShrink: 0, marginTop: '2px' }} />
        <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
          <strong style={{ color: 'var(--color-text-primary)' }}>Despeses per categoria i proveïdor</strong>
          {' '}— Mostra les factures de compra i despeses generals registrades al sistema, agrupades per categoria.
          Les despeses de projectes importats (recursos humans i materials) s'afegeixen per coherència
          amb els informes antics, tot i que no estan en format de factura.
        </div>
      </div>

      {/* KPIs */}
      {(() => {
        const G_RED    = 'linear-gradient(135deg, #dc2626, #ef4444, #f97316)';
        const G_INDIGO = 'linear-gradient(135deg, #4338ca, #6366f1, #818cf8)';
        const gSpan = (v: React.ReactNode, g: string) => (
          <span style={{ background: g, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{v}</span>
        );
        return (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
            <div className="stat-card">
              <div className="stat-card-stripe" style={{ background: G_RED }} />
              <div className="stat-card-body">
                <div className="stat-card-label"><TrendingDown size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.3rem' }} />Total Despeses</div>
                <div className="stat-card-value">{gSpan(formatCurrency(totalDespeses), G_RED)}</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-card-stripe" style={{ background: G_INDIGO }} />
              <div className="stat-card-body">
                <div className="stat-card-label">Categories Actives</div>
                <div className="stat-card-value">{gSpan(despesesPerCategoria.length, G_INDIGO)}</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-card-stripe" style={{ background: G_INDIGO }} />
              <div className="stat-card-body">
                <div className="stat-card-label"><Package size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.3rem' }} />Proveïdors Actius</div>
                <div className="stat-card-value">{gSpan(proveidorsAmbDades.length, G_INDIGO)}</div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Despeses per categoria */}
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
          💸 Despeses per Categoria
        </h3>
        
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
              <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600 }}>
                Categoria
              </th>
              <th style={{ textAlign: 'right', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600 }}>
                Total
              </th>
              <th style={{ textAlign: 'right', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600 }}>
                % Total
              </th>
              <th style={{ textAlign: 'center', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600 }}>
                Núm. Factures
              </th>
            </tr>
          </thead>
          <tbody>
            {despesesPerCategoria.map((cat, i) => {
              const percentatge = (cat.total / totalDespeses) * 100;
              
              return (
                <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '0.75rem' }}>
                    <span style={{ marginRight: '0.5rem' }}>{cat.icon}</span>
                    {cat.categoria}
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600 }}>
                    {formatCurrency(cat.total)}
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem' }}>
                      <div style={{
                        flex: '0 0 100px',
                        height: '8px',
                        background: 'var(--color-bg-tertiary)',
                        borderRadius: '4px',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          height: '100%',
                          width: `${percentatge}%`,
                          background: 'var(--color-error)',
                          borderRadius: '4px'
                        }} />
                      </div>
                      <span style={{ fontWeight: 600, minWidth: '50px' }}>
                        {percentatge.toFixed(1)}%
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 600 }}>
                    {cat.numFactures}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Ranking de proveedores */}
      <div style={{
        background: 'var(--color-bg-secondary)',
        borderRadius: '12px',
        border: '1px solid var(--color-border)',
        overflow: 'hidden'
      }}>
        <div style={{ padding: '1.5rem', borderBottom: '2px solid var(--color-border)' }}>
          <h3 style={{ 
            fontSize: '1rem', 
            fontWeight: 600,
            color: 'var(--color-text-primary)'
          }}>
            🏆 Ranking de Proveïdors
          </h3>
        </div>
        
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--color-border)', background: 'var(--color-bg-tertiary)' }}>
              <th style={{ textAlign: 'left', padding: '1rem', fontSize: '0.85rem', fontWeight: 600 }}>
                Proveïdor
              </th>
              <th style={{ textAlign: 'center', padding: '1rem', fontSize: '0.85rem', fontWeight: 600 }}>
                Núm. Factures
              </th>
              <th style={{ textAlign: 'right', padding: '1rem', fontSize: '0.85rem', fontWeight: 600 }}>
                Volum Total
              </th>
              <th style={{ textAlign: 'right', padding: '1rem', fontSize: '0.85rem', fontWeight: 600 }}>
                Temps Mitjà Pagament
              </th>
            </tr>
          </thead>
          <tbody>
            {proveidorsAmbDades.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ 
                  textAlign: 'center', 
                  padding: '2rem',
                  color: 'var(--color-text-tertiary)'
                }}>
                  No hi ha proveïdors en aquest període
                </td>
              </tr>
            ) : (
              proveidorsAmbDades.map((prov, index) => (
                <tr 
                  key={prov.codi}
                  style={{ borderBottom: '1px solid var(--color-border)' }}
                  className="table-row-hover"
                >
                  <td style={{ padding: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: index < 3 ? 'var(--color-warning)' : 'var(--color-bg-tertiary)',
                        color: index < 3 ? 'white' : 'var(--color-text-tertiary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                        fontWeight: 700
                      }}>
                        {index + 1}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600 }}>
                          {prov.nomComercial}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>
                          {prov.codi}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 600 }}>
                    {prov.numFactures}
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 700, color: 'var(--color-error)' }}>
                    {formatCurrency(prov.volum)}
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600 }}>
                    {prov.tempsMitjaPagament.toFixed(0)} dies
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
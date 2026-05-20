import React from 'react';
import { Package, TrendingDown } from 'lucide-react';
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
    const materials = p.materials?.reduce((sum, m) => sum + (m.preuProveidor || 0), 0) || 0;
    
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
      {/* KPIs */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(3, 1fr)', 
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
            <TrendingDown size={16} />
            Total Despeses
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ef4444' }}>
            {formatCurrency(totalDespeses)}
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
            Categories Actives
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>
            {despesesPerCategoria.length}
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
            <Package size={16} />
            Proveïdors Actius
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>
            {proveidorsAmbDades.length}
          </div>
        </div>
      </div>

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
                          background: '#ef4444',
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
                        background: index < 3 ? '#f59e0b' : 'var(--color-bg-tertiary)',
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
                  <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 700, color: '#ef4444' }}>
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
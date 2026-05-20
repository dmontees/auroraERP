import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle, Clock, FileText, Briefcase, Euro } from 'lucide-react';
import type { FacturaVenta } from '../../types/facturaVenta';
import type { Gasto } from '../../types/facturaCompra';
import type { Projecte } from '../../types/projecte';
import type { Pressupost } from '../../types/pressupost';
import type { Client } from '../../types/client';

export default function Dashboard() {
  const [facturesVenda, setFacturesVenda] = useState<FacturaVenta[]>([]);
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [projectes, setProjectes] = useState<Projecte[]>([]);
  const [pressupostos, setPressupostos] = useState<Pressupost[]>([]);
  const [clients, setClients] = useState<Client[]>([]);

  // Cargar datos
  useEffect(() => {
    const loadData = () => {
      setFacturesVenda(JSON.parse(localStorage.getItem('plateaFacturesVenda') || '[]'));
      setGastos(JSON.parse(localStorage.getItem('plateaGastos') || '[]'));
      setProjectes(JSON.parse(localStorage.getItem('plateaProjectes') || '[]'));
      setPressupostos(JSON.parse(localStorage.getItem('plateaPressupostos') || '[]'));
      setClients(JSON.parse(localStorage.getItem('plateaClients') || '[]'));
    };
    loadData();
  }, []);

  // CALCULAR KPIs
  const pendentCobrar = facturesVenda
    .filter(f => ['enviada', 'pagada-parcial', 'vencuda'].includes(f.estat))
    .reduce((sum, f) => sum + f.pendentCobrar, 0);

  const pendentPagar = gastos
    .filter(g => g.pendentPagament > 0)
    .reduce((sum, g) => sum + g.pendentPagament, 0);

  const facturesVencudes = facturesVenda.filter(f => f.estat === 'vencuda');
  const totalVencudes = facturesVencudes.reduce((sum, f) => sum + f.pendentCobrar, 0);

  const projectesActius = projectes.filter(p => p.estat === 'en-curs').length;

// DATOS PARA GRÁFICO (últimos 6 meses)
const getGraficData = () => {
  const mesos: string[] = [];
  const avui = new Date();
  
  for (let i = 5; i >= 0; i--) {
    const data = new Date(avui.getFullYear(), avui.getMonth() - i, 1);
    mesos.push(data.toISOString().substring(0, 7));
  }

  const ingressos = mesos.map(mes => {
    // Ingresos de facturas
    let total = facturesVenda
      .filter(f => f.dataFactura && f.dataFactura.startsWith(mes))
      .reduce((sum, f) => sum + f.totalFactura, 0);
    
    // AÑADIR ingresos de proyectos importados sin factura
    projectes
      .filter(p => p.esImportat && p.dataInici && p.dataInici.startsWith(mes))
      .forEach(p => {
        const teFactura = facturesVenda.some(f => f.projecte === p.codi);
        
        if (!teFactura) {
          let ingressos = 0;
          
          if (p.tasques && p.tasques.length > 0) {
            ingressos = p.tasques.reduce((sum, t) => sum + (t.importe || 0), 0);
          } else if (p.ingresSenseIVA) {
            ingressos = p.ingresSenseIVA;
          }
          
          total += ingressos;
        }
      });
    
    return total;
  });
  
  const despeses = mesos.map(mes => {
    // Despesas de gastos
    let total = gastos
      .filter(g => g.dataGasto && g.dataGasto.startsWith(mes))
      .reduce((sum, g) => sum + g.totalGasto, 0);
    
    // AÑADIR despesas de proyectos importados
    projectes
      .filter(p => p.esImportat && p.dataInici && p.dataInici.startsWith(mes))
      .forEach(p => {
        // Calcular despesas del proyecto
        const recursosHumans = p.recursosHumans?.reduce((sum, r) => sum + (r.cost || 0), 0) || 0;
        const materials = p.materials?.reduce((sum, m) => sum + (m.preuProveidor || 0), 0) || 0;
        const despesesProjecte = recursosHumans + materials;
        
        total += despesesProjecte;
      });
    
    return total;
  });

  const labels = mesos.map(m => {
    const [any, mes] = m.split('-');
    return new Date(parseInt(any), parseInt(mes) - 1).toLocaleString('ca', { month: 'short' });
  });

  return { labels, ingressos, despeses };
};

  const graficData = getGraficData();

  // TAREAS URGENTES
  const tascasUrgents = {
    facturesVencudes: facturesVencudes.slice(0, 3),
    gastosVencuts: gastos.filter(g => g.estat === 'vencuda').slice(0, 3),
    pressupostsPendents: pressupostos.filter(p => p.estat === 'pendent').slice(0, 3),
    projectesPropers: projectes
      .filter(p => p.estat === 'en-curs' && p.dataEntrega)
      .sort((a, b) => new Date(a.dataEntrega).getTime() - new Date(b.dataEntrega).getTime())
      .slice(0, 3)
  };

  // ACTIVIDAD RECIENTE
  const activitatRecent = [
    ...facturesVenda.slice(-5).map(f => ({
      tipus: 'factura',
      text: `Factura ${f.codi} creada`,
      data: f.dataFactura,
      icon: <FileText size={16} />
    })),
    ...projectes.slice(-5).map(p => ({
      tipus: 'projecte',
      text: `Projecte ${p.titol}`,
      data: p.dataInici,
      icon: <Briefcase size={16} />
    }))
  ].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()).slice(0, 8);

  const formatCurrency = (value: number) => {
    return value.toLocaleString('ca-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '€';
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ca-ES', { day: 'numeric', month: 'short' });
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* HEADER */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>
          Benvingut a Aurora ERP - Platea Films
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem' }}>
          {new Date().toLocaleDateString('ca-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* KPIs */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '1.5rem',
        marginBottom: '2rem'
      }}>
        {/* Pendent Cobrar */}
        <div style={{
          background: 'var(--color-bg-secondary)',
          padding: '1.5rem',
          borderRadius: '12px',
          border: '2px solid #f59e0b'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ 
              background: '#fef3c7', 
              padding: '0.75rem', 
              borderRadius: '8px',
              display: 'flex'
            }}>
              <TrendingUp size={24} color="#f59e0b" />
            </div>
            <span style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
              Pendent de Cobrar
            </span>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#f59e0b' }}>
            {formatCurrency(pendentCobrar)}
          </div>
        </div>

        {/* Pendent Pagar */}
        <div style={{
          background: 'var(--color-bg-secondary)',
          padding: '1.5rem',
          borderRadius: '12px',
          border: '2px solid #ef4444'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ 
              background: '#fee2e2', 
              padding: '0.75rem', 
              borderRadius: '8px',
              display: 'flex'
            }}>
              <TrendingDown size={24} color="#ef4444" />
            </div>
            <span style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
              Pendent de Pagar
            </span>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#ef4444' }}>
            {formatCurrency(pendentPagar)}
          </div>
        </div>

        {/* Vençudes */}
        <div style={{
          background: 'var(--color-bg-secondary)',
          padding: '1.5rem',
          borderRadius: '12px',
          border: '2px solid #dc2626'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ 
              background: '#fecaca', 
              padding: '0.75rem', 
              borderRadius: '8px',
              display: 'flex'
            }}>
              <AlertCircle size={24} color="#dc2626" />
            </div>
            <span style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
              Factures Vençudes
            </span>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#dc2626' }}>
            {facturesVencudes.length}
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--color-text-tertiary)', marginTop: '0.5rem' }}>
            {formatCurrency(totalVencudes)}
          </div>
        </div>

        {/* Projectes Actius */}
        <div style={{
          background: 'var(--color-bg-secondary)',
          padding: '1.5rem',
          borderRadius: '12px',
          border: '2px solid #10b981'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ 
              background: '#d1fae5', 
              padding: '0.75rem', 
              borderRadius: '8px',
              display: 'flex'
            }}>
              <Briefcase size={24} color="#10b981" />
            </div>
            <span style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
              Projectes Actius
            </span>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#10b981' }}>
            {projectesActius}
          </div>
        </div>
      </div>

      {/* GRÁFICO Y TAREAS */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Gráfico */}
        <div style={{
          background: 'var(--color-bg-secondary)',
          padding: '1.5rem',
          borderRadius: '12px',
          border: '1px solid var(--color-border)'
        }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1.5rem' }}>
            📊 Ingressos vs Despeses (últims 6 mesos)
          </h3>
          
          <GraficLinies data={graficData} />
        </div>

        {/* Tareas Urgentes */}
        <div style={{
          background: 'var(--color-bg-secondary)',
          padding: '1.5rem',
          borderRadius: '12px',
          border: '1px solid var(--color-border)'
        }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1.5rem' }}>
            ⚡ Tasques Urgents
          </h3>

          {/* Factures Vençudes */}
          {tascasUrgents.facturesVencudes.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#dc2626', marginBottom: '0.5rem' }}>
                Factures vençudes ({facturesVencudes.length})
              </div>
              {tascasUrgents.facturesVencudes.map(f => {
                const client = clients.find(c => c.codi === f.client);
                return (
                  <div key={f.codi} style={{ 
                    padding: '0.5rem', 
                    fontSize: '0.85rem',
                    borderLeft: '3px solid #dc2626',
                    paddingLeft: '0.75rem',
                    marginBottom: '0.5rem',
                    background: 'var(--color-bg-tertiary)'
                  }}>
                    <div style={{ fontWeight: 600 }}>{f.codi}</div>
                    <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem' }}>
                      {client?.nomComercial || client?.nomFiscal} • {formatCurrency(f.pendentCobrar)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Projectes Propers */}
          {tascasUrgents.projectesPropers.length > 0 && (
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f59e0b', marginBottom: '0.5rem' }}>
                Projectes per entregar
              </div>
              {tascasUrgents.projectesPropers.map(p => (
                <div key={p.codi} style={{ 
                  padding: '0.5rem', 
                  fontSize: '0.85rem',
                  borderLeft: '3px solid #f59e0b',
                  paddingLeft: '0.75rem',
                  marginBottom: '0.5rem',
                  background: 'var(--color-bg-tertiary)'
                }}>
                  <div style={{ fontWeight: 600 }}>{p.titol}</div>
                  <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem' }}>
                    Entrega: {formatDate(p.dataEntrega)}
                  </div>
                </div>
              ))}
            </div>
          )}

          {tascasUrgents.facturesVencudes.length === 0 && tascasUrgents.projectesPropers.length === 0 && (
            <div style={{ 
              textAlign: 'center', 
              padding: '2rem', 
              color: 'var(--color-text-tertiary)',
              fontSize: '0.9rem'
            }}>
              <CheckCircle size={32} style={{ margin: '0 auto 0.5rem', opacity: 0.5 }} />
              <div>Tot al dia! 🎉</div>
            </div>
          )}
        </div>
      </div>

      {/* ACTIVITAT RECENT */}
      <div style={{
        background: 'var(--color-bg-secondary)',
        padding: '1.5rem',
        borderRadius: '12px',
        border: '1px solid var(--color-border)'
      }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1.5rem' }}>
          🕐 Activitat Recent
        </h3>
        
        {activitatRecent.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--color-text-tertiary)', padding: '2rem' }}>
            No hi ha activitat recent
          </p>
        ) : (
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {activitatRecent.map((item, i) => (
              <div key={i} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '0.75rem',
                background: 'var(--color-bg-tertiary)',
                borderRadius: '8px',
                fontSize: '0.9rem'
              }}>
                <div style={{ 
                  background: 'var(--color-bg-secondary)',
                  padding: '0.5rem',
                  borderRadius: '6px',
                  display: 'flex'
                }}>
                  {item.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500 }}>{item.text}</div>
                </div>
                <div style={{ color: 'var(--color-text-tertiary)', fontSize: '0.85rem' }}>
                  {formatDate(item.data)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// COMPONENTE GRÁFICO DE LÍNEAS
function GraficLinies({ data }: { data: { labels: string[], ingressos: number[], despeses: number[] } }) {
  const width = 600;
  const height = 300;
  const padding = 40;
  
  const maxValue = Math.max(...data.ingressos, ...data.despeses, 100);
  const scale = (height - padding * 2) / maxValue;

  const getX = (index: number) => padding + (index * (width - padding * 2) / (data.labels.length - 1));
  const getY = (value: number) => height - padding - (value * scale);

  const ingressosPath = data.ingressos
    .map((val, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(val)}`)
    .join(' ');

  const despesesPath = data.despeses
    .map((val, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(val)}`)
    .join(' ');

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((percent, i) => {
        const y = height - padding - (maxValue * percent * scale);
        return (
          <g key={i}>
            <line
              x1={padding}
              y1={y}
              x2={width - padding}
              y2={y}
              stroke="var(--color-border)"
              strokeWidth="1"
              strokeDasharray="4"
            />
            <text
              x={padding - 10}
              y={y + 4}
              textAnchor="end"
              fontSize="10"
              fill="var(--color-text-tertiary)"
            >
              {(maxValue * percent).toFixed(0)}€
            </text>
          </g>
        );
      })}

      {/* Línea Ingressos */}
      <path
        d={ingressosPath}
        fill="none"
        stroke="#10b981"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Línea Despeses */}
      <path
        d={despesesPath}
        fill="none"
        stroke="#ef4444"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Puntos Ingressos */}
      {data.ingressos.map((val, i) => (
        <circle
          key={`ing-${i}`}
          cx={getX(i)}
          cy={getY(val)}
          r="4"
          fill="#10b981"
        />
      ))}

      {/* Puntos Despeses */}
      {data.despeses.map((val, i) => (
        <circle
          key={`desp-${i}`}
          cx={getX(i)}
          cy={getY(val)}
          r="4"
          fill="#ef4444"
        />
      ))}

      {/* Labels */}
      {data.labels.map((label, i) => (
        <text
          key={i}
          x={getX(i)}
          y={height - 10}
          textAnchor="middle"
          fontSize="11"
          fill="var(--color-text-secondary)"
        >
          {label}
        </text>
      ))}

      {/* Leyenda */}
      <g transform={`translate(${width - 150}, 20)`}>
        <circle cx="0" cy="0" r="4" fill="#10b981" />
        <text x="10" y="4" fontSize="12" fill="var(--color-text-primary)">Ingressos</text>
        
        <circle cx="0" cy="20" r="4" fill="#ef4444" />
        <text x="10" y="24" fontSize="12" fill="var(--color-text-primary)">Despeses</text>
      </g>
    </svg>
  );
}
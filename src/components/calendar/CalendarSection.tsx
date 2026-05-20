import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, X, Plus } from 'lucide-react';
import type { Projecte } from '../../types/projecte';
import type { FacturaVenta } from '../../types/facturaVenta';
import type { Gasto } from '../../types/facturaCompra';
import type { PartTreball } from '../../types/partTreball';
import type { Pressupost } from '../../types/pressupost';
import type { Client } from '../../types/client';
import type { Proveidor } from '../../types/proveidor';
import SearchableSelect from '../common/SearchableSelect';
import { afegirEntradaHistorial } from '../../utils/projecteHistorial';


interface CalendarEvent {
  id: string;
  tipus: 'projecte-inici' | 'projecte-entrega' | 'factura-venda' | 'factura-venda-venciment' | 'factura-compra' | 'factura-compra-venciment' | 'pressupost' | 'esdeveniment-personalitzat';
  tipusDescriptiu: string;
  titol: string;
  subtitol?: string;
  data: string;
  color: string;
  estat?: string;
  projecteCodi?: string;
}

export default function CalendarSection() {
  const [mesActual, setMesActual] = useState(new Date());
  const [diaSeleccionat, setDiaSeleccionat] = useState<string | null>(null);
  const [esdeveniments, setEsdeveniments] = useState<CalendarEvent[]>([]);
  
  const [projectes, setProjectes] = useState<Projecte[]>([]);
  const [facturesVenda, setFacturesVenda] = useState<FacturaVenta[]>([]);
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [parts, setParts] = useState<PartTreball[]>([]);
  const [pressupostos, setPressupostos] = useState<Pressupost[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [proveidors, setProveidors] = useState<Proveidor[]>([]);
  const [showNouEsdeveniment, setShowNouEsdeveniment] = useState(false);
  const [esdevenimentsPersonalitzats, setEsdevenimentsPersonalitzats] = useState<any[]>([]);
  const [editingEsdeveniment, setEditingEsdeveniment] = useState<any | null>(null);
  
  // Cargar eventos personalizados
  useEffect(() => {
    const saved = localStorage.getItem('plateaEsdevenimentsPersonalitzats');
    if (saved) {
      setEsdevenimentsPersonalitzats(JSON.parse(saved));
    }
  }, [projectes]);

  // Cargar datos
  useEffect(() => {
    const loadData = () => {
      setProjectes(JSON.parse(localStorage.getItem('plateaProjectes') || '[]'));
      setFacturesVenda(JSON.parse(localStorage.getItem('plateaFacturesVenda') || '[]'));
      setGastos(JSON.parse(localStorage.getItem('plateaGastos') || '[]'));
      setParts(JSON.parse(localStorage.getItem('plateaParts') || '[]'));
      setPressupostos(JSON.parse(localStorage.getItem('plateaPressupostos') || '[]'));
      setClients(JSON.parse(localStorage.getItem('plateaClients') || '[]'));
      setProveidors(JSON.parse(localStorage.getItem('plateaProveidors') || '[]'));
    };
    loadData();
  }, []);

  // Generar eventos del calendario
  useEffect(() => {
    const events: CalendarEvent[] = [];

    // PROJECTES - Inicio
projectes.forEach(p => {
  if (p.dataInici) {
    const client = clients.find(c => c.codi === p.client);
    events.push({
      id: `proj-inici-${p.codi}`,
      tipus: 'projecte-inici',
      tipusDescriptiu: '🎬 Inici de rodatge',
      titol: p.titol,
      subtitol: client?.nomComercial || client?.nomFiscal,
      data: p.dataInici,
      color: '#3b82f6',
      estat: p.estat
    });
  }
});

// PROJECTES - Entrega
projectes.forEach(p => {
  if (p.dataEntrega) {
    const client = clients.find(c => c.codi === p.client);
    events.push({
      id: `proj-entrega-${p.codi}`,
      tipus: 'projecte-entrega',
      tipusDescriptiu: '📦 Entrega de projecte',
      titol: p.titol,
      subtitol: client?.nomComercial || client?.nomFiscal,
      data: p.dataEntrega,
      color: p.estat === 'completat' ? '#10b981' : '#f59e0b',
      estat: p.estat
    });
  }
});

// FACTURES VENDA - Emisión
facturesVenda.forEach(f => {
  const client = clients.find(c => c.codi === f.client);
  events.push({
    id: `fac-venda-${f.codi}`,
    tipus: 'factura-venda',
    tipusDescriptiu: '💰 Factura emesa',
    titol: f.codi,
    subtitol: client?.nomComercial || client?.nomFiscal,
    data: f.dataFactura,
    color: f.estat === 'pagada' ? '#10b981' : '#3b82f6',
    estat: f.estat
  });
  
  // Vencimiento si no está pagada
  if (f.estat !== 'pagada' && f.dataVenciment) {
    events.push({
      id: `fac-venda-venc-${f.codi}`,
      tipus: 'factura-venda-venciment',
      tipusDescriptiu: '⏰ Venciment factura venda',
      titol: f.codi,
      subtitol: client?.nomComercial || client?.nomFiscal,
      data: f.dataVenciment,
      color: f.estat === 'vencuda' ? '#dc2626' : '#f59e0b',
      estat: f.estat
    });
  }
});

// FACTURES COMPRA
gastos.forEach(g => {
  if (g.tipus === 'factura-compra') {
    const prov = proveidors.find(p => p.codi === g.proveidor);
    events.push({
      id: `gasto-${g.codi}`,
      tipus: 'factura-compra',
      tipusDescriptiu: '💸 Factura rebuda',
      titol: g.codi,
      subtitol: prov?.nomComercial,
      data: g.dataGasto,
      color: g.estat === 'pagada' ? '#10b981' : '#ef4444',
      estat: g.estat
    });
    
    // Vencimiento si no está pagada
    if (g.estat !== 'pagada' && g.dataVenciment) {
      events.push({
        id: `gasto-venc-${g.codi}`,
        tipus: 'factura-compra-venciment',
        tipusDescriptiu: '⚠️ Venciment factura compra',
        titol: g.codi,
        subtitol: prov?.nomComercial,
        data: g.dataVenciment,
        color: g.estat === 'vencuda' ? '#dc2626' : '#f59e0b',
        estat: g.estat
      });
    }
  }
});

// PRESSUPOSTOS
pressupostos.forEach(p => {
  const client = clients.find(c => c.codi === p.client);
  events.push({
    id: `pres-${p.codi}`,
    tipus: 'pressupost',
    tipusDescriptiu: '📋 Pressupost creat',
    titol: p.codi,
    subtitol: client?.nomComercial || client?.nomFiscal,
    data: p.dataCreacio,
    color: p.estat === 'acceptat' ? '#10b981' : p.estat === 'rebutjat' ? '#dc2626' : '#6366f1',
    estat: p.estat
  });
});

// ESDEVENIMENTS PERSONALITZATS
esdevenimentsPersonalitzats.forEach(e => {
  let subtitol = e.descripcio;
  if (e.projecte) {
    const projecte = projectes.find(p => p.codi === e.projecte);
    if (projecte) {
      subtitol = `📁 ${projecte.titol}${e.descripcio ? ' • ' + e.descripcio : ''}`;
    }
  }
  
  events.push({
    id: `custom-${e.id}`,
    tipus: 'esdeveniment-personalitzat',
    tipusDescriptiu: '📌 Esdeveniment personalitzat',
    titol: e.titol,
    subtitol: subtitol,
    data: e.data,
    color: e.color || '#ec4899',
    projecteCodi: e.projecte
  });
});

    setEsdeveniments(events);
  }, [projectes, facturesVenda, gastos, parts, pressupostos, clients, proveidors, esdevenimentsPersonalitzats]);
  
  // Generar días del mes
  const getDiesDelMes = () => {
    const any = mesActual.getFullYear();
    const mes = mesActual.getMonth();
    
    const primerDia = new Date(any, mes, 1);
    const ultimDia = new Date(any, mes + 1, 0);
    
    const diesAnteriors = primerDia.getDay() === 0 ? 6 : primerDia.getDay() - 1;
    const totalDies = ultimDia.getDate();
    
    const dies: (Date | null)[] = [];
    
    // Días del mes anterior
    for (let i = diesAnteriors; i > 0; i--) {
      dies.push(new Date(any, mes, -i + 1));
    }
    
    // Días del mes actual
    for (let i = 1; i <= totalDies; i++) {
      dies.push(new Date(any, mes, i));
    }
    
    // Días del mes siguiente
    const diesRestants = 42 - dies.length; // 6 semanas x 7 días
    for (let i = 1; i <= diesRestants; i++) {
      dies.push(new Date(any, mes + 1, i));
    }
    
    return dies;
  };

  const diesDelMes = getDiesDelMes();
  
  const mesAnterior = () => {
    setMesActual(new Date(mesActual.getFullYear(), mesActual.getMonth() - 1));
    setDiaSeleccionat(null);
  };
  
  const mesSeguent = () => {
    setMesActual(new Date(mesActual.getFullYear(), mesActual.getMonth() + 1));
    setDiaSeleccionat(null);
  };
  
  const avui = () => {
    setMesActual(new Date());
    setDiaSeleccionat(null);
  };

  const esAvui = (data: Date) => {
    const avui = new Date();
    return data.toDateString() === avui.toDateString();
  };

  const esMesActual = (data: Date) => {
    return data.getMonth() === mesActual.getMonth();
  };

  const getEsdevenimentsDelDia = (data: Date) => {
    const any = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    const dataStr = `${any}-${mes}-${dia}`;
    return esdeveniments.filter(e => e.data === dataStr);
  };

  const esdevenimentsSeleccionats = diaSeleccionat 
    ? esdeveniments.filter(e => e.data === diaSeleccionat)
    : [];

    const formatData = (dataStr: string) => {
      return new Date(dataStr).toLocaleDateString('ca-ES', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    };
    
    // Eliminar evento personalizado
    const eliminarEsdeveniment = (id: string) => {
      if (!confirm('Estàs segur que vols eliminar aquest esdeveniment?')) {
        return;
      }
      
      const nous = esdevenimentsPersonalitzats.filter(e => e.id !== id);
      setEsdevenimentsPersonalitzats(nous);
      localStorage.setItem('plateaEsdevenimentsPersonalitzats', JSON.stringify(nous));
    };

  return (
    <div style={{ padding: '2rem', maxWidth: '1600px', margin: '0 auto' }}>
      
      {/* NAVEGACIÓN CALENDARIO */}
<div style={{ 
  display: 'flex', 
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '2rem'
}}>
  <button
    onClick={avui}
    className="btn-secondary"
  >
    Avui
  </button>
  
  <div style={{ display: 'flex', gap: '0.5rem' }}>
    <button
      onClick={mesAnterior}
      className="btn-secondary"
      style={{ padding: '0.5rem' }}
    >
      <ChevronLeft size={20} />
    </button>
    
    <div style={{ 
      padding: '0.5rem 1.5rem',
      background: 'var(--color-bg-secondary)',
      borderRadius: '8px',
      fontWeight: 600,
      fontSize: '1.1rem',
      minWidth: '200px',
      textAlign: 'center'
    }}>
      {mesActual.toLocaleDateString('ca-ES', { month: 'long', year: 'numeric' })}
    </div>
    
    <button
      onClick={mesSeguent}
      className="btn-secondary"
      style={{ padding: '0.5rem' }}
    >
      <ChevronRight size={20} />
    </button>
  </div>
  
  <button
    onClick={() => setShowNouEsdeveniment(true)}
    className="btn-primary"
  >
    Nou Esdeveniment
  </button>
</div>

      {/* LEYENDA */}
      <div style={{
        display: 'flex',
        gap: '1.5rem',
        marginBottom: '1.5rem',
        flexWrap: 'wrap',
        padding: '1rem',
        background: 'var(--color-bg-secondary)',
        borderRadius: '8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
          <div style={{ width: '12px', height: '12px', background: '#3b82f6', borderRadius: '2px' }} />
          Inici de rodatge
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
          <div style={{ width: '12px', height: '12px', background: '#f59e0b', borderRadius: '2px' }} />
          Entrega de projecte
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
          <div style={{ width: '12px', height: '12px', background: '#10b981', borderRadius: '2px' }} />
          Factures venda
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
          <div style={{ width: '12px', height: '12px', background: '#ef4444', borderRadius: '2px' }} />
          Factures compra
        </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
          <div style={{ width: '12px', height: '12px', background: '#6366f1', borderRadius: '2px' }} />
          Pressupostos
        </div>
      </div>

      {/* GRID LAYOUT */}
      <div style={{ display: 'grid', gridTemplateColumns: diaSeleccionat ? '1fr 350px' : '1fr', gap: '1.5rem' }}>
        {/* CALENDARIO */}
        <div style={{
          background: 'var(--color-bg-secondary)',
          borderRadius: '12px',
          border: '1px solid var(--color-border)',
          overflow: 'hidden'
        }}>
          {/* Headers días semana */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            background: 'var(--color-bg-tertiary)',
            borderBottom: '2px solid var(--color-border)'
          }}>
            {['Dl', 'Dt', 'Dc', 'Dj', 'Dv', 'Ds', 'Dg'].map(dia => (
              <div
                key={dia}
                style={{
                  padding: '1rem',
                  textAlign: 'center',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  color: 'var(--color-text-secondary)',
                  textTransform: 'uppercase'
                }}
              >
                {dia}
              </div>
            ))}
          </div>

          {/* Grid días */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gridTemplateRows: 'repeat(6, 1fr)'
          }}>
            {diesDelMes.map((dia, index) => {
              if (!dia) return null;
              
              const esdeveniments = getEsdevenimentsDelDia(dia);
              const esDiaActual = esAvui(dia);
              const esDinsMes = esMesActual(dia);
              const any = dia.getFullYear();
              const mes = String(dia.getMonth() + 1).padStart(2, '0');
              const diaNum = String(dia.getDate()).padStart(2, '0');
              const dataStr = `${any}-${mes}-${diaNum}`;

              return (
                <div
                  key={index}
                  onClick={() => setDiaSeleccionat(dataStr)}
                  style={{
                    minHeight: '120px',
                    padding: '0.5rem',
                    borderRight: (index + 1) % 7 !== 0 ? '1px solid var(--color-border)' : 'none',
                    borderBottom: index < 35 ? '1px solid var(--color-border)' : 'none',
                    cursor: 'pointer',
                    background: diaSeleccionat === dataStr 
                      ? 'var(--color-accent-secondary)' 
                      : esDiaActual 
                      ? '#fef3c7' 
                      : 'transparent',
                    opacity: esDinsMes ? 1 : 0.4,
                    transition: 'all 0.2s',
                    position: 'relative'
                  }}
                  onMouseEnter={(e) => {
                    if (diaSeleccionat !== dataStr && !esDiaActual) {
                      e.currentTarget.style.background = 'var(--color-bg-tertiary)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (diaSeleccionat !== dataStr && !esDiaActual) {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  <div style={{
                    fontSize: '0.9rem',
                    fontWeight: esDiaActual ? 700 : 500,
                    marginBottom: '0.5rem',
                    color: esDiaActual ? '#f59e0b' : 'var(--color-text-primary)'
                  }}>
                    {dia.getDate()}
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {esdeveniments.slice(0, 3).map(event => (
                      <div
                        key={event.id}
                        style={{
                          fontSize: '0.7rem',
                          padding: '2px 4px',
                          background: event.color,
                          color: 'white',
                          borderRadius: '2px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          fontWeight: 500
                        }}
                        title={event.titol}
                      >
                        {event.titol}
                      </div>
                    ))}
                    {esdeveniments.length > 3 && (
                      <div style={{
                        fontSize: '0.7rem',
                        color: 'var(--color-text-tertiary)',
                        fontWeight: 600,
                        marginTop: '2px'
                      }}>
                        +{esdeveniments.length - 3} més
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* SIDEBAR DETALLE DÍA */}
        {diaSeleccionat && (
          <div style={{
            background: 'var(--color-bg-secondary)',
            borderRadius: '12px',
            border: '1px solid var(--color-border)',
            padding: '1.5rem',
            maxHeight: '800px',
            overflowY: 'auto'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '1.5rem'
            }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>
                {formatData(diaSeleccionat)}
              </h3>
              <button
                onClick={() => setDiaSeleccionat(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0.25rem',
                  color: 'var(--color-text-tertiary)'
                }}
              >
                <X size={20} />
              </button>
            </div>

            {esdevenimentsSeleccionats.length === 0 ? (
              <p style={{ 
                textAlign: 'center', 
                color: 'var(--color-text-tertiary)',
                padding: '2rem'
              }}>
                No hi ha esdeveniments aquest dia
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {esdevenimentsSeleccionats.map(event => {
  const esPersonalitzat = event.tipus === 'esdeveniment-personalitzat';
  const esdevenimentData = esPersonalitzat 
    ? esdevenimentsPersonalitzats.find(e => `custom-${e.id}` === event.id)
    : null;
  
  return (
    <div
      key={event.id}
      style={{
        padding: '1rem',
        background: 'var(--color-bg-tertiary)',
        borderRadius: '8px',
        borderLeft: `4px solid ${event.color}`
      }}
    >
      <div style={{ 
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '0.5rem'
      }}>
        <div style={{ 
          fontSize: '0.75rem',
          color: 'var(--color-text-tertiary)',
          textTransform: 'uppercase',
          fontWeight: 600
        }}>
          {event.tipusDescriptiu}
        </div>
        
        {esPersonalitzat && esdevenimentData && (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => {
                setEditingEsdeveniment(esdevenimentData);
                setShowNouEsdeveniment(true);
              }}
              style={{
                background: 'transparent',
                border: '1px solid var(--color-border)',
                borderRadius: '4px',
                padding: '0.25rem 0.5rem',
                cursor: 'pointer',
                fontSize: '0.75rem',
                color: 'var(--color-text-secondary)'
              }}
              title="Editar"
            >
              ✏️
            </button>
            <button
              onClick={() => eliminarEsdeveniment(esdevenimentData.id)}
              style={{
                background: 'transparent',
                border: '1px solid #ef4444',
                borderRadius: '4px',
                padding: '0.25rem 0.5rem',
                cursor: 'pointer',
                fontSize: '0.75rem',
                color: '#ef4444'
              }}
              title="Eliminar"
            >
              🗑️
            </button>
          </div>
        )}
      </div>
      
      <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
        {event.titol}
      </div>
      {event.subtitol && (
        <div style={{ 
          fontSize: '0.85rem', 
          color: 'var(--color-text-secondary)',
          marginBottom: '0.5rem'
        }}>
          {event.subtitol}
        </div>
      )}
      {event.estat && (
        <div style={{
          fontSize: '0.75rem',
          padding: '0.25rem 0.5rem',
          background: 'var(--color-bg-secondary)',
          borderRadius: '4px',
          display: 'inline-block',
          textTransform: 'uppercase',
          fontWeight: 600
        }}>
          {event.estat}
        </div>
      )}
    </div>
  );
})}
              </div>
            )}
          </div>
        )}
        </div>

{/* MODAL NOU ESDEVENIMENT */}
{showNouEsdeveniment && (
  <NouEsdevenimentModal
    onClose={() => {
      setShowNouEsdeveniment(false);
      setEditingEsdeveniment(null);
    }}
    editingEsdeveniment={editingEsdeveniment}
    onSave={(esdeveniment) => {
      // Guardar evento (crear o editar)
      let nous;
      if (editingEsdeveniment) {
        // Editar evento existente
        nous = esdevenimentsPersonalitzats.map(e => 
          e.id === esdeveniment.id ? esdeveniment : e
        );
      } else {
        // Crear nuevo evento
        nous = [...esdevenimentsPersonalitzats, esdeveniment];
      }
      setEsdevenimentsPersonalitzats(nous);
      localStorage.setItem('plateaEsdevenimentsPersonalitzats', JSON.stringify(nous));
      
      // Si está vinculado a proyecto, añadir al historial
      if (esdeveniment.projecte) {
        const projectesActuals = JSON.parse(localStorage.getItem('plateaProjectes') || '[]');
        const projecte = projectesActuals.find((p: Projecte) => p.codi === esdeveniment.projecte);
        
        if (projecte) {
          // Registrar en el historial con la estructura moderna
          const dataFormatada = new Date(esdeveniment.data).toLocaleDateString('ca-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          });
          
          const projecteAmbHistorial = afegirEntradaHistorial(
            projecte,
            'esdeveniment',
            `Esdeveniment creat: ${esdeveniment.titol}`,
            `Data: ${dataFormatada}${esdeveniment.descripcio ? ' | ' + esdeveniment.descripcio : ''}`
          );
          
          // Actualizar el proyecto en el array
          const projectesActualitzats = projectesActuals.map((p: Projecte) => 
            p.codi === esdeveniment.projecte ? projecteAmbHistorial : p
          );
          
          // Guardar y actualizar estado
          localStorage.setItem('plateaProjectes', JSON.stringify(projectesActualitzats));
          setProjectes(projectesActualitzats);
        }
      }
      
      setShowNouEsdeveniment(false);
      setEditingEsdeveniment(null);
    }}

    projectes={projectes}
  />
)}
    </div>
      );
    }

    // MODAL NOU ESDEVENIMENT
    interface NouEsdevenimentModalProps {
      onClose: () => void;
      onSave: (esdeveniment: any) => void;
      projectes: Projecte[];
      editingEsdeveniment?: any | null;
    }
    
    function NouEsdevenimentModal({ onClose, onSave, projectes, editingEsdeveniment }: NouEsdevenimentModalProps) {
      const [formData, setFormData] = useState(
        editingEsdeveniment || {
          id: '',  // ← Ya no necesitamos generar aquí
          titol: '',
          descripcio: '',
          data: new Date().toISOString().split('T')[0],
          projecte: '',
          color: '#ec4899'
        }
      );
    
      const handleSubmit = () => {
        if (!formData.titol || !formData.data) {
          alert('El títol i la data són obligatoris');
          return;
        }
        
        // Si es nuevo evento, generar ID único
        const esdevenimentAGuardar = editingEsdeveniment 
          ? formData 
          : { ...formData, id: Date.now().toString() };
        
        onSave(esdevenimentAGuardar);
      };
    
      return (
        <div className="modal-overlay">
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
          <div className="modal-header">
  <h2>📌 {editingEsdeveniment ? 'Editar' : 'Nou'} Esdeveniment</h2>
              <button className="modal-close" onClick={onClose}>
                <X size={24} />
              </button>
            </div>
    
            <div className="modal-body">
              <div className="form-group">
                <label>Títol *</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.titol}
                  onChange={(e) => setFormData({ ...formData, titol: e.target.value })}
                  placeholder="Ex: Reunió amb client, Deadline presentació..."
                  required
                />
              </div>
    
              <div className="form-group">
                <label>Descripció</label>
                <textarea
                  className="form-input"
                  value={formData.descripcio}
                  onChange={(e) => setFormData({ ...formData, descripcio: e.target.value })}
                  rows={4}
                  placeholder="Detalls de l'esdeveniment..."
                />
              </div>
    
              <div className="form-group">
                <label>Data *</label>
                <input
                  type="date"
                  className="form-input"
                  value={formData.data}
                  onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                  required
                />
              </div>
    
              <div className="form-group">
  <label>Vincular a projecte (opcional)</label>
  <SearchableSelect
    value={formData.projecte}
    onChange={(value) => setFormData({ ...formData, projecte: value || '' })}
    options={[
      { value: '', label: 'Cap projecte' },
      ...projectes.map(p => ({
        value: p.codi,
        label: `${p.titol} (${p.codi})`
      }))
    ]}
    placeholder="Selecciona projecte..."
  />
  <small style={{ color: 'var(--color-text-tertiary)', fontSize: '0.85rem', display: 'block', marginTop: '0.5rem' }}>
    Si selecciones un projecte, l'esdeveniment es registrarà al seu historial
  </small>
</div>
              <div className="form-group">
            <label>Color</label>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {[
                { color: '#ec4899', label: 'Rosa' },
                { color: '#8b5cf6', label: 'Lila' },
                { color: '#3b82f6', label: 'Blau' },
                { color: '#10b981', label: 'Verd' },
                { color: '#f59e0b', label: 'Taronja' },
                { color: '#ef4444', label: 'Vermell' },
                { color: '#6366f1', label: 'Índigo' },
                { color: '#06b6d4', label: 'Cian' }
              ].map(({ color, label }) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData({ ...formData, color })}
                  style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '8px',
                    background: color,
                    border: formData.color === color ? '3px solid var(--color-text-primary)' : '2px solid var(--color-border)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.7rem',
                    color: 'white',
                    fontWeight: 600,
                    transition: 'all 0.2s',
                    transform: formData.color === color ? 'scale(1.1)' : 'scale(1)'
                  }}
                  title={label}
                >
                  {formData.color === color && '✓'}
                </button>
              ))}
            </div>
          </div>
            </div>
    
            <div className="modal-footer">
              <button type="button" className="btn-secondary" onClick={onClose}>
                Cancel·lar
              </button>
              <button type="button" className="btn-primary" onClick={handleSubmit}>
  {editingEsdeveniment ? 'Guardar Canvis' : 'Crear Esdeveniment'}
</button>
            </div>
          </div>
        </div>
      );
    }
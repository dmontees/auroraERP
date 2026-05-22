import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import CalendarGrid from './CalendarGrid';
import EventsSidebar from './EventsSidebar';
import CalendarEventModal from './CalendarEventModal';
import { useCalendarData } from './useCalendarData';
import { useCalendarEvents } from './useCalendarEvents';
import { afegirEntradaHistorial } from '../../utils/projecteHistorial';
import type { Projecte } from '../../types/projecte';

export default function CalendarSection() {
  const [mesActual, setMesActual] = useState(new Date());
  const [diaSeleccionat, setDiaSeleccionat] = useState<string | null>(null);
  const [showNouEsdeveniment, setShowNouEsdeveniment] = useState(false);
  const [editingEsdeveniment, setEditingEsdeveniment] = useState<any | null>(null);

  const {
    projectes,
    facturesVenda,
    gastos,
    pressupostos,
    clients,
    proveidors,
    esdevenimentsPersonalitzats,
    updateEsdevenimentsPersonalitzats,
    updateProjectes
  } = useCalendarData();

  const esdeveniments = useCalendarEvents({
    projectes,
    facturesVenda,
    gastos,
    pressupostos,
    clients,
    proveidors,
    esdevenimentsPersonalitzats
  });

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

  const handleSaveEsdeveniment = (esdeveniment: any) => {
    let nous;
    if (editingEsdeveniment) {
      nous = esdevenimentsPersonalitzats.map(e => 
        e.id === esdeveniment.id ? esdeveniment : e
      );
    } else {
      nous = [...esdevenimentsPersonalitzats, esdeveniment];
    }
    
    updateEsdevenimentsPersonalitzats(nous);

    // Vincular a proyecto si corresponde
    if (esdeveniment.projecte && !editingEsdeveniment) {
      const projecte = projectes.find((p: Projecte) => p.codi === esdeveniment.projecte);
      
      if (projecte) {
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
        
        const projectesActualitzats = projectes.map((p: Projecte) => 
          p.codi === esdeveniment.projecte ? projecteAmbHistorial : p
        );
        
        updateProjectes(projectesActualitzats);
      }
    }
    
    setShowNouEsdeveniment(false);
    setEditingEsdeveniment(null);
  };

  const handleDeleteEsdeveniment = (id: string) => {
    if (!confirm('Estàs segur que vols eliminar aquest esdeveniment?')) {
      return;
    }
    
    const nous = esdevenimentsPersonalitzats.filter(e => e.id !== id);
    updateEsdevenimentsPersonalitzats(nous);
  };

  const handleEditEsdeveniment = (esdeveniment: any) => {
    setEditingEsdeveniment(esdeveniment);
    setShowNouEsdeveniment(true);
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1600px', margin: '0 auto' }}>
      {/* NAVEGACIÓN */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2rem'
      }}>
        <button onClick={avui} className="btn-secondary">
          Avui
        </button>
        
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={mesAnterior} className="btn-secondary" style={{ padding: '0.5rem' }}>
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
          
          <button onClick={mesSeguent} className="btn-secondary" style={{ padding: '0.5rem' }}>
            <ChevronRight size={20} />
          </button>
        </div>
        
        <button onClick={() => setShowNouEsdeveniment(true)} className="btn-primary">
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
        {[
          { color: '#3b82f6', label: 'Inici de rodatge' },
          { color: '#f59e0b', label: 'Entrega de projecte' },
          { color: '#10b981', label: 'Factures venda' },
          { color: '#ef4444', label: 'Factures compra' },
          { color: '#6366f1', label: 'Pressupostos' }
        ].map(({ color, label }) => (
          <div key={color} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
            <div style={{ width: '12px', height: '12px', background: color, borderRadius: '2px' }} />
            {label}
          </div>
        ))}
      </div>

      {/* GRID LAYOUT */}
      <div style={{ display: 'grid', gridTemplateColumns: diaSeleccionat ? '1fr 350px' : '1fr', gap: '1.5rem' }}>
        <CalendarGrid
          mesActual={mesActual}
          diaSeleccionat={diaSeleccionat}
          setDiaSeleccionat={setDiaSeleccionat}
          getEsdevenimentsDelDia={getEsdevenimentsDelDia}
        />

        {diaSeleccionat && (
          <EventsSidebar
            diaSeleccionat={diaSeleccionat}
            esdeveniments={esdevenimentsSeleccionats}
            esdevenimentsPersonalitzats={esdevenimentsPersonalitzats}
            onClose={() => setDiaSeleccionat(null)}
            onEdit={handleEditEsdeveniment}
            onDelete={handleDeleteEsdeveniment}
          />
        )}
      </div>

      {/* MODAL */}
      {showNouEsdeveniment && (
        <CalendarEventModal
          onClose={() => {
            setShowNouEsdeveniment(false);
            setEditingEsdeveniment(null);
          }}
          onSave={handleSaveEsdeveniment}
          projectes={projectes}
          editingEsdeveniment={editingEsdeveniment}
        />
      )}
    </div>
  );
}
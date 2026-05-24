import React, { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import CalendarGrid from './CalendarGrid';
import EventsSidebar from './EventsSidebar';
import CalendarEventModal from './CalendarEventModal';
import EventDetailModal from './EventDetailModal';
import { useCalendarData } from './useCalendarData';
import { useCalendarEvents } from './useCalendarEvents';
import type { CalendarEvent } from './useCalendarEvents';
import { afegirEntradaHistorial } from '../../utils/projecteHistorial';
import { storage } from '../../utils/storageManager';
import { syncCustomEventToGoogle, deleteGoogleEvent, isGoogleCalendarConnected } from '../../utils/googleCalendarSync';
import type { Projecte } from '../../types/projecte';

const DEFAULT_CONFIG_CALENDARI = {
  rodatge:       { actiu: true,  color: '#ef4444' },
  entrega:       { actiu: true,  color: '#f59e0b' },
  facturesVenda: { actiu: false, color: '#3b82f6' },
  facturesCompra:{ actiu: false, color: '#ef4444' },
  pressupostos:  { actiu: false, color: '#6366f1' },
};

const AUTO_CATS_LEGEND = [
  { key: 'rodatge',        label: 'Rodatge' },
  { key: 'entrega',        label: 'Entrega de projecte' },
  { key: 'facturesVenda',  label: 'Factures de venda' },
  { key: 'facturesCompra', label: 'Factures de compra' },
  { key: 'pressupostos',   label: 'Pressupostos' },
] as const;

type CatKey = 'rodatge' | 'entrega' | 'facturesVenda' | 'facturesCompra' | 'pressupostos';

export default function CalendarSection() {
  const [mesActual, setMesActual] = useState(new Date());
  const [diaSeleccionat, setDiaSeleccionat] = useState<string | null>(null);
  const [showNouEsdeveniment, setShowNouEsdeveniment] = useState(false);
  const [editingEsdeveniment, setEditingEsdeveniment] = useState<any | null>(null);
  const [viewingEvent, setViewingEvent] = useState<CalendarEvent | null>(null);

  const {
    projectes,
    facturesVenda,
    gastos,
    pressupostos,
    clients,
    proveidors,
    esdevenimentsPersonalitzats,
    updateEsdevenimentsPersonalitzats,
    updateProjectes,
    configCalendari,
    categoriesCalendari,
    extresEsdevenimentsAuto,
    updateExtresEsdevenimentsAuto
  } = useCalendarData();

  // Toggle state for auto-categories (persisted in storage)
  const [categoriesActives, setCategoriesActives] = useState<Record<CatKey, boolean>>({
    rodatge:       true,
    entrega:       true,
    facturesVenda: false,
    facturesCompra:false,
    pressupostos:  false,
  });

  // Toggle state for user categories (local session state)
  const [customCatsActives, setCustomCatsActives] = useState<Record<string, boolean>>({});

  // Sync auto-category toggles from storage
  useEffect(() => {
    if (configCalendari) {
      setCategoriesActives({
        rodatge:       configCalendari.rodatge?.actiu ?? true,
        entrega:       configCalendari.entrega?.actiu ?? true,
        facturesVenda: configCalendari.facturesVenda?.actiu ?? false,
        facturesCompra:configCalendari.facturesCompra?.actiu ?? false,
        pressupostos:  configCalendari.pressupostos?.actiu ?? false,
      });
    }
  }, [configCalendari]);

  // Initialize new custom categories as active
  useEffect(() => {
    setCustomCatsActives(prev => {
      const updated = { ...prev };
      categoriesCalendari.forEach(cat => {
        if (!(cat.id in updated)) updated[cat.id] = true;
      });
      return updated;
    });
  }, [categoriesCalendari]);

  // Merge user toggles into config for event generation
  const configActiu = {
    rodatge:       { ...(configCalendari?.rodatge        ?? DEFAULT_CONFIG_CALENDARI.rodatge),       actiu: categoriesActives.rodatge },
    entrega:       { ...(configCalendari?.entrega        ?? DEFAULT_CONFIG_CALENDARI.entrega),       actiu: categoriesActives.entrega },
    facturesVenda: { ...(configCalendari?.facturesVenda  ?? DEFAULT_CONFIG_CALENDARI.facturesVenda), actiu: categoriesActives.facturesVenda },
    facturesCompra:{ ...(configCalendari?.facturesCompra ?? DEFAULT_CONFIG_CALENDARI.facturesCompra),actiu: categoriesActives.facturesCompra },
    pressupostos:  { ...(configCalendari?.pressupostos   ?? DEFAULT_CONFIG_CALENDARI.pressupostos),  actiu: categoriesActives.pressupostos },
  };

  const tots_els_esdeveniments = useCalendarEvents({
    projectes,
    facturesVenda,
    gastos,
    pressupostos,
    clients,
    proveidors,
    esdevenimentsPersonalitzats,
    configCalendari: configActiu,
    categoriesCalendari,
    extresEsdevenimentsAuto
  });

  // Filter custom events by user category toggles
  const esdeveniments = useMemo(() => {
    return tots_els_esdeveniments.filter(e => {
      if (e.tipus !== 'esdeveniment-personalitzat') return true;
      if (!e.categoriaId) return true;
      return customCatsActives[e.categoriaId] !== false;
    });
  }, [tots_els_esdeveniments, customCatsActives]);

  const handleToggleCategoria = (catKey: CatKey, newValue: boolean) => {
    setCategoriesActives(prev => ({ ...prev, [catKey]: newValue }));
    const p = storage.getParametres();
    const currentConfig = p?.configCalendari ?? DEFAULT_CONFIG_CALENDARI;
    storage.setParametres({
      ...p,
      configCalendari: {
        ...currentConfig,
        [catKey]: { ...(currentConfig as any)[catKey], actiu: newValue }
      }
    });
  };

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
    // Google Calendar sync (fire and forget)
    if (isGoogleCalendarConnected()) {
      syncCustomEventToGoogle(esdeveniment).then(googleEventId => {
        if (googleEventId && googleEventId !== esdeveniment.googleEventId) {
          const updatedEvent = { ...esdeveniment, googleEventId };
          const stored = storage.getEsdevenimentsPersonalitzats();
          const updated = editingEsdeveniment
            ? stored.map((e: any) => e.id === updatedEvent.id ? updatedEvent : e)
            : [...stored, updatedEvent];
          storage.setEsdevenimentsPersonalitzats(updated);
        }
      }).catch(console.error);
    }

    let nous;
    if (editingEsdeveniment) {
      nous = esdevenimentsPersonalitzats.map(e =>
        e.id === esdeveniment.id ? esdeveniment : e
      );
    } else {
      nous = [...esdevenimentsPersonalitzats, esdeveniment];
    }

    updateEsdevenimentsPersonalitzats(nous);

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
    const event = esdevenimentsPersonalitzats.find(e => e.id === id);
    if (event?.googleEventId && isGoogleCalendarConnected()) {
      deleteGoogleEvent(event.googleEventId).catch(console.error);
    }
    const nous = esdevenimentsPersonalitzats.filter(e => e.id !== id);
    updateEsdevenimentsPersonalitzats(nous);
  };

  const handleEditEsdeveniment = (esdeveniment: any) => {
    setEditingEsdeveniment(esdeveniment);
    setShowNouEsdeveniment(true);
  };

  const getOriginalCustomEvent = (event: CalendarEvent) => {
    if (event.tipus !== 'esdeveniment-personalitzat') return undefined;
    return esdevenimentsPersonalitzats.find(e => e.id === event.customEventId);
  };

  const legendItemStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.85rem',
    cursor: 'pointer',
    userSelect: 'none'
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1600px', margin: '0 auto' }}>
      {/* NAVEGACIÓ */}
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

      {/* LLEGENDA AMB CHECKBOXES */}
      <div style={{
        display: 'flex',
        gap: '1.25rem',
        marginBottom: '1.5rem',
        flexWrap: 'wrap',
        padding: '1rem 1.25rem',
        background: 'var(--color-bg-secondary)',
        borderRadius: '8px',
        alignItems: 'center'
      }}>
        {/* Auto-categories */}
        {AUTO_CATS_LEGEND.map(({ key, label }) => {
          const catConf = configActiu[key];
          return (
            <label key={key} style={legendItemStyle}>
              <input
                type="checkbox"
                checked={categoriesActives[key]}
                onChange={(e) => handleToggleCategoria(key, e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              <div style={{
                width: '12px',
                height: '12px',
                background: catConf.color,
                borderRadius: '2px',
                flexShrink: 0
              }} />
              <span style={{ color: categoriesActives[key] ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)' }}>
                {label}
              </span>
            </label>
          );
        })}

        {/* Separator + user categories */}
        {categoriesCalendari.length > 0 && (
          <>
            <div style={{ width: '1px', height: '20px', background: 'var(--color-border)', margin: '0 0.1rem', flexShrink: 0 }} />
            {categoriesCalendari.map((cat: { id: string; nom: string; color: string }) => {
              const actiu = customCatsActives[cat.id] !== false;
              return (
                <label key={cat.id} style={legendItemStyle}>
                  <input
                    type="checkbox"
                    checked={actiu}
                    onChange={(e) => setCustomCatsActives(prev => ({ ...prev, [cat.id]: e.target.checked }))}
                    style={{ cursor: 'pointer' }}
                  />
                  <div style={{
                    width: '12px',
                    height: '12px',
                    background: cat.color,
                    borderRadius: '2px',
                    flexShrink: 0
                  }} />
                  <span style={{ color: actiu ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)' }}>
                    {cat.nom || '(sense nom)'}
                  </span>
                </label>
              );
            })}
          </>
        )}
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
            onViewEvent={(event) => setViewingEvent(event)}
          />
        )}
      </div>

      {/* MODAL NOU/EDITAR ESDEVENIMENT */}
      {showNouEsdeveniment && (
        <CalendarEventModal
          onClose={() => {
            setShowNouEsdeveniment(false);
            setEditingEsdeveniment(null);
          }}
          onSave={handleSaveEsdeveniment}
          projectes={projectes}
          editingEsdeveniment={editingEsdeveniment}
          categoriesCalendari={categoriesCalendari}
        />
      )}

      {/* MODAL DETALL ESDEVENIMENT */}
      {viewingEvent && (
        <EventDetailModal
          event={viewingEvent}
          originalCustomEvent={getOriginalCustomEvent(viewingEvent)}
          onClose={() => setViewingEvent(null)}
          onEdit={(customEvent) => {
            setViewingEvent(null);
            handleEditEsdeveniment(customEvent);
          }}
          onDelete={(id) => {
            handleDeleteEsdeveniment(id);
            setViewingEvent(null);
          }}
          onSaveExtras={updateExtresEsdevenimentsAuto}
        />
      )}
    </div>
  );
}

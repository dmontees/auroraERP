import React from 'react';
import { X } from 'lucide-react';
import type { CalendarEvent } from './useCalendarEvents';

interface EventsSidebarProps {
  diaSeleccionat: string;
  esdeveniments: CalendarEvent[];
  esdevenimentsPersonalitzats: any[];
  onClose: () => void;
  onEdit: (esdeveniment: any) => void;
  onDelete: (id: string) => void;
}

export default function EventsSidebar({
  diaSeleccionat,
  esdeveniments,
  esdevenimentsPersonalitzats,
  onClose,
  onEdit,
  onDelete
}: EventsSidebarProps) {
  
  const formatData = (dataStr: string) => {
    return new Date(dataStr).toLocaleDateString('ca-ES', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  return (
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
          onClick={onClose}
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

      {esdeveniments.length === 0 ? (
        <p style={{ 
          textAlign: 'center', 
          color: 'var(--color-text-tertiary)',
          padding: '2rem'
        }}>
          No hi ha esdeveniments aquest dia
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {esdeveniments.map(event => {
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
                        onClick={() => onEdit(esdevenimentData)}
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
                        onClick={() => onDelete(esdevenimentData.id)}
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
  );
}
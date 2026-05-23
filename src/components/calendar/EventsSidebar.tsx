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
  onViewEvent: (event: CalendarEvent) => void;
}

export default function EventsSidebar({
  diaSeleccionat,
  esdeveniments,
  onClose,
  onViewEvent
}: EventsSidebarProps) {

  const formatData = (dataStr: string) => {
    const parts = dataStr.split('-');
    if (parts.length !== 3) return dataStr;
    const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    return d.toLocaleDateString('ca-ES', {
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
          {esdeveniments.map(event => (
            <div
              key={event.id}
              onClick={() => onViewEvent(event)}
              style={{
                padding: '1rem',
                background: 'var(--color-bg-tertiary)',
                borderRadius: '8px',
                borderLeft: `4px solid ${event.color}`,
                cursor: 'pointer',
                transition: 'opacity 0.15s'
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.opacity = '0.8'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.opacity = '1'; }}
            >
              <div style={{
                fontSize: '0.75rem',
                color: 'var(--color-text-tertiary)',
                textTransform: 'uppercase',
                fontWeight: 600,
                marginBottom: '0.5rem'
              }}>
                {event.tipusDescriptiu}
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

              {(event.horaInici || event.horaFi) && (
                <div style={{
                  fontSize: '0.8rem',
                  color: 'var(--color-text-tertiary)',
                  marginBottom: '0.25rem'
                }}>
                  {event.horaInici && event.horaFi
                    ? `${event.horaInici} – ${event.horaFi}`
                    : event.horaInici || event.horaFi}
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
          ))}
        </div>
      )}
    </div>
  );
}

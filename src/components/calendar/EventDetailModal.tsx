import React, { useState } from 'react';
import { X, Edit2, Trash2, ExternalLink, MapPin, Clock } from 'lucide-react';
import type { CalendarEvent } from './useCalendarEvents';

interface Props {
  event: CalendarEvent;
  originalCustomEvent?: any;
  onClose: () => void;
  onEdit?: (customEvent: any) => void;
  onDelete?: (id: string) => void;
  onSaveExtras?: (eventId: string, extras: { ubicacio?: string; horaInici?: string; horaFi?: string; enllac?: string }) => void;
}

export default function EventDetailModal({
  event,
  originalCustomEvent,
  onClose,
  onEdit,
  onDelete,
  onSaveExtras
}: Props) {
  const isCustom = event.tipus === 'esdeveniment-personalitzat';

  const [extras, setExtras] = useState({
    ubicacio: event.ubicacio || '',
    horaInici: event.horaInici || '',
    horaFi: event.horaFi || '',
    enllac: event.enllac || '',
  });

  const extrasModificats =
    extras.ubicacio !== (event.ubicacio || '') ||
    extras.horaInici !== (event.horaInici || '') ||
    extras.horaFi !== (event.horaFi || '') ||
    extras.enllac !== (event.enllac || '');

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

  const handleDelete = () => {
    if (!originalCustomEvent) return;
    if (confirm('Estàs segur que vols eliminar aquest esdeveniment?')) {
      onDelete?.(originalCustomEvent.id);
      onClose();
    }
  };

  const handleEdit = () => {
    if (!originalCustomEvent) return;
    onEdit?.(originalCustomEvent);
    onClose();
  };

  const handleSaveExtras = () => {
    onSaveExtras?.(event.id, extras);
    onClose();
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.4rem 0.6rem',
    border: '1px solid var(--color-border)',
    borderRadius: '6px',
    fontSize: '0.9rem',
    background: 'var(--color-bg-primary)',
    color: 'var(--color-text-primary)',
    boxSizing: 'border-box'
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '520px' }}
      >
        {/* Header */}
        <div className="modal-header" style={{ borderBottom: `3px solid ${event.color}` }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <span style={{
              fontSize: '0.75rem',
              color: 'var(--color-text-tertiary)',
              textTransform: 'uppercase',
              fontWeight: 600,
              letterSpacing: '0.05em'
            }}>
              {event.tipusDescriptiu}
            </span>
            <h2 style={{ margin: 0, fontSize: '1.2rem' }}>{event.titol}</h2>
          </div>
          <button className="modal-close" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="modal-body">
          {/* Date */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.75rem 1rem',
            background: 'var(--color-bg-tertiary)',
            borderRadius: '8px',
            marginBottom: '1rem'
          }}>
            <span style={{ fontSize: '1.25rem' }}>📅</span>
            <div style={{ fontWeight: 600 }}>{formatData(event.data)}</div>
          </div>

          {/* Subtitol / client info */}
          {event.subtitol && (
            <div style={{ marginBottom: '0.75rem', color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
              {event.subtitol}
            </div>
          )}

          {/* Estat */}
          {event.estat && (
            <div style={{ marginBottom: '1rem' }}>
              <span style={{
                fontSize: '0.75rem',
                padding: '0.25rem 0.6rem',
                background: 'var(--color-bg-tertiary)',
                borderRadius: '4px',
                textTransform: 'uppercase',
                fontWeight: 600,
                color: 'var(--color-text-secondary)'
              }}>
                {event.estat}
              </span>
            </div>
          )}

          {/* AUTO-EVENTS: editable extra fields */}
          {!isCustom && (
            <>
              <div style={{
                borderTop: '1px solid var(--color-border)',
                marginBottom: '1rem',
                paddingTop: '1rem'
              }}>
                <p style={{
                  fontSize: '0.8rem',
                  color: 'var(--color-text-tertiary)',
                  marginBottom: '1rem',
                  fontStyle: 'italic'
                }}>
                  Pots afegir informació complementària a aquest event. Les dades originals es gestionen des del registre corresponent.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.3rem' }}>
                      <Clock size={13} /> Hora inici
                    </label>
                    <input
                      type="time"
                      value={extras.horaInici}
                      onChange={(e) => setExtras({ ...extras, horaInici: e.target.value })}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.3rem' }}>
                      <Clock size={13} /> Hora fi
                    </label>
                    <input
                      type="time"
                      value={extras.horaFi}
                      onChange={(e) => setExtras({ ...extras, horaFi: e.target.value })}
                      style={inputStyle}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '0.75rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.3rem' }}>
                    <MapPin size={13} /> Ubicació
                  </label>
                  <input
                    type="text"
                    value={extras.ubicacio}
                    onChange={(e) => setExtras({ ...extras, ubicacio: e.target.value })}
                    placeholder="Adreça o nom del lloc..."
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.3rem' }}>
                    <ExternalLink size={13} /> Enllaç (URL)
                  </label>
                  <input
                    type="url"
                    value={extras.enllac}
                    onChange={(e) => setExtras({ ...extras, enllac: e.target.value })}
                    placeholder="https://..."
                    style={inputStyle}
                  />
                </div>
              </div>
            </>
          )}

          {/* CUSTOM EVENTS: show stored extra info read-only */}
          {isCustom && (
            <>
              {(event.horaInici || event.horaFi) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', fontSize: '0.9rem' }}>
                  <Clock size={15} style={{ color: 'var(--color-text-tertiary)', flexShrink: 0 }} />
                  <span>
                    {event.horaInici && event.horaFi
                      ? `${event.horaInici} – ${event.horaFi}`
                      : event.horaInici
                      ? `Des de les ${event.horaInici}`
                      : `Fins a les ${event.horaFi}`}
                  </span>
                </div>
              )}
              {event.ubicacio && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', fontSize: '0.9rem' }}>
                  <MapPin size={15} style={{ color: 'var(--color-text-tertiary)', flexShrink: 0 }} />
                  <span>{event.ubicacio}</span>
                </div>
              )}
              {event.enllac && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', fontSize: '0.9rem' }}>
                  <ExternalLink size={15} style={{ color: 'var(--color-text-tertiary)', flexShrink: 0 }} />
                  <a
                    href={event.enllac}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'var(--color-accent-primary)', wordBreak: 'break-all' }}
                  >
                    {event.enllac}
                  </a>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          {isCustom && originalCustomEvent ? (
            <>
              <button type="button" className="btn-secondary" onClick={onClose}>
                Tancar
              </button>
              <button
                type="button"
                onClick={handleDelete}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.4rem',
                  padding: '0.5rem 1rem', background: 'transparent',
                  border: '1px solid #ef4444', borderRadius: '6px',
                  color: '#ef4444', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 500
                }}
              >
                <Trash2 size={15} />
                Eliminar
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleEdit}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <Edit2 size={15} />
                Editar
              </button>
            </>
          ) : (
            <>
              <button type="button" className="btn-secondary" onClick={onClose}>
                Tancar
              </button>
              {extrasModificats && (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleSaveExtras}
                >
                  Desar informació addicional
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

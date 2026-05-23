import React from 'react';
import type { CalendarEvent } from './useCalendarEvents';

interface CalendarGridProps {
  mesActual: Date;
  diaSeleccionat: string | null;
  setDiaSeleccionat: (dia: string | null) => void;
  getEsdevenimentsDelDia: (data: Date) => CalendarEvent[];
}

export default function CalendarGrid({
  mesActual,
  diaSeleccionat,
  setDiaSeleccionat,
  getEsdevenimentsDelDia
}: CalendarGridProps) {
  
  const getDiesDelMes = () => {
    const any = mesActual.getFullYear();
    const mes = mesActual.getMonth();
    
    const primerDia = new Date(any, mes, 1);
    const ultimDia = new Date(any, mes + 1, 0);
    
    const diesAnteriors = primerDia.getDay() === 0 ? 6 : primerDia.getDay() - 1;
    const totalDies = ultimDia.getDate();
    
    const dies: (Date | null)[] = [];
    
    for (let i = diesAnteriors; i > 0; i--) {
      dies.push(new Date(any, mes, -i + 1));
    }
    
    for (let i = 1; i <= totalDies; i++) {
      dies.push(new Date(any, mes, i));
    }
    
    const diesRestants = 42 - dies.length;
    for (let i = 1; i <= diesRestants; i++) {
      dies.push(new Date(any, mes + 1, i));
    }
    
    return dies;
  };

  const esAvui = (data: Date) => {
    const avui = new Date();
    return data.toDateString() === avui.toDateString();
  };

  const esMesActual = (data: Date) => {
    return data.getMonth() === mesActual.getMonth();
  };

  const diesDelMes = getDiesDelMes();

  return (
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
        gridTemplateRows: 'repeat(6, 120px)'
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
                height: '120px',
                overflow: 'hidden',
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
                transition: 'all 0.2s'
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
                {(() => {
                  // Range events first, then single events, for consistent slot positioning
                  const sorted = [...esdeveniments].sort((a, b) => {
                    const aR = !!(a.rangeId);
                    const bR = !!(b.rangeId);
                    if (aR && !bR) return -1;
                    if (!aR && bR) return 1;
                    if (aR && bR) return (a.rangeId || '').localeCompare(b.rangeId || '');
                    return 0;
                  });

                  const dayOfWeek = index % 7; // 0=Dl, 6=Dg
                  const CELL_PAD = 8; // matches cell padding 0.5rem
                  const visible = sorted.slice(0, 3);
                  const hidden = sorted.length - visible.length;

                  return (
                    <>
                      {visible.map(event => {
                        const isRange = !!(event.rangeId);
                        const visualStart = !isRange || event.isRangeStart || dayOfWeek === 0;
                        const visualEnd   = !isRange || event.isRangeEnd   || dayOfWeek === 6;
                        const showText    = !isRange || event.isRangeStart || dayOfWeek === 0;

                        const borderRadius = isRange
                          ? (visualStart && visualEnd ? '2px'
                            : visualStart ? '2px 0 0 2px'
                            : visualEnd   ? '0 2px 2px 0'
                            : '0')
                          : '2px';

                        return (
                          <div
                            key={event.id}
                            title={event.titol}
                            style={{
                              fontSize: '0.7rem',
                              padding: isRange
                                ? `2px ${visualEnd ? 4 : CELL_PAD}px 2px ${visualStart ? 4 : CELL_PAD}px`
                                : '2px 4px',
                              marginLeft:  isRange && !visualStart ? -CELL_PAD : 0,
                              marginRight: isRange && !visualEnd   ? -CELL_PAD : 0,
                              background: event.color,
                              color: 'white',
                              borderRadius,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              fontWeight: 500,
                            }}
                          >
                            {showText ? event.titol : ' '}
                          </div>
                        );
                      })}
                      {hidden > 0 && (
                        <div style={{
                          fontSize: '0.7rem',
                          color: 'var(--color-text-tertiary)',
                          fontWeight: 600,
                          marginTop: '2px'
                        }}>
                          +{hidden} més
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
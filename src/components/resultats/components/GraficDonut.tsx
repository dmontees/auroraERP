import React from 'react';

interface DataItem {
  label: string;
  valor: number;
  color: string;
}

interface GraficDonutProps {
  dades: DataItem[];
  size?: number;
  formatValue?: (value: number) => string;
  showPercentage?: boolean;
}

export default function GraficDonut({ 
  dades, 
  size = 200,
  formatValue = (v) => v.toFixed(0),
  showPercentage = true
}: GraficDonutProps) {
  const radius = size / 2;
  const innerRadius = radius * 0.6;
  const total = dades.reduce((sum, d) => sum + d.valor, 0);

  if (total === 0) {
    return (
      <div style={{ 
        textAlign: 'center', 
        padding: '2rem',
        color: 'var(--color-text-tertiary)'
      }}>
        No hi ha dades per mostrar
      </div>
    );
  }

  // Calcular ángulos
  let currentAngle = -90; // Empezar arriba
  const segments = dades.map(item => {
    const percentage = (item.valor / total) * 100;
    const angle = (item.valor / total) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle = endAngle;

    return {
      ...item,
      percentage,
      startAngle,
      endAngle
    };
  });

  // Función para convertir ángulo polar a coordenadas cartesianas
  const polarToCartesian = (angle: number, r: number) => {
    const angleInRadians = (angle * Math.PI) / 180;
    return {
      x: radius + r * Math.cos(angleInRadians),
      y: radius + r * Math.sin(angleInRadians)
    };
  };

  // Crear path de arco
  const createArc = (startAngle: number, endAngle: number, outerRadius: number, innerRadius: number) => {
    const start = polarToCartesian(startAngle, outerRadius);
    const end = polarToCartesian(endAngle, outerRadius);
    const innerStart = polarToCartesian(endAngle, innerRadius);
    const innerEnd = polarToCartesian(startAngle, innerRadius);

    const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;

    return [
      `M ${start.x} ${start.y}`,
      `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`,
      `L ${innerStart.x} ${innerStart.y}`,
      `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${innerEnd.x} ${innerEnd.y}`,
      'Z'
    ].join(' ');
  };

  return (
    <div>
      <svg width={size} height={size} style={{ display: 'block', margin: '0 auto' }}>
        {/* Segmentos */}
        {segments.map((segment, i) => (
          <g key={i}>
            <path
              d={createArc(segment.startAngle, segment.endAngle, radius, innerRadius)}
              fill={segment.color}
              stroke="white"
              strokeWidth="2"
              style={{ 
                cursor: 'pointer',
                transition: 'opacity 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
            >
              <title>{`${segment.label}: ${formatValue(segment.valor)} (${segment.percentage.toFixed(1)}%)`}</title>
            </path>
          </g>
        ))}

        {/* Texto central */}
        <text
          x={radius}
          y={radius}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="24"
          fontWeight="700"
          fill="var(--color-text-primary)"
        >
          {formatValue(total)}
        </text>
      </svg>

      {/* Leyenda */}
      <div style={{ 
        marginTop: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem'
      }}>
        {segments.map((segment, i) => (
          <div key={i} style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{
                width: '12px',
                height: '12px',
                borderRadius: '2px',
                background: segment.color,
                flexShrink: 0
              }} />
              <span style={{ fontSize: '0.85rem', color: 'var(--color-text-primary)' }}>
                {segment.label}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span style={{ 
                fontSize: '0.85rem', 
                fontWeight: 600,
                color: 'var(--color-text-primary)'
              }}>
                {formatValue(segment.valor)}
              </span>
              {showPercentage && (
                <span style={{ 
                  fontSize: '0.75rem',
                  color: 'var(--color-text-tertiary)'
                }}>
                  ({segment.percentage.toFixed(1)}%)
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
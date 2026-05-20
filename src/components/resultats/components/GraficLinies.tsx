import React from 'react';

interface DataPoint {
  label: string;
  valor: number;
}

interface Serie {
  nom: string;
  color: string;
  dades: DataPoint[];
}

interface GraficLiniesProps {
  series: Serie[];
  height?: number;
  showLegend?: boolean;
  formatValue?: (value: number) => string;
}

export default function GraficLinies({ 
  series, 
  height = 300, 
  showLegend = true,
  formatValue = (v) => v.toFixed(0)
}: GraficLiniesProps) {
  const width = 700;
  const padding = { top: 20, right: 20, bottom: 40, left: 60 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Obtener todos los valores para calcular el máximo
  const allValues = series.flatMap(s => s.dades.map(d => d.valor));
  const maxValue = Math.max(...allValues, 0);
  const minValue = Math.min(...allValues, 0);
  const valueRange = maxValue - minValue;

  // Escala Y
  const getY = (value: number) => {
    if (valueRange === 0) return chartHeight / 2;
    return chartHeight - ((value - minValue) / valueRange * chartHeight);
  };

  // Escala X (asumiendo mismos labels para todas las series)
  const labels = series[0]?.dades.map(d => d.label) || [];
  const getX = (index: number) => {
    return (index / Math.max(labels.length - 1, 1)) * chartWidth;
  };

  // Generar líneas de grid
  const gridLines = [0, 0.25, 0.5, 0.75, 1].map(percent => {
    const value = minValue + (valueRange * percent);
    const y = getY(value);
    return { y, value };
  });

  return (
    <div>
      <svg 
        width="100%" 
        height={height} 
        viewBox={`0 0 ${width} ${height}`}
        style={{ overflow: 'visible' }}
      >
        <g transform={`translate(${padding.left}, ${padding.top})`}>
          {/* Grid horizontal */}
          {gridLines.map((line, i) => (
            <g key={i}>
              <line
                x1={0}
                y1={line.y}
                x2={chartWidth}
                y2={line.y}
                stroke="var(--color-border)"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
              <text
                x={-10}
                y={line.y + 4}
                textAnchor="end"
                fontSize="11"
                fill="var(--color-text-tertiary)"
              >
                {formatValue(line.value)}
              </text>
            </g>
          ))}

          {/* Líneas de datos */}
          {series.map((serie, serieIndex) => {
            const pathData = serie.dades
              .map((d, i) => {
                const x = getX(i);
                const y = getY(d.valor);
                return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
              })
              .join(' ');

            return (
              <g key={serieIndex}>
                {/* Línea */}
                <path
                  d={pathData}
                  fill="none"
                  stroke={serie.color}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Puntos */}
                {serie.dades.map((d, i) => (
                  <g key={i}>
                    <circle
                      cx={getX(i)}
                      cy={getY(d.valor)}
                      r="5"
                      fill={serie.color}
                      stroke="white"
                      strokeWidth="2"
                    />
                    <title>{`${serie.nom}: ${formatValue(d.valor)}`}</title>
                  </g>
                ))}
              </g>
            );
          })}

          {/* Labels X */}
          {labels.map((label, i) => (
            <text
              key={i}
              x={getX(i)}
              y={chartHeight + 25}
              textAnchor="middle"
              fontSize="11"
              fill="var(--color-text-secondary)"
            >
              {label}
            </text>
          ))}
        </g>
      </svg>

      {/* Leyenda */}
      {showLegend && (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          gap: '2rem',
          marginTop: '1rem'
        }}>
          {series.map((serie, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                background: serie.color
              }} />
              <span style={{ fontSize: '0.9rem', color: 'var(--color-text-primary)' }}>
                {serie.nom}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
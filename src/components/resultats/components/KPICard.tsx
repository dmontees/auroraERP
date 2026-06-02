import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface KPICardProps {
  titol: string;
  valor: string;
  icon: React.ReactNode;
  color: string;
  variacio?: number;
  comparativa?: string;
  subtitol?: string;
}

export default function KPICard({ 
  titol, 
  valor, 
  icon, 
  color,
  variacio,
  comparativa,
  subtitol
}: KPICardProps) {
  const esPositiu = variacio !== undefined ? variacio >= 0 : null;
  
  return (
    <div style={{
      background: 'var(--color-bg-secondary)',
      padding: '1.5rem',
      borderRadius: '12px',
      border: `2px solid ${color}`,
      transition: 'transform 0.2s, box-shadow 0.2s'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-4px)';
      e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.1)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = 'none';
    }}
    >
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '0.75rem', 
        marginBottom: '1rem' 
      }}>
        <div style={{ 
          background: `${color}20`, 
          padding: '0.75rem', 
          borderRadius: '8px',
          display: 'flex'
        }}>
          {icon}
        </div>
        <span style={{ 
          fontSize: '0.9rem', 
          color: 'var(--color-text-secondary)',
          fontWeight: 500
        }}>
          {titol}
        </span>
      </div>
      
      <div style={{ 
  fontSize: '2rem', 
  fontWeight: 700, 
  color: color,
  marginBottom: subtitol ? '0.25rem' : '0.5rem'  // ← Ajustar espacio
}}>
  {valor}
</div>

{subtitol && (
  <div style={{ 
    fontSize: '0.85rem', 
    color: 'var(--color-text-secondary)',
    marginBottom: '0.5rem'
  }}>
    {subtitol}
  </div>
)}

{variacio !== undefined && (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.5rem',
          fontSize: '0.85rem'
        }}>
          {esPositiu ? (
            <TrendingUp size={16} color="var(--color-success)" />
          ) : (
            <TrendingDown size={16} color="var(--color-error)" />
          )}
          <span style={{ 
            color: esPositiu ? 'var(--color-success)' : 'var(--color-error)',
            fontWeight: 600
          }}>
            {esPositiu ? '+' : ''}{variacio.toFixed(1)}%
          </span>
          {comparativa && (
            <span style={{ color: 'var(--color-text-tertiary)' }}>
              vs {comparativa}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
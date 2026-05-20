import React from 'react';
import { Download } from 'lucide-react';
import type { FacturaVenta } from '../../types/facturaVenta';
import type { Client } from '../../types/client';

interface Props {
  factures: FacturaVenta[];
  clients: Client[];
  mesExport: string;
  setMesExport: (mes: string) => void;
  onExportarZip: () => void;
}

export default function FacturaVendaStats({ factures, clients, mesExport, setMesExport, onExportarZip }: Props) {
  // PENDENT DE COBRAR (global)
  const facturesPendents = factures.filter(f => 
    ['enviada', 'pagada-parcial', 'vencuda'].includes(f.estat)
  );
  const totalPendent = facturesPendents.reduce((sum, f) => sum + f.pendentCobrar, 0);
  const numFacturesPendents = facturesPendents.length;

  // VENÇUDES
  const facturesVencudes = factures.filter(f => f.estat === 'vencuda');
  const totalVencudes = facturesVencudes.reduce((sum, f) => sum + f.pendentCobrar, 0);
  const numFacturesVencudes = facturesVencudes.length;

  // ENVIADES (sin vencidas)
  const facturesEnviades = factures.filter(f => 
    f.estat === 'enviada' || f.estat === 'pagada-parcial'
  );
  const totalEnviades = facturesEnviades.reduce((sum, f) => sum + f.pendentCobrar, 0);
  const numFacturesEnviades = facturesEnviades.length;

  // COBRAT AQUEST MES
  const avui = new Date();
  const primerDiaMes = new Date(avui.getFullYear(), avui.getMonth(), 1);
  
  const pagamentsAquestMes = factures.flatMap(f => 
    f.pagaments.filter(p => new Date(p.data) >= primerDiaMes)
  );
  const totalCobratAquestMes = pagamentsAquestMes.reduce((sum, p) => sum + p.import, 0);
  
  const facturesCobrades = new Set(
    factures
      .filter(f => f.pagaments.some(p => new Date(p.data) >= primerDiaMes))
      .map(f => f.codi)
  );
  const numFacturesCobrades = facturesCobrades.size;

  return (
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '1rem',
      marginBottom: '1.5rem'
    }}>
      {/* Card 1: Pendent de Cobrar */}
      <div style={{
        background: 'var(--color-bg-secondary)',
        padding: '1.5rem',
        borderRadius: '12px',
        border: '2px solid #f59e0b'
      }}>
        <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>
          💰 Pendent de Cobrar
        </div>
        <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#f59e0b' }}>
          {totalPendent.toLocaleString('ca-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€
        </div>
        <div style={{ fontSize: '0.85rem', color: 'var(--color-text-tertiary)', marginTop: '0.25rem' }}>
          {numFacturesPendents} factures
        </div>
      </div>
  
      {/* Card 2: Vençudes */}
      <div style={{
        background: 'var(--color-bg-secondary)',
        padding: '1.5rem',
        borderRadius: '12px',
        border: '2px solid #dc2626'
      }}>
        <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>
          🔴 Vençudes
        </div>
        <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#dc2626' }}>
          {numFacturesVencudes}
        </div>
        <div style={{ fontSize: '0.85rem', color: 'var(--color-text-tertiary)', marginTop: '0.25rem' }}>
          {totalVencudes.toLocaleString('ca-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€
        </div>
      </div>
  
      {/* Card 3: Enviades */}
      <div style={{
        background: 'var(--color-bg-secondary)',
        padding: '1.5rem',
        borderRadius: '12px',
        border: '2px solid #3b82f6'
      }}>
        <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>
          📤 Enviades
        </div>
        <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#3b82f6' }}>
          {numFacturesEnviades}
        </div>
        <div style={{ fontSize: '0.85rem', color: 'var(--color-text-tertiary)', marginTop: '0.25rem' }}>
          {totalEnviades.toLocaleString('ca-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€
        </div>
      </div>
  
     {/* Card 4: Exportar ZIP */}
<div style={{
  background: 'var(--color-bg-secondary)',
  padding: '1.5rem',
  borderRadius: '12px',
  border: '1px solid var(--color-border)',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.75rem'
}}>
  <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
    📦 Exportar Mes
  </div>
  <input
    type="month"
    value={mesExport}
    onChange={(e) => setMesExport(e.target.value)}
    className="form-input"
    style={{ fontSize: '0.85rem' }}
  />
  <button
    className="btn-secondary"
    onClick={onExportarZip}
    style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: '0.5rem',
      fontSize: '0.85rem',
      padding: '0.5rem'
    }}
  >
    <Download size={16} />
    ZIP
  </button>
      </div>
      </div>
  );
}
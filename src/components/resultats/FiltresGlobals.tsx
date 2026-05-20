import React from 'react';
import type { Periode } from '../../utils/resultatCalculs';
import type { Client } from '../../types/client';
import type { Projecte } from '../../types/projecte';

interface FiltresGlobalsProps {
  periode: Periode;
  setPeriode: (periode: Periode) => void;
  periodePreset: string;
  setPeriodePreset: (preset: string) => void;
  clientSeleccionat: string;
  setClientSeleccionat: (client: string) => void;
  projecteSeleccionat: string;
  setProjecteSeleccionat: (projecte: string) => void;
  compararAmb: string;
  setCompararAmb: (comparar: string) => void;
  clients: Client[];
  projectes: Projecte[];
}

export default function FiltresGlobals({
  periode,
  setPeriode,
  periodePreset,
  setPeriodePreset,
  clientSeleccionat,
  setClientSeleccionat,
  projecteSeleccionat,
  setProjecteSeleccionat,
  compararAmb,
  setCompararAmb,
  clients,
  projectes
}: FiltresGlobalsProps) {
  
  const handlePresetChange = (preset: string) => {
    setPeriodePreset(preset);
    
    const avui = new Date();
    let nouPeriode: Periode;
    
    switch (preset) {
      case 'ultims-3-mesos':
        nouPeriode = {
          dataInici: new Date(avui.getFullYear(), avui.getMonth() - 2, 1).toISOString().split('T')[0],
          dataFi: avui.toISOString().split('T')[0]
        };
        break;
      case 'ultims-6-mesos':
        nouPeriode = {
          dataInici: new Date(avui.getFullYear(), avui.getMonth() - 5, 1).toISOString().split('T')[0],
          dataFi: avui.toISOString().split('T')[0]
        };
        break;
      case 'ultims-12-mesos':
        nouPeriode = {
          dataInici: new Date(avui.getFullYear(), avui.getMonth() - 11, 1).toISOString().split('T')[0],
          dataFi: avui.toISOString().split('T')[0]
        };
        break;
      case 'aquest-any':
        nouPeriode = {
          dataInici: new Date(avui.getFullYear(), 0, 1).toISOString().split('T')[0],
          dataFi: avui.toISOString().split('T')[0]
        };
        break;
      case 'any-anterior':
        nouPeriode = {
          dataInici: new Date(avui.getFullYear() - 1, 0, 1).toISOString().split('T')[0],
          dataFi: new Date(avui.getFullYear() - 1, 11, 31).toISOString().split('T')[0]
        };
        break;
      default:
        return;
    }
    
    setPeriode(nouPeriode);
  };

  return (
    <div style={{
      background: 'var(--color-bg-secondary)',
      padding: '1rem',
      borderRadius: '8px',
      border: '1px solid var(--color-border)',
      marginBottom: '1.5rem'
    }}>
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '0.75rem'
      }}>
        {/* Preset de período */}
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem', display: 'block' }}>
            Període
          </label>
          <select
            className="form-input"
            value={periodePreset}
            onChange={(e) => handlePresetChange(e.target.value)}
            style={{ fontSize: '0.875rem', padding: '0.375rem 0.5rem' }}
          >
            <option value="ultims-3-mesos">Últims 3 mesos</option>
            <option value="ultims-6-mesos">Últims 6 mesos</option>
            <option value="ultims-12-mesos">Últims 12 mesos</option>
            <option value="aquest-any">Aquest any</option>
            <option value="any-anterior">Any anterior</option>
            <option value="personalitzat">Personalitzat</option>
          </select>
        </div>
  
        {/* Fecha desde */}
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem', display: 'block' }}>
            Des de
          </label>
          <input
            type="date"
            className="form-input"
            value={periode.dataInici}
            onChange={(e) => {
              setPeriode({ ...periode, dataInici: e.target.value });
              setPeriodePreset('personalitzat');
            }}
            style={{ fontSize: '0.875rem', padding: '0.375rem 0.5rem' }}
          />
        </div>
  
        {/* Fecha hasta */}
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem', display: 'block' }}>
            Fins a
          </label>
          <input
            type="date"
            className="form-input"
            value={periode.dataFi}
            onChange={(e) => {
              setPeriode({ ...periode, dataFi: e.target.value });
              setPeriodePreset('personalitzat');
            }}
            style={{ fontSize: '0.875rem', padding: '0.375rem 0.5rem' }}
          />
        </div>
  
        {/* Comparar con */}
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem', display: 'block' }}>
            Comparar amb
          </label>
          <select
            className="form-input"
            value={compararAmb}
            onChange={(e) => setCompararAmb(e.target.value)}
            style={{ fontSize: '0.875rem', padding: '0.375rem 0.5rem' }}
          >
            <option value="periode-anterior">Període anterior</option>
            <option value="any-anterior">Any anterior</option>
            <option value="sense-comparar">Sense comparar</option>
          </select>
        </div>
  
        {/* Cliente */}
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem', display: 'block' }}>
            Client
          </label>
          <select
            className="form-input"
            value={clientSeleccionat}
            onChange={(e) => setClientSeleccionat(e.target.value)}
            style={{ fontSize: '0.875rem', padding: '0.375rem 0.5rem' }}
          >
            <option value="">Tots els clients</option>
            {clients.map(c => (
              <option key={c.codi} value={c.codi}>
                {c.nomComercial || c.nomFiscal}
              </option>
            ))}
          </select>
        </div>
  
        {/* Proyecto */}
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem', display: 'block' }}>
            Projecte
          </label>
          <select
            className="form-input"
            value={projecteSeleccionat}
            onChange={(e) => setProjecteSeleccionat(e.target.value)}
            style={{ fontSize: '0.875rem', padding: '0.375rem 0.5rem' }}
          >
            <option value="">Tots els projectes</option>
            {projectes.map(p => (
              <option key={p.codi} value={p.codi}>
                {p.codi} - {p.titol}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
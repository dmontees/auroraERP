import React from 'react';
import type { Plantilla } from '../../../types/parametres';

interface Props {
  plantilles: Plantilla[];
  plantillesSeleccionades: string[];
  plantillesText: string;
  onTogglePlantilla: (codi: string) => void;
  onChangeText: (text: string) => void;
  disabled?: boolean;
}

export default function PlantillesSelector({
  plantilles,
  plantillesSeleccionades,
  plantillesText,
  onTogglePlantilla,
  onChangeText,
  disabled = false
}: Props) {
  
  const plantillesFactura = plantilles.filter(p => p.tipusPlantilla === 'TPL-00002');

  return (
    <div style={{
      background: 'var(--color-bg-tertiary)',
      padding: '1.5rem',
      borderRadius: '8px'
    }}>
      <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>
        📄 Plantilles Disponibles
      </h3>

      {/* Checkboxes */}
      <div style={{ marginBottom: '1.5rem' }}>
        {plantillesFactura.map(plantilla => {
          const estaSeleccionada = plantillesSeleccionades.includes(plantilla.codi);
          const esPerDefecte = plantilla.perDefecte;

          return (
            <label
              key={plantilla.codi}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.5rem',
                cursor: (disabled || (esPerDefecte && estaSeleccionada)) ? 'not-allowed' : 'pointer',
                opacity: (disabled || (esPerDefecte && estaSeleccionada)) ? 0.7 : 1
              }}
            >
              <input
                type="checkbox"
                checked={estaSeleccionada}
                onChange={() => onTogglePlantilla(plantilla.codi)}
                disabled={disabled || (esPerDefecte && estaSeleccionada)}
              />
              <span style={{ fontWeight: 600 }}>
                {plantilla.titol}
                {esPerDefecte && (
                  <span style={{
                    marginLeft: '0.5rem',
                    fontSize: '0.7rem',
                    background: 'var(--color-success)',
                    color: 'white',
                    padding: '0.15rem 0.4rem',
                    borderRadius: '3px',
                    fontWeight: 600
                  }}>
                    PER DEFECTE
                  </span>
                )}
              </span>
            </label>
          );
        })}
      </div>

      {/* Cuadro de texto editable */}
      <div>
        <label style={{ fontWeight: 600, marginBottom: '0.5rem', display: 'block' }}>
          Text del Peu de Pàgina
        </label>
        <textarea
          className="form-input"
          value={plantillesText}
          onChange={(e) => onChangeText(e.target.value)}
          rows={10}
          placeholder="Selecciona plantilles per veure el text aquí..."
          disabled={disabled}
        />
      </div>
    </div>
  );
}
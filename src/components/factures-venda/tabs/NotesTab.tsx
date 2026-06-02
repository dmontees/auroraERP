import React, { useState, useEffect } from 'react';
import type { FacturaVenta } from '../../../types/facturaVenta';
import type { Plantilla } from '../../../types/parametres';
import LangToggle, { type Lang } from '../../common/LangToggle';

interface Props {
  formData: FacturaVenta;
  setFormData: (data: FacturaVenta) => void;
  plantilles: Plantilla[];
  onTogglePlantilla?: (codi: string) => void;
  clientBlocked: boolean;
  tePagaments: boolean;
  esBloquejat?: boolean;
}

export default function NotesTab({
  formData,
  setFormData,
  plantilles,
  clientBlocked,
  tePagaments,
  esBloquejat = false
}: Props) {
  const [lang, setLang] = useState<Lang>('ca');

  const disabled = clientBlocked || tePagaments || esBloquejat;

  // Lazy-populate ES/EN text from selected plantilles when switching to an empty lang field
  useEffect(() => {
    if (lang === 'ca') return;
    const field = lang === 'es' ? 'plantillesTextEs' : 'plantillesTextEn';
    if ((formData as any)[field]) return;

    const plantillesActives = plantilles.filter(p =>
      formData.plantillesSeleccionades.includes(p.codi)
    );
    if (plantillesActives.length === 0) return;

    const textLines = plantillesActives
      .map(p => `• ${lang === 'es' ? ((p as any).textEs || p.text || '') : ((p as any).textEn || p.text || '')}`)
      .join('\n');

    if (textLines.trim()) {
      setFormData({ ...formData, [field]: textLines } as FacturaVenta);
    }
  }, [lang]); // eslint-disable-line react-hooks/exhaustive-deps
  const plantillesFactura = plantilles.filter(p => p.tipusPlantilla === 'TPL-00002');

  const textField = lang === 'ca' ? 'plantillesText' : lang === 'es' ? 'plantillesTextEs' : 'plantillesTextEn';
  const currentText = (formData as any)[textField] || '';

  const handleToggle = (codi: string) => {
    const plantilla = plantilles.find(p => p.codi === codi);
    if (!plantilla) return;

    const esPerDefecte = plantilla.perDefecte;
    const estaSeleccionada = formData.plantillesSeleccionades.includes(codi);
    if (esPerDefecte && estaSeleccionada) return;

    const noves = estaSeleccionada
      ? formData.plantillesSeleccionades.filter(c => c !== codi)
      : [...formData.plantillesSeleccionades, codi];

    if (!estaSeleccionada) {
      const langText = lang === 'ca'
        ? (plantilla.text || '')
        : lang === 'es'
          ? (plantilla.textEs || plantilla.text || '')
          : (plantilla.textEn || plantilla.text || '');
      const existing = currentText;
      const newText = existing ? `${existing}\n• ${langText}` : `• ${langText}`;
      setFormData({ ...formData, plantillesSeleccionades: noves, [textField]: newText } as FacturaVenta);
    } else {
      setFormData({ ...formData, plantillesSeleccionades: noves });
    }
  };

  const placeholder = lang === 'ca'
    ? 'Selecciona plantilles per veure el text aquí...'
    : lang === 'es'
      ? 'Selecciona plantillas para ver el texto aquí...'
      : 'Select templates to see the text here...';

  return (
    <>
      {esBloquejat && (
        <div style={{
          padding: '0.65rem 1rem', marginBottom: '1rem',
          background: 'var(--color-info-bg)', border: '1px solid var(--color-info-border)',
          borderRadius: '8px', fontSize: '0.85rem', color: 'var(--color-info-dark)',
          display: 'flex', alignItems: 'center', gap: '0.5rem'
        }}>
          🔒 Factura emesa — el contingut no es pot modificar. Per fer correccions, crea una factura rectificativa.
        </div>
      )}
    <div style={{ background: 'var(--color-bg-tertiary)', padding: '1.5rem', borderRadius: '8px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 0 }}>
          Plantilles Disponibles
        </h3>
        <LangToggle value={lang} onChange={setLang} />
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        {plantillesFactura.map(plantilla => {
          const estaSeleccionada = formData.plantillesSeleccionades.includes(plantilla.codi);
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
                onChange={() => handleToggle(plantilla.codi)}
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

      <div>
        <label style={{ fontWeight: 600, marginBottom: '0.5rem', display: 'block' }}>
          Text del Peu de Pàgina
        </label>
        <textarea
          className="form-input"
          value={currentText}
          onChange={(e) => setFormData({ ...formData, [textField]: e.target.value } as FacturaVenta)}
          rows={10}
          placeholder={placeholder}
          disabled={disabled}
        />
      </div>
    </div>
    </>
  );
}

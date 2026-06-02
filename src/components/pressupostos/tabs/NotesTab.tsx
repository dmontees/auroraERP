import React, { useState, useEffect } from 'react';
import { storage } from '../../../utils/storageManager';
import LangToggle, { type Lang } from '../../common/LangToggle';

interface NotesTabProps {
  hook: any;
}

export default function NotesTab({ hook }: NotesTabProps) {
  const { formData, setFormData, plantillesSeleccionades, setPlantillesSeleccionades, clientBlocked, pressupostBloquejat } = hook;
  const [lang, setLang] = useState<Lang>('ca');

  // Lazy-populate ES/EN text from selected plantilles when switching to an empty lang field
  useEffect(() => {
    if (lang === 'ca') return;
    const field = lang === 'es' ? 'notesAPeuEs' : 'notesAPeuEn';
    if (formData[field]) return;

    const parametresData = storage.getParametres();
    const plantillesActives = (parametresData.plantilles || [])
      .filter((p: any) => plantillesSeleccionades.includes(p.codi));

    if (plantillesActives.length === 0) return;

    const textLines = plantillesActives
      .map((p: any) => `• ${lang === 'es' ? (p.textEs || p.text || '') : (p.textEn || p.text || '')}`)
      .join('\n');

    if (textLines.trim()) {
      setFormData((prev: any) => ({ ...prev, [field]: textLines }));
    }
  }, [lang]); // eslint-disable-line react-hooks/exhaustive-deps

  const currentField = lang === 'ca' ? 'notesAPeu' : lang === 'es' ? 'notesAPeuEs' : 'notesAPeuEn';
  const currentPlaceholder = lang === 'ca'
    ? 'Les notes seleccionades apareixeran aquí. Podeu editar el text lliurement...'
    : lang === 'es'
      ? 'Las notas aparecerán aquí. Puedes editar el texto libremente...'
      : 'Notes will appear here. You can edit the text freely...';

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 0 }}>
            Plantilles disponibles
          </h3>
          <LangToggle value={lang} onChange={setLang} />
        </div>

        {(() => {
          const parametres = storage.getParametres();
          const tipusPeuPagina = (parametres as any).tipusPlantilles?.find((t: any) => t.nom === 'Peu de pàgina de pressupost');

          if (!tipusPeuPagina) return <p style={{ color: 'var(--color-text-tertiary)' }}>No hi ha plantilles de peu de pàgina</p>;

          const plantillesPeu = (parametres.plantilles || []).filter((p: any) => p.tipusPlantilla === tipusPeuPagina.codi);

          if (plantillesPeu.length === 0) return <p style={{ color: 'var(--color-text-tertiary)' }}>No hi ha plantilles creades</p>;

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {plantillesPeu.map((plantilla: any) => {
                const isChecked = plantillesSeleccionades.includes(plantilla.codi);
                const isDisabled = plantilla.perDefecte;

                return (
                  <label
                    key={plantilla.codi}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.5rem 0.75rem',
                      background: isChecked ? 'var(--color-bg-tertiary)' : 'transparent',
                      border: '1px solid var(--color-border)',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => {
                        const checked = e.target.checked;

                        if (checked) {
                          setPlantillesSeleccionades((prev: string[]) => [...prev, plantilla.codi]);
                          const langText = lang === 'ca'
                            ? (plantilla.text || '')
                            : lang === 'es'
                              ? (plantilla.textEs || plantilla.text || '')
                              : (plantilla.textEn || plantilla.text || '');
                          setFormData((prev: any) => ({
                            ...prev,
                            [currentField]: prev[currentField]
                              ? `${prev[currentField]}\n• ${langText}`
                              : `• ${langText}`
                          }));
                        } else {
                          setPlantillesSeleccionades((prev: string[]) => prev.filter(c => c !== plantilla.codi));
                        }
                      }}
                      disabled={clientBlocked || pressupostBloquejat}
                      style={{
                        width: '18px',
                        height: '18px',
                        cursor: 'pointer'
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ flex: 1, fontSize: '0.9rem', fontWeight: 500, color: 'var(--color-text-primary)' }}>
                        {plantilla.titol}
                        {plantilla.perDefecte && (
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
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          );
        })()}
      </div>

      <div className="form-group" style={{ marginTop: '2rem' }}>
        <label style={{ fontSize: '1rem', fontWeight: 600 }}>
          Notes a peu de pàgina
          <span style={{ fontSize: '0.85rem', fontWeight: 400, color: 'var(--color-text-tertiary)', marginLeft: '0.5rem' }}>
            (Text editable)
          </span>
        </label>
        <textarea
          className="form-input"
          value={formData[currentField] || ''}
          onChange={(e) => setFormData({ ...formData, [currentField]: e.target.value })}
          rows={12}
          style={{ resize: 'vertical', fontFamily: 'monospace' }}
          placeholder={currentPlaceholder}
          disabled={pressupostBloquejat}
        />
      </div>
    </div>
  );
}

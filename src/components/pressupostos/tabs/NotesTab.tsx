import React from 'react';

interface NotesTabProps {
  hook: any;
}

export default function NotesTab({ hook }: NotesTabProps) {
  const { formData, setFormData, plantillesSeleccionades, setPlantillesSeleccionades, clientBlocked, pressupostBloquejat } = hook;

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '1rem' }}>
          Plantilles disponibles
        </h3>
        
        {(() => {
          const parametresGuardats = localStorage.getItem('plateaParametres');
          if (!parametresGuardats) return <p style={{ color: 'var(--color-text-tertiary)' }}>No hi ha plantilles disponibles</p>;
          
          const parametres = JSON.parse(parametresGuardats);
          const tipusPeuPagina = parametres.tipusPlantilles?.find((t: any) => t.nom === 'Peu de pàgina de pressupost');
          
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
                          setFormData((prev: any) => ({
                            ...prev,
                            notesAPeu: prev.notesAPeu 
                              ? `${prev.notesAPeu}\n• ${plantilla.text}`
                              : `• ${plantilla.text}`
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
                            background: '#10b981',
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
          value={formData.notesAPeu}
          onChange={(e) => setFormData({ ...formData, notesAPeu: e.target.value })}
          rows={12}
          style={{ resize: 'vertical', fontFamily: 'monospace' }}
          placeholder="Les notes seleccionades apareixeran aquí. Podeu editar el text lliurement..."
          disabled={pressupostBloquejat}
        />
      </div>
    </div>
  );
}
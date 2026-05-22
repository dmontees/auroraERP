import React from 'react';

interface EmpresaTabProps {
  hook: {
    parametres: any;
    saveParametres: (params: any) => void;
  };
}

export default function EmpresaTab({ hook }: EmpresaTabProps) {
  const { parametres, saveParametres } = hook;

  return (
    <div style={{ maxWidth: '800px' }}>
      {/* LOGO DE L'EMPRESA */}
      <div style={{ marginBottom: '2rem' }}>
        <label style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem', display: 'block' }}>
          🎨 Logo de l'empresa
        </label>
        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-tertiary)', marginBottom: '1rem' }}>
          Aquest logo apareixerà en tots els pressupostos, factures i documents generats
        </p>
        <div style={{ 
          display: 'flex', 
          gap: '2rem',
          alignItems: 'flex-start'
        }}>
          {/* PREVIEW DEL LOGO */}
          <div style={{
            width: '250px',
            height: '150px',
            border: '2px dashed var(--color-border)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#f9fafb',
            padding: '1rem'
          }}>
            {parametres.dadesEmpresa.logo ? (
              <img 
                src={parametres.dadesEmpresa.logo} 
                alt="Logo empresa" 
                style={{ 
                  maxWidth: '100%', 
                  maxHeight: '100%',
                  objectFit: 'contain'
                }} 
              />
            ) : (
              <span style={{ color: 'var(--color-text-tertiary)', fontSize: '0.85rem', textAlign: 'center' }}>
                Sense logo
              </span>
            )}
          </div>

          {/* CONTROLES */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <input
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/svg+xml"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  if (file.size > 2 * 1024 * 1024) {
                    alert('El fitxer és massa gran. Màxim 2MB.');
                    return;
                  }
                  
                  const reader = new FileReader();
                  reader.onload = (event) => {
                    const base64 = event.target?.result as string;
                    saveParametres({
                      ...parametres,
                      dadesEmpresa: { ...parametres.dadesEmpresa, logo: base64 }
                    });
                  };
                  reader.readAsDataURL(file);
                }
              }}
              style={{ 
                padding: '0.5rem',
                border: '1px solid var(--color-border)',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            />
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-tertiary)', margin: 0 }}>
              Formats: PNG, JPG, SVG • Màxim 2MB
            </p>
            {parametres.dadesEmpresa.logo && (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => saveParametres({
                  ...parametres,
                  dadesEmpresa: { ...parametres.dadesEmpresa, logo: null }
                })}
                style={{ 
                  background: 'var(--color-error)', 
                  color: 'white',
                  alignSelf: 'flex-start'
                }}
              >
                Eliminar logo
              </button>
            )}
          </div>
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '2rem', marginBottom: '1.5rem' }}></div>

      {/* DATOS FISCALES */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
        <div className="form-group">
          <label>🏢 Nom fiscal *</label>
          <input
            type="text"
            className="form-input"
            value={parametres.dadesEmpresa.nomFiscal}
            onChange={(e) => saveParametres({
              ...parametres,
              dadesEmpresa: { ...parametres.dadesEmpresa, nomFiscal: e.target.value }
            })}
            required
          />
        </div>
        <div className="form-group">
          <label>Nom comercial</label>
          <input
            type="text"
            className="form-input"
            value={parametres.dadesEmpresa.nomComercial}
            onChange={(e) => saveParametres({
              ...parametres,
              dadesEmpresa: { ...parametres.dadesEmpresa, nomComercial: e.target.value }
            })}
          />
        </div>
      </div>

      <div className="form-group" style={{ marginBottom: '1rem' }}>
        <label>NIF *</label>
        <input
          type="text"
          className="form-input"
          value={parametres.dadesEmpresa.nif}
          onChange={(e) => saveParametres({
            ...parametres,
            dadesEmpresa: { ...parametres.dadesEmpresa, nif: e.target.value }
          })}
          required
        />
      </div>

      <div className="form-group" style={{ marginBottom: '1rem' }}>
        <label>Domicili *</label>
        <textarea
          className="form-input"
          value={parametres.dadesEmpresa.domicili}
          onChange={(e) => saveParametres({
            ...parametres,
            dadesEmpresa: { ...parametres.dadesEmpresa, domicili: e.target.value }
          })}
          rows={3}
          style={{ resize: 'vertical' }}
          required
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
        <div className="form-group">
          <label>Telèfon</label>
          <input
            type="tel"
            className="form-input"
            value={parametres.dadesEmpresa.telefon}
            onChange={(e) => saveParametres({
              ...parametres,
              dadesEmpresa: { ...parametres.dadesEmpresa, telefon: e.target.value }
            })}
          />
        </div>
        <div className="form-group">
          <label>Correu electrònic</label>
          <input
            type="email"
            className="form-input"
            value={parametres.dadesEmpresa.email}
            onChange={(e) => saveParametres({
              ...parametres,
              dadesEmpresa: { ...parametres.dadesEmpresa, email: e.target.value }
            })}
          />
        </div>
      </div>

      <div className="form-group" style={{ marginBottom: '1rem' }}>
        <label>Web</label>
        <input
          type="url"
          className="form-input"
          value={parametres.dadesEmpresa.web}
          onChange={(e) => saveParametres({
            ...parametres,
            dadesEmpresa: { ...parametres.dadesEmpresa, web: e.target.value }
          })}
        />
      </div>

      <div className="form-group" style={{ marginBottom: '1rem' }}>
        <label>IBAN per defecte</label>
        <input
          type="text"
          className="form-input"
          value={parametres.dadesEmpresa.ibanDefecte}
          onChange={(e) => saveParametres({
            ...parametres,
            dadesEmpresa: { ...parametres.dadesEmpresa, ibanDefecte: e.target.value }
          })}
          placeholder="ES00 0000 0000 0000 0000 0000"
        />
      </div>

      <div className="form-group">
        <label>Observacions per a factures (text per defecte)</label>
        <textarea
          className="form-input"
          value={parametres.dadesEmpresa.observacionsFactura}
          onChange={(e) => saveParametres({
            ...parametres,
            dadesEmpresa: { ...parametres.dadesEmpresa, observacionsFactura: e.target.value }
          })}
          rows={4}
          placeholder="Text que apareixerà per defecte a les factures..."
          style={{ resize: 'vertical' }}
        />
      </div>
    </div>
  );
}
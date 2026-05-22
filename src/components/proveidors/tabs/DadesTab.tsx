import React from 'react';
import type { Proveidor } from '../../../types/proveidor';
import SearchableSelect from '../../common/SearchableSelect';

interface DadesTabProps {
  hook: {
    formData: Proveidor;
    setFormData: React.Dispatch<React.SetStateAction<Proveidor>>;
    parametres: any;
    toggleCategoria: (categoriaCodi: string) => void;
  };
}

export default function DadesTab({ hook }: DadesTabProps) {
  const { formData, setFormData, parametres, toggleCategoria } = hook;

  const categoriesProveidors = parametres?.categoriesProveidors || [];

  console.log('🟢 DadesTab render:', {
    parametres,
    categoriesProveidors,
    formDataCategories: formData.categories,
    toggleCategoria: typeof toggleCategoria
  });


  return (
    <div>
      {/* SECCIÓN: IDENTIFICACIÓN */}
      <div style={{ marginBottom: '2rem' }}>
        <h3 style={{ 
          fontSize: '1.1rem', 
          fontWeight: 600, 
          marginBottom: '1rem',
          color: 'var(--color-text-primary)'
        }}>
          Identificació
        </h3>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr', 
          gap: '1rem' 
        }}>
          <div className="form-group">
            <label className="form-label">Codi</label>
            <input
              type="text"
              className="form-input"
              value={formData.codi}
              disabled
              style={{ 
                background: 'var(--color-bg-tertiary)', 
                cursor: 'not-allowed' 
              }}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Data d'alta</label>
            <input
              type="date"
              className="form-input"
              value={formData.dataAlta}
              onChange={(e) => setFormData(prev => ({ ...prev, dataAlta: e.target.value }))}
            />
          </div>
        </div>
      </div>

      {/* SECCIÓN: DATOS PRINCIPALES */}
      <div style={{ marginBottom: '2rem' }}>
        <h3 style={{ 
          fontSize: '1.1rem', 
          fontWeight: 600, 
          marginBottom: '1rem',
          color: 'var(--color-text-primary)'
        }}>
          Dades principals
        </h3>

        <div style={{ display: 'grid', gap: '1rem' }}>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr', 
            gap: '1rem' 
          }}>
            <div className="form-group">
              <label className="form-label">
                Nom fiscal <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="text"
                className="form-input"
                value={formData.nomFiscal}
                onChange={(e) => setFormData(prev => ({ ...prev, nomFiscal: e.target.value }))}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Nom comercial</label>
              <input
                type="text"
                className="form-input"
                value={formData.nomComercial}
                onChange={(e) => setFormData(prev => ({ ...prev, nomComercial: e.target.value }))}
              />
            </div>
          </div>

          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr', 
            gap: '1rem' 
          }}>
            <div className="form-group">
              <label className="form-label">NIF</label>
              <input
                type="text"
                className="form-input"
                value={formData.nif}
                onChange={(e) => setFormData(prev => ({ ...prev, nif: e.target.value }))}
              />
            </div>

            <div className="form-group">
              <label className="form-label">País</label>
              <SearchableSelect
                value={formData.pais}
                onChange={(value) => setFormData(prev => ({ 
                  ...prev, 
                  pais: value as Proveidor['pais'] 
                }))}
                options={[
                  { value: 'Espanya', label: 'Espanya' },
                  { value: 'UE-VIES', label: 'UE-VIES' },
                  { value: 'Estranger-exportació', label: 'Estranger-exportació' },
                  { value: 'Altres', label: 'Altres' }
                ]}
                placeholder="Selecciona país..."
              />
            </div>
          </div>
        </div>
      </div>

      {/* SECCIÓN: CATEGORÍAS */}
      <div style={{ marginBottom: '2rem' }}>
        <h3 style={{ 
          fontSize: '1.1rem', 
          fontWeight: 600, 
          marginBottom: '1rem',
          color: 'var(--color-text-primary)'
        }}>
          Categories professionals
        </h3>

        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.5rem'
        }}>
          {categoriesProveidors.map((categoria: any) => {
            const isSelected = formData.categories.includes(categoria.codi);
            
            return (
              <button
                key={categoria.codi}
                type="button"
                onClick={() => {
                  console.log('🟡 Click en categoria:', categoria.codi);
                  toggleCategoria(categoria.codi);
                }}

                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '20px',
                  border: isSelected ? 'none' : '2px solid var(--color-border)',
                  background: isSelected ? categoria.color : 'white',
                  color: isSelected ? 'white' : 'var(--color-text-primary)',
                  fontWeight: isSelected ? 600 : 400,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  fontSize: '0.875rem'
                }}
              >
                {categoria.nom}
              </button>
            );
          })}
        </div>

        {formData.categories.length === 0 && (
          <p style={{
            marginTop: '0.75rem',
            fontSize: '0.875rem',
            color: 'var(--color-text-tertiary)'
          }}>
            Selecciona una o més categories professionals
          </p>
        )}
      </div>

      {/* SECCIÓN: CONTACTO */}
      <div style={{ marginBottom: '2rem' }}>
        <h3 style={{ 
          fontSize: '1.1rem', 
          fontWeight: 600, 
          marginBottom: '1rem',
          color: 'var(--color-text-primary)'
        }}>
          Contacte
        </h3>

        <div style={{ display: 'grid', gap: '1rem' }}>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr', 
            gap: '1rem' 
          }}>
            <div className="form-group">
              <label className="form-label">Telèfon</label>
              <input
                type="tel"
                className="form-input"
                value={formData.telefon}
                onChange={(e) => setFormData(prev => ({ ...prev, telefon: e.target.value }))}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Correu electrònic</label>
              <input
                type="email"
                className="form-input"
                value={formData.correuElectronic}
                onChange={(e) => setFormData(prev => ({ ...prev, correuElectronic: e.target.value }))}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Domicili</label>
            <textarea
              className="form-input"
              value={formData.domicili}
              onChange={(e) => setFormData(prev => ({ ...prev, domicili: e.target.value }))}
              rows={3}
              style={{ resize: 'vertical' }}
              placeholder="Adreça completa"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Web</label>
            <input
              type="url"
              className="form-input"
              value={formData.web}
              onChange={(e) => setFormData(prev => ({ ...prev, web: e.target.value }))}
              placeholder="https://..."
            />
          </div>
        </div>
      </div>

      {/* SECCIÓN: NOTAS INTERNAS */}
      <div>
        <h3 style={{ 
          fontSize: '1.1rem', 
          fontWeight: 600, 
          marginBottom: '1rem',
          color: 'var(--color-text-primary)'
        }}>
          Notes internes
        </h3>

        <div className="form-group">
          <textarea
            className="form-input"
            value={formData.notesInternes}
            onChange={(e) => setFormData(prev => ({ ...prev, notesInternes: e.target.value }))}
            rows={4}
            style={{ resize: 'vertical' }}
            placeholder="Notes internes sobre el proveïdor..."
          />
        </div>
      </div>
    </div>
  );
}
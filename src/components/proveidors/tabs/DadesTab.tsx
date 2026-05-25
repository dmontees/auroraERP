import React from 'react';
import type { Proveidor } from '../../../types/proveidor';
import SearchableSelect from '../../common/SearchableSelect';
import ProveidorImageCrop from '../ProveidorImageCrop';

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
  const categoriesAcreedor = parametres?.categoriesAcreedor || [];
  const serveis = parametres?.serveis || [];
  const isTreballador = formData.tipus === 'Treballador';


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
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 130px', gap: '1.5rem', alignItems: 'start' }}>
          {/* Left: codi + data d'alta apilats */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Codi</label>
              <input
                type="text"
                className="form-input"
                value={formData.codi}
                disabled
                style={{ background: 'var(--color-bg-tertiary)', cursor: 'not-allowed' }}
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

          {/* Right: imatge de perfil */}
          <div>
            <label className="form-label" style={{ display: 'block', marginBottom: '0.5rem' }}>Imatge de perfil</label>
            <ProveidorImageCrop
              currentImage={formData.imatgePerfil}
              onSave={(b64) => setFormData(prev => ({ ...prev, imatgePerfil: b64 }))}
              onRemove={() => setFormData(prev => ({ ...prev, imatgePerfil: undefined }))}
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

      {/* SECCIÓN TREBALLADOR: Camps específics */}
      {isTreballador && (
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--color-text-primary)' }}>
            Configuració Laboral
          </h3>

          {/* Toggle actiu */}
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="form-label">Treballador actiu (contractat)</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.4rem' }}>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, actiu: !(prev.actiu !== false) }))}
                style={{
                  width: '48px', height: '26px', borderRadius: '13px', border: 'none', cursor: 'pointer',
                  background: formData.actiu !== false ? '#10b981' : '#e5e7eb',
                  position: 'relative', transition: 'background 0.2s', flexShrink: 0
                }}
              >
                <span style={{
                  position: 'absolute', top: '3px',
                  left: formData.actiu !== false ? '25px' : '3px',
                  width: '20px', height: '20px', borderRadius: '50%', background: 'white',
                  transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                }} />
              </button>
              <span style={{ fontSize: '0.9rem', color: formData.actiu !== false ? '#065f46' : 'var(--color-text-tertiary)', fontWeight: 500 }}>
                {formData.actiu !== false ? 'Actiu' : 'Inactiu'}
              </span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div className="form-group">
              <label className="form-label">% SS càrrec empresa</label>
              <input type="number" step="0.01" min="0" className="form-input"
                value={formData.percentatgeSSEmpresa ?? 30.2}
                onChange={(e) => setFormData(prev => ({ ...prev, percentatgeSSEmpresa: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">% SS càrrec treballador</label>
              <input type="number" step="0.01" min="0" className="form-input"
                value={formData.percentatgeSSTreballador ?? 6.35}
                onChange={(e) => setFormData(prev => ({ ...prev, percentatgeSSTreballador: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">% IRPF retingut</label>
              <input type="number" step="0.01" min="0" className="form-input"
                value={formData.percentatgeIRPF ?? 15}
                onChange={(e) => setFormData(prev => ({ ...prev, percentatgeIRPF: parseFloat(e.target.value) || 0 }))}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="form-label">Salari diari brut (referència) €</label>
            <input type="number" step="0.01" min="0" className="form-input"
              value={formData.salariDiari ?? 0}
              onChange={(e) => setFormData(prev => ({ ...prev, salariDiari: parseFloat(e.target.value) || 0 }))}
              placeholder="0.00"
            />
          </div>

          {/* Serveis associats */}
          {serveis.length > 0 && (
            <div className="form-group">
              <label className="form-label">Serveis que realitza</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.4rem' }}>
                {serveis.map((s: any) => {
                  const sel = (formData.serveisAssociats || []).includes(s.codi);
                  return (
                    <button key={s.codi} type="button"
                      onClick={() => setFormData(prev => {
                        const arr = prev.serveisAssociats || [];
                        return { ...prev, serveisAssociats: sel ? arr.filter(x => x !== s.codi) : [...arr, s.codi] };
                      })}
                      style={{
                        padding: '0.35rem 0.8rem', borderRadius: '16px', fontSize: '0.82rem',
                        border: sel ? 'none' : '2px solid var(--color-border)',
                        background: sel ? 'var(--color-accent-primary)' : 'transparent',
                        color: sel ? 'white' : 'var(--color-text-primary)',
                        cursor: 'pointer', fontWeight: sel ? 600 : 400
                      }}
                    >
                      {s.nom}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* SECCIÓN: CATEGORÍAS (ocult per a Treballadors) */}
      {!isTreballador && (
      <div style={{ marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--color-text-primary)' }}>
          Categories
        </h3>

        {/* Categories de proveïdor */}
        {categoriesProveidors.length > 0 && (
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.5rem' }}>
              Categories professionals
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {categoriesProveidors.map((categoria: any) => {
                const isSelected = formData.categories.includes(categoria.codi);
                return (
                  <button
                    key={categoria.codi}
                    type="button"
                    onClick={() => toggleCategoria(categoria.codi)}
                    style={{
                      padding: '0.4rem 0.9rem',
                      borderRadius: '20px',
                      border: isSelected ? 'none' : '2px solid var(--color-border)',
                      background: isSelected ? categoria.color : 'white',
                      color: isSelected ? 'white' : 'var(--color-text-primary)',
                      fontWeight: isSelected ? 600 : 400,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      fontSize: '0.85rem'
                    }}
                  >
                    {categoria.nom}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Separador */}
        {categoriesProveidors.length > 0 && categoriesAcreedor.length > 0 && (
          <div style={{ borderTop: '1px solid var(--color-border)', margin: '0.75rem 0' }} />
        )}

        {/* Categories d'acreedor */}
        {categoriesAcreedor.length > 0 && (
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.5rem' }}>
              Categories acreedor
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {categoriesAcreedor.map((categoria: any) => {
                const isSelected = formData.categories.includes(categoria.codi);
                return (
                  <button
                    key={categoria.codi}
                    type="button"
                    onClick={() => toggleCategoria(categoria.codi)}
                    style={{
                      padding: '0.4rem 0.9rem',
                      borderRadius: '20px',
                      border: isSelected ? 'none' : '2px solid var(--color-border)',
                      background: isSelected ? categoria.color : 'white',
                      color: isSelected ? 'white' : 'var(--color-text-primary)',
                      fontWeight: isSelected ? 600 : 400,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      fontSize: '0.85rem'
                    }}
                  >
                    {categoria.nom}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {formData.categories.length === 0 && (
          <p style={{ marginTop: '0.75rem', fontSize: '0.875rem', color: 'var(--color-text-tertiary)' }}>
            Selecciona una o més categories
          </p>
        )}
      </div>
      )}

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

          {!isTreballador && (
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
          )}
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
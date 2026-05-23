import { useState } from 'react';
import { X } from 'lucide-react';
import type { Projecte, DataRodatge, DataEntrega } from '../../../types/projecte';
import type { Client } from '../../../types/client';
import type { Parametres } from '../../../types/parametres';
import SearchableSelect from '../../common/SearchableSelect';

interface Props {
  formData: Projecte;
  setFormData: (data: Projecte) => void;
  clients: Client[];
  parametres: Parametres | null;
  esBloquejat: boolean;
}

export default function DadesTab({ formData, setFormData, clients, parametres, esBloquejat }: Props) {
  const [searchClient, setSearchClient] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);

  const datesRodatge = formData.datesRodatge || [];
  const datesEntrega = formData.datesEntrega || [];

  const addDataRodatge = () => {
    const nou: DataRodatge = { id: `rod-${Date.now()}`, data: '', hora: '', nota: '' };
    setFormData({ ...formData, datesRodatge: [...datesRodatge, nou] });
  };

  const removeDataRodatge = (id: string) => {
    setFormData({ ...formData, datesRodatge: datesRodatge.filter(d => d.id !== id) });
  };

  const updateDataRodatge = (id: string, field: keyof DataRodatge, value: string) => {
    setFormData({
      ...formData,
      datesRodatge: datesRodatge.map(d => d.id === id ? { ...d, [field]: value } : d)
    });
  };

  const addDataEntrega = () => {
    const nou: DataEntrega = { id: `ent-${Date.now()}`, data: '', nota: '' };
    setFormData({ ...formData, datesEntrega: [...datesEntrega, nou] });
  };

  const removeDataEntrega = (id: string) => {
    setFormData({ ...formData, datesEntrega: datesEntrega.filter(d => d.id !== id) });
  };

  const updateDataEntrega = (id: string, field: keyof DataEntrega, value: string) => {
    setFormData({
      ...formData,
      datesEntrega: datesEntrega.map(d => d.id === id ? { ...d, [field]: value } : d)
    });
  };

  return (
    <div>
      {/* Fila 1: Codi + Modalitat + Tipus de producció */}
      <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr 1fr', gap: '1rem' }}>
        <div className="form-group">
          <label>Codi</label>
          <input
            type="text"
            className="form-input"
            value={formData.codi}
            disabled
            style={{ background: 'var(--color-bg-tertiary)', cursor: 'not-allowed' }}
          />
        </div>

        <div className="form-group">
          <label>Modalitat</label>
          <SearchableSelect
            value={formData.modalitat}
            onChange={(value) => setFormData({ ...formData, modalitat: value })}
            disabled={esBloquejat}
            options={parametres?.modalitats?.map(m => ({ value: m.codi, label: m.nom })) || []}
            placeholder="Selecciona modalitat..."
          />
        </div>

        <div className="form-group">
          <label>Tipus de producció</label>
          <SearchableSelect
            value={formData.servei}
            onChange={(value) => setFormData({ ...formData, servei: value })}
            disabled={esBloquejat}
            options={parametres?.tipusProduccio?.map(t => ({ value: t.codi, label: t.nom })) || []}
            placeholder="Selecciona tipus..."
          />
        </div>
      </div>

      {/* Fila 2: Títol + Checkbox directe */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1rem', alignItems: 'end' }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>Títol del Projecte *</label>
          <input
            type="text"
            className="form-input"
            value={formData.titol}
            onChange={(e) => setFormData({ ...formData, titol: e.target.value })}
            disabled={esBloquejat}
            placeholder="Títol descriptiu del projecte..."
            required
          />
        </div>
        <div style={{ paddingBottom: '0.6rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', whiteSpace: 'nowrap', fontSize: '0.9rem' }}>
            <input
              type="checkbox"
              checked={formData.esDirect}
              onChange={(e) => setFormData({ ...formData, esDirect: e.target.checked })}
              disabled={esBloquejat}
            />
            Gravació en directe
          </label>
        </div>
      </div>

      {/* Fila 3: Client */}
      <div className="form-group" style={{ position: 'relative', marginTop: '1rem' }}>
        <label>Client *</label>
        <input
          type="text"
          className="form-input"
          value={searchClient || (formData.client ? (clients.find(c => c.codi === formData.client)?.nomComercial || clients.find(c => c.codi === formData.client)?.nomFiscal || '') : '')}
          onChange={(e) => {
            setSearchClient(e.target.value);
            setShowClientDropdown(true);
          }}
          disabled={esBloquejat || formData.estat !== 'esborrany'}
          onFocus={() => setShowClientDropdown(true)}
          placeholder="Cerca client..."
          required
        />
        {showClientDropdown && (
          <div style={{
            position: 'absolute', top: '100%', left: 0, right: 0,
            maxHeight: '200px', overflowY: 'auto', background: 'white',
            border: '1px solid var(--color-border)', borderRadius: '4px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)', zIndex: 1000, marginTop: '0.25rem'
          }}>
            {clients
              .filter(c => {
                const nom = (c.nomComercial || c.nomFiscal).toLowerCase();
                return nom.includes(searchClient.toLowerCase());
              })
              .map(c => (
                <div
                  key={c.codi}
                  onClick={() => {
                    setFormData({ ...formData, client: c.codi });
                    setSearchClient('');
                    setShowClientDropdown(false);
                  }}
                  style={{ padding: '0.5rem 0.75rem', cursor: 'pointer', borderBottom: '1px solid var(--color-border)', fontSize: '0.85rem' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-bg-tertiary)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ fontWeight: 600 }}>{c.nomComercial || c.nomFiscal}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-tertiary)' }}>{c.codi} • {c.nif}</div>
                </div>
              ))}
            {clients.filter(c => (c.nomComercial || c.nomFiscal).toLowerCase().includes(searchClient.toLowerCase())).length === 0 && (
              <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: '0.85rem' }}>
                No s'han trobat clients
              </div>
            )}
          </div>
        )}
      </div>

      {/* Fila 4: Dates (dues columnes) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginTop: '1rem' }}>

        {/* Dates de Rodatge */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <label style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-text-primary)' }}>
              Dates de Rodatge
            </label>
            {!esBloquejat && (
              <button
                type="button"
                onClick={addDataRodatge}
                style={{
                  padding: '0.2rem 0.6rem', fontSize: '0.8rem', fontWeight: 600,
                  background: 'var(--color-accent-primary)', color: 'white',
                  border: 'none', borderRadius: '4px', cursor: 'pointer'
                }}
              >
                + Afegir
              </button>
            )}
          </div>

          {datesRodatge.length === 0 ? (
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-tertiary)', fontStyle: 'italic', padding: '0.5rem 0' }}>
              Cap data de rodatge
            </p>
          ) : (
            datesRodatge.map((d) => (
              <div key={d.id} style={{ display: 'grid', gridTemplateColumns: '1fr 75px 1fr 28px', gap: '0.4rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                <input
                  type="date"
                  className="form-input"
                  value={d.data}
                  onChange={(e) => updateDataRodatge(d.id, 'data', e.target.value)}
                  disabled={esBloquejat}
                  style={{ fontSize: '0.85rem', padding: '0.4rem 0.5rem' }}
                />
                <input
                  type="time"
                  className="form-input"
                  value={d.hora || ''}
                  onChange={(e) => updateDataRodatge(d.id, 'hora', e.target.value)}
                  disabled={esBloquejat}
                  style={{ fontSize: '0.85rem', padding: '0.4rem 0.5rem' }}
                />
                <input
                  type="text"
                  className="form-input"
                  value={d.nota || ''}
                  onChange={(e) => updateDataRodatge(d.id, 'nota', e.target.value)}
                  disabled={esBloquejat}
                  placeholder="Nota opcional..."
                  style={{ fontSize: '0.85rem', padding: '0.4rem 0.5rem' }}
                />
                {!esBloquejat && (
                  <button
                    type="button"
                    onClick={() => removeDataRodatge(d.id)}
                    style={{
                      background: 'transparent', border: 'none',
                      color: 'var(--color-error)', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.2rem'
                    }}
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        {/* Dates d'Entrega */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <label style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-text-primary)' }}>
              Dates d'Entrega
            </label>
            {!esBloquejat && (
              <button
                type="button"
                onClick={addDataEntrega}
                style={{
                  padding: '0.2rem 0.6rem', fontSize: '0.8rem', fontWeight: 600,
                  background: 'var(--color-accent-primary)', color: 'white',
                  border: 'none', borderRadius: '4px', cursor: 'pointer'
                }}
              >
                + Afegir
              </button>
            )}
          </div>

          {datesEntrega.length === 0 ? (
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-tertiary)', fontStyle: 'italic', padding: '0.5rem 0' }}>
              Cap data d'entrega
            </p>
          ) : (
            datesEntrega.map((d) => (
              <div key={d.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 28px', gap: '0.4rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                <input
                  type="date"
                  className="form-input"
                  value={d.data}
                  onChange={(e) => updateDataEntrega(d.id, 'data', e.target.value)}
                  disabled={esBloquejat}
                  style={{ fontSize: '0.85rem', padding: '0.4rem 0.5rem' }}
                />
                <input
                  type="text"
                  className="form-input"
                  value={d.nota || ''}
                  onChange={(e) => updateDataEntrega(d.id, 'nota', e.target.value)}
                  disabled={esBloquejat}
                  placeholder="Nota opcional..."
                  style={{ fontSize: '0.85rem', padding: '0.4rem 0.5rem' }}
                />
                {!esBloquejat && (
                  <button
                    type="button"
                    onClick={() => removeDataEntrega(d.id)}
                    style={{
                      background: 'transparent', border: 'none',
                      color: 'var(--color-error)', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.2rem'
                    }}
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Avís de facturació */}
      <div style={{
        marginTop: '1rem',
        padding: '0.75rem 1rem',
        borderRadius: '8px',
        border: `1px solid ${formData.avisFacturacio?.actiu ? '#fbbf24' : 'var(--color-border)'}`,
        background: formData.avisFacturacio?.actiu ? '#fffbeb' : 'var(--color-bg-secondary)',
        transition: 'all 0.2s'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>⚠️</span>
          <span style={{ fontWeight: 600, fontSize: '0.9rem', flex: 1, color: formData.avisFacturacio?.actiu ? '#92400e' : 'var(--color-text-secondary)' }}>
            Avís de facturació
          </span>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', userSelect: 'none' }}>
            <div
              onClick={() => {
                const nouActiu = !(formData.avisFacturacio?.actiu ?? false);
                setFormData({
                  ...formData,
                  avisFacturacio: {
                    actiu: nouActiu,
                    descripcio: formData.avisFacturacio?.descripcio || ''
                  }
                });
              }}
              style={{
                width: '40px', height: '22px', borderRadius: '11px',
                background: formData.avisFacturacio?.actiu ? '#f59e0b' : '#d1d5db',
                position: 'relative', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0
              }}
            >
              <div style={{
                position: 'absolute', top: '3px',
                left: formData.avisFacturacio?.actiu ? '21px' : '3px',
                width: '16px', height: '16px', borderRadius: '50%',
                background: 'white', transition: 'left 0.2s',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
              }} />
            </div>
            <span style={{ fontSize: '0.82rem', color: formData.avisFacturacio?.actiu ? '#92400e' : 'var(--color-text-tertiary)', fontWeight: 500 }}>
              {formData.avisFacturacio?.actiu ? 'Actiu' : 'Inactiu'}
            </span>
          </label>
        </div>
        <input
          type="text"
          className="form-input"
          value={formData.avisFacturacio?.descripcio || ''}
          onChange={(e) => setFormData({
            ...formData,
            avisFacturacio: { actiu: formData.avisFacturacio?.actiu ?? false, descripcio: e.target.value }
          })}
          disabled={!formData.avisFacturacio?.actiu}
          placeholder={formData.avisFacturacio?.actiu ? "Descriu l'avís (ex: afegir despeses d'aparcament)..." : "Desactivat"}
          style={{
            marginTop: '0.6rem',
            opacity: formData.avisFacturacio?.actiu ? 1 : 0.5,
            cursor: formData.avisFacturacio?.actiu ? 'text' : 'not-allowed'
          }}
        />
      </div>

      {/* Descripció */}
      <div className="form-group" style={{ marginTop: '1rem' }}>
        <label>Descripció</label>
        <textarea
          className="form-input"
          value={formData.descripcio}
          onChange={(e) => setFormData({ ...formData, descripcio: e.target.value })}
          rows={4}
          disabled={esBloquejat}
          placeholder="Descripció detallada del projecte..."
        />
      </div>
    </div>
  );
}

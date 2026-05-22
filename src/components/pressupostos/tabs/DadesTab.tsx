import React, { useState, useEffect } from 'react';
import SearchableSelect from '../../common/SearchableSelect';

interface DadesTabProps {
  hook: any;
}

export default function DadesTab({ hook }: DadesTabProps) {
  const { 
    formData, 
    setFormData, 
    clients, 
    selectedClient, 
    clientBlocked, 
    pressupostBloquejat 
  } = hook;

  const [searchClient, setSearchClient] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);

  useEffect(() => {
    const handleClickOutside = () => setShowClientDropdown(false);
    if (showClientDropdown) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showClientDropdown]);

  return (
    <div>
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

      <div className="form-group" style={{ position: 'relative' }}>
        <label>Client *</label>
        <input
          type="text"
          className="form-input"
          value={searchClient || (formData.client ? (clients.find((c: any) => c.codi === formData.client)?.nomComercial || clients.find((c: any) => c.codi === formData.client)?.nomFiscal || '') : '')}
          onChange={(e) => {
            setSearchClient(e.target.value);
            setShowClientDropdown(true);
          }}
          onFocus={() => setShowClientDropdown(true)}
          placeholder="Cerca client..."
          disabled={pressupostBloquejat}
          required
        />
        
        {showClientDropdown && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            maxHeight: '200px',
            overflowY: 'auto',
            background: 'white',
            border: '1px solid var(--color-border)',
            borderRadius: '4px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            zIndex: 1000,
            marginTop: '0.25rem'
          }}>
            {clients
              .filter((c: any) => {
                const searchLower = searchClient.toLowerCase();
                const nom = (c.nomComercial || c.nomFiscal).toLowerCase();
                return nom.includes(searchLower);
              })
              .map((c: any) => (
                <div
                  key={c.codi}
                  onClick={() => {
                    const ivaNumero = c.tipusIVA === 'Normal' ? 21 : 0;
                    
                    setFormData({
                      ...formData,
                      client: c.codi,
                      iva: ivaNumero,
                      retencioIRPF: c.retencio || 0
                    });
                    setSearchClient('');
                    setShowClientDropdown(false);
                  }}
                  style={{
                    padding: '0.75rem',
                    cursor: 'pointer',
                    borderBottom: '1px solid var(--color-border)',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-bg-tertiary)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ fontWeight: 600 }}>
                    {c.nomComercial || c.nomFiscal}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--color-text-tertiary)' }}>
                    {c.codi} • {c.nif}
                  </div>
                </div>
              ))}
            {clients.filter((c: any) => {
              const searchLower = searchClient.toLowerCase();
              const nom = (c.nomComercial || c.nomFiscal).toLowerCase();
              return nom.includes(searchLower);
            }).length === 0 && (
              <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--color-text-tertiary)' }}>
                No s'han trobat clients
              </div>
            )}
          </div>
        )}
      </div>

      {clientBlocked && (
        <div style={{ 
          padding: '1rem', 
          background: '#fef3c7', 
          border: '1px solid #fbbf24',
          borderRadius: '8px',
          marginBottom: '1rem',
          color: '#92400e'
        }}>
          ⚠️ Selecciona un client per continuar
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div className="form-group">
          <label>Data del pressupost *</label>
          <input
            type="date"
            className="form-input"
            value={formData.data}
            onChange={(e) => setFormData({ ...formData, data: e.target.value })}
            disabled={clientBlocked || pressupostBloquejat}
            required
          />
        </div>
        <div className="form-group">
          <label>Data de venciment</label>
          <input
            type="date"
            className="form-input"
            value={formData.dataVenciment}
            onChange={(e) => setFormData({ ...formData, dataVenciment: e.target.value })}
            disabled={clientBlocked || pressupostBloquejat}
          />
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginTop: '0.25rem' }}>
            Per defecte: 30 dies des de la data del pressupost
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div className="form-group">
          <label>IVA (%)</label>
          <input
            type="number"
            className="form-input"
            value={formData.iva}
            onChange={(e) => setFormData({ ...formData, iva: parseFloat(e.target.value) || 0 })}
            disabled={clientBlocked || pressupostBloquejat}
            min="0"
            max="100"
            step="0.1"
          />
        </div>
        <div className="form-group">
          <label>Retenció IRPF (%)</label>
          <input
            type="number"
            className="form-input"
            value={formData.retencioIRPF}
            onChange={(e) => setFormData({ ...formData, retencioIRPF: parseFloat(e.target.value) || 0 })}
            disabled={clientBlocked || pressupostBloquejat}
            min="0"
            max="100"
            step="0.1"
          />
        </div>
      </div>

      <div className="form-group">
        <label>Contacte (opcional)</label>
        <SearchableSelect
          value={formData.contacte}
          onChange={(value) => setFormData({ ...formData, contacte: value })}
          options={selectedClient?.contactes.map((c: any) => ({ 
            value: c.codi, 
            label: `${c.nom} - ${c.correu}` 
          })) || []}
          placeholder="Cap contacte"
          disabled={clientBlocked || pressupostBloquejat}
        />
      </div>

      <div className="form-group">
        <label>Observacions del client</label>
        <textarea
          className="form-input"
          value={formData.observacionsClient}
          onChange={(e) => setFormData({ ...formData, observacionsClient: e.target.value })}
          rows={6}
          style={{ resize: 'vertical' }}
          disabled={clientBlocked || pressupostBloquejat}
          placeholder="Instruccions i indicacions del client..."
        />
      </div>
    </div>
  );
}
import React from 'react';
import type { FacturaVenta } from '../../../types/facturaVenta';
import type { Client } from '../../../types/client';
import SearchableSelect from '../../common/SearchableSelect';

interface Props {
  formData: FacturaVenta;
  setFormData: (data: FacturaVenta) => void;
  clients: Client[];
  totals: {
    baseImposable: number;
    ivaImport: number;
    irpfImport: number;
    totalFactura: number;
    pendentCobrar: number;
  };
  clientBlocked: boolean;
  tePagaments: boolean;
  warnings: string[];
}

export default function DadesTab({
  formData,
  setFormData,
  clients,
  totals,
  clientBlocked,
  tePagaments,
  warnings
}: Props) {
  
  return (
    <div>
      {/* ← NUEVO: Info Factura Rectificativa */}
      {formData.tipus === 'rectificativa' && formData.facturaRectificada && (
        <div style={{
          background: '#fee2e2',
          border: '2px solid #dc2626',
          borderRadius: '8px',
          padding: '1rem',
          marginBottom: '1.5rem'
        }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#dc2626', marginBottom: '0.5rem' }}>
            📋 Nota de Crèdit (Factura Rectificativa)
          </h3>
          <div style={{ fontSize: '0.9rem', color: '#991b1b' }}>
            <div><strong>Rectifica la factura:</strong> {formData.facturaRectificada}</div>
            {formData.motivoRectificativa && (
              <div style={{ marginTop: '0.5rem' }}>
                <strong>Motiu:</strong> {formData.motivoRectificativa}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          {warnings.map((warning, index) => (
            <div 
              key={index}
              style={{ 
                padding: '1rem', 
                background: '#fef3c7', 
                border: '1px solid #fbbf24',
                borderRadius: '8px',
                marginBottom: '0.5rem',
                color: '#92400e'
              }}
            >
              {warning}
            </div>
          ))}
        </div>
      )}

      {/* Dades Bàsiques */}
      <div style={{
        background: 'var(--color-bg-tertiary)',
        padding: '1.5rem',
        borderRadius: '8px',
        marginBottom: '1.5rem'
      }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>
          📋 Dades Bàsiques
        </h3>

        <div className="form-group">
          <label>Codi</label>
          <input
            type="text"
            className="form-input"
            value={formData.codi}
            readOnly
            style={{ background: 'var(--color-bg-secondary)', cursor: 'not-allowed' }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="form-group">
            <label>Data Factura *</label>
            <input
              type="date"
              className="form-input"
              value={formData.dataFactura}
              onChange={(e) => setFormData({ ...formData, dataFactura: e.target.value })}
              required
              disabled={clientBlocked || tePagaments}
            />
          </div>

          <div className="form-group">
            <label>Data Venciment *</label>
            <input
              type="date"
              className="form-input"
              value={formData.dataVenciment}
              onChange={(e) => setFormData({ ...formData, dataVenciment: e.target.value })}
              required
              disabled={clientBlocked || tePagaments}
            />
          </div>
        </div>

        <div className="form-group">
          <label>Client *</label>
          <SearchableSelect
            value={formData.client}
            onChange={(value) => setFormData({ ...formData, client: value })}
            options={clients.map(c => ({
              value: c.codi,
              label: c.nomComercial || c.nomFiscal
            }))}
            placeholder="Selecciona un client..."
            disabled={tePagaments}
          />
        </div>
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

      {/* Càlculs Fiscals */}
      <div style={{
        background: 'var(--color-bg-tertiary)',
        padding: '1.5rem',
        borderRadius: '8px',
        marginBottom: '1.5rem'
      }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>
          💶 Càlculs Fiscals
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="form-group">
            <label>IVA (%)</label>
            <input
              type="number"
              step="0.01"
              className="form-input"
              value={formData.ivaPercent}
              onChange={(e) => setFormData({ ...formData, ivaPercent: parseFloat(e.target.value) || 0 })}
              disabled={clientBlocked || tePagaments}
            />
          </div>

          <div className="form-group">
            <label>Base Imposable</label>
            <input
              type="text"
              className="form-input"
              value={`${totals.baseImposable.toFixed(2)}€`}
              readOnly
              style={{ background: 'var(--color-bg-secondary)', cursor: 'not-allowed' }}
            />
          </div>

          <div className="form-group">
            <label>IRPF (%)</label>
            <input
              type="number"
              step="0.01"
              className="form-input"
              value={formData.irpfPercent}
              onChange={(e) => setFormData({ ...formData, irpfPercent: parseFloat(e.target.value) || 0 })}
              disabled={clientBlocked || tePagaments}
            />
          </div>

          <div className="form-group">
            <label>IVA</label>
            <input
              type="text"
              className="form-input"
              value={`${totals.ivaImport.toFixed(2)}€`}
              readOnly
              style={{ background: 'var(--color-bg-secondary)', cursor: 'not-allowed' }}
            />
          </div>

          <div></div>

          <div className="form-group">
            <label>IRPF</label>
            <input
              type="text"
              className="form-input"
              value={`-${totals.irpfImport.toFixed(2)}€`}
              readOnly
              style={{ background: 'var(--color-bg-secondary)', cursor: 'not-allowed' }}
            />
          </div>
        </div>

        <div style={{
          marginTop: '1.5rem',
          padding: '1.5rem',
          background: 'var(--color-accent-primary)',
          color: 'white',
          borderRadius: '8px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span style={{ fontSize: '1.3rem', fontWeight: 700 }}>TOTAL FACTURA</span>
          <span style={{ fontSize: '2rem', fontWeight: 700 }}>
            {totals.totalFactura.toFixed(2)}€
          </span>
        </div>
      </div>

      {/* Observacions */}
      <div style={{
        background: 'var(--color-bg-tertiary)',
        padding: '1.5rem',
        borderRadius: '8px'
      }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>
          📝 Observacions del Client
        </h3>
        
        <textarea
          className="form-input"
          value={formData.observacions}
          onChange={(e) => setFormData({ ...formData, observacions: e.target.value })}
          rows={4}
          placeholder="Notes addicionals per al client..."
          disabled={clientBlocked || tePagaments}
        />
      </div>
    </div>
  );
}
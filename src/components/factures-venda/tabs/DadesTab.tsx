import React from 'react';
import type { FacturaVenta } from '../../../types/facturaVenta';
import type { Client } from '../../../types/client';
import type { Projecte } from '../../../types/projecte';
import SearchableSelect from '../../common/SearchableSelect';

const IVA_OPTIONS = [
  { label: 'Normal (21%)',       tipusIVA: 'Normal',      percent: 21 },
  { label: 'Reduït (10%)',       tipusIVA: 'Reduit',      percent: 10 },
  { label: 'Superreduït (4%)',   tipusIVA: 'Superreduit', percent: 4  },
  { label: 'Exempt (0%)',        tipusIVA: 'Exempt',      percent: 0  },
] as const;

function percentToTipus(percent: number): string {
  if (percent === 0)  return 'Exempt';
  if (percent === 4)  return 'Superreduit';
  if (percent === 10) return 'Reduit';
  return 'Normal';
}

interface Props {
  formData: FacturaVenta;
  setFormData: (data: FacturaVenta) => void;
  clients: Client[];
  projectes: Projecte[];
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
  esBloquejatContenido?: boolean;
  onToggleAvis: () => void;
  onUpdateAvisDescripcio: (desc: string) => void;
  onProjecteSeleccionat: (codiProjecte: string | undefined) => void;
}

export default function DadesTab({
  formData, setFormData, clients, projectes,
  clientBlocked, tePagaments, warnings,
  esBloquejatContenido = false,
  onToggleAvis, onUpdateAvisDescripcio, onProjecteSeleccionat,
}: Props) {

  const client = clients.find(c => c.codi === formData.client);
  const currentTipusIVA = percentToTipus(formData.ivaPercent);
  const esBloquejatPerVerifactu = esBloquejatContenido;

  const handleIVAChange = (tipusIVA: string) => {
    const opt = IVA_OPTIONS.find(o => o.tipusIVA === tipusIVA);
    if (opt) setFormData({ ...formData, ivaPercent: opt.percent });
  };

  return (
    <div>
      {/* Nota de Crèdit banner */}
      {formData.tipus === 'rectificativa' && formData.facturaRectificada && (
        <div style={{ background: 'var(--color-error-bg)', border: '2px solid var(--color-error-dark)', borderRadius: '8px', padding: '1rem', marginBottom: '1.25rem' }}>
          <div style={{ fontWeight: 600, color: 'var(--color-error-dark)', marginBottom: '0.35rem' }}>📋 Nota de Crèdit (Factura Rectificativa)</div>
          <div style={{ fontSize: '0.9rem', color: 'var(--color-error-darker)' }}>
            <strong>Rectifica la factura:</strong> {formData.facturaRectificada}
            {formData.motivoRectificativa && <div style={{ marginTop: '0.3rem' }}><strong>Motiu:</strong> {formData.motivoRectificativa}</div>}
          </div>
        </div>
      )}

      {/* Banner: contingut bloquejat (factura emesa) */}
      {esBloquejatPerVerifactu && (
        <div style={{
          padding: '0.65rem 1rem', marginBottom: '1rem',
          background: 'var(--color-info-bg)', border: '1px solid var(--color-info-border)',
          borderRadius: '8px', fontSize: '0.85rem', color: 'var(--color-info-dark)',
          display: 'flex', alignItems: 'center', gap: '0.5rem'
        }}>
          🔒 Factura emesa — el contingut no es pot modificar. Per fer correccions, crea una factura rectificativa.
        </div>
      )}

      {/* Validation warnings */}
      {warnings.length > 0 && (
        <div style={{ marginBottom: '1.25rem' }}>
          {warnings.map((w, i) => (
            <div key={i} style={{ padding: '0.75rem 1rem', background: 'var(--color-warning-bg)', border: '1px solid var(--color-warning-light)', borderRadius: '8px', marginBottom: '0.4rem', color: 'var(--color-warning-dark)', fontSize: '0.875rem' }}>
              {w}
            </div>
          ))}
        </div>
      )}

      {/* ── MAIN LAYOUT: 60% Dades Bàsiques + 40% Observacions ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '60fr 40fr', gap: '1.25rem', alignItems: 'stretch', marginBottom: '1.25rem' }}>

        {/* Col 1: Dades Bàsiques */}
        <div style={{ background: 'var(--color-bg-tertiary)', padding: '1.25rem', borderRadius: '8px' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-text-tertiary)', marginBottom: '1rem' }}>
            📋 Dades Bàsiques
          </div>

          {/* Línia 1: Codi · Data Factura · Data Venciment */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr 1.2fr', gap: '0.75rem', marginBottom: '0.85rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: '0.8rem' }}>Codi</label>
              <input type="text" className="form-input" value={formData.codi} readOnly
                style={{ background: 'var(--color-bg-secondary)', cursor: 'not-allowed', fontFamily: 'monospace', fontSize: '0.9rem' }} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: '0.8rem' }}>Data Factura *</label>
              <input type="date" className="form-input" value={formData.dataFactura}
                onChange={e => setFormData({ ...formData, dataFactura: e.target.value })}
                disabled={clientBlocked || tePagaments || esBloquejatPerVerifactu} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: '0.8rem' }}>Data Venciment *</label>
              <input type="date" className="form-input" value={formData.dataVenciment}
                onChange={e => setFormData({ ...formData, dataVenciment: e.target.value })}
                disabled={clientBlocked || tePagaments} />
            </div>
          </div>

          {/* Línia 2: Client · Projecte */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 3fr', gap: '0.75rem', marginBottom: '0.85rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: '0.8rem' }}>Client *</label>
              <SearchableSelect
                value={formData.client}
                onChange={v => setFormData({ ...formData, client: v })}
                options={clients.map(c => ({ value: c.codi, label: c.nomComercial || c.nomFiscal }))}
                placeholder="Selecciona un client..."
                disabled={tePagaments || esBloquejatPerVerifactu}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: '0.8rem' }}>Projecte</label>
              <SearchableSelect
                key={formData.client}
                value={formData.projecte || ''}
                onChange={v => onProjecteSeleccionat(v || undefined)}
                options={projectes
                  .filter(p => !formData.client || p.client === formData.client)
                  .map(p => ({ value: p.codi, label: `${p.codi} – ${p.titol}${p.facturaAssociada ? ` (vinculat a ${p.facturaAssociada})` : ''}` }))}
                placeholder={formData.client ? 'Vincular projecte (opcional)...' : 'Selecciona primer un client...'}
                disabled={tePagaments || !formData.client}
              />
            </div>
          </div>

          {/* Línia 3: IVA · IRPF */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: '0.8rem' }}>Tipus d'IVA</label>
              <select
                className="form-input"
                value={currentTipusIVA}
                onChange={e => handleIVAChange(e.target.value)}
                disabled={clientBlocked || tePagaments || esBloquejatPerVerifactu}
              >
                {IVA_OPTIONS.map(o => (
                  <option key={o.tipusIVA} value={o.tipusIVA}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: '0.8rem' }}>IRPF (retencions)</label>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.5rem 0.75rem', background: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border)', borderRadius: '6px', minHeight: '38px',
              }}>
                <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{formData.irpfPercent}%</span>
                {client && (
                  <span style={{ fontSize: '0.78rem', color: 'var(--color-text-tertiary)' }}>
                    · heretat de {client.nomComercial || client.nomFiscal}
                  </span>
                )}
                {!client && (
                  <span style={{ fontSize: '0.78rem', color: 'var(--color-text-tertiary)', fontStyle: 'italic' }}>
                    · s'assigna en seleccionar el client
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Col 2: Observacions del Client */}
        <div style={{ background: 'var(--color-bg-tertiary)', padding: '1.25rem', borderRadius: '8px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-text-tertiary)', marginBottom: '0.85rem' }}>
            📝 Observacions del Client
          </div>
          <textarea
            className="form-input"
            value={formData.observacions}
            onChange={e => setFormData({ ...formData, observacions: e.target.value })}
            rows={7}
            placeholder="Notes addicionals per al client..."
            disabled={clientBlocked || tePagaments}
            style={{ flex: 1, resize: 'vertical' }}
          />
        </div>
      </div>

      {/* ── AVÍS DE FACTURACIÓ ── */}
      <div style={{
        padding: '0.85rem 1rem', borderRadius: '8px', marginBottom: '0',
        border: `1px solid ${formData.avisFacturacio?.actiu ? 'var(--color-warning-light)' : 'var(--color-border)'}`,
        background: formData.avisFacturacio?.actiu ? 'var(--color-warning-bg)' : 'var(--color-bg-tertiary)',
        transition: 'all 0.2s',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: formData.avisFacturacio?.actiu ? '0.6rem' : 0 }}>
          <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>⚠️</span>
          <span style={{ fontWeight: 600, fontSize: '0.9rem', flex: 1, color: formData.avisFacturacio?.actiu ? 'var(--color-warning-dark)' : 'var(--color-text-secondary)' }}>
            Avís de facturació
          </span>
          <div onClick={onToggleAvis} style={{
            width: '40px', height: '22px', borderRadius: '11px', flexShrink: 0,
            background: formData.avisFacturacio?.actiu ? 'var(--color-warning)' : 'var(--color-border-strong)',
            position: 'relative', cursor: 'pointer', transition: 'background 0.2s',
          }}>
            <div style={{
              position: 'absolute', top: '3px',
              left: formData.avisFacturacio?.actiu ? '21px' : '3px',
              width: '16px', height: '16px', borderRadius: '50%',
              background: 'white', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            }} />
          </div>
          <span style={{ fontSize: '0.82rem', color: formData.avisFacturacio?.actiu ? 'var(--color-warning-dark)' : 'var(--color-text-tertiary)', fontWeight: 500, minWidth: '48px' }}>
            {formData.avisFacturacio?.actiu ? 'Actiu' : 'Inactiu'}
          </span>
        </div>
        {formData.avisFacturacio?.actiu && (
          <input
            type="text"
            className="form-input"
            value={formData.avisFacturacio?.descripcio || ''}
            onChange={e => onUpdateAvisDescripcio(e.target.value)}
            placeholder="Descriu l'avís (ex: afegir despeses d'aparcament)..."
          />
        )}
      </div>
    </div>
  );
}

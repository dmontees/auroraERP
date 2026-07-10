import React from 'react';
import type { FacturaVenta } from '../../../types/facturaVenta';
import type { Client } from '../../../types/client';
import type { Projecte } from '../../../types/projecte';
import SearchableSelect from '../../common/SearchableSelect';
import {
  calcularBestretesAplicades,
  esFacturaFinal,
  getCodisBestretaSeleccionats,
  getFacturesBestretaDisponibles,
  getTipusComercialFactura,
} from '../../../utils/facturaBestretes';

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
  allFactures: FacturaVenta[];
  totals: {
    baseTasques?: number;
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
  formData, setFormData, clients, projectes, allFactures,
  clientBlocked, tePagaments, warnings,
  esBloquejatContenido = false,
  onToggleAvis, onUpdateAvisDescripcio, onProjecteSeleccionat,
}: Props) {

  const client = clients.find(c => c.codi === formData.client);
  const currentTipusIVA = percentToTipus(formData.ivaPercent);
  const esBloquejatPerVerifactu = esBloquejatContenido;
  const tipusComercial = getTipusComercialFactura(formData);
  const facturesAnticip = getFacturesBestretaDisponibles(formData, allFactures);
  const anticiposSeleccionats = getCodisBestretaSeleccionats(formData, allFactures);
  const anticiposTotals = calcularBestretesAplicades(formData, allFactures);
  const projecteSeleccionat = projectes.find(p => p.codi === formData.projecte);
  const baseProjecteAnticip = projecteSeleccionat?.tasques.reduce(
    (sum, tasca) => sum + tasca.quantitat * tasca.tarifa,
    0,
  ) || 0;
  const percentAnticip = Math.min(100, Math.max(0, formData.bestretaPercent ?? 30));

  const handleIVAChange = (tipusIVA: string) => {
    const opt = IVA_OPTIONS.find(o => o.tipusIVA === tipusIVA);
    if (opt) setFormData({ ...formData, ivaPercent: opt.percent });
  };

  const handleTipusComercialChange = (tipus: FacturaVenta['tipusComercial']) => {
    setFormData({
      ...formData,
      tipusComercial: tipus,
      bestretaPercent: tipus === 'bestreta' ? (formData.bestretaPercent ?? 30) : formData.bestretaPercent,
      bestretesAplicades: tipus === 'final'
        ? getFacturesBestretaDisponibles({ ...formData, tipusComercial: tipus }, allFactures).map(f => f.codi)
        : [],
    });
  };

  const aplicarAnticip = () => {
    if (!projecteSeleccionat || !baseProjecteAnticip) return;
    const baseAnticip = Number((baseProjecteAnticip * percentAnticip / 100).toFixed(2));
    setFormData({
      ...formData,
      bestretaPercent: percentAnticip,
      bestretaBaseProjecte: baseProjecteAnticip,
      tasques: [{
        categoria: 'ANTICIP',
        tasques: [{
          id: `anticip-${projecteSeleccionat.codi}`,
          categoria: 'ANTICIP',
          servei: 'Bestreta de projecte',
          descripcio: `Bestreta del ${percentAnticip}% del projecte ${projecteSeleccionat.codi} - ${projecteSeleccionat.titol}`,
          quantitat: 1,
          unitat: 'unitat',
          preu: baseAnticip,
          importe: baseAnticip,
          ordre: 0,
        }],
      }],
    });
  };

  const toggleAnticip = (codi: string) => {
    const actuals = new Set(anticiposSeleccionats);
    if (actuals.has(codi)) actuals.delete(codi);
    else actuals.add(codi);
    setFormData({ ...formData, bestretesAplicades: Array.from(actuals) });
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: '0.8rem' }}>Tipus factura</label>
              <select
                className="form-input"
                value={tipusComercial}
                onChange={e => handleTipusComercialChange(e.target.value as FacturaVenta['tipusComercial'])}
                disabled={clientBlocked || tePagaments || esBloquejatPerVerifactu || formData.tipus === 'rectificativa'}
              >
                <option value="ordinaria">Ordinaria</option>
                <option value="anticip">Bestreta</option>
                <option value="final">Final amb bestreta</option>
              </select>
            </div>
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
      {esFacturaFinal(formData) && (
        <div style={{
          padding: '0.85rem 1rem', borderRadius: '8px', marginBottom: '1rem',
          border: '1px solid var(--color-border)',
          background: 'var(--color-bg-tertiary)',
        }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-text-tertiary)', marginBottom: '0.75rem' }}>
            Bestretes aplicades a la factura final
          </div>
          {!formData.projecte ? (
            <div style={{ fontSize: '0.86rem', color: 'var(--color-warning-dark)' }}>
              Vincula un projecte per poder aplicar les factures de bestreta emeses.
            </div>
          ) : facturesAnticip.length === 0 ? (
            <div style={{ fontSize: '0.86rem', color: 'var(--color-text-secondary)' }}>
              Aquest projecte no te factures de bestreta emeses.
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', marginBottom: '0.75rem' }}>
                {facturesAnticip.map(f => (
                  <label key={f.codi} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', padding: '0.55rem 0.7rem', background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: '6px', cursor: esBloquejatPerVerifactu ? 'not-allowed' : 'pointer' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                      <input
                        type="checkbox"
                        checked={anticiposSeleccionats.includes(f.codi)}
                        onChange={() => toggleAnticip(f.codi)}
                        disabled={esBloquejatPerVerifactu}
                      />
                      <span style={{ fontWeight: 600 }}>{f.codi}</span>
                      <span style={{ fontSize: '0.82rem', color: 'var(--color-text-tertiary)' }}>{new Date(f.dataFactura).toLocaleDateString('ca-ES')}</span>
                    </span>
                    <span style={{ fontWeight: 700 }}>{(f.baseImposable || 0).toFixed(2)}€ base</span>
                  </label>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.6rem', fontSize: '0.86rem' }}>
                <div><strong>Base projecte:</strong> {(totals.baseTasques || 0).toFixed(2)}€</div>
                <div><strong>Bestretes:</strong> -{anticiposTotals.base.toFixed(2)}€</div>
                <div><strong>Base final:</strong> {totals.baseImposable.toFixed(2)}€</div>
              </div>
            </>
          )}
        </div>
      )}

      {tipusComercial === 'bestreta' && (
        <div style={{
          padding: '0.85rem 1rem', borderRadius: '8px', marginBottom: '1rem',
          border: '1px solid var(--color-border)', background: 'var(--color-bg-tertiary)',
        }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-text-tertiary)', marginBottom: '0.75rem' }}>
            Bestreta del projecte
          </div>
          {!projecteSeleccionat ? (
            <div style={{ fontSize: '0.86rem', color: 'var(--color-warning-dark)' }}>
              Vincula un projecte per calcular la bestreta sobre el seu import actual.
            </div>
          ) : baseProjecteAnticip <= 0 ? (
            <div style={{ fontSize: '0.86rem', color: 'var(--color-warning-dark)' }}>
              Aquest projecte no te tasques facturables per calcular la bestreta.
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'end', gap: '0.75rem', flexWrap: 'wrap' }}>
              <div className="form-group" style={{ marginBottom: 0, width: '130px' }}>
                <label style={{ fontSize: '0.8rem' }}>Percentatge</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <input
                    type="number"
                    className="form-input"
                    min="0"
                    max="100"
                    step="0.01"
                    value={formData.bestretaPercent ?? 30}
                    onChange={e => setFormData({ ...formData, bestretaPercent: Number(e.target.value) })}
                    disabled={esBloquejatPerVerifactu}
                  />
                  <span>%</span>
                </div>
              </div>
              <div style={{ fontSize: '0.86rem', color: 'var(--color-text-secondary)', paddingBottom: '0.55rem' }}>
                Base projecte: <strong>{baseProjecteAnticip.toFixed(2)}€</strong><br />
                Bestreta: <strong>{(baseProjecteAnticip * percentAnticip / 100).toFixed(2)}€</strong>
              </div>
              <button
                type="button"
                className="btn btn-primary"
                onClick={aplicarAnticip}
                disabled={esBloquejatPerVerifactu}
              >
                Aplicar bestreta
              </button>
            </div>
          )}
        </div>
      )}

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

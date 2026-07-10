import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { FacturaVenta } from '../../../types/facturaVenta';
import type { TascaCategoria } from '../../../types/pressupost';
import SearchableSelect from '../../common/SearchableSelect';
import { esFacturaFinal } from '../../../utils/facturaBestretes';

interface Props {
  formData: FacturaVenta;
  setFormData: (data: FacturaVenta) => void;
  parametres: any;
  totals: {
    baseTasques?: number;
    baseImposable: number;
    ivaImport: number;
    irpfImport: number;
    totalFactura: number;
    bestretesAplicadesBase?: number;
  };
  clientBlocked: boolean;
  tePagaments: boolean;
  esBloquejat?: boolean;
  onShowTascaModal: () => void;
  onShowMaterialModal: () => void;
  onEliminarTasca: (catIndex: number, tascaIndex: number) => void;
  onEliminarCategoria: (catIndex: number) => void;
  onMoureCategoriaAmunt: (index: number) => void;
  onMoureCategoriaAvall: (index: number) => void;
  onMoureTascaAmunt: (catIndex: number, tascaIndex: number) => void;
  onMoureTascaAvall: (catIndex: number, tascaIndex: number) => void;
  onUpdateTasca: (catIndex: number, tascaIndex: number, field: string, value: any) => void;
  onBuscarTarifa: (codiServei: string, codiUnitat: string) => number;
}

export default function TasquesTab({
  formData,
  setFormData,
  parametres,
  totals,
  clientBlocked,
  tePagaments: tePagamentsProp,
  esBloquejat = false,
  onShowTascaModal,
  onShowMaterialModal,
  onEliminarTasca,
  onEliminarCategoria,
  onMoureCategoriaAmunt,
  onMoureCategoriaAvall,
  onMoureTascaAmunt,
  onMoureTascaAvall,
  onUpdateTasca,
  onBuscarTarifa
}: Props) {

  // Una factura emesa (no borrador) bloqueja tota l'edició, igual que tenir pagaments
  const tePagaments = tePagamentsProp || esBloquejat;

  return (
    <div>
      {esBloquejat && (
        <div style={{
          padding: '0.65rem 1rem', marginBottom: '1rem',
          background: 'var(--color-info-bg)', border: '1px solid var(--color-info-border)',
          borderRadius: '8px', fontSize: '0.85rem', color: 'var(--color-info-dark)',
          display: 'flex', alignItems: 'center', gap: '0.5rem'
        }}>
          🔒 Factura emesa — el contingut no es pot modificar. Per fer correccions, crea una factura rectificativa.
        </div>
      )}

      {/* Tasques */}
      <div style={{
        background: 'var(--color-bg-tertiary)',
        padding: '1.5rem',
        borderRadius: '8px'
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '1rem'
        }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>
            📝 Tasques i Materials
          </h3>
          
          {!tePagaments && (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => {
                  if (!formData.client) {
                    alert('Selecciona primer un client a la pestanya "Dades"');
                    return;
                  }
                  onShowTascaModal();
                }}
                className="btn-secondary"
                style={{ fontSize: '0.85rem' }}
                disabled={clientBlocked}
              >
                <Plus size={16} />
                Afegir Tasca
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!formData.client) {
                    alert('Selecciona primer un client a la pestanya "Dades"');
                    return;
                  }
                  onShowMaterialModal();
                }}
                className="btn-secondary"
                style={{ fontSize: '0.85rem' }}
                disabled={clientBlocked}
              >
                <Plus size={16} />
                Afegir Material
              </button>
            </div>
          )}
        </div>

        {formData.tasques.length === 0 ? (
          <p style={{ 
            textAlign: 'center', 
            color: 'var(--color-text-tertiary)',
            padding: '2rem'
          }}>
            No hi ha tasques. Afegeix tasques per generar la factura.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {formData.tasques.map((categoria, catIndex) => (
              <div 
                key={catIndex}
                style={{
                  background: 'var(--color-bg-secondary)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  overflow: 'hidden'
                }}
              >
                {/* Header Categoria */}
                <div style={{
                  background: 'var(--color-accent-primary)',
                  color: 'white',
                  padding: '0.75rem 1rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: 600, textTransform: 'uppercase' }}>
                    {categoria.categoria === 'MATERIALS' 
                      ? 'MATERIALS'
                      : (parametres?.categories?.find((c: any) => c.codi === categoria.categoria)?.nom || categoria.categoria)
                    }
                  </h4>
                  
                  {!tePagaments && (
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      <button
                        type="button"
                        onClick={() => onMoureCategoriaAmunt(catIndex)}
                        disabled={catIndex === 0}
                        style={{
                          background: 'rgba(255,255,255,0.2)',
                          border: 'none',
                          color: 'white',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          cursor: catIndex === 0 ? 'not-allowed' : 'pointer',
                          opacity: catIndex === 0 ? 0.5 : 1
                        }}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => onMoureCategoriaAvall(catIndex)}
                        disabled={catIndex === formData.tasques.length - 1}
                        style={{
                          background: 'rgba(255,255,255,0.2)',
                          border: 'none',
                          color: 'white',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          cursor: catIndex === formData.tasques.length - 1 ? 'not-allowed' : 'pointer',
                          opacity: catIndex === formData.tasques.length - 1 ? 0.5 : 1
                        }}
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        onClick={() => onEliminarCategoria(catIndex)}
                        style={{
                          background: 'rgba(220, 38, 38, 0.8)',
                          border: 'none',
                          color: 'white',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Tasques */}
                <div style={{ padding: '1rem' }}>
                  {/* Headers de tabla */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: tePagaments ? '1.2fr 2.5fr 0.9fr 0.9fr 1fr 1fr' : '1.2fr 2.5fr 0.9fr 0.9fr 1fr 1fr 60px',
                    gap: '0.75rem',
                    padding: '0.5rem 0.75rem',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    color: 'var(--color-text-secondary)',
                    borderBottom: '1px solid var(--color-border)',
                    marginBottom: '0.5rem'
                  }}>
                    <div>Servei</div>
                    <div style={{ paddingLeft: '2rem' }}>Descripció</div>
                    <div style={{ textAlign: 'right', paddingRight: '0rem' }}>Quantitat</div>
                    <div style={{ paddingLeft: '1.8rem' }}>Unitat</div>
                    <div style={{ textAlign: 'right' }}>Preu</div>
                    <div style={{ textAlign: 'right' }}>Total</div>
                    {!tePagaments && <div></div>}
                  </div>

                  {categoria.tasques.map((tasca, tascaIndex) => (
                    <div 
                      key={tascaIndex}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: tePagaments ? '1.2fr 2.5fr 0.9fr 0.9fr 1fr 1fr' : '1.2fr 2.5fr 0.9fr 0.9fr 1fr 1fr 60px',
                        gap: '0.75rem',
                        alignItems: 'center',
                        padding: '0.75rem',
                        background: 'var(--color-bg-primary)',
                        borderRadius: '6px',
                        marginBottom: '0.5rem',
                        border: '1px solid var(--color-border)'
                      }}
                    >
                      {/* Servei */}
                      <div>
                        {tePagaments || categoria.categoria === 'MATERIALS' ? (
                          <div style={{ fontWeight: 600 }}>{tasca.servei}</div>
                        ) : (
                          <SearchableSelect
                            value={parametres?.serveis?.find((s: any) => s.nom === tasca.servei)?.codi || ''}
                            onChange={(codiServei) => {
                              const serveiData = parametres?.serveis?.find((s: any) => s.codi === codiServei);
                              const unitatActual = tasca.unitat;
                              const codiUnitat = parametres?.unitats?.find((u: any) => u.nom === unitatActual)?.codi;
                              
                              onUpdateTasca(catIndex, tascaIndex, 'servei', serveiData?.nom || codiServei);
                              onUpdateTasca(catIndex, tascaIndex, 'descripcio', serveiData?.descripcio || '');
                              
                              if (codiUnitat) {
                                const preu = onBuscarTarifa(codiServei, codiUnitat);
                                onUpdateTasca(catIndex, tascaIndex, 'preu', preu);
                              }
                            }}
                            options={parametres?.serveis?.map((s: any) => ({ value: s.codi, label: s.nom })) || []}
                            placeholder="Servei..."
                          />
                        )}
                      </div>
                      
                      {/* Descripció */}
                      <div>
                        {tePagaments ? (
                          <div style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
                            {tasca.descripcio}
                          </div>
                        ) : (
                          <textarea
                            className="form-input"
                            value={tasca.descripcio}
                            onChange={(e) => onUpdateTasca(catIndex, tascaIndex, 'descripcio', e.target.value)}
                            rows={2}
                            style={{ 
                              fontSize: '0.85rem',
                              padding: '0.5rem',
                              resize: 'vertical',
                              minHeight: '60px'
                            }}
                          />
                        )}
                      </div>
                      
                      {/* Quantitat */}
                      <div style={{ textAlign: 'right' }}>
                        {tePagaments ? (
                          <div style={{ fontWeight: 600 }}>{tasca.quantitat}</div>
                        ) : (
                          <input
                            type="number"
                            className="form-input"
                            value={tasca.quantitat}
                            onChange={(e) => onUpdateTasca(catIndex, tascaIndex, 'quantitat', parseFloat(e.target.value) || 0)}
                            min="0"
                            step="0.01"
                            style={{ 
                              fontSize: '0.85rem',
                              padding: '0.5rem',
                              textAlign: 'right'
                            }}
                          />
                        )}
                      </div>
                      
                      {/* Unitat */}
                      <div>
                        {tePagaments || categoria.categoria === 'MATERIALS' ? (
                          <div style={{ fontSize: '0.9rem', color: 'var(--color-text-tertiary)' }}>
                            {tasca.unitat}
                          </div>
                        ) : (
                          <SearchableSelect
                            value={parametres?.unitats?.find((u: any) => u.nom === tasca.unitat)?.codi || ''}
                            onChange={(codiUnitat) => {
                              const unitatData = parametres?.unitats?.find((u: any) => u.codi === codiUnitat);
                              const serveiActual = tasca.servei;
                              const codiServei = parametres?.serveis?.find((s: any) => s.nom === serveiActual)?.codi;
                              
                              onUpdateTasca(catIndex, tascaIndex, 'unitat', unitatData?.nom || codiUnitat);
                              
                              if (codiServei) {
                                const preu = onBuscarTarifa(codiServei, codiUnitat);
                                onUpdateTasca(catIndex, tascaIndex, 'preu', preu);
                              }
                            }}
                            options={parametres?.unitats?.map((u: any) => ({ value: u.codi, label: u.nom })) || []}
                            placeholder="Unitat..."
                          />
                        )}
                      </div>
                      
                      {/* Preu */}
                      <div style={{ textAlign: 'right' }}>
                        {tePagaments ? (
                          <div>{tasca.preu.toFixed(2)}€</div>
                        ) : (
                          <input
                            type="number"
                            className="form-input"
                            value={tasca.preu}
                            onChange={(e) => onUpdateTasca(catIndex, tascaIndex, 'preu', parseFloat(e.target.value) || 0)}
                            min="0"
                            step="0.01"
                            style={{ 
                              fontSize: '0.85rem',
                              padding: '0.5rem',
                              textAlign: 'right'
                            }}
                          />
                        )}
                      </div>
                      
                      {/* Total */}
                      <div style={{ textAlign: 'right', fontWeight: 600, color: 'var(--color-accent-primary)' }}>
                        {(tasca.quantitat * tasca.preu).toFixed(2)}€
                      </div>
                      
                      {/* Botones acción */}
                      {!tePagaments && (
                        <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center' }}>
                          <button
                            type="button"
                            onClick={() => onMoureTascaAmunt(catIndex, tascaIndex)}
                            disabled={tascaIndex === 0}
                            style={{
                              background: 'transparent',
                              border: '1px solid var(--color-border)',
                              color: tascaIndex === 0 ? 'var(--color-text-tertiary)' : 'var(--color-text-secondary)',
                              cursor: tascaIndex === 0 ? 'not-allowed' : 'pointer',
                              padding: '0.25rem 0.4rem',
                              borderRadius: '4px',
                              fontSize: '0.75rem'
                            }}
                            title="Moure amunt"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            onClick={() => onMoureTascaAvall(catIndex, tascaIndex)}
                            disabled={tascaIndex === categoria.tasques.length - 1}
                            style={{
                              background: 'transparent',
                              border: '1px solid var(--color-border)',
                              color: tascaIndex === categoria.tasques.length - 1 ? 'var(--color-text-tertiary)' : 'var(--color-text-secondary)',
                              cursor: tascaIndex === categoria.tasques.length - 1 ? 'not-allowed' : 'pointer',
                              padding: '0.25rem 0.4rem',
                              borderRadius: '4px',
                              fontSize: '0.75rem'
                            }}
                            title="Moure avall"
                          >
                            ↓
                          </button>
                          <button
                            type="button"
                            onClick={() => onEliminarTasca(catIndex, tascaIndex)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--color-error-dark)',
                              cursor: 'pointer',
                              padding: '0.25rem'
                            }}
                            title="Eliminar"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Totales */}
        <div style={{
          marginTop: '1.5rem',
          padding: '1rem',
          background: 'var(--color-bg-secondary)',
          borderRadius: '8px',
          border: '1px solid var(--color-border)'
        }}>
          {esFacturaFinal(formData) && (totals.baseTasques || 0) > totals.baseImposable && (
            <>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '0.5rem',
                fontSize: '0.95rem'
              }}>
                <span>Base projecte:</span>
                <span style={{ fontWeight: 600 }}>{(totals.baseTasques || 0).toFixed(2)}€</span>
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '0.5rem',
                fontSize: '0.95rem',
                color: 'var(--color-warning-dark)'
              }}>
                <span>Bestretes aplicades:</span>
                <span style={{ fontWeight: 600 }}>-{(totals.bestretesAplicadesBase || 0).toFixed(2)}€</span>
              </div>
            </>
          )}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            marginBottom: '0.5rem',
            fontSize: '0.95rem'
          }}>
            <span>Subtotal (Base Imposable):</span>
            <span style={{ fontWeight: 600 }}>{totals.baseImposable.toFixed(2)}€</span>
          </div>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            marginBottom: '0.5rem',
            fontSize: '0.95rem'
          }}>
            <span>IVA ({formData.ivaPercent}%):</span>
            <span style={{ fontWeight: 600 }}>+{totals.ivaImport.toFixed(2)}€</span>
          </div>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            marginBottom: '0.75rem',
            fontSize: '0.95rem'
          }}>
            <span>IRPF ({formData.irpfPercent}%):</span>
            <span style={{ fontWeight: 600 }}>-{totals.irpfImport.toFixed(2)}€</span>
          </div>
          <div style={{
            borderTop: '2px solid var(--color-border)',
            paddingTop: '0.75rem',
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '1.2rem',
            fontWeight: 700
          }}>
            <span>TOTAL:</span>
            <span style={{ color: 'var(--color-accent-primary)' }}>
              {totals.totalFactura.toFixed(2)}€
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

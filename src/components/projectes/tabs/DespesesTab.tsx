import React from 'react';
import { Check, Trash2, ArrowDownToLine, FileText } from 'lucide-react';
import type { Projecte, RecursHumaProjecte, MaterialProjecte } from '../../../types/projecte';
import type { Parametres } from '../../../types/parametres';
import type { Proveidor } from '../../../types/proveidor';
import SearchableSelect from '../../common/SearchableSelect';
import { storage } from '../../../utils/storageManager';

interface Props {
  formData: Projecte;
  setFormData: React.Dispatch<React.SetStateAction<Projecte>>;
  parametres: Parametres | null;
  proveidors: Proveidor[];
  esBloquejat: boolean;
  recursCopiado: string | null;
  materialsAgregats: boolean;
  onAfegirRecursHuma: () => void;
  onActualitzarRecursHuma: (id: string, field: keyof RecursHumaProjecte, value: any) => void;
  onEliminarRecursHuma: (id: string) => void;
  onTrasladarRecursATaska: (recurs: RecursHumaProjecte) => void;
  onActualitzarMaterial: (id: string, field: keyof MaterialProjecte, value: any) => void;
  onEliminarMaterial: (id: string) => void;
  onAgregarMaterialsATasques: () => void;
}

export default function DespesesTab({
  formData,
  setFormData,
  parametres,
  proveidors,
  esBloquejat,
  recursCopiado,
  materialsAgregats,
  onAfegirRecursHuma,
  onActualitzarRecursHuma,
  onEliminarRecursHuma,
  onTrasladarRecursATaska,
  onActualitzarMaterial,
  onEliminarMaterial,
  onAgregarMaterialsATasques
}: Props) {
  const albaransCompra = storage.getAlbaransCompra();

  const registrarCompra = (draft: {
    proveidor?: string;
    concepte: string;
    base: number;
    albaraCodis?: string[];
  }) => {
    localStorage.setItem('auroraRegistrarCompraDespesa', JSON.stringify({
      projecteCodi: formData.codi,
      ...draft,
    }));
    window.dispatchEvent(new CustomEvent('navigate-to', { detail: { section: 'factures-compra', codi: '' } }));
  };

  const serveiLabel = (recurs: RecursHumaProjecte) => {
    const servei = parametres?.serveis.find(s => s.codi === recurs.servei)?.nom || recurs.servei || 'Despesa';
    const unitat = parametres?.unitats.find(u => u.codi === recurs.unitat)?.nom || recurs.unitat;
    return unitat ? `${servei} (${recurs.quantitat || 0} ${unitat})` : servei;
  };

  return (
    <div>
      {/* TABLA 1: RECURSOS HUMANS */}
      <div style={{ marginBottom: '3rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
            Recursos Humans i Logística
          </h3>
          <button
            type="button"
            className="btn-primary"
            onClick={onAfegirRecursHuma}
            disabled={esBloquejat}
          >
            + Afegir Recurs/Material
          </button>
        </div>

        {formData.recursosHumans.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--color-text-tertiary)', padding: '2rem' }}>
            No hi ha recursos humans. Fes clic a "Afegir Recurs Humà".
          </p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, width: '150px' }}>Proveïdor</th>
                <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600 }}>Servei</th>
                <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, width: '120px' }}>Categoria</th>
                <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, width: '80px' }}>Quantitat</th>
                <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, width: '120px' }}>Unitat</th>
                <th style={{ textAlign: 'center', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, width: '80px' }}>Preu Prov.</th>
                <th style={{ textAlign: 'center', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, width: '100px' }}>Cost</th>
                <th style={{ width: '100px' }}></th>
              </tr>
            </thead>
            <tbody>
              {formData.recursosHumans.map((recurs) => {
                const categoriaData = parametres?.categories.find(c => c.codi === recurs.categoria);
                const albaraRecurs = recurs.tdCodi
                  ? albaransCompra.find(a => a.tdCodi === recurs.tdCodi && a.tipusLinia === 'rrhh')
                  : undefined;
                const teCompraAssociada = !!albaraRecurs?.facturaCodi;
                return (
                  <tr key={recurs.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '0.75rem', width: '150px' }}>
                      <SearchableSelect
                        value={recurs.proveidor || ''}
                        onChange={(value) => {
                          onActualitzarRecursHuma(recurs.id, 'proveidor', value);
                        }}
                        disabled={esBloquejat}
                        options={[
                          { value: '', label: 'Cap proveïdor' },
                          ...proveidors.filter(p => p.tipus !== 'Treballador').map(p => ({
                            value: p.codi,
                            label: p.nomComercial || p.nomFiscal
                          })),
                          ...proveidors.filter(p => p.tipus === 'Treballador').map(p => ({
                            value: p.codi,
                            label: `👷 ${p.nomComercial || p.nomFiscal}`
                          }))
                        ]}
                        placeholder="Cap proveïdor"
                      />
                    </td>

                    <td style={{ padding: '0.75rem' }}>
                      <SearchableSelect
                        value={recurs.servei}
                        onChange={(value) => onActualitzarRecursHuma(recurs.id, 'servei', value)}
                        disabled={esBloquejat}
                        options={parametres?.serveis.map(s => ({ value: s.codi, label: s.nom })) || []}
                        placeholder="Selecciona servei..."
                      />
                    </td>

                    <td style={{ padding: '0.75rem', width: '120px' }}>
                      <input
                        type="text"
                        className="form-input"
                        value={categoriaData?.nom || ''}
                        disabled
                        style={{ background: 'var(--color-bg-tertiary)', cursor: 'not-allowed', fontSize: '0.85rem' }}
                        placeholder="Auto"
                      />
                    </td>

                    <td style={{ padding: '0.75rem', textAlign: 'right', width: '80px' }}>
                      <input
                        type="number"
                        className="form-input"
                        value={recurs.quantitat}
                        onChange={(e) => onActualitzarRecursHuma(recurs.id, 'quantitat', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                        disabled={esBloquejat}
                        min="0"
                        step="0.01"
                        style={{ textAlign: 'right' }}
                      />
                    </td>

                    <td style={{ padding: '0.75rem', width: '120px' }}>
                      <SearchableSelect
                        value={recurs.unitat}
                        onChange={(value) => onActualitzarRecursHuma(recurs.id, 'unitat', value)}
                        disabled={esBloquejat}
                        options={parametres?.unitats.map(u => ({ value: u.codi, label: u.nom })) || []}
                        placeholder="Unitat..."
                      />
                    </td>

                    <td style={{ padding: '0.75rem', textAlign: 'right', width: '80px' }}>
                      <input
                        type="number"
                        className="form-input"
                        value={recurs.preu}
                        onChange={(e) => onActualitzarRecursHuma(recurs.id, 'preu', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                        disabled={esBloquejat}
                        min="0"
                        step="0.01"
                        style={{ textAlign: 'right' }}
                      />
                    </td>

                    <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600, width: '100px' }}>
                      {(recurs.cost || 0).toFixed(2)}€
                    </td>

                    <td style={{ padding: '0.75rem', textAlign: 'center', width: '100px' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                        <button
                          type="button"
                          onClick={() => onTrasladarRecursATaska(recurs)}
                          disabled={!recurs.servei || !recurs.unitat || esBloquejat}
                          style={{
                            background: recursCopiado === recurs.id ? 'var(--color-success)' : 'transparent',
                            border: `1px solid ${recursCopiado === recurs.id ? 'var(--color-success)' : 'var(--color-border)'}`,
                            borderRadius: '4px',
                            color: recursCopiado === recurs.id ? 'white' : 'var(--color-accent-primary)',
                            cursor: (recurs.servei && recurs.unitat) ? 'pointer' : 'not-allowed',
                            padding: '0.25rem 0.5rem',
                            fontSize: '0.85rem',
                            opacity: (recurs.servei && recurs.unitat) ? 1 : 0.5,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            transition: 'all 0.3s ease'
                          }}
                          title="Trasladar a tasques"
                        >
                          {recursCopiado === recurs.id ? (
                            <><Check size={14} />Copiat</>
                          ) : (
                            '→ Tasques'
                          )}
                        </button>
                        {!teCompraAssociada && (
                          <button
                            type="button"
                            onClick={() => registrarCompra({
                              proveidor: recurs.proveidor,
                              concepte: serveiLabel(recurs),
                              base: recurs.cost || 0,
                              albaraCodis: albaraRecurs ? [albaraRecurs.codi] : [],
                            })}
                            disabled={esBloquejat || !recurs.cost}
                            title="Registrar factura"
                            style={{
                              background: 'transparent',
                              border: '1px solid var(--color-border)',
                              borderRadius: '4px',
                              color: 'var(--color-accent-primary)',
                              cursor: esBloquejat || !recurs.cost ? 'not-allowed' : 'pointer',
                              padding: '0.25rem 0.5rem',
                              fontSize: '0.85rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.25rem'
                            }}
                          >
                            <FileText size={14} /> Factura
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onEliminarRecursHuma(recurs.id)}
                          disabled={esBloquejat}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--color-error)',
                            cursor: 'pointer',
                            padding: '0.25rem'
                          }}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* TABLA 2: MATERIALS */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
            Materials
          </h3>
          {formData.materials.some(m => m.material && m.grup) && !esBloquejat && (
            <button
              type="button"
              onClick={onAgregarMaterialsATasques}
              title="Agrupa tots els materials per grup i els afegeix a Tasques de Venda (substitueix les tasques de Materials existents)"
              style={{
                background: materialsAgregats ? 'var(--color-success)' : 'transparent',
                border: `1px solid ${materialsAgregats ? 'var(--color-success)' : 'var(--color-accent-primary)'}`,
                borderRadius: '4px',
                color: materialsAgregats ? 'white' : 'var(--color-accent-primary)',
                cursor: 'pointer',
                padding: '0.4rem 0.75rem',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                transition: 'all 0.3s ease'
              }}
            >
              {materialsAgregats ? (
                <><Check size={14} /> Generat!</>
              ) : (
                <><ArrowDownToLine size={14} /> Generar Tasques</>
              )}
            </button>
          )}
        </div>

        {formData.materials.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--color-text-tertiary)', padding: '2rem' }}>
            No hi ha materials. Fes clic a "Afegir Material".
          </p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, width: '120px' }}>Grup</th>
                <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600 }}>Material</th>
                <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, width: '150px' }}>Proveïdor</th>
                <th style={{ textAlign: 'center', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, width: '75px' }}>Preu Prov.</th>
                <th style={{ textAlign: 'center', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, width: '70px' }}>Jorns.</th>
                <th style={{ textAlign: 'center', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, width: '75px' }}>Total Cost</th>
                <th style={{ textAlign: 'center', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, width: '75px' }}>Preu Platea</th>
                <th style={{ width: '40px' }}></th>
              </tr>
            </thead>
            <tbody>
              {formData.materials.map((material) => {
                const grupData = parametres?.grupsMaterials.find(g => g.codi === material.grup);
                return (
                  <tr key={material.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '0.75rem', width: '120px' }}>
                      <input
                        type="text"
                        className="form-input"
                        value={grupData?.nom || ''}
                        disabled
                        style={{ background: 'var(--color-bg-tertiary)', cursor: 'not-allowed', fontSize: '0.85rem' }}
                        placeholder="Auto"
                      />
                    </td>

                    <td style={{ padding: '0.75rem' }}>
                      <SearchableSelect
                        value={material.material}
                        onChange={(value) => {
                          const materialData = parametres?.materials.find(m => m.codi === value);
                          if (materialData) {
                            const matId = material.id;
                            setFormData(prev => ({
                              ...prev,
                              materials: prev.materials.map(m =>
                                m.id === matId
                                  ? { ...m, material: value, grup: materialData.grup, preuProveidor: materialData.preuProveidor, preuPlatea: materialData.preuPlatea }
                                  : m
                              )
                            }));
                          }
                        }}
                        disabled={esBloquejat}
                        options={parametres?.materials.filter(m => m.estat === 'actiu').map(m => ({
                          value: m.codi,
                          label: m.material
                        })) || []}
                        placeholder="Selecciona material..."
                      />
                    </td>

                    <td style={{ padding: '0.75rem', width: '150px' }}>
                      <SearchableSelect
                        value={material.proveidor}
                        onChange={(value) => onActualitzarMaterial(material.id, 'proveidor', value)}
                        disabled={esBloquejat}
                        options={[
                          { value: '', label: 'Cap proveïdor' },
                          ...proveidors.map(p => ({ value: p.codi, label: p.nomComercial || p.nomFiscal }))
                        ]}
                        placeholder="Cap proveïdor"
                      />
                    </td>

                    <td style={{ padding: '0.75rem', textAlign: 'right', width: '75px' }}>
                      <input
                        type="number"
                        className="form-input"
                        value={material.preuProveidor}
                        onChange={(e) => onActualitzarMaterial(material.id, 'preuProveidor', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                        disabled={esBloquejat}
                        min="0"
                        step="0.01"
                        style={{ textAlign: 'right' }}
                      />
                    </td>

                    <td style={{ padding: '0.75rem', textAlign: 'right', width: '70px' }}>
                      <input
                        type="number"
                        className="form-input"
                        value={material.jornades ?? 1}
                        onChange={(e) => onActualitzarMaterial(material.id, 'jornades', e.target.value === '' ? 1 : parseInt(e.target.value, 10))}
                        disabled={esBloquejat}
                        min="1"
                        step="1"
                        style={{ textAlign: 'right' }}
                      />
                    </td>

                    <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600, width: '75px', color: 'var(--color-text-secondary)' }}>
                      {(material.preuProveidor * (material.jornades ?? 1)).toFixed(2)}€
                    </td>

                    <td style={{ padding: '0.75rem', textAlign: 'right', width: '75px' }}>
                      <input
                        type="number"
                        className="form-input"
                        value={material.preuPlatea}
                        onChange={(e) => onActualitzarMaterial(material.id, 'preuPlatea', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                        disabled={esBloquejat}
                        min="0"
                        step="0.01"
                        style={{ textAlign: 'right' }}
                      />
                    </td>

                    <td style={{ padding: '0.75rem', textAlign: 'center', width: '40px' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                        <button
                          type="button"
                          onClick={() => onEliminarMaterial(material.id)}
                          disabled={esBloquejat}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--color-error)',
                            cursor: 'pointer',
                            padding: '0.25rem'
                          }}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

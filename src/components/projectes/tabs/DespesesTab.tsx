import React from 'react';
import { Check, Trash2 } from 'lucide-react';
import type { Projecte, RecursHumaProjecte, MaterialProjecte } from '../../../types/projecte';
import type { Parametres } from '../../../types/parametres';
import type { Proveidor } from '../../../types/proveidor';
import SearchableSelect from '../../common/SearchableSelect';

interface Props {
  formData: Projecte;
  setFormData: React.Dispatch<React.SetStateAction<Projecte>>;
  parametres: Parametres | null;
  proveidors: Proveidor[];
  esBloquejat: boolean;
  recursCopiado: string | null;
  materialCopiado: string | null;
  onAfegirRecursHuma: () => void;
  onActualitzarRecursHuma: (id: string, field: keyof RecursHumaProjecte, value: any) => void;
  onEliminarRecursHuma: (id: string) => void;
  onTrasladarRecursATaska: (recurs: RecursHumaProjecte) => void;
  onActualitzarMaterial: (id: string, field: keyof MaterialProjecte, value: any) => void;
  onEliminarMaterial: (id: string) => void;
  onTrasladarMaterialATaska: (material: MaterialProjecte) => void;
}

export default function DespesesTab({
  formData,
  setFormData,
  parametres,
  proveidors,
  esBloquejat,
  recursCopiado,
  materialCopiado,
  onAfegirRecursHuma,
  onActualitzarRecursHuma,
  onEliminarRecursHuma,
  onTrasladarRecursATaska,
  onActualitzarMaterial,
  onEliminarMaterial,
  onTrasladarMaterialATaska
}: Props) {
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
                            background: recursCopiado === recurs.id ? '#10b981' : 'transparent',
                            border: `1px solid ${recursCopiado === recurs.id ? '#10b981' : 'var(--color-border)'}`,
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
                <th style={{ textAlign: 'center', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, width: '90px' }}>Preu Prov.</th>
                <th style={{ textAlign: 'center', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, width: '90px' }}>Preu Platea</th>
                <th style={{ width: '100px' }}></th>
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

                    <td style={{ padding: '0.75rem', textAlign: 'right', width: '90px' }}>
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

                    <td style={{ padding: '0.75rem', textAlign: 'right', width: '90px' }}>
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

                    <td style={{ padding: '0.75rem', textAlign: 'center', width: '100px' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                        <button
                          type="button"
                          onClick={() => onTrasladarMaterialATaska(material)}
                          disabled={!material.material || !material.grup || esBloquejat}
                          style={{
                            background: materialCopiado === material.id ? '#10b981' : 'transparent',
                            border: `1px solid ${materialCopiado === material.id ? '#10b981' : 'var(--color-border)'}`,
                            borderRadius: '4px',
                            color: materialCopiado === material.id ? 'white' : 'var(--color-accent-primary)',
                            cursor: material.material ? 'pointer' : 'not-allowed',
                            padding: '0.25rem 0.5rem',
                            fontSize: '0.85rem',
                            opacity: (material.material && material.grup) ? 1 : 0.5,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            transition: 'all 0.3s ease'
                          }}
                          title="Trasladar a tasques"
                        >
                          {materialCopiado === material.id ? (
                            <><Check size={14} />Copiat</>
                          ) : (
                            '→ Tasques'
                          )}
                        </button>
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

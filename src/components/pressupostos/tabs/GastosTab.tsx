import React from 'react';
import { Check, Trash2, ArrowDownToLine } from 'lucide-react';
import SearchableSelect from '../../common/SearchableSelect';

interface GastosTabProps {
  hook: any;
}

export default function GastosTab({ hook }: GastosTabProps) {
  const {
    formData,
    clientBlocked,
    pressupostBloquejat,
    parametres,
    proveidors,
    totalGastos,
    materialsAgregats,
    recursCopiado,
    afegirMaterial,
    actualitzarMaterial,
    eliminarMaterial,
    agregaMaterialsATasques,
    afegirRecursHuma,
    actualitzarRecursHuma,
    eliminarRecursHuma,
    trasladarRecursATaska
  } = hook;

  return (
    <div>
      {/* TOTAL GASTOS */}
      <div style={{ 
        padding: '1rem', 
        background: 'var(--color-bg-tertiary)', 
        borderRadius: '8px',
        marginBottom: '2rem',
        textAlign: 'right'
      }}>
        <span style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', marginRight: '1rem' }}>
          Total Despeses:
        </span>
        <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
          {totalGastos.toFixed(2)}€
        </span>
      </div>

      {/* TABLA 1: MATERIALS */}
      <div style={{ marginBottom: '3rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
            Materials
          </h3>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {formData.materials.some((m: any) => m.material && m.grup) && !pressupostBloquejat && (
              <button
                type="button"
                onClick={agregaMaterialsATasques}
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
            <button
              type="button"
              className="btn-primary"
              onClick={afegirMaterial}
              disabled={clientBlocked || pressupostBloquejat}
            >
              + Afegir Material
            </button>
          </div>
        </div>

        {formData.materials.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--color-text-tertiary)', padding: '2rem' }}>
            No hi ha materials. Fes clic a "Afegir Material".
          </p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600 }}>Grup</th>
                <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600 }}>Material</th>
                <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600 }}>Proveïdor</th>
                <th style={{ textAlign: 'right', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, width: '90px' }}>Preu Prov.</th>
                <th style={{ textAlign: 'right', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, width: '65px' }}>Jorns.</th>
                <th style={{ textAlign: 'right', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, width: '90px' }}>Total Cost</th>
                <th style={{ textAlign: 'right', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, width: '90px' }}>Preu Platea</th>
                <th style={{ width: '40px' }}></th>
              </tr>
            </thead>
            <tbody>
              {formData.materials.map((material: any) => {
                const grupData = parametres?.grupsMaterials.find((g: any) => g.codi === material.grup);
                
                return (
                  <tr key={material.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '0.75rem' }}>
                      {grupData?.nom || '-'}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <SearchableSelect
                        value={material.material}
                        onChange={(value) => actualitzarMaterial(material.id, 'material', value)}
                        options={parametres?.materials.filter((m: any) => m.estat === 'actiu').map((m: any) => ({ 
                          value: m.codi, 
                          label: m.material 
                        })) || []}
                        placeholder="Selecciona material..."
                        disabled={pressupostBloquejat}
                      />
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <SearchableSelect
                        value={material.proveidor}
                        onChange={(value) => actualitzarMaterial(material.id, 'proveidor', value)}
                        options={proveidors.map((p: any) => ({ 
                          value: p.codi, 
                          label: p.nomComercial || p.nomFiscal 
                        }))}
                        placeholder="Cap proveïdor"
                        disabled={pressupostBloquejat}
                      />
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', width: '90px' }}>
                      <input
                        type="number"
                        className="form-input"
                        value={material.preuProveidor}
                        onChange={(e) => actualitzarMaterial(material.id, 'preuProveidor', parseFloat(e.target.value) || 0)}
                        min="0"
                        step="0.01"
                        style={{ textAlign: 'right', MozAppearance: 'textfield' }}
                        onWheel={(e) => e.currentTarget.blur()}
                        disabled={pressupostBloquejat}
                      />
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', width: '65px' }}>
                      <input
                        type="number"
                        className="form-input"
                        value={material.jornades ?? 1}
                        onChange={(e) => actualitzarMaterial(material.id, 'jornades', parseInt(e.target.value, 10) || 1)}
                        min="1"
                        step="1"
                        style={{ textAlign: 'right', MozAppearance: 'textfield' }}
                        onWheel={(e) => e.currentTarget.blur()}
                        disabled={pressupostBloquejat}
                      />
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600, width: '90px', color: 'var(--color-text-secondary)' }}>
                      {(material.preuProveidor * (material.jornades ?? 1)).toFixed(2)}€
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', width: '90px' }}>
                      <input
                        type="number"
                        className="form-input"
                        value={material.preuPlatea}
                        onChange={(e) => actualitzarMaterial(material.id, 'preuPlatea', parseFloat(e.target.value) || 0)}
                        min="0"
                        step="0.01"
                        style={{ textAlign: 'right', MozAppearance: 'textfield' }}
                        onWheel={(e) => e.currentTarget.blur()}
                        disabled={pressupostBloquejat}
                      />
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => eliminarMaterial(material.id)}
                        disabled={pressupostBloquejat}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--color-error)',
                          cursor: 'pointer',
                          padding: '0.25rem',
                          opacity: pressupostBloquejat ? 0.5 : 1
                        }}
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* TABLA 2: RECURSOS HUMANS */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
              Recursos Humans i Logística
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-tertiary)', fontStyle: 'italic', marginTop: '0.25rem' }}>
              * Les despeses d'aquesta taula poden ser orientatius
            </p>
          </div>
          <button
            type="button"
            className="btn-primary"
            onClick={afegirRecursHuma}
            disabled={clientBlocked || pressupostBloquejat}
          >
            + Afegir Recurs
          </button>
        </div>

        {formData.recursosHumans.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--color-text-tertiary)', padding: '2rem' }}>
            No hi ha recursos humans. Fes clic a "Afegir Recurs".
          </p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600 }}>Proveïdor</th>
                <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600 }}>Categoria</th>
                <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600 }}>Servei</th>
                <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, width: '80px' }}>Quantitat</th>
                <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600 }}>Unitat</th>
                <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, width: '100px' }}>Preu Prov.</th>
                <th style={{ textAlign: 'right', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600 }}>Import (€)</th>
                <th style={{ width: '80px' }}></th>
              </tr>
            </thead>
            <tbody>
              {formData.recursosHumans.map((recurs: any) => {
                const categoriaData = parametres?.categories.find((c: any) => c.codi === recurs.categoria);
                
                return (
                  <tr key={recurs.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '0.75rem' }}>
                      <SearchableSelect
                        value={recurs.proveidor}
                        onChange={(value) => actualitzarRecursHuma(recurs.id, 'proveidor', value)}
                        options={[
                          { value: '', label: 'Cap proveïdor' },
                          ...proveidors.filter((p: any) => p.tipus !== 'Treballador').map((p: any) => ({
                            value: p.codi,
                            label: p.nomComercial || p.nomFiscal
                          })),
                          ...proveidors.filter((p: any) => p.tipus === 'Treballador').map((p: any) => ({
                            value: p.codi,
                            label: `👷 ${p.nomComercial || p.nomFiscal}`
                          }))
                        ]}
                        placeholder="Selecciona proveïdor..."
                        disabled={pressupostBloquejat}
                      />
                    </td>
                    <td style={{ padding: '0.75rem', color: 'var(--color-text-secondary)' }}>
                      {categoriaData?.nom || '-'}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <SearchableSelect
                        value={recurs.servei}
                        onChange={(value) => actualitzarRecursHuma(recurs.id, 'servei', value)}
                        options={parametres?.serveis.map((s: any) => ({ value: s.codi, label: s.nom })) || []}
                        placeholder="Selecciona servei..."
                        disabled={pressupostBloquejat}
                      />
                    </td>
                    <td style={{ padding: '0.75rem', width: '80px' }}>
                      <input
                        type="number"
                        className="form-input"
                        value={recurs.quantitat}
                        onChange={(e) => actualitzarRecursHuma(recurs.id, 'quantitat', parseFloat(e.target.value) || 0)}
                        min="0"
                        step="0.01"
                        style={{ 
                          textAlign: 'right',
                          MozAppearance: 'textfield'
                        }}
                        onWheel={(e) => e.currentTarget.blur()}
                        disabled={pressupostBloquejat}
                      />
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <SearchableSelect
                        value={recurs.unitat}
                        onChange={(value) => actualitzarRecursHuma(recurs.id, 'unitat', value)}
                        options={parametres?.unitats.map((u: any) => ({ value: u.codi, label: u.nom })) || []}
                        placeholder="Selecciona unitat..."
                        disabled={pressupostBloquejat}
                      />
                    </td>
                    <td style={{ padding: '0.75rem', width: '100px' }}>
                      <input
                        type="number"
                        className="form-input"
                        value={recurs.tarifa}
                        onChange={(e) => actualitzarRecursHuma(recurs.id, 'tarifa', parseFloat(e.target.value) || 0)}
                        min="0"
                        step="0.01"
                        style={{ 
                          textAlign: 'right',
                          MozAppearance: 'textfield'
                        }}
                        onWheel={(e) => e.currentTarget.blur()}
                        disabled={pressupostBloquejat}
                      />
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600 }}>
                      {recurs.importe.toFixed(2)}€
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                        <button
                          type="button"
                          onClick={() => trasladarRecursATaska(recurs)}
                          disabled={!recurs.servei || !recurs.unitat || pressupostBloquejat}
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
                            <>
                              <Check size={14} />
                              Copiat
                            </>
                          ) : (
                            '→ Tasques'
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => eliminarRecursHuma(recurs.id)}
                          disabled={pressupostBloquejat}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--color-error)',
                            cursor: 'pointer',
                            padding: '0.25rem',
                            opacity: pressupostBloquejat ? 0.5 : 1
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
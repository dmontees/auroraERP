import React, { useState } from 'react';
import { X, Settings } from 'lucide-react';
import { storage } from '../../../utils/storageManager';
import MaterialModal from '../MaterialModal';

interface MaterialsTabProps {
  hook: {
    parametres: any;
    getNextMaterialCode: () => string;
    materialEnUs: (codi: string) => boolean;
    afegirMaterial: (material: any) => void;
    actualitzarMaterial: (material: any) => void;
    marcarNoUtilitzat: (codi: string) => void;
    reactivarMaterial: (codi: string) => void;
    eliminarMaterial: (codi: string) => void;
    afegirGrupMaterial: () => void;
    actualitzarGrupMaterial: (index: number, nom: string) => void;
    eliminarGrupMaterial: (index: number) => void;
  };
}

export default function MaterialsTab({ hook }: MaterialsTabProps) {
  const {
    parametres,
    getNextMaterialCode,
    materialEnUs,
    afegirMaterial,
    actualitzarMaterial,
    marcarNoUtilitzat,
    reactivarMaterial,
    eliminarMaterial,
    afegirGrupMaterial,
    actualitzarGrupMaterial,
    eliminarGrupMaterial
  } = hook;

  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<any>(null);
  const [showGrupsModal, setShowGrupsModal] = useState(false);

  return (
    <div>
      <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem' }}>
        <button className="btn-primary" onClick={() => {
          setEditingMaterial(null);
          setShowMaterialModal(true);
        }}>
          + Afegir Material
        </button>
        <button className="btn-secondary" onClick={() => setShowGrupsModal(true)}>
          Gestionar Grups
        </button>
      </div>

      {/* MATERIALS ACTIVOS - Agrupados */}
      {parametres.grupsMaterials.map((grup: any) => {
        const materialsGrup = parametres.materials.filter((m: any) => m.grup === grup.codi && m.estat === 'actiu');
        
        return (
          <div key={grup.codi} style={{ marginBottom: '2rem' }}>
            <h3 style={{ 
              fontSize: '1.1rem', 
              fontWeight: 600, 
              marginBottom: '1rem',
              color: 'var(--color-text-primary)',
              borderBottom: '2px solid var(--color-border)',
              paddingBottom: '0.5rem'
            }}>
              {grup.nom}
            </h3>
            
            {materialsGrup.length === 0 ? (
              <p style={{ 
                color: 'var(--color-text-tertiary)', 
                fontStyle: 'italic',
                padding: '1rem'
              }}>
                No hi ha materials en aquest grup
              </p>
            ) : (
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', 
                gap: '1rem' 
              }}>
                {materialsGrup.map((material: any) => (
                  <div
                    key={material.codi}
                    onClick={() => {
                      setEditingMaterial(material);
                      setShowMaterialModal(true);
                    }}
                    style={{
                      padding: '1rem',
                      background: 'var(--color-bg-secondary)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all var(--transition-base)',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                    }}
                    className="table-row-hover"
                  >
                    <div style={{ 
                      fontSize: '0.75rem', 
                      color: 'var(--color-text-tertiary)',
                      marginBottom: '0.5rem'
                    }}>
                      {material.codi}
                    </div>
                    <div style={{ 
                      fontWeight: 600,
                      color: 'var(--color-text-primary)',
                      marginBottom: '0.5rem'
                    }}>
                      {material.material}
                    </div>
                    <div style={{ 
                      fontSize: '0.9rem',
                      color: 'var(--color-accent-primary)',
                      fontWeight: 500
                    }}>
                      {material.preuPlatea}€
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* MATERIALS NO UTILITZATS */}
      {parametres.materials.some((m: any) => m.estat === 'no_utilitzat') && (
        <div style={{ 
          marginTop: '3rem',
          padding: '1.5rem',
          background: 'var(--color-bg-tertiary)',
          border: '2px dashed var(--color-border)',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ 
            fontSize: '1.1rem', 
            fontWeight: 600, 
            marginBottom: '1rem',
            color: 'var(--color-text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <span style={{
              background: 'var(--color-text-tertiary)',
              color: 'white',
              padding: '0.25rem 0.5rem',
              borderRadius: '4px',
              fontSize: '0.75rem',
              fontWeight: 700
            }}>
              NO UTILITZAT
            </span>
            Materials fora de servei
          </h3>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', 
            gap: '1rem' 
          }}>
            {parametres.materials.filter((m: any) => m.estat === 'no_utilitzat').map((material: any) => {
              const grup = parametres.grupsMaterials.find((g: any) => g.codi === material.grup);
              
              return (
                <div
                  key={material.codi}
                  onClick={() => {
                    setEditingMaterial(material);
                    setShowMaterialModal(true);
                  }}
                  style={{
                    padding: '1rem',
                    background: '#f5f5f5',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    opacity: 0.7,
                    position: 'relative'
                  }}
                  className="table-row-hover"
                >
                  <div style={{
                    position: 'absolute',
                    top: '0.5rem',
                    right: '0.5rem',
                    background: '#6b7280',
                    color: 'white',
                    padding: '0.15rem 0.4rem',
                    borderRadius: '3px',
                    fontSize: '0.65rem',
                    fontWeight: 700
                  }}>
                    INACTIU
                  </div>
                  <div style={{ 
                    fontSize: '0.75rem', 
                    color: 'var(--color-text-tertiary)',
                    marginBottom: '0.5rem'
                  }}>
                    {material.codi} • {grup?.nom}
                  </div>
                  <div style={{ 
                    fontWeight: 600,
                    color: 'var(--color-text-secondary)',
                    marginBottom: '0.5rem'
                  }}>
                    {material.material}
                  </div>
                  <div style={{ 
                    fontSize: '0.9rem',
                    color: 'var(--color-text-tertiary)',
                    fontWeight: 500
                  }}>
                    {material.preuPlatea}€
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL: GESTIÓ DE MATERIAL */}
      {showMaterialModal && (
        <MaterialModal
          material={editingMaterial}
          onClose={() => {
            setShowMaterialModal(false);
            setEditingMaterial(null);
          }}
          onSave={(material) => {
            if (editingMaterial) {
              actualitzarMaterial(material);
            } else {
              afegirMaterial(material);
            }
            setShowMaterialModal(false);
            setEditingMaterial(null);
          }}
          onDelete={eliminarMaterial}
          onMarcarNoUtilitzat={marcarNoUtilitzat}
          onReactivar={reactivarMaterial}
          nextCode={getNextMaterialCode()}
          grups={parametres.grupsMaterials}
          proveidors={storage.getProveidors()}
          materialEnUs={editingMaterial ? materialEnUs(editingMaterial.codi) : false}
        />
      )}

      {/* MODAL: GESTIÓ DE GRUPS */}
      {showGrupsModal && (
        <div className="modal-overlay" onClick={() => setShowGrupsModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2>
                <Settings size={24} />
                Gestió de Grups de Materials
              </h2>
              <button className="modal-close" onClick={() => setShowGrupsModal(false)}>
                <X size={24} />
              </button>
            </div>

            <div className="modal-body">
              <div style={{ marginBottom: '1rem' }}>
                <button className="btn-primary" onClick={afegirGrupMaterial}>
                  + Afegir Grup
                </button>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                    <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600 }}>Codi</th>
                    <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600 }}>Nom</th>
                    <th style={{ width: '50px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {parametres.grupsMaterials.map((grup: any, index: number) => (
                    <tr key={grup.codi} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '0.75rem', fontSize: '0.85rem', color: 'var(--color-text-tertiary)' }}>
                        {grup.codi}
                        {grup.esDefault && (
                          <span style={{
                            marginLeft: '0.5rem',
                            fontSize: '0.7rem',
                            background: '#dbeafe',
                            color: '#1e40af',
                            padding: '0.15rem 0.4rem',
                            borderRadius: '3px',
                            fontWeight: 600
                          }}>
                            DEFAULT
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        {grup.esDefault ? (
                          grup.nom
                        ) : (
                          <input
                            type="text"
                            className="form-input"
                            value={grup.nom}
                            onChange={(e) => actualitzarGrupMaterial(index, e.target.value)}
                            placeholder="Nom del grup"
                          />
                        )}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                        {!grup.esDefault && (
                          <button
                            type="button"
                            onClick={() => eliminarGrupMaterial(index)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--color-error)',
                              cursor: 'pointer',
                              padding: '0.25rem'
                            }}
                          >
                            <X size={18} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="modal-footer">
              <button className="btn-primary" onClick={() => setShowGrupsModal(false)}>
                Tancar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
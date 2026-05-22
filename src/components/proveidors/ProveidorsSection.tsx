import React, { useState, useEffect } from 'react';
import { Plus, FileSpreadsheet, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import type { Proveidor } from '../../types/proveidor';
import ProveidorModal from './ProveidorModal';
import TipusModal from './TipusModal';
import { storage } from '../../utils/storageManager';

export default function ProveidorsSection() {
  const [proveidors, setProveidors] = useState<Proveidor[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showTipusModal, setShowTipusModal] = useState(false);
  const [tipusSeleccionat, setTipusSeleccionat] = useState<'Proveïdor' | 'Acreedor'>('Proveïdor');
  const [editingProveidor, setEditingProveidor] = useState<Proveidor | null>(null);
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipus, setFilterTipus] = useState<'Tots' | 'Proveïdor' | 'Acreedor'>('Tots');
  const [filterCategories, setFilterCategories] = useState<string[]>([]);

  // Parámetros (para obtener categorías)
  const [parametres, setParametres] = useState<any>(null);

  // Cargar datos
  useEffect(() => {
    setProveidors(storage.getProveidors());
    setParametres(storage.getParametres());
  }, []);

  const categoriesProveidors = parametres?.categoriesProveidors || [];

  // Guardar proveedores
  const saveProveidors = (newProveidors: Proveidor[]) => {
    storage.setProveidors(newProveidors);
    setProveidors(newProveidors);
  };

  const deleteProveidor = (codi: string) => {
    const nuevos = proveidors.filter(p => p.codi !== codi);
    saveProveidors(nuevos);
  };

  // Generar código para nuevo proveedor/acreedor
  const getNextCode = (tipus: 'Proveïdor' | 'Acreedor') => {
    const filtered = proveidors.filter(p => p.tipus === tipus);
    const prefix = tipus === 'Proveïdor' ? 'PRO' : 'ACR';
    
    if (filtered.length === 0) return `${prefix}-00001`;
    
    const maxNum = Math.max(...filtered.map(p => parseInt(p.codi.split('-')[1])));
    return `${prefix}-${String(maxNum + 1).padStart(5, '0')}`;
  };

  // Toggle filtro de categoría
  const toggleCategoriaFilter = (categoriaCodi: string) => {
    setFilterCategories(prev => 
      prev.includes(categoriaCodi)
        ? prev.filter(c => c !== categoriaCodi)
        : [...prev, categoriaCodi]
    );
  };

  // Limpiar filtros de categorías
  const clearCategoriesFilter = () => {
    setFilterCategories([]);
  };

  // Filtrar proveedores
  const filteredProveidors = proveidors.filter(proveidor => {
    const matchSearch = 
      proveidor.nomComercial.toLowerCase().includes(searchTerm.toLowerCase()) ||
      proveidor.nomFiscal.toLowerCase().includes(searchTerm.toLowerCase()) ||
      proveidor.nif.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchTipus = filterTipus === 'Tots' || proveidor.tipus === filterTipus;
    
    const matchCategories = filterCategories.length === 0 || 
      filterCategories.some(cat => proveidor.categories?.includes(cat));
    
    return matchSearch && matchTipus && matchCategories;
  });

  // Exportar a Excel
  const exportarExcel = () => {
    const data = filteredProveidors.map(proveidor => {
      const categoriesNoms = proveidor.categories
        ?.map(catCodi => categoriesProveidors.find((c: any) => c.codi === catCodi)?.nom)
        .filter(Boolean)
        .join(', ') || '-';

      return {
        'Tipus': proveidor.tipus,
        'Codi': proveidor.codi,
        'Data Alta': proveidor.dataAlta,
        'Nom Fiscal': proveidor.nomFiscal,
        'Nom Comercial': proveidor.nomComercial,
        'NIF': proveidor.nif,
        'País': proveidor.pais,
        'Categories': categoriesNoms,
        'Telèfon': proveidor.telefon,
        'Correu': proveidor.correuElectronic,
        'Domicili': proveidor.domicili,
        'Web': proveidor.web,
        'Tipus IVA': proveidor.tipusIVA,
        'Retenció IRPF': proveidor.retencio
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Proveïdors');
    
    const fileName = `proveidors-${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  // Abrir modal nuevo proveedor
  const obrirNouProveidor = () => {
    setEditingProveidor(null);
    setShowTipusModal(true);
  };

  const seleccionarTipus = (tipus: 'Proveïdor' | 'Acreedor') => {
    setTipusSeleccionat(tipus);
    setShowTipusModal(false);
    setShowModal(true);
  };

  // Obtener color de categoría
  const getCategoriaColor = (categoriaCodi: string) => {
    const categoria = categoriesProveidors.find((c: any) => c.codi === categoriaCodi);
    return categoria?.color || '#6b7280';
  };

  const getCategoriaNom = (categoriaCodi: string) => {
    const categoria = categoriesProveidors.find((c: any) => c.codi === categoriaCodi);
    return categoria?.nom || categoriaCodi;
  };

  return (
    <div className="section-placeholder">
      {/* BARRA DE FILTROS Y ACCIONES */}
      <div style={{
        display: 'flex',
        gap: '1rem',
        marginBottom: '1rem',
        flexWrap: 'wrap',
        alignItems: 'center'
      }}>
        <input
          type="text"
          placeholder="Cercar proveïdor..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="form-input"
          style={{ flex: '1', minWidth: '200px' }}
        />
        
        <select
          value={filterTipus}
          onChange={(e) => setFilterTipus(e.target.value as typeof filterTipus)}
          className="form-input"
          style={{ width: '200px' }}
        >
          <option value="Tots">Tots els tipus</option>
          <option value="Proveïdor">Proveïdors</option>
          <option value="Acreedor">Acreedors</option>
        </select>
        
        <button 
          className="btn-secondary" 
          onClick={exportarExcel}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <FileSpreadsheet size={18} />
          Exportar Excel
        </button>
        
        <button 
          className="btn-primary" 
          onClick={obrirNouProveidor}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <Plus size={18} />
          Nou Proveïdor
        </button>
      </div>

      {/* FILTROS DE CATEGORÍAS */}
      {categoriesProveidors.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '0.75rem'
          }}>
            <span style={{ 
              fontSize: '0.875rem', 
              fontWeight: 600,
              color: 'var(--color-text-secondary)'
            }}>
              Filtrar per categories:
            </span>
            {filterCategories.length > 0 && (
              <button
                onClick={clearCategoriesFilter}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#dc2626',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  textDecoration: 'underline',
                  padding: '0'
                }}
              >
                Netejar filtres
              </button>
            )}
          </div>
          
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.5rem'
          }}>
            {categoriesProveidors.map((categoria: any) => {
              const isSelected = filterCategories.includes(categoria.codi);
              const count = proveidors.filter(p => p.categories?.includes(categoria.codi)).length;
              
              return (
                <button
                  key={categoria.codi}
                  onClick={() => toggleCategoriaFilter(categoria.codi)}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '20px',
                    border: isSelected ? 'none' : '2px solid var(--color-border)',
                    background: isSelected ? categoria.color : 'white',
                    color: isSelected ? 'white' : 'var(--color-text-primary)',
                    fontWeight: isSelected ? 600 : 400,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    fontSize: '0.875rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  {categoria.nom}
                  <span style={{
                    padding: '0.125rem 0.5rem',
                    borderRadius: '12px',
                    background: isSelected ? 'rgba(255,255,255,0.3)' : '#f3f4f6',
                    color: isSelected ? 'white' : '#6b7280',
                    fontSize: '0.75rem',
                    fontWeight: 600
                  }}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* TABLA DE PROVEEDORES */}
      <div className="placeholder-card" style={{ overflowX: 'auto' }}>
        {filteredProveidors.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '4rem', 
            color: 'var(--color-text-tertiary)' 
          }}>
            <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>
              No hi ha proveïdors
            </p>
            <p style={{ fontSize: '0.9rem' }}>
              {searchTerm || filterTipus !== 'Tots' || filterCategories.length > 0
                ? 'Prova a canviar els filtres de cerca'
                : 'Fes clic a "Nou Proveïdor" per crear-ne un'}
            </p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600 }}>
                  Tipus
                </th>
                <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600 }}>
                  Nom
                </th>
                <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600 }}>
                  Categories
                </th>
                <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600 }}>
                  NIF
                </th>
                <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600 }}>
                  Contacte
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredProveidors.map((proveidor) => (
                <tr 
                  key={proveidor.codi} 
                  onClick={() => {
                    setEditingProveidor(proveidor);
                    setShowModal(true);
                  }}
                  style={{ 
                    borderBottom: '1px solid var(--color-border)', 
                    cursor: 'pointer' 
                  }} 
                  className="table-row-hover"
                >
                  <td style={{ padding: '0.75rem' }}>
                    <span style={{
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      background: proveidor.tipus === 'Proveïdor' ? '#dbeafe' : '#fef3c7',
                      color: proveidor.tipus === 'Proveïdor' ? '#1e40af' : '#92400e'
                    }}>
                      {proveidor.tipus}
                    </span>
                  </td>
                  <td style={{ 
                    padding: '0.75rem', 
                    color: 'var(--color-accent-primary)', 
                    fontWeight: 500 
                  }}>
                    {proveidor.nomComercial || proveidor.nomFiscal}
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    {proveidor.categories && proveidor.categories.length > 0 ? (
                      <div style={{ 
                        display: 'flex', 
                        flexWrap: 'wrap', 
                        gap: '0.25rem',
                        maxWidth: '300px'
                      }}>
                        {proveidor.categories.slice(0, 3).map(catCodi => (
                          <span
                            key={catCodi}
                            style={{
                              padding: '0.125rem 0.5rem',
                              borderRadius: '12px',
                              fontSize: '0.7rem',
                              fontWeight: 600,
                              background: getCategoriaColor(catCodi),
                              color: 'white',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {getCategoriaNom(catCodi)}
                          </span>
                        ))}
                        {proveidor.categories.length > 3 && (
                          <span style={{
                            padding: '0.125rem 0.5rem',
                            borderRadius: '12px',
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            background: '#e5e7eb',
                            color: '#6b7280'
                          }}>
                            +{proveidor.categories.length - 3}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span style={{ color: 'var(--color-text-tertiary)', fontSize: '0.875rem' }}>
                        -
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '0.75rem' }}>{proveidor.nif || '-'}</td>
                  <td style={{ padding: '0.75rem' }}>
                    <div style={{ fontSize: '0.875rem' }}>
                      {proveidor.telefon && (
                        <div>{proveidor.telefon}</div>
                      )}
                      {proveidor.correuElectronic && (
                        <div style={{ color: 'var(--color-text-tertiary)' }}>
                          {proveidor.correuElectronic}
                        </div>
                      )}
                      {!proveidor.telefon && !proveidor.correuElectronic && '-'}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* MODAL: SELECCIONAR TIPO */}
      {showTipusModal && (
        <TipusModal 
          onClose={() => setShowTipusModal(false)}
          onSelect={seleccionarTipus}
        />
      )}

      {/* MODAL DE PROVEEDOR/ACREEDOR */}
      {showModal && (
        <ProveidorModal
          onClose={() => {
            setShowModal(false);
            setEditingProveidor(null);
            setProveidors(storage.getProveidors());
          }}
          onSave={(proveidor) => {
            const existeix = proveidors.some(p => p.codi === proveidor.codi);
            if (existeix) {
              saveProveidors(proveidors.map(p => 
                p.codi === proveidor.codi ? proveidor : p
              ));
            } else {
              saveProveidors([...proveidors, proveidor]);
            }
          }}
          onDelete={deleteProveidor}
          nextCode={getNextCode(editingProveidor?.tipus || tipusSeleccionat)}
          editingProveidor={editingProveidor}
          tipus={editingProveidor?.tipus || tipusSeleccionat}
        />
      )}
    </div>
  );
}
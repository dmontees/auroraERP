import React, { useState, useEffect } from 'react';
import { Plus, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import type { Proveidor } from '../../types/proveidor';
import ProveidorModal from './ProveidorModal';
import TipusModal from './TipusModal';
import { storage } from '../../utils/storageManager';

export default function ProveidorsSection() {
  const [proveidors, setProveidors] = useState<Proveidor[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showTipusModal, setShowTipusModal] = useState(false);
  const [tipusSeleccionat, setTipusSeleccionat] = useState<'Proveïdor' | 'Acreedor' | 'Treballador'>('Proveïdor');
  const [editingProveidor, setEditingProveidor] = useState<Proveidor | null>(null);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipus, setFilterTipus] = useState<'Tots' | 'Proveïdor' | 'Acreedor' | 'Treballador'>('Tots');
  const [filterTreballadorActiu, setFilterTreballadorActiu] = useState<'actius' | 'tots'>('actius');
  const [filterCatProveidor, setFilterCatProveidor] = useState<string[]>([]);
  const [filterCatAcreedor, setFilterCatAcreedor] = useState<string[]>([]);
  const [showDropProv, setShowDropProv] = useState(false);
  const [showDropAcr, setShowDropAcr] = useState(false);

  // Parámetros
  const [parametres, setParametres] = useState<any>(null);

  useEffect(() => {
    setProveidors(storage.getProveidors());
    setParametres(storage.getParametres());
  }, []);

  const categoriesProveidors = parametres?.categoriesProveidors || [];
  const categoriesAcreedor = parametres?.categoriesAcreedor || [];
  const totesCategories = [...categoriesProveidors, ...categoriesAcreedor];

  const saveProveidors = (newProveidors: Proveidor[]) => {
    storage.setProveidors(newProveidors);
    setProveidors(newProveidors);
  };

  const deleteProveidor = (codi: string) => {
    saveProveidors(proveidors.filter(p => p.codi !== codi));
  };

  const getNextCode = (tipus: 'Proveïdor' | 'Acreedor' | 'Treballador') => {
    const filtered = proveidors.filter(p => p.tipus === tipus);
    const prefix = tipus === 'Proveïdor' ? 'PRO' : tipus === 'Acreedor' ? 'ACR' : 'TRB';
    if (filtered.length === 0) return `${prefix}-00001`;
    const maxNum = Math.max(...filtered.map(p => parseInt(p.codi.split('-')[1]) || 0));
    return `${prefix}-${String(maxNum + 1).padStart(5, '0')}`;
  };

  const filteredProveidors = proveidors.filter(proveidor => {
    const matchSearch =
      proveidor.nomComercial.toLowerCase().includes(searchTerm.toLowerCase()) ||
      proveidor.nomFiscal.toLowerCase().includes(searchTerm.toLowerCase()) ||
      proveidor.nif.toLowerCase().includes(searchTerm.toLowerCase());

    const matchTipus = filterTipus === 'Tots' || proveidor.tipus === filterTipus;

    // Filtre d'actius per a Treballadors
    const matchActiu = !(proveidor.tipus === 'Treballador' && filterTipus === 'Treballador' && filterTreballadorActiu === 'actius')
      || proveidor.actiu !== false;

    const matchCatProv = filterCatProveidor.length === 0 ||
      filterCatProveidor.every(cat => proveidor.categories?.includes(cat));
    const matchCatAcr = filterCatAcreedor.length === 0 ||
      filterCatAcreedor.every(cat => proveidor.categories?.includes(cat));

    return matchSearch && matchTipus && matchActiu && matchCatProv && matchCatAcr;
  });

  const exportarExcel = () => {
    const data = filteredProveidors.map(proveidor => ({
      'Tipus': proveidor.tipus,
      'Codi': proveidor.codi,
      'Data Alta': proveidor.dataAlta,
      'Nom Fiscal': proveidor.nomFiscal,
      'Nom Comercial': proveidor.nomComercial,
      'NIF': proveidor.nif,
      'País': proveidor.pais,
      'Categories': proveidor.categories
        ?.map(catCodi => totesCategories.find((c: any) => c.codi === catCodi)?.nom)
        .filter(Boolean).join(', ') || '-',
      'Telèfon': proveidor.telefon,
      'Correu': proveidor.correuElectronic,
      'Domicili': proveidor.domicili,
      'Web': proveidor.web,
      'Tipus IVA': proveidor.tipusIVA,
      'Retenció IRPF': proveidor.retencio
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Proveïdors');
    XLSX.writeFile(workbook, `proveidors-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const obrirNouProveidor = () => {
    setEditingProveidor(null);
    setShowTipusModal(true);
  };

  const seleccionarTipus = (tipus: 'Proveïdor' | 'Acreedor' | 'Treballador') => {
    setTipusSeleccionat(tipus);
    setShowTipusModal(false);
    setShowModal(true);
  };

  const getCategoriaColor = (codi: string) =>
    totesCategories.find((c: any) => c.codi === codi)?.color || 'var(--color-text-secondary)';

  const getCategoriaNom = (codi: string) =>
    totesCategories.find((c: any) => c.codi === codi)?.nom || codi;

  const thStyle: React.CSSProperties = {
    textAlign: 'left',
    padding: '0.75rem',
    fontSize: '0.85rem',
    fontWeight: 600,
    textTransform: 'uppercase',
  };

  return (
    <div className="section-placeholder">
      {/* BARRA DE FILTROS */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Cercar proveïdor..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="form-input"
          style={{ flex: '1', minWidth: '180px' }}
        />

        <select
          value={filterTipus}
          onChange={(e) => setFilterTipus(e.target.value as typeof filterTipus)}
          className="form-input"
          style={{ width: '175px', fontSize: '0.85rem' }}
        >
          <option value="Tots">Tots els tipus</option>
          <option value="Proveïdor">Proveïdors</option>
          <option value="Acreedor">Acreedors</option>
          <option value="Treballador">Treballadors</option>
        </select>

        {/* Sub-filtre actius/tots per a Treballadors */}
        {filterTipus === 'Treballador' && (
          <div style={{ display: 'flex', gap: '0.25rem' }}>
            {(['actius', 'tots'] as const).map(opt => (
              <button
                key={opt}
                onClick={() => setFilterTreballadorActiu(opt)}
                className={filterTreballadorActiu === opt ? 'btn-primary' : 'btn-secondary'}
                style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
              >
                {opt === 'actius' ? 'Actius' : 'Tots'}
              </button>
            ))}
          </div>
        )}

        {/* Desplegable multiselecció: categories proveïdor */}
        {categoriesProveidors.length > 0 && (
          <div style={{ position: 'relative' }}>
            <button
              className="form-input"
              onClick={() => { setShowDropProv(p => !p); setShowDropAcr(false); }}
              style={{ width: '165px', fontSize: '0.85rem', textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
            >
              <span>
                Cat. proveïdor
                {filterCatProveidor.length > 0 && (
                  <span style={{ marginLeft: '0.4rem', background: 'var(--color-accent-primary)', color: 'white', borderRadius: '10px', padding: '0.05rem 0.45rem', fontSize: '0.72rem', fontWeight: 700 }}>
                    {filterCatProveidor.length}
                  </span>
                )}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>{showDropProv ? '▲' : '▼'}</span>
            </button>
            {showDropProv && (
              <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 100, background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.12)', padding: '0.5rem', minWidth: '180px', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                {filterCatProveidor.length > 0 && (
                  <button onClick={() => setFilterCatProveidor([])} style={{ background: 'none', border: 'none', color: 'var(--color-error-dark)', fontSize: '0.78rem', cursor: 'pointer', textAlign: 'left', padding: '0.2rem 0.4rem' }}>
                    Netejar selecció
                  </button>
                )}
                {categoriesProveidors.map((c: any) => {
                  const sel = filterCatProveidor.includes(c.codi);
                  return (
                    <button
                      key={c.codi}
                      onClick={() => setFilterCatProveidor(prev => sel ? prev.filter(x => x !== c.codi) : [...prev, c.codi])}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.35rem 0.5rem', borderRadius: '6px', border: 'none', cursor: 'pointer', background: sel ? c.color + '22' : 'transparent', textAlign: 'left' }}
                    >
                      <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: c.color, flexShrink: 0 }} />
                      <span style={{ fontSize: '0.82rem', fontWeight: sel ? 600 : 400 }}>{c.nom}</span>
                      {sel && <span style={{ marginLeft: 'auto', color: c.color, fontSize: '0.8rem' }}>✓</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Desplegable multiselecció: categories acreedor */}
        {categoriesAcreedor.length > 0 && (
          <div style={{ position: 'relative' }}>
            <button
              className="form-input"
              onClick={() => { setShowDropAcr(p => !p); setShowDropProv(false); }}
              style={{ width: '165px', fontSize: '0.85rem', textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
            >
              <span>
                Cat. acreedor
                {filterCatAcreedor.length > 0 && (
                  <span style={{ marginLeft: '0.4rem', background: 'var(--color-accent-primary)', color: 'white', borderRadius: '10px', padding: '0.05rem 0.45rem', fontSize: '0.72rem', fontWeight: 700 }}>
                    {filterCatAcreedor.length}
                  </span>
                )}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>{showDropAcr ? '▲' : '▼'}</span>
            </button>
            {showDropAcr && (
              <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 100, background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.12)', padding: '0.5rem', minWidth: '180px', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                {filterCatAcreedor.length > 0 && (
                  <button onClick={() => setFilterCatAcreedor([])} style={{ background: 'none', border: 'none', color: 'var(--color-error-dark)', fontSize: '0.78rem', cursor: 'pointer', textAlign: 'left', padding: '0.2rem 0.4rem' }}>
                    Netejar selecció
                  </button>
                )}
                {categoriesAcreedor.map((c: any) => {
                  const sel = filterCatAcreedor.includes(c.codi);
                  return (
                    <button
                      key={c.codi}
                      onClick={() => setFilterCatAcreedor(prev => sel ? prev.filter(x => x !== c.codi) : [...prev, c.codi])}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.35rem 0.5rem', borderRadius: '6px', border: 'none', cursor: 'pointer', background: sel ? c.color + '22' : 'transparent', textAlign: 'left' }}
                    >
                      <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: c.color, flexShrink: 0 }} />
                      <span style={{ fontSize: '0.82rem', fontWeight: sel ? 600 : 400 }}>{c.nom}</span>
                      {sel && <span style={{ marginLeft: 'auto', color: c.color, fontSize: '0.8rem' }}>✓</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <button
          className="btn-excel"
          onClick={exportarExcel}
        >
          <FileSpreadsheet size={16} />
          Excel
        </button>

        <button
          className="btn-primary"
          onClick={obrirNouProveidor}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <Plus size={18} />
          Nou
        </button>
      </div>

      {/* TABLA */}
      <div className="placeholder-card" style={{ overflowX: 'auto' }}>
        {filteredProveidors.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--color-text-tertiary)' }}>
            <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>No hi ha proveïdors</p>
            <p style={{ fontSize: '0.9rem' }}>
              {searchTerm || filterTipus !== 'Tots' || filterCatProveidor || filterCatAcreedor
                ? 'Prova a canviar els filtres de cerca'
                : 'Fes clic a "Nou Proveïdor" per crear-ne un'}
            </p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: '160px' }} />
              <col style={{ width: '20%' }} />
              <col />
              <col style={{ width: '110px' }} />
              <col style={{ width: '18%' }} />
            </colgroup>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                <th style={thStyle}>Tipus</th>
                <th style={{ ...thStyle, paddingLeft: '1.5rem' }}>Nom</th>
                <th style={{ ...thStyle, paddingLeft: '1.25rem' }}>Categories</th>
                <th style={thStyle}>NIF</th>
                <th style={thStyle}>Contacte</th>
              </tr>
            </thead>
            <tbody>
              {filteredProveidors.map((proveidor) => (
                <tr
                  key={proveidor.codi}
                  onClick={() => { setEditingProveidor(proveidor); setShowModal(true); }}
                  style={{ borderBottom: '1px solid var(--color-border)', cursor: 'pointer' }}
                  className="table-row-hover"
                >
                  <td style={{ padding: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'nowrap' }}>
                      <span style={{
                        padding: '0.2rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        background: proveidor.tipus === 'Proveïdor' ? 'var(--color-info-bg)' : proveidor.tipus === 'Acreedor' ? 'var(--color-warning-bg)' : '#f3e8ff',
                        color: proveidor.tipus === 'Proveïdor' ? 'var(--color-info-dark)' : proveidor.tipus === 'Acreedor' ? 'var(--color-warning-dark)' : '#6b21a8',
                        whiteSpace: 'nowrap'
                      }}>
                        {proveidor.tipus === 'Treballador' ? '👷 ' : ''}{proveidor.tipus}
                      </span>
                      {proveidor.tipus === 'Treballador' && (
                        <span style={{
                          padding: '0.15rem 0.4rem',
                          borderRadius: '4px',
                          fontSize: '0.65rem',
                          fontWeight: 600,
                          background: proveidor.actiu !== false ? 'var(--color-success-bg)' : 'var(--color-error-bg)',
                          color: proveidor.actiu !== false ? 'var(--color-success-dark)' : 'var(--color-error-darker)',
                          whiteSpace: 'nowrap'
                        }}>
                          {proveidor.actiu !== false ? 'Actiu' : 'Inactiu'}
                        </span>
                      )}
                    </div>
                  </td>

                  <td style={{ padding: '0.75rem 0.75rem 0.75rem 1.5rem', color: 'var(--color-accent-primary)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {proveidor.nomComercial || proveidor.nomFiscal}
                  </td>

                  <td style={{ padding: '0.75rem 0.75rem 0.75rem 1.25rem' }}>
                    {proveidor.categories && proveidor.categories.length > 0 ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                        {proveidor.categories.slice(0, 6).map(catCodi => (
                          <span
                            key={catCodi}
                            style={{
                              padding: '0.15rem 0.55rem',
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
                        {proveidor.categories.length > 6 && (
                          <span style={{ padding: '0.15rem 0.55rem', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 600, background: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
                            +{proveidor.categories.length - 6}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span style={{ color: 'var(--color-text-tertiary)', fontSize: '0.875rem' }}>-</span>
                    )}
                  </td>

                  <td style={{ padding: '0.75rem', fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {proveidor.nif || '-'}
                  </td>

                  <td style={{ padding: '0.75rem', fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {[proveidor.telefon, proveidor.correuElectronic].filter(Boolean).join(' · ') || '-'}
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
              saveProveidors(proveidors.map(p => p.codi === proveidor.codi ? proveidor : p));
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

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import * as XLSX from 'xlsx';
import type { Proveidor } from '../../types/proveidor';
import ProveidorModal from './ProveidorModal';
import TipusModal from './TipusModal';

function ProveidorsSection() {
  const [proveidors, setProveidors] = useState<Proveidor[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showTipusModal, setShowTipusModal] = useState(false);
  const [tipusSeleccionat, setTipusSeleccionat] = useState<'Proveïdor' | 'Acreedor' | null>(null);
  const [editingProveidor, setEditingProveidor] = useState<Proveidor | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipus, setFilterTipus] = useState<'Tots' | 'Proveïdor' | 'Acreedor'>('Proveïdor');

  // Cargar proveedores desde localStorage
  useEffect(() => {
    const saved = localStorage.getItem('plateaProveidors');
    if (saved) setProveidors(JSON.parse(saved));
  }, []);

  // Guardar proveedores en localStorage
  const saveProveidors = (newProveidors: Proveidor[]) => {
    setProveidors(newProveidors);
    localStorage.setItem('plateaProveidors', JSON.stringify(newProveidors));
  };

// Exportar proveedores a Excel
const exportarExcel = () => {
  const data = proveidors.map(proveidor => ({
    'Tipus': proveidor.tipus,
    'Codi': proveidor.codi,
    'Data Alta': proveidor.dataAlta,
    'Nom Fiscal': proveidor.nomFiscal,
    'Nom Comercial': proveidor.nomComercial,
    'NIF': proveidor.nif,
    'País': proveidor.pais,
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
  
  const fileName = `proveidors-${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(workbook, fileName);
};

  // Filtrar proveedores
  const filteredProveidors = proveidors.filter(proveidor => {
    const matchSearch = 
      proveidor.nomComercial.toLowerCase().includes(searchTerm.toLowerCase()) ||
      proveidor.nomFiscal.toLowerCase().includes(searchTerm.toLowerCase()) ||
      proveidor.nif.toLowerCase().includes(searchTerm.toLowerCase());
    const matchTipus = filterTipus === 'Tots' || proveidor.tipus === filterTipus;
    return matchSearch && matchTipus;
  });

  // Abrir modal para nuevo proveedor/acreedor
  const obrirNouProveidor = () => {
    setShowTipusModal(true);
  };

  const seleccionarTipus = (tipus: 'Proveïdor' | 'Acreedor') => {
    setTipusSeleccionat(tipus);
    setShowTipusModal(false);
    setShowModal(true);
  };

  const deleteProveidor = (codi: string) => {
    saveProveidors(proveidors.filter(p => p.codi !== codi));
  };

  return (
    <div>
      {/* BARRA DE FILTROS Y ACCIONES */}
      <div style={{
        display: 'flex',
        gap: '1rem',
        marginBottom: '1.5rem',
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
  onChange={(e) => setFilterTipus(e.target.value as 'Tots' | 'Proveïdor' | 'Acreedor')}
  className="form-input"
  style={{ width: '200px' }}
>
  <option value="Tots">Tots els tipus</option>
  <option value="Proveïdor">Proveïdors</option>
  <option value="Acreedor">Acreedors</option>
</select>
        <button className="btn-secondary" onClick={exportarExcel}>Exportar Excel</button>
        <button className="btn-primary" onClick={obrirNouProveidor}>
          Nou Proveïdor
        </button>
      </div>

      {/* TABLA DE PROVEEDORES */}
      <div className="placeholder-card">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
              <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Tipus</th>
              <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Nom</th>
              <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>NIF</th>
              <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Correu</th>
              <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Telèfon</th>
              <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Web</th>
            </tr>
          </thead>
          <tbody>
            {filteredProveidors.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-tertiary)' }}>
                  No hi ha proveïdors. Fes clic a "Nou Proveïdor" per afegir-ne un.
                </td>
              </tr>
            ) : (
              filteredProveidors.map((proveidor) => (
                <tr 
  key={proveidor.codi} 
  style={{ borderBottom: '1px solid var(--color-border)', cursor: 'pointer' }} 
  className="table-row-hover"
  onClick={() => {
    setEditingProveidor(proveidor);
    setShowModal(true);
  }}
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
                  <td 
  style={{ padding: '0.75rem', color: 'var(--color-accent-primary)', fontWeight: 500 }}
>
                    {proveidor.nomComercial || proveidor.nomFiscal}
                  </td>
                  <td style={{ padding: '0.75rem' }}>{proveidor.nif}</td>
                  <td style={{ padding: '0.75rem' }}>{proveidor.correuElectronic}</td>
                  <td style={{ padding: '0.75rem' }}>{proveidor.telefon}</td>
                  <td style={{ padding: '0.75rem' }}>
                    {proveidor.web ? (
                      <a 
                        href={proveidor.web.startsWith('http') ? proveidor.web : `https://${proveidor.web}`}
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={{ color: 'var(--color-accent-primary)', textDecoration: 'none' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {proveidor.web}
                      </a>
                    ) : (
                      '-'
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

{/* MODAL: SELECCIONAR TIPO */}
{showTipusModal && (
        <TipusModal 
          onClose={() => setShowTipusModal(false)}
          onSelect={seleccionarTipus}
        />
      )}

      {/* MODAL DE PROVEEDOR/ACREEDOR */}
      {(showModal || editingProveidor) && (
        <ProveidorModal
        onClose={() => {
          setShowModal(false);
          setEditingProveidor(null);
          setTipusSeleccionat(null);
          // Recargar proveedores desde localStorage
          const saved = localStorage.getItem('plateaProveidors');
          setProveidors(saved ? JSON.parse(saved) : []);
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
          nextCodeProveidor={
            proveidors.filter(p => p.tipus === 'Proveïdor').length === 0 
              ? 'PRO-00001' 
              : `PRO-${String(Math.max(...proveidors.filter(p => p.tipus === 'Proveïdor').map(p => parseInt(p.codi.split('-')[1]))) + 1).padStart(5, '0')}`
          }
          nextCodeAcreedor={
            proveidors.filter(p => p.tipus === 'Acreedor').length === 0 
              ? 'ACR-00001' 
              : `ACR-${String(Math.max(...proveidors.filter(p => p.tipus === 'Acreedor').map(p => parseInt(p.codi.split('-')[1]))) + 1).padStart(5, '0')}`
          }
          editingProveidor={editingProveidor}
          tipusSeleccionat={tipusSeleccionat}
        />
      )}
    </div>

);
}

export default ProveidorsSection;
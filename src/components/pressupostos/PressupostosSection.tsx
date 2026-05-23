import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import type { Pressupost } from '../../types/pressupost';
import type { Client } from '../../types/client';
import PressupostModal from './PressupostModal';
import { storage } from '../../utils/storageManager';

function PressupostosSection() {
  const [pressupostos, setPressupostos] = useState<Pressupost[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingPressupost, setEditingPressupost] = useState<Pressupost | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstat, setFilterEstat] = useState<'Tots' | 'esborrany' | 'enviat' | 'acceptat' | 'rebutjat'>('Tots');

  // Cargar presupuestos
  useEffect(() => {
    setPressupostos(storage.getPressupostos());
  }, []);

  // Guardar presupuestos
  const savePressupostos = (newPressupostos: Pressupost[]) => {
    storage.setPressupostos(newPressupostos);
    setPressupostos(newPressupostos);
  };

  const deletePressupost = (codi: string) => {
    const nuevos = pressupostos.filter(p => p.codi !== codi);
    savePressupostos(nuevos);
  };

  // Cargar clientes para mostrar nombres
  const [clients, setClients] = useState<Client[]>([]);
  useEffect(() => {
    setClients(storage.getClients());
  }, []);

  // Escuchar navegación desde otras secciones
  useEffect(() => {
    if (pressupostos.length === 0) return;
    
    const navigateTo = storage.getNavigateTo();
    if (navigateTo) {
      if (navigateTo.type === 'pressupost' && navigateTo.codi) {
        const pressupost = pressupostos.find(p => p.codi === navigateTo.codi);
        if (pressupost) {
          setTimeout(() => {
            setEditingPressupost(pressupost);
            setShowModal(true);
          }, 100);
        }
      }
      storage.deleteNavigateTo();
    }
  }, [pressupostos]);

  // Filtrar y ordenar presupuestos (más recientes primero)
  const filteredPressupostos = pressupostos
    .filter(pressupost => {
      const client = clients.find(c => c.codi === pressupost.client);
      const clientNom = client?.nomComercial || client?.nomFiscal || '';
      
      const matchSearch = 
        pressupost.codi.toLowerCase().includes(searchTerm.toLowerCase()) ||
        clientNom.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pressupost.nomProjecte.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchEstat = filterEstat === 'Tots' || pressupost.estat === filterEstat;
      
      return matchSearch && matchEstat;
    })
    .sort((a, b) => {
      const dateA = new Date(a.data).getTime();
      const dateB = new Date(b.data).getTime();
      return dateB - dateA;
    });

  // Calcular totales de un presupuesto
  const calcularTotals = (pressupost: Pressupost) => {
    const totalGastos = 
      pressupost.materials.reduce((sum, m) => sum + m.preuProveidor, 0) +
      pressupost.recursosHumans.reduce((sum, r) => sum + r.importe, 0);
    
    const totalPressupost = pressupost.tasques.reduce((sum, t) => sum + t.importe, 0);
    const benefici = totalPressupost - totalGastos;
    const percentBenefici = totalPressupost > 0 ? (benefici / totalPressupost) * 100 : 0;
    
    return { totalGastos, totalPressupost, benefici, percentBenefici };
  };

  // Exportar a Excel
  const exportarExcel = () => {
    const excelData = filteredPressupostos.map(pressupost => {
      const client = clients.find(c => c.codi === pressupost.client);
      const totals = calcularTotals(pressupost);
      
      return {
        'Codi': pressupost.codi,
        'Estat': pressupost.estat.toUpperCase(),
        'Client': client?.nomComercial || client?.nomFiscal || '-',
        'Projecte': pressupost.nomProjecte || '-',
        'Data': pressupost.data,
        'Data Venciment': pressupost.dataVenciment,
        'Gastos (€)': totals.totalGastos.toFixed(2),
        'Total Pressupost (€)': totals.totalPressupost.toFixed(2),
        'Benefici (€)': totals.benefici.toFixed(2),
        '% Benefici': totals.percentBenefici.toFixed(1) + '%'
      };
    });

    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Pressupostos');

    const colWidths = [
      { wch: 12 }, { wch: 12 }, { wch: 30 }, { wch: 30 }, { wch: 12 },
      { wch: 15 }, { wch: 15 }, { wch: 18 }, { wch: 15 }, { wch: 12 }
    ];
    ws['!cols'] = colWidths;

    const fileName = `pressupostos_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
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
          placeholder="Cercar pressupost..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="form-input"
          style={{ flex: '1', minWidth: '200px' }}
        />
        <select
          value={filterEstat}
          onChange={(e) => setFilterEstat(e.target.value as any)}
          className="form-input"
          style={{ width: '200px' }}
        >
          <option value="Tots">Tots els estats</option>
          <option value="esborrany">Esborrany</option>
          <option value="enviat">Enviat</option>
          <option value="acceptat">Acceptat</option>
          <option value="rebutjat">Rebutjat</option>
        </select>
        <button className="btn-secondary" onClick={exportarExcel}>Exportar Excel</button>
        <button className="btn-primary" onClick={() => {
          setEditingPressupost(null);
          setShowModal(true);
        }}>
          Nou Pressupost
        </button>
      </div>

      {/* TABLA DE PRESUPUESTOS */}
      <div className="placeholder-card">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
              <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Estat</th>
              <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Codi</th>
              <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Client</th>
              <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Projecte</th>
              <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Data</th>
              <th style={{ textAlign: 'right', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Import</th>
              <th style={{ textAlign: 'right', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Benefici</th>
            </tr>
          </thead>
          <tbody>
            {filteredPressupostos.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-tertiary)' }}>
                  No hi ha pressupostos. Fes clic a "Nou Pressupost" per crear-ne un.
                </td>
              </tr>
            ) : (
              filteredPressupostos.map((pressupost) => {
                const client = clients.find(c => c.codi === pressupost.client);
                const totals = calcularTotals(pressupost);
                
                const estatColors = {
                  esborrany: { bg: '#f3f4f6', text: '#6b7280' },
                  enviat: { bg: '#dbeafe', text: '#1e40af' },
                  acceptat: { bg: '#d1fae5', text: '#065f46' },
                  rebutjat: { bg: '#fee2e2', text: '#991b1b' }
                };
                
                return (
                  <tr 
                    key={pressupost.codi} 
                    style={{ borderBottom: '1px solid var(--color-border)', cursor: 'pointer' }} 
                    className="table-row-hover"
                    onClick={() => setEditingPressupost(pressupost)}
                  >
                    <td style={{ padding: '0.75rem' }}>
                      <span style={{
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        background: estatColors[pressupost.estat].bg,
                        color: estatColors[pressupost.estat].text,
                        textTransform: 'uppercase'
                      }}>
                        {pressupost.estat}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem', fontWeight: 500 }}>{pressupost.codi}</td>
                    <td style={{ padding: '0.75rem' }}>
                      {client?.nomComercial || client?.nomFiscal || '-'}
                    </td>
                    <td style={{ padding: '0.75rem' }}>{pressupost.nomProjecte || '-'}</td>
                    <td style={{ padding: '0.75rem' }}>{pressupost.data}</td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600 }}>
                      {totals.totalPressupost.toFixed(2)}€
                    </td>
                    <td style={{ 
                      padding: '0.75rem', 
                      textAlign: 'right',
                      color: totals.benefici >= 0 ? '#065f46' : '#991b1b',
                      fontWeight: 600
                    }}>
                      {totals.benefici.toFixed(2)}€ ({totals.percentBenefici.toFixed(1)}%)
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL DE PRESUPUESTO */}
      {(showModal || editingPressupost) && (
        <PressupostModal
          onClose={() => {
            setShowModal(false);
            setEditingPressupost(null);
          }}
          onSave={(pressupost) => {
            const existeix = pressupostos.some(p => p.codi === pressupost.codi);
            if (existeix) {
              savePressupostos(pressupostos.map(p => p.codi === pressupost.codi ? pressupost : p));
            } else {
              savePressupostos([...pressupostos, pressupost]);
            }
          }}
          onDelete={deletePressupost}
          nextCode={
            pressupostos.length === 0 
              ? 'PRE-00001' 
              : `PRE-${String(Math.max(...pressupostos.map(p => parseInt(p.codi.split('-')[1]))) + 1).padStart(5, '0')}`
          }
          editingPressupost={editingPressupost}
        />
      )}
    </div>
  );
}

export default PressupostosSection;
import React, { useState, useEffect } from 'react';
import { Plus, Clock, Trash2, Calendar } from 'lucide-react';
import SearchableSelect from '../common/SearchableSelect';
import type { PartTreball } from '../../types/partTreball';
import type { Client } from '../../types/client';
import type { Projecte } from '../../types/projecte';
import PartTreballModal from './PartTreballModal';
import CronometreModal from './CronometreModal';

interface PartsTreballSectionProps {
  clients: Client[];
}

type FiltrePeriode = 'tots' | 'mes-actual' | 'mes-anterior' | 'mes-seguent' | 'personalitzat';

export default function PartsTreballSection({ clients }: PartsTreballSectionProps) {
  const [parts, setParts] = useState<PartTreball[]>([]);
  const [projectes, setProjectes] = useState<Projecte[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showCronometreModal, setShowCronometreModal] = useState(false);
  const [editingPart, setEditingPart] = useState<PartTreball | null>(null);
  
  // Filtros
  const [filtrePeriode, setFiltrePeriode] = useState<FiltrePeriode>('mes-actual');
  const [dataInici, setDataInici] = useState('');
  const [dataFi, setDataFi] = useState('');
  const [filtreProjecte, setFiltreProjecte] = useState('');
  const [filtreClient, setFiltreClient] = useState('');

  // Cargar datos
  useEffect(() => {
    const savedParts = localStorage.getItem('plateaPartsTreball');
    setParts(savedParts ? JSON.parse(savedParts) : []);
    
    const savedProjectes = localStorage.getItem('plateaProjectes');
    setProjectes(savedProjectes ? JSON.parse(savedProjectes) : []);
  }, []);

  const saveParts = (newParts: PartTreball[]) => {
    localStorage.setItem('plateaPartsTreball', JSON.stringify(newParts));
    setParts(newParts);
  };

  // Generar código
  const getNextCode = () => {
    if (parts.length === 0) return 'PT-00001';
    const maxNum = Math.max(...parts.map(p => parseInt(p.codi.split('-')[1])));
    return `PT-${String(maxNum + 1).padStart(5, '0')}`;
  };

  // Filtrar parts por periodo
  const getPartsFiltrats = () => {
    let partsFiltrats = parts;
  
    // Filtro por período
    if (filtrePeriode !== 'tots') {
      const avui = new Date();
      let inici: Date;
      let fi: Date;
  
      switch (filtrePeriode) {
        case 'mes-actual':
          inici = new Date(avui.getFullYear(), avui.getMonth(), 1);
          fi = new Date(avui.getFullYear(), avui.getMonth() + 1, 0);
          break;
        case 'mes-anterior':
          inici = new Date(avui.getFullYear(), avui.getMonth() - 1, 1);
          fi = new Date(avui.getFullYear(), avui.getMonth(), 0);
          break;
        case 'mes-seguent':
          inici = new Date(avui.getFullYear(), avui.getMonth() + 1, 1);
          fi = new Date(avui.getFullYear(), avui.getMonth() + 2, 0);
          break;
        case 'personalitzat':
          if (!dataInici || !dataFi) break;
          inici = new Date(dataInici);
          fi = new Date(dataFi);
          break;
        default:
          return partsFiltrats;
      }
  
      if (inici! && fi!) {
        partsFiltrats = partsFiltrats.filter(p => {
          const dataPart = new Date(p.data);
          return dataPart >= inici && dataPart <= fi;
        });
      }
    }
  
    // Filtro por proyecto
    if (filtreProjecte) {
      partsFiltrats = partsFiltrats.filter(p => p.projecte === filtreProjecte);
    }
  
    // Filtro por cliente
    if (filtreClient) {
      partsFiltrats = partsFiltrats.filter(p => p.client === filtreClient);
    }

// Ordenar por fecha y hora de fin (más recientes primero)
partsFiltrats = partsFiltrats.sort((a, b) => {
  // Primero comparar por fecha
  const dateA = new Date(a.data).getTime();
  const dateB = new Date(b.data).getTime();
  
  if (dateA !== dateB) {
    return dateB - dateA; // Más recientes primero
  }
  
  // Si las fechas son iguales, ordenar por hora de fin
  const [horaA, minA] = a.horaFi.split(':').map(Number);
  const [horaB, minB] = b.horaFi.split(':').map(Number);
  const minutosA = horaA * 60 + minA;
  const minutosB = horaB * 60 + minB;
  
  return minutosB - minutosA; // Más tarde primero
});

return partsFiltrats;
  };

  const partsFiltrats = getPartsFiltrats();

    // Calcular total de tiempos
  const totalTemps = partsFiltrats.reduce((sum, p) => sum + p.temps, 0);

  // Eliminar part
  const eliminarPart = (codi: string) => {
    if (!confirm('Estàs segur que vols eliminar aquest part de treball?')) return;
    saveParts(parts.filter(p => p.codi !== codi));
  };

  // Formatear tiempo
  const formatTemps = (minuts: number) => {
    const hores = Math.floor(minuts / 60);
    const mins = minuts % 60;
    return `${hores}h ${mins}m`;
  };

  return (
    <div className="section-placeholder">
      
{/* FILTROS */}
<div style={{ 
  display: 'flex',
  gap: '1rem',
  marginBottom: '1.5rem',
  flexWrap: 'wrap',
  alignItems: 'center'
}}>
  {/* Filtros de período */}
  <div style={{ 
    display: 'flex', 
    gap: '0.25rem',
    background: 'var(--color-bg-secondary)',
    padding: '0.25rem',
    borderRadius: '8px',
    border: '1px solid var(--color-border)'
  }}>
    <button
      onClick={() => setFiltrePeriode('tots')}
      style={{
        padding: '0.4rem 0.75rem',
        fontSize: '0.8rem',
        background: filtrePeriode === 'tots' ? 'var(--color-accent-primary)' : 'transparent',
        color: filtrePeriode === 'tots' ? 'white' : 'var(--color-text-primary)',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        fontWeight: 500,
        transition: 'all 0.2s'
      }}
    >
      Tots
    </button>
    <button
      onClick={() => setFiltrePeriode('mes-anterior')}
      style={{
        padding: '0.4rem 0.75rem',
        fontSize: '0.8rem',
        background: filtrePeriode === 'mes-anterior' ? 'var(--color-accent-primary)' : 'transparent',
        color: filtrePeriode === 'mes-anterior' ? 'white' : 'var(--color-text-primary)',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        fontWeight: 500,
        transition: 'all 0.2s'
      }}
    >
      Mes Anterior
    </button>
    <button
      onClick={() => setFiltrePeriode('mes-actual')}
      style={{
        padding: '0.4rem 0.75rem',
        fontSize: '0.8rem',
        background: filtrePeriode === 'mes-actual' ? 'var(--color-accent-primary)' : 'transparent',
        color: filtrePeriode === 'mes-actual' ? 'white' : 'var(--color-text-primary)',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        fontWeight: 500,
        transition: 'all 0.2s'
      }}
    >
      Mes Actual
    </button>
    <button
      onClick={() => setFiltrePeriode('mes-seguent')}
      style={{
        padding: '0.4rem 0.75rem',
        fontSize: '0.8rem',
        background: filtrePeriode === 'mes-seguent' ? 'var(--color-accent-primary)' : 'transparent',
        color: filtrePeriode === 'mes-seguent' ? 'white' : 'var(--color-text-primary)',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        fontWeight: 500,
        transition: 'all 0.2s'
      }}
    >
      Mes Següent
    </button>
    <button
      onClick={() => setFiltrePeriode('personalitzat')}
      style={{
        padding: '0.4rem 0.75rem',
        fontSize: '0.8rem',
        background: filtrePeriode === 'personalitzat' ? 'var(--color-accent-primary)' : 'transparent',
        color: filtrePeriode === 'personalitzat' ? 'white' : 'var(--color-text-primary)',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        fontWeight: 500,
        transition: 'all 0.2s',
        display: 'flex',
        alignItems: 'center',
        gap: '0.3rem'
      }}
    >
      <Calendar size={14} />
      Entre dates
    </button>
  </div>

  {/* Fechas personalizadas (inline) */}
  {filtrePeriode === 'personalitzat' && (
    <>
      <input
        type="date"
        className="form-input"
        value={dataInici}
        onChange={(e) => setDataInici(e.target.value)}
        style={{ width: '140px', padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
      />
      <span style={{ color: 'var(--color-text-tertiary)', fontSize: '0.85rem' }}>→</span>
      <input
        type="date"
        className="form-input"
        value={dataFi}
        onChange={(e) => setDataFi(e.target.value)}
        style={{ width: '140px', padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
      />
    </>
  )}

  {/* Separador */}
  <div style={{ width: '1px', height: '30px', background: 'var(--color-border)' }} />

  {/* Filtro Cliente */}
  <div style={{ minWidth: '180px', maxWidth: '200px' }}>
    <SearchableSelect
      value={filtreClient}
      onChange={(value) => setFiltreClient(value)}
      options={[
        { value: '', label: 'Tots els clients' },
        ...clients.map(c => ({ value: c.codi, label: c.nomComercial || c.nomFiscal }))
      ]}
      placeholder="Client..."
    />
  </div>

  {/* Filtro Proyecto */}
  <div style={{ minWidth: '180px', maxWidth: '200px' }}>
    <SearchableSelect
      value={filtreProjecte}
      onChange={(value) => setFiltreProjecte(value)}
      options={[
        { value: '', label: 'Tots els projectes' },
        ...projectes.map(p => ({ value: p.codi, label: `${p.codi} - ${p.titol}` }))
      ]}
      placeholder="Projecte..."
    />
  </div>

  {/* Spacer */}
  <div style={{ flex: 1 }} />

  {/* Total Temps (más discreto) */}
  <div style={{
    padding: '0.5rem 1rem',
    background: 'var(--color-bg-tertiary)',
    border: '2px solid var(--color-accent-primary)',
    borderRadius: '8px',
    fontWeight: 600,
    color: 'var(--color-accent-primary)',
    fontSize: '0.9rem',
    whiteSpace: 'nowrap'
  }}>
    ⏱️ {formatTemps(totalTemps)}
  </div>

  {/* Botones */}
  <button
    className="btn-secondary"
    onClick={() => setShowCronometreModal(true)}
    style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: '0.4rem',
      padding: '0.5rem 1rem',
      fontSize: '0.85rem'
    }}
  >
    <Clock size={16} />
    Cronòmetre
  </button>
  <button
    className="btn-primary"
    onClick={() => {
      setEditingPart(null);
      setShowModal(true);
    }}
    style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: '0.4rem',
      padding: '0.5rem 1rem',
      fontSize: '0.85rem'
    }}
  >
    <Plus size={16} />
    Nou Part
  </button>
</div>

      {/* TABLA */}
      <div className="placeholder-card" style={{ overflowX: 'auto' }}>
        {partsFiltrats.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--color-text-tertiary)' }}>
            <Clock size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
            <p>No hi ha parts de treball en aquest període</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600 }}>Codi</th>
                <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600 }}>Data</th>
                <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600 }}>Projecte</th>
                <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600 }}>Tasca</th>
                <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600 }}>Client</th>
                <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600 }}>Hora Inici</th>
                <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600 }}>Hora Fi</th>
                <th style={{ textAlign: 'right', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600 }}>Temps</th>
                <th style={{ width: '50px' }}></th>
              </tr>
            </thead>
            <tbody>
              {partsFiltrats.map(part => {
                const projecte = projectes.find(p => p.codi === part.projecte);
                const client = clients.find(c => c.codi === part.client);
                const tasca = projecte?.tasques.find(t => t.id === part.tasca);

                return (
                  <tr
                    key={part.codi}
                    onClick={() => {
                      setEditingPart(part);
                      setShowModal(true);
                    }}
                    style={{
                      borderBottom: '1px solid var(--color-border)',
                      cursor: 'pointer'
                    }}
                    className="table-row-hover"
                  >
                    <td style={{ padding: '0.75rem', fontSize: '0.85rem', color: 'var(--color-text-tertiary)' }}>
                      {part.codi}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      {new Date(part.data).toLocaleDateString('ca-ES')}
                    </td>
                    <td style={{ padding: '0.75rem', fontWeight: 500 }}>
  {part.projecte === 'ADMIN' ? (
    <span style={{ color: '#6b7280', fontStyle: 'italic' }}>Tasca administrativa</span>
  ) : (
    projecte?.titol || '-'
  )}
</td>
<td style={{ padding: '0.75rem' }}>
  {part.projecte === 'ADMIN' ? (
    part.tasca || '-'
  ) : (
    tasca?.servei || '-'
  )}
</td>
                    <td style={{ padding: '0.75rem' }}>
                      {client?.nomComercial || client?.nomFiscal || '-'}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      {part.horaInici}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      {part.horaFi}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600, color: 'var(--color-accent-primary)' }}>
                      {formatTemps(part.temps)}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          eliminarPart(part.codi);
                        }}
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
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* MODALS */}
      {showModal && (
        <PartTreballModal
          part={editingPart}
          onClose={() => {
            setShowModal(false);
            setEditingPart(null);
          }}
          onSave={(part) => {
            const existeix = parts.some(p => p.codi === part.codi);
            if (existeix) {
              saveParts(parts.map(p => p.codi === part.codi ? part : p));
            } else {
              saveParts([...parts, part]);
            }
          }}
          nextCode={getNextCode()}
          clients={clients}
          projectes={projectes}
        />
      )}

      {showCronometreModal && (
        <CronometreModal
          onClose={() => setShowCronometreModal(false)}
          clients={clients}
          projectes={projectes}
          onCrearPart={(part) => {
            saveParts([...parts, { ...part, codi: getNextCode() }]);
          }}
        />
      )}
    </div>
  );
}
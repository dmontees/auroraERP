import React, { useState, useEffect } from 'react';
import type { ObligacioFiscal, EstatGasto } from '../../types/facturaCompra';
import { SUBTIPUS_OBLIGACIO_FISCAL } from '../../types/facturaCompra';
import type { Proveidor } from '../../types/proveidor';
import type { Projecte } from '../../types/projecte';
import { storage } from '../../utils/storageManager';
import ObligacioFiscalModal from './ObligacioFiscalModal';
import { formatCurrency } from '../factures-compra/utils/facturesCalculations';
import { AlertCircle, CheckCircle, Clock } from 'lucide-react';

export default function GestioFiscalSection() {
  const [obligacions, setObligacions] = useState<ObligacioFiscal[]>([]);
  const [proveidors, setProveidors] = useState<Proveidor[]>([]);
  const [projectes, setProjectes] = useState<Projecte[]>([]);

  const [showModal, setShowModal] = useState(false);
  const [editingOF, setEditingOF] = useState<ObligacioFiscal | null>(null);

  const [filterSubtipus, setFilterSubtipus] = useState<string>('tots');
  const [filterEstat, setFilterEstat] = useState<'tots' | EstatGasto>('tots');
  const [filterAny, setFilterAny] = useState(() => String(new Date().getFullYear()));

  useEffect(() => {
    setObligacions(storage.getObligacionsFiscals());
    setProveidors(storage.getProveidors());
    setProjectes(storage.getProjectes());
  }, []);

  const treballadors = proveidors.filter(p => p.tipus === 'Treballador');

  const saveObligacio = (of: ObligacioFiscal) => {
    const existeix = obligacions.some(o => o.codi === of.codi);
    const nouObligacions = existeix
      ? obligacions.map(o => o.codi === of.codi ? of : o)
      : [...obligacions, of];
    setObligacions(nouObligacions);
    storage.setObligacionsFiscals(nouObligacions);

    // Sync nomina PDF to worker's documents
    if (of.subtipus === 'nomina-treballador' && of.treballadorCodi && of.documentPDF) {
      const worker = proveidors.find(p => p.codi === of.treballadorCodi);
      if (worker) {
        const docId = `nomina-${of.codi}`;
        const linkedProject = of.projecteCodi
          ? projectes.find(p => p.codi === of.projecteCodi)
          : undefined;
        const newDoc = {
          id: docId,
          nom: of.documentPDFName || `Nòmina ${of.periode}`,
          tipus: 'contracte' as const,
          dataCarrega: new Date().toISOString().split('T')[0],
          urlFitxer: of.documentPDF,
          ...(linkedProject && {
            projecteCodi: linkedProject.codi,
            projecteNom: linkedProject.titol,
          }),
        };
        const existingDocs = worker.documents || [];
        const updatedDocs = existingDocs.some(d => d.id === docId)
          ? existingDocs.map(d => d.id === docId ? newDoc : d)
          : [...existingDocs, newDoc];
        const updatedWorker = { ...worker, documents: updatedDocs };
        const updatedProveidors = proveidors.map(p => p.codi === worker.codi ? updatedWorker : p);
        storage.setProveidors(updatedProveidors);
        setProveidors(updatedProveidors);
      }
    }
  };

  const deleteObligacio = (codi: string) => {
    const nouObligacions = obligacions.filter(o => o.codi !== codi);
    setObligacions(nouObligacions);
    storage.setObligacionsFiscals(nouObligacions);
  };

  const getNextCode = (): string => {
    if (obligacions.length === 0) return 'OF-00001';
    const maxNum = Math.max(...obligacions.map(o => parseInt(o.codi.split('-')[1]) || 0));
    return `OF-${String(maxNum + 1).padStart(5, '0')}`;
  };

  const currentYear = new Date().getFullYear();
  const filterYears = Array.from({ length: currentYear - 2020 + 2 }, (_, i) => String(2020 + i));

  const ofsFiltrats = obligacions
    .filter(o => {
      if (filterSubtipus !== 'tots' && o.subtipus !== filterSubtipus) return false;
      if (filterEstat !== 'tots' && o.estat !== filterEstat) return false;
      if (filterAny && !o.periode?.startsWith(filterAny)) return false;
      return true;
    })
    .sort((a, b) => {
      if (a.createdAt && b.createdAt) return b.createdAt.localeCompare(a.createdAt);
      return b.dataGasto.localeCompare(a.dataGasto);
    });

  const totalPendent = obligacions.reduce((s, o) => s + (o.pendentPagament || 0), 0);
  const vencudes = obligacions.filter(o => o.estat === 'vencuda');
  const importVencudes = vencudes.reduce((s, o) => s + (o.pendentPagament || 0), 0);
  const totalPagat = obligacions.filter(o => o.estat === 'pagada').reduce((s, o) => s + (o.totalGasto || 0), 0);

  const getEstatIcon = (estat: EstatGasto) => {
    switch (estat) {
      case 'vencuda': return <AlertCircle size={18} color="#dc2626" />;
      case 'pendent': return <Clock size={18} color="#f59e0b" />;
      case 'pagada-parcial': return <Clock size={18} color="#3b82f6" />;
      case 'pagada': return <CheckCircle size={18} color="#10b981" />;
    }
  };

  return (
    <div>
      {/* Mètriques */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem'
      }}>
        <div style={{ background: 'var(--color-bg-secondary)', padding: '1.5rem', borderRadius: '12px', border: '2px solid #f59e0b' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>💸 Pendent de Pagament</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#f59e0b' }}>{formatCurrency(totalPendent)}</div>
        </div>
        <div style={{ background: 'var(--color-bg-secondary)', padding: '1.5rem', borderRadius: '12px', border: '2px solid #dc2626' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>🔴 Vençudes</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#dc2626' }}>{vencudes.length}</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--color-text-tertiary)', marginTop: '0.25rem' }}>{formatCurrency(importVencudes)}</div>
        </div>
        <div style={{ background: 'var(--color-bg-secondary)', padding: '1.5rem', borderRadius: '12px', border: '2px solid #10b981' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>✅ Total Pagat</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#10b981' }}>{formatCurrency(totalPagat)}</div>
        </div>
      </div>

      {/* Filtres */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <select
          value={filterSubtipus}
          onChange={(e) => setFilterSubtipus(e.target.value)}
          className="form-input"
          style={{ width: '220px', fontSize: '0.85rem' }}
        >
          <option value="tots">Tots els subtipus</option>
          {SUBTIPUS_OBLIGACIO_FISCAL.map(s => (
            <option key={s.codi} value={s.codi}>{s.icon} {s.nom}</option>
          ))}
        </select>

        <select
          value={filterEstat}
          onChange={(e) => setFilterEstat(e.target.value as any)}
          className="form-input"
          style={{ width: '150px', fontSize: '0.85rem' }}
        >
          <option value="tots">Tots els estats</option>
          <option value="pendent">Pendent</option>
          <option value="pagada-parcial">Pagada Parcial</option>
          <option value="pagada">Pagada</option>
          <option value="vencuda">Vençuda</option>
        </select>

        <select
          value={filterAny}
          onChange={(e) => setFilterAny(e.target.value)}
          className="form-input"
          style={{ width: '100px', fontSize: '0.85rem' }}
        >
          <option value="">Tots els anys</option>
          {filterYears.map(y => <option key={y} value={y}>{y}</option>)}
        </select>

        <div style={{ flex: 1 }} />

        <button
          className="btn-primary"
          onClick={() => { setEditingOF(null); setShowModal(true); }}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          Nova Obligació Fiscal
        </button>
      </div>

      {/* Taula */}
      <div className="placeholder-card">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
              <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Estat</th>
              <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Codi</th>
              <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Tipus</th>
              <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Període</th>
              <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Concepte</th>
              <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Data</th>
              <th style={{ textAlign: 'right', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Total</th>
              <th style={{ textAlign: 'right', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Pendent</th>
            </tr>
          </thead>
          <tbody>
            {ofsFiltrats.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-tertiary)' }}>
                  No hi ha obligacions fiscals. Fes clic a "Nova Obligació Fiscal" per afegir-ne.
                </td>
              </tr>
            ) : (
              ofsFiltrats.map(of => {
                const subtipusInfo = SUBTIPUS_OBLIGACIO_FISCAL.find(s => s.codi === of.subtipus);
                const pendent = Math.round((of.pendentPagament || 0) * 100) / 100;
                return (
                  <tr
                    key={of.codi}
                    style={{ borderBottom: '1px solid var(--color-border)', cursor: 'pointer' }}
                    className="table-row-hover"
                    onClick={() => setEditingOF(of)}
                  >
                    <td style={{ padding: '0.75rem' }}>{getEstatIcon(of.estat)}</td>
                    <td style={{ padding: '0.75rem', fontWeight: 500 }}>{of.codi}</td>
                    <td style={{ padding: '0.75rem', fontSize: '0.85rem' }}>
                      {subtipusInfo ? `${subtipusInfo.icon} ${subtipusInfo.nom}` : of.subtipus}
                      {of.subtipus === 'nomina-treballador' && of.treballadorNom && (
                        <div style={{ fontSize: '0.78rem', color: 'var(--color-text-tertiary)' }}>{of.treballadorNom}</div>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem' }}>{of.periode}</td>
                    <td style={{ padding: '0.75rem', fontSize: '0.85rem' }}>{of.concepte}</td>
                    <td style={{ padding: '0.75rem' }}>{of.dataGasto}</td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600 }}>{formatCurrency(of.totalGasto)}</td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600, color: pendent > 0 ? '#dc2626' : '#10b981' }}>
                      {formatCurrency(pendent)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {(showModal || editingOF) && (
        <ObligacioFiscalModal
          onClose={() => { setShowModal(false); setEditingOF(null); }}
          onSave={saveObligacio}
          onDelete={deleteObligacio}
          nextCode={getNextCode()}
          editingGasto={editingOF}
          treballadors={treballadors}
          projectes={projectes}
        />
      )}
    </div>
  );
}

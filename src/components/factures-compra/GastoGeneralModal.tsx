import React, { useState, useEffect } from 'react';
import { X, Trash2, Lock } from 'lucide-react';
import type { GastoGeneral, CategoriaGastoGeneral } from '../../types/facturaCompra';
import { CATEGORIES_GASTO_GENERAL } from '../../types/facturaCompra';
import { useAutoSave } from '../../hooks/useAutoSave';
import PagamentsManager from './shared/PagamentsManager';
import PDFUploader from './shared/PDFUploader';
import { usePagaments } from './hooks/usePagaments';
import { calcularImpostos, determinarEstat } from './utils/facturesCalculations';

interface GastoGeneralModalProps {
  onClose: () => void;
  onSave: (gasto: GastoGeneral) => void;
  onDelete?: (codi: string) => void;
  nextCode: string;
  editingGasto?: GastoGeneral | null;
}

export default function GastoGeneralModal({
  onClose,
  onSave,
  onDelete,
  nextCode,
  editingGasto
}: GastoGeneralModalProps) {
  
  // Freeze the code at open time so re-renders from parent don't change it
  const [codiFixed] = useState(() => editingGasto?.codi || nextCode);

  const [formData, setFormData] = useState<Omit<GastoGeneral, 'totalGasto' | 'pendentPagament' | 'estat' | 'pagaments' | 'totalPagat'>>(
    editingGasto ? {
      codi: editingGasto.codi,
      tipus: editingGasto.tipus,
      categoria: editingGasto.categoria,
      concepte: editingGasto.concepte,
      mesImputacion: editingGasto.mesImputacion,
      dataGasto: editingGasto.dataGasto,
      baseImposable: editingGasto.baseImposable,
      ivaPercent: editingGasto.ivaPercent,
      ivaImport: editingGasto.ivaImport,
      irpfPercent: editingGasto.irpfPercent,
      irpfImport: editingGasto.irpfImport,
      notes: editingGasto.notes,
      documentPDF: editingGasto.documentPDF,
      documentPDFName: editingGasto.documentPDFName
    } : {
      codi: codiFixed,
      tipus: 'gasto-general',
      categoria: 'seguro',
      concepte: '',
      mesImputacion: (() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      })(),
      dataGasto: new Date().toISOString().split('T')[0],
      baseImposable: 0,
      ivaPercent: 21,
      ivaImport: 0,
      irpfPercent: 0,
      irpfImport: 0,
      notes: '',
      documentPDF: undefined,
      documentPDFName: undefined
    }
  );

  const { pagaments, setPagaments, afegirPagament, eliminarPagament, totalPagat } = usePagaments(
    editingGasto?.pagaments || []
  );

  const [pdfFileName, setPdfFileName] = useState<string>(editingGasto?.documentPDFName || '');

  const esNou = !editingGasto;
  const [initialData] = useState(JSON.stringify({ formData, pagaments }));
  const [haCambiat, setHaCambiat] = useState(false);
  
  useEffect(() => {
    setHaCambiat(JSON.stringify({ formData, pagaments }) !== initialData);
  }, [formData, pagaments, initialData]);

  const { ivaImport, irpfImport, total: totalGasto } = calcularImpostos(
    formData.baseImposable,
    formData.ivaPercent,
    formData.irpfPercent
  );

  const pendentPagament = totalGasto - totalPagat;
  const camposBloquejats = totalPagat > 0;
  const completamentPagada = totalGasto > 0.01 && pendentPagament <= 0.01;

  const prepararGasto = (): GastoGeneral | null => {
    if (!formData.concepte || !formData.dataGasto || !formData.mesImputacion) {
      return null;
    }
    
    if (!formData.documentPDF) {
      return null;
    }

    const estat = determinarEstat(totalGasto, totalPagat);

    return {
      ...formData,
      ivaImport,
      irpfImport,
      totalGasto,
      pendentPagament: Math.max(0, pendentPagament),
      estat,
      pagaments,
      totalPagat
    };
  };

  const { saveNow } = useAutoSave(
    { formData, pagaments },
    () => {
      const gastoCompleto = prepararGasto();
      if (gastoCompleto) {
        onSave(gastoCompleto);
      }
    }
  );

  const calcularTotals = (base: number, ivaPercent: number, irpfPercent: number) => {
    const { ivaImport: ivaImp, irpfImport: irpfImp } = calcularImpostos(base, ivaPercent, irpfPercent);
    
    setFormData(prev => ({
      ...prev,
      ivaImport: ivaImp,
      irpfImport: irpfImp
    }));
  };

  const handlePDFUpload = (file: File) => {
    setPdfFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      setFormData({ 
        ...formData, 
        documentPDF: event.target?.result as string,
        documentPDFName: file.name 
      });
    };
    reader.readAsDataURL(file);
  };

  const handlePDFDelete = () => {
    if (confirm('Estàs segur que vols eliminar el document PDF?')) {
      setFormData({ ...formData, documentPDF: undefined, documentPDFName: undefined });
      setPdfFileName('');
    }
  };

  const handleAfegirPagament = (nouPagament: any) => {
    afegirPagament(nouPagament);
  };

  const handleEliminarPagament = (codi: string) => {
    eliminarPagament(codi);
  };

  const handleDelete = () => {
    if (!editingGasto) return;
    
    if (totalPagat > 0) {
      alert('No es pot eliminar una despesa amb pagaments registrats. Primer desbloqueja la despesa.');
      return;
    }

    if (!confirm('Estàs segur que vols eliminar aquesta despesa? Aquesta acció no es pot desfer.')) {
      return;
    }

    onDelete?.(editingGasto.codi);
    onClose();
  };

  const handleClose = () => {
    if (esNou && !haCambiat) {
      onClose();
      return;
    }
    
    const gastoCompleto = prepararGasto();
    if (!gastoCompleto) {
      alert('Omple tots els camps obligatoris i puja un recibo PDF');
      return;
    }
    
    saveNow();
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()}
        style={{ 
          maxWidth: '900px', 
          maxHeight: '90vh', 
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        <div className="modal-header">
          <h2>
            💳 {editingGasto ? 'Editar' : 'Nova'} Despesa General
            {completamentPagada && (
              <span style={{
                marginLeft: '1rem',
                fontSize: '0.9rem',
                background: '#10b981',
                color: 'white',
                padding: '0.25rem 0.75rem',
                borderRadius: '4px',
                fontWeight: 600
              }}>
                <Lock size={14} style={{ display: 'inline', marginRight: '0.25rem' }} />
                PAGADA
              </span>
            )}
          </h2>
          <button className="modal-close" onClick={handleClose}>
            <X size={24} />
          </button>
        </div>

        <div className="modal-body" style={{ flex: 1, overflow: 'auto' }}>
          <div className="form-group">
            <label>Codi</label>
            <input
              type="text"
              className="form-input"
              value={formData.codi}
              readOnly
              style={{ background: 'var(--color-bg-tertiary)', cursor: 'not-allowed' }}
            />
          </div>

          <div className="form-group">
            <label>Categoria *</label>
            <select
              className="form-input"
              value={formData.categoria}
              onChange={(e) => setFormData({ ...formData, categoria: e.target.value as CategoriaGastoGeneral })}
              required
              disabled={camposBloquejats}
            >
              {CATEGORIES_GASTO_GENERAL.map(cat => (
                <option key={cat.codi} value={cat.codi}>
                  {cat.icon} {cat.nom}
                </option>
              ))}
              {formData.categoria === 'autonomo' && (
                <option value="autonomo">👤 Quota Autònom (usa Obligació Fiscal per a noves)</option>
              )}
            </select>
          </div>

          <div className="form-group">
            <label>Concepte *</label>
            <input
              type="text"
              className="form-input"
              value={formData.concepte}
              onChange={(e) => setFormData({ ...formData, concepte: e.target.value })}
              placeholder="Ex: Quota autònom gener 2024"
              required
              disabled={camposBloquejats}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label>Mes d'Imputació *</label>
              <input
                type="month"
                className="form-input"
                value={formData.mesImputacion}
                onChange={(e) => setFormData({ ...formData, mesImputacion: e.target.value })}
                required
                disabled={camposBloquejats}
              />
            </div>

            <div className="form-group">
              <label>Data del Gasto *</label>
              <input
                type="date"
                className="form-input"
                value={formData.dataGasto}
                onChange={(e) => setFormData({ ...formData, dataGasto: e.target.value })}
                required
                disabled={camposBloquejats}
              />
            </div>
          </div>

          <div style={{
            background: 'var(--color-bg-tertiary)',
            padding: '1.5rem',
            borderRadius: '8px',
            marginTop: '1rem'
          }}>
            <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>💰 Importes</h3>

            <div className="form-group">
              <label>Base Imposable *</label>
              <input
                type="number"
                step="0.01"
                className="form-input"
                value={formData.baseImposable}
                onChange={(e) => {
                  const base = parseFloat(e.target.value) || 0;
                  setFormData({ ...formData, baseImposable: base });
                  calcularTotals(base, formData.ivaPercent, formData.irpfPercent);
                }}
                required
                disabled={camposBloquejats}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label>IVA (%)</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-input"
                  value={formData.ivaPercent}
                  onChange={(e) => {
                    const iva = parseFloat(e.target.value) || 0;
                    setFormData({ ...formData, ivaPercent: iva });
                    calcularTotals(formData.baseImposable, iva, formData.irpfPercent);
                  }}
                  disabled={camposBloquejats}
                />
              </div>

              <div className="form-group">
                <label>Import IVA</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-input"
                  value={ivaImport.toFixed(2)}
                  readOnly
                  style={{ background: 'var(--color-bg-secondary)', cursor: 'not-allowed' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label>IRPF (%) - Opcional</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-input"
                  value={formData.irpfPercent}
                  onChange={(e) => {
                    const irpf = parseFloat(e.target.value) || 0;
                    setFormData({ ...formData, irpfPercent: irpf });
                    calcularTotals(formData.baseImposable, formData.ivaPercent, irpf);
                  }}
                  disabled={camposBloquejats}
                />
              </div>

              <div className="form-group">
                <label>Import IRPF</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-input"
                  value={irpfImport.toFixed(2)}
                  readOnly
                  style={{ background: 'var(--color-bg-secondary)', cursor: 'not-allowed' }}
                />
              </div>
            </div>

            <div style={{
              marginTop: '1rem',
              padding: '1rem',
              background: 'var(--color-accent-primary)',
              color: 'white',
              borderRadius: '8px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{ fontWeight: 600, fontSize: '1.1rem' }}>TOTAL A PAGAR</span>
              <span style={{ fontWeight: 700, fontSize: '1.5rem' }}>
                {totalGasto.toFixed(2)}€
              </span>
            </div>
          </div>

          <PagamentsManager
            pagaments={pagaments}
            pendentPagament={pendentPagament}
            onAfegirPagament={handleAfegirPagament}
            onEliminarPagament={handleEliminarPagament}
            disabled={completamentPagada}
          />

          <PDFUploader
            documentPDF={formData.documentPDF}
            fileName={pdfFileName}
            onUpload={handlePDFUpload}
            onDelete={handlePDFDelete}
            disabled={camposBloquejats}
            required
          />

          <div className="form-group">
            <label>Notes</label>
            <textarea
              className="form-input"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              placeholder="Notes addicionals..."
              disabled={camposBloquejats}
            />
          </div>
        </div>

        <div className="modal-footer" style={{ flexShrink: 0 }}>
          {editingGasto && onDelete && !camposBloquejats && (
            <button 
              type="button" 
              className="btn-secondary"
              onClick={handleDelete}
              style={{ 
                marginRight: 'auto',
                borderColor: '#dc2626',
                color: '#dc2626'
              }}
            >
              <Trash2 size={18} />
              Eliminar
            </button>
          )}
          
          <button type="button" className="btn-primary" onClick={handleClose}>
            Acceptar
          </button>
        </div>
      </div>
    </div>
  );
}
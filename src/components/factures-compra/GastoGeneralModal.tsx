import React, { useState, useEffect } from 'react';
import { X, Upload, FileText, Euro, Trash2, Lock, Unlock } from 'lucide-react';
import type { GastoGeneral, Pagament, CategoriaGastoGeneral } from '../../types/facturaCompra';
import { CATEGORIES_GASTO_GENERAL } from '../../types/facturaCompra';
import { useAutoSave } from '../../hooks/useAutoSave';


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
  const [formData, setFormData] = useState<Omit<GastoGeneral, 'totalGasto' | 'pendentPagament' | 'estat'>>(
    editingGasto || {
      codi: nextCode,
      tipus: 'gasto-general',
      categoria: 'otros',
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
      pagaments: [],
      totalPagat: 0,
      notes: ''
    }
  );

  const esNou = !editingGasto;
  const [initialData] = useState(JSON.stringify(formData));
  const [haCambiat, setHaCambiat] = useState(false);
  
  // Detectar cambios
  useEffect(() => {
    setHaCambiat(JSON.stringify(formData) !== initialData);
  }, [formData, initialData]);

  const [pdfFileName, setPdfFileName] = useState<string>(
    editingGasto?.documentPDFName || ''
  );

  const [nouPagament, setNouPagament] = useState({
    data: new Date().toISOString().split('T')[0],
    import: 0,
    metode: 'transferencia' as const,
    referencia: ''
  });

  const ivaImport = (formData.baseImposable * formData.ivaPercent) / 100;
  const irpfImport = (formData.baseImposable * formData.irpfPercent) / 100;
  const totalGasto = formData.baseImposable + ivaImport - irpfImport;
  const pendentPagament = totalGasto - formData.totalPagat;

  // Bloqueo parcial: si hay pagos, bloquear campos pero permitir más pagos
  const camposBloquejats = formData.totalPagat > 0;
  // Bloqueo total: solo si está completamente pagada
  const completamentPagada = pendentPagament <= 0.01;

// Preparar gasto completo
const prepararGasto = (): GastoGeneral | null => {
  if (!formData.concepte || !formData.dataGasto || !formData.mesImputacion) {
    return null;
  }
  
  if (!formData.documentPDF) {
    return null;  // ← Simplemente retornar null, sin alert aquí
  }

  let estat: 'pendent' | 'pagada-parcial' | 'pagada' | 'vencuda' = 'pendent';
  if (pendentPagament <= 0.01) {
    estat = 'pagada';
  } else if (formData.totalPagat > 0) {
    estat = 'pagada-parcial';
  }

  return {
    ...formData,
    ivaImport,
    irpfImport,
    totalGasto,
    pendentPagament: Math.max(0, pendentPagament),
    estat
  };
};

// Autoguardado
const { saveNow } = useAutoSave(
  formData,
  (data) => {
    const gastoCompleto = prepararGasto();
    if (gastoCompleto) {
      onSave(gastoCompleto);
    } else {
    }
  }
);

  const calcularTotals = (base: number, ivaPercent: number, irpfPercent: number) => {
    const ivaImp = (base * ivaPercent) / 100;
    const irpfImp = (base * irpfPercent) / 100;
    
    setFormData(prev => ({
      ...prev,
      ivaImport: ivaImp,
      irpfImport: irpfImp
    }));
  };

  const registrarPagament = () => {
    if (nouPagament.import <= 0) {
      alert('L\'import ha de ser superior a 0');
      return;
    }

    if (nouPagament.import > pendentPagament) {
      alert('L\'import no pot ser superior al pendent');
      return;
    }

    const pagament: Pagament = {
      codi: `PAG-${String(formData.pagaments.length + 1).padStart(5, '0')}`,
      data: nouPagament.data,
      import: nouPagament.import,
      metode: nouPagament.metode,
      referencia: nouPagament.referencia
    };

    setFormData({
      ...formData,
      pagaments: [...formData.pagaments, pagament],
      totalPagat: formData.totalPagat + nouPagament.import
    });

    setNouPagament({
      data: new Date().toISOString().split('T')[0],
      import: 0,
      metode: 'transferencia',
      referencia: ''
    });
  };

  const eliminarPagament = (codiPagament: string) => {
    const pagament = formData.pagaments.find(p => p.codi === codiPagament);
    if (!pagament) return;

    if (!confirm('Estàs segur que vols eliminar aquest pagament? Això desbloquearà la despesa.')) {
      return;
    }

    setFormData({
      ...formData,
      pagaments: formData.pagaments.filter(p => p.codi !== codiPagament),
      totalPagat: formData.totalPagat - pagament.import
    });
  };

    const handlePDFUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        alert('Només es permeten arxius PDF');
        return;
      }
      
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
    }
  };

  const eliminarPDF = () => {
    if (confirm('Estàs segur que vols eliminar el document PDF?')) {
      setFormData({ ...formData, documentPDF: undefined, documentPDFName: undefined });
      setPdfFileName('');
    }
  };

  const handleDelete = () => {
    if (!editingGasto) return;
    
    if (formData.totalPagat > 0) {
      alert('No es pot eliminar una despesa amb pagaments registrats. Primer desbloqueja la despesa.');
      return;
    }

    if (!confirm('Estàs segur que vols eliminar aquesta despesa? Aquesta acció no es pot desfer.')) {
      return;
    }

    onDelete?.(editingGasto.codi);
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div 
  className="modal-content" 
  onClick={(e) => e.stopPropagation()}
  style={{ 
    maxWidth: '1000px', 
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
          <button className="modal-close" onClick={() => {
  if (esNou && !haCambiat) {
    // Nuevo gasto sin cambios, cerrar sin guardar
    onClose();
    return;
  }
  
  const gastoCompleto = prepararGasto();
  if (!gastoCompleto) {
    alert('Omple tots els camps obligatoris i puja un recibo PDF');
    return;
  }
  
  onSave(gastoCompleto);
  onClose();
}}>
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

            <div style={{
              background: 'var(--color-bg-tertiary)',
              padding: '1.5rem',
              borderRadius: '8px',
              marginTop: '1.5rem'
            }}>
              <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>💰 Gestió de Pagaments</h3>

              {formData.pagaments.length > 0 && (
                <div style={{ marginBottom: '1rem' }}>
                  <table style={{ width: '100%', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <th style={{ textAlign: 'left', padding: '0.5rem' }}>Data</th>
                        <th style={{ textAlign: 'left', padding: '0.5rem' }}>Import</th>
                        <th style={{ textAlign: 'left', padding: '0.5rem' }}>Mètode</th>
                        <th style={{ textAlign: 'left', padding: '0.5rem' }}>Referència</th>
                        <th style={{ textAlign: 'right', padding: '0.5rem' }}>Accions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {formData.pagaments.map(pag => (
                        <tr key={pag.codi} style={{ borderBottom: '1px solid var(--color-border)' }}>
                          <td style={{ padding: '0.5rem' }}>{pag.data}</td>
                          <td style={{ padding: '0.5rem', fontWeight: 600 }}>{pag.import.toFixed(2)}€</td>
                          <td style={{ padding: '0.5rem' }}>{pag.metode}</td>
                          <td style={{ padding: '0.5rem' }}>{pag.referencia || '-'}</td>
                          <td style={{ padding: '0.5rem', textAlign: 'right' }}>
                            <button
                              type="button"
                              onClick={() => eliminarPagament(pag.codi)}
                              className="btn-secondary"
                              style={{ 
                                padding: '0.25rem 0.5rem',
                                fontSize: '0.75rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem'
                              }}
                            >
                              <Unlock size={12} />
                              Eliminar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div style={{
                    marginTop: '1rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontWeight: 600,
                    padding: '0.75rem',
                    background: 'var(--color-bg-secondary)',
                    borderRadius: '6px'
                  }}>
                    <span>Pendent:</span>
                    <span style={{ color: pendentPagament > 0 ? '#dc2626' : '#10b981' }}>
                      {pendentPagament.toFixed(2)}€
                    </span>
                  </div>
                </div>
              )}

              {pendentPagament > 0.01 && (
                <div>
                  <h4 style={{ fontSize: '0.9rem', marginBottom: '0.75rem', fontWeight: 600 }}>
                    Registrar Nou Pagament
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: '0.5rem', alignItems: 'end' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: '0.8rem' }}>Data</label>
                      <input
                        type="date"
                        className="form-input"
                        value={nouPagament.data}
                        onChange={(e) => setNouPagament({ ...nouPagament, data: e.target.value })}
                        style={{ fontSize: '0.85rem' }}
                      />
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: '0.8rem' }}>Import</label>
                      <input
                        type="number"
                        step="0.01"
                        className="form-input"
                        value={nouPagament.import}
                        onChange={(e) => setNouPagament({ ...nouPagament, import: parseFloat(e.target.value) || 0 })}
                        placeholder="0.00"
                        style={{ fontSize: '0.85rem' }}
                      />
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: '0.8rem' }}>Mètode</label>
                      <select
                        className="form-input"
                        value={nouPagament.metode}
                        onChange={(e) => setNouPagament({ ...nouPagament, metode: e.target.value as any })}
                        style={{ fontSize: '0.85rem' }}
                      >
                        <option value="transferencia">Transferència</option>
                        <option value="efectiu">Efectiu</option>
                        <option value="targeta">Targeta</option>
                        <option value="domiciliacio">Domiciliació</option>
                      </select>
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: '0.8rem' }}>Referència</label>
                      <input
                        type="text"
                        className="form-input"
                        value={nouPagament.referencia}
                        onChange={(e) => setNouPagament({ ...nouPagament, referencia: e.target.value })}
                        placeholder="Opcional"
                        style={{ fontSize: '0.85rem' }}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={registrarPagament}
                      className="btn-primary"
                      style={{ 
                        padding: '0.5rem 1rem',
                        fontSize: '0.85rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}
                    >
                      <Euro size={16} />
                      Registrar
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="form-group" style={{ marginTop: '1.5rem' }}>
              <label>Recibo PDF *</label>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handlePDFUpload}
                  style={{ display: 'none' }}
                  id="pdf-upload"
                  disabled={camposBloquejats}
                />
                <label 
                  htmlFor="pdf-upload" 
                  className="btn-secondary"
                  style={{ 
                    cursor: camposBloquejats ? 'not-allowed' : 'pointer', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.5rem',
                    opacity: camposBloquejats ? 0.5 : 1
                  }}
                >
                  <Upload size={18} />
                  Pujar PDF
                </label>
{formData.documentPDF && (
  <div style={{ 
    display: 'flex', 
    alignItems: 'center', 
    gap: '0.5rem'
  }}>
    <span style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: '0.5rem',
      color: 'var(--color-accent-primary)',
      fontWeight: 500,
      fontSize: '0.85rem'
    }}>
      <FileText size={18} />
      {pdfFileName}
    </span>
    <button
      type="button"
      onClick={eliminarPDF}
      className="btn-secondary"
      style={{ 
        padding: '0.4rem',
        minWidth: 'auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderColor: '#dc2626',
        color: '#dc2626'
      }}
      disabled={camposBloquejats}
      title="Eliminar PDF"
    >
      <Trash2 size={16} />
    </button>
  </div>
)}
              </div>
            </div>

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

<div className="modal-footer" style={{ flexShrink: 0 }}>  {editingGasto && onDelete && !camposBloquejats && (
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
  
  <button type="button" className="btn-primary" onClick={() => {
  if (esNou && !haCambiat) {
    // Nuevo gasto sin cambios, cerrar sin guardar
    onClose();
    return;
  }
  
  const gastoCompleto = prepararGasto();
  if (!gastoCompleto) {
    alert('Omple tots els camps obligatoris i puja un recibo PDF');
    return;
  }
  
  onSave(gastoCompleto);
  onClose();
}}>
  Acceptar
</button>
</div>
        </div>
      </div>
  );
}
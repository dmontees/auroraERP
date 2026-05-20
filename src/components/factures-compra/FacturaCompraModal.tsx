import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Upload, FileText, Euro, Lock, Unlock } from 'lucide-react';
import type { FacturaCompra, Pagament } from '../../types/facturaCompra';
import type { Proveidor } from '../../types/proveidor';
import type { Projecte } from '../../types/projecte';
import SearchableSelect from '../common/SearchableSelect';
import { useAutoSave } from '../../hooks/useAutoSave';

interface FacturaCompraModalProps {
  onClose: () => void;
  onSave: (factura: FacturaCompra) => void;
  onDelete?: (codi: string) => void;
  nextCode: string;
  proveidors: Proveidor[];
  projectes: Projecte[];
  editingFactura?: FacturaCompra | null;
}

interface ConcepteLinea {
  id: string;
  descripcio: string;
  base: number;
}

export default function FacturaCompraModal({
  onClose,
  onSave,
  onDelete,
  nextCode,
  proveidors,
  projectes,
  editingFactura
}: FacturaCompraModalProps) {
  const [conceptes, setConceptes] = useState<ConcepteLinea[]>(() => {
    if (editingFactura) {
      // Quitar el último segmento si parece un precio (contiene €)
      let descripcioNeta = editingFactura.concepte;
      
      // Si termina con algo como ": 1200.00€", quitarlo
      const match = descripcioNeta.match(/^(.+?):\s*[\d,\.]+€$/);
      if (match) {
        descripcioNeta = match[1];
      }
      
      return [{ 
        id: '1', 
        descripcio: descripcioNeta, 
        base: editingFactura.baseImposable 
      }];
    }
    
    return [{ id: '1', descripcio: '', base: 0 }];
  });

  const [formData, setFormData] = useState<Omit<FacturaCompra, 'baseImposable' | 'ivaImport' | 'irpfImport' | 'totalGasto' | 'pendentPagament' | 'estat'>>(
    editingFactura || {  // ← CAMBIAR el ? por ||
      codi: nextCode,
      tipus: 'factura-compra',
      proveidor: '',
      numFacturaProveidor: '',
      dataGasto: new Date().toISOString().split('T')[0],
      dataVenciment: '',
      ivaPercent: 21,
      irpfPercent: 0,
      pagaments: [],
      totalPagat: 0,
      projectes: [],
      esDesepsaGeneral: false,
      concepte: '',
      documentPDF: undefined,        // ← AÑADIR
      documentPDFName: undefined,    // ← AÑADIR
      notes: ''
    }
  );

  const esNova = !editingFactura;
const [initialData] = useState(JSON.stringify({ formData, conceptes }));
const [haCambiat, setHaCambiat] = useState(false);

// Detectar cambios
useEffect(() => {
  setHaCambiat(JSON.stringify({ formData, conceptes }) !== initialData);
}, [formData, conceptes, initialData]);

  const [pdfFileName, setPdfFileName] = useState<string>(
    editingFactura?.documentPDFName || ''
  );

  const [nouPagament, setNouPagament] = useState({
    data: new Date().toISOString().split('T')[0],
    import: 0,
    metode: 'transferencia' as const,
    referencia: ''
  });

  const baseTotal = conceptes.reduce((sum, c) => sum + c.base, 0);
  const ivaImport = (baseTotal * formData.ivaPercent) / 100;
  const irpfImport = (baseTotal * formData.irpfPercent) / 100;
  const totalFactura = baseTotal + ivaImport - irpfImport;
  const pendentPagament = totalFactura - formData.totalPagat;

  // Bloqueo parcial: si hay pagos, bloquear campos pero permitir más pagos
  const camposBloquejats = formData.totalPagat > 0;
  // Bloqueo total: solo si está completamente pagada
  const teConceptes = formData.conceptes && formData.conceptes.length > 0 && formData.conceptes.some(c => c.import > 0);
  const completamentPagada = teConceptes && balance <= 0.01;

  useEffect(() => {
    if (formData.proveidor && !editingFactura) {
      const proveidor = proveidors.find(p => p.codi === formData.proveidor);
      if (proveidor) {
        let ivaPercent = 21;
        if (proveidor.tipusIVA === 'Exempt') {
          ivaPercent = 0;
        } else if (proveidor.tipusIVA === 'Reduit') {
          ivaPercent = 10;
        } else if (proveidor.tipusIVA === 'Superreduit') {
          ivaPercent = 4;
        }

        const irpfPercent = proveidor.retencio || 0;
        
        setFormData(prev => ({ ...prev, ivaPercent, irpfPercent }));
      }
    }
  }, [formData.proveidor, proveidors, editingFactura]);

  const afegirConcepte = () => {
    setConceptes([...conceptes, {
      id: Date.now().toString(),
      descripcio: '',
      base: 0
    }]);
  };

  const eliminarConcepte = (id: string) => {
    if (conceptes.length === 1) {
      alert('Ha d\'haver almenys un concepte');
      return;
    }
    setConceptes(conceptes.filter(c => c.id !== id));
  };

  const actualitzarConcepte = (id: string, field: keyof ConcepteLinea, value: any) => {
    setConceptes(conceptes.map(c => 
      c.id === id ? { ...c, [field]: value } : c
    ));
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

    if (!confirm('Estàs segur que vols eliminar aquest pagament? Això desbloquearà la factura.')) {
      return;
    }

    setFormData({
      ...formData,
      pagaments: formData.pagaments.filter(p => p.codi !== codiPagament),
      totalPagat: formData.totalPagat - pagament.import
    });
  };

  // Preparar factura completa con cálculos
const prepararFactura = (): FacturaCompra | null => {
  // Validaciones
  if (!formData.proveidor || !formData.numFacturaProveidor || !formData.dataGasto) {
    return null;
  }

  if (conceptes.some(c => !c.descripcio || c.base === 0)) {
    return null;
  }
  // Determinar estado
  let estat: 'pendent' | 'pagada-parcial' | 'pagada' | 'vencuda' = 'pendent';
  if (pendentPagament <= 0.01) {
    estat = 'pagada';
  } else if (formData.totalPagat > 0) {
    estat = 'pagada-parcial';
  } else if (formData.dataVenciment && new Date(formData.dataVenciment) < new Date()) {
    estat = 'vencuda';
  }

  const conceptesCombinats = conceptes.map(c => `${c.descripcio}: ${c.base.toFixed(2)}€`).join(' | ');

  return {
    ...formData,
    concepte: conceptesCombinats,
    baseImposable: baseTotal,
    ivaImport,
    irpfImport,
    totalGasto: totalFactura,
    pendentPagament: Math.max(0, pendentPagament),
    estat
  };
};

// Autoguardado
const { saveNow } = useAutoSave(
  { formData, conceptes },
  (data) => {
    const facturaCompleta = prepararFactura();
    if (facturaCompleta) {
      onSave(facturaCompleta);
    }
  }
);

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
    if (!editingFactura) return;
    
    if (formData.totalPagat > 0) {
      alert('No es pot eliminar una factura amb pagaments registrats. Primer desbloqueja la factura.');
      return;
    }

    if (!confirm('Estàs segur que vols eliminar aquesta factura? Aquesta acció no es pot desfer.')) {
      return;
    }

    onDelete?.(editingFactura.codi);
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
            📄 {editingFactura ? 'Editar' : 'Nova'} Factura de Compra
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
            if (esNova && !haCambiat) {
              onClose();
              return;
            }
            
            const facturaCompleta = prepararFactura();
            if (!facturaCompleta) {
              alert('Omple tots els camps obligatoris, assegura\'t que tots els conceptes siguin vàlids i puja una factura PDF');
              return;
            }
            saveNow();
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

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label>Proveïdor *</label>
                <SearchableSelect
                  value={formData.proveidor}
                  onChange={(value) => setFormData({ ...formData, proveidor: value })}
                  options={proveidors.map(p => ({
                    value: p.codi,
                    label: p.nomComercial || p.nomFiscal
                  }))}
                  placeholder="Selecciona un proveïdor..."
                  disabled={camposBloquejats}
                />
              </div>

              <div className="form-group">
                <label>Núm. Factura *</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.numFacturaProveidor}
                  onChange={(e) => setFormData({ ...formData, numFacturaProveidor: e.target.value })}
                  placeholder="FAC-2024-001"
                  required
                  disabled={camposBloquejats}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label>Data Factura *</label>
                <input
                  type="date"
                  className="form-input"
                  value={formData.dataGasto}
                  onChange={(e) => setFormData({ ...formData, dataGasto: e.target.value })}
                  required
                  disabled={camposBloquejats}
                />
              </div>

              <div className="form-group">
                <label>Data Venciment</label>
                <input
                  type="date"
                  className="form-input"
                  value={formData.dataVenciment || ''}
                  onChange={(e) => setFormData({ ...formData, dataVenciment: e.target.value })}
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1rem' }}>📋 Conceptes de la Factura</h3>
                {!camposBloquejats && (
                  <button
                    type="button"
                    onClick={afegirConcepte}
                    className="btn-secondary"
                    style={{ fontSize: '0.85rem', padding: '0.4rem 0.75rem' }}
                  >
                    <Plus size={16} /> Afegir Concepte
                  </button>
                )}
              </div>

              {conceptes.map((concepte) => (
                <div 
                  key={concepte.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: camposBloquejats ? '1fr 150px' : '1fr 150px 40px',
                    gap: '0.75rem',
                    marginBottom: '0.75rem',
                    padding: '0.75rem',
                    background: 'var(--color-bg-secondary)',
                    borderRadius: '6px'
                  }}
                >
                  <input
                    type="text"
                    className="form-input"
                    value={concepte.descripcio}
                    onChange={(e) => actualitzarConcepte(concepte.id, 'descripcio', e.target.value)}
                    placeholder="Descripció del concepte..."
                    style={{ margin: 0 }}
                    disabled={camposBloquejats}
                  />
                  
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
  <input
    type="number"
    step="0.01"
    className="form-input"
    value={concepte.base}
    onChange={(e) => actualitzarConcepte(concepte.id, 'base', parseFloat(e.target.value) || 0)}
    placeholder="0.00"
    style={{ margin: 0, paddingRight: '2rem' }}
    disabled={camposBloquejats}
  />
  <span style={{ 
    position: 'absolute', 
    right: '0.75rem', 
    color: 'var(--color-text-tertiary)',
    fontWeight: 600,
    pointerEvents: 'none'
  }}>
    €
  </span>
</div>

                  {!camposBloquejats && (
                    <button
                      type="button"
                      onClick={() => eliminarConcepte(concepte.id)}
                      className="btn-secondary"
                      style={{ 
                        padding: '0.5rem',
                        minWidth: 'auto',
                        aspectRatio: '1',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      disabled={conceptes.length === 1}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}

              <div style={{
                marginTop: '1rem',
                padding: '0.75rem',
                background: 'var(--color-bg-secondary)',
                borderRadius: '6px',
                display: 'flex',
                justifyContent: 'space-between',
                fontWeight: 600
              }}>
                <span>Base Total:</span>
                <span>{baseTotal.toFixed(2)}€</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
              <div className="form-group">
                <label>IVA (%)</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-input"
                  value={formData.ivaPercent}
                  onChange={(e) => setFormData({ ...formData, ivaPercent: parseFloat(e.target.value) || 0 })}
                  disabled={camposBloquejats}
                />
                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-tertiary)', marginTop: '0.25rem' }}>
                  Import IVA: {ivaImport.toFixed(2)}€
                </div>
              </div>

              <div className="form-group">
                <label>IRPF (%) - Opcional</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-input"
                  value={formData.irpfPercent}
                  onChange={(e) => setFormData({ ...formData, irpfPercent: parseFloat(e.target.value) || 0 })}
                  disabled={camposBloquejats}
                />
                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-tertiary)', marginTop: '0.25rem' }}>
                  Import IRPF: {irpfImport.toFixed(2)}€
                </div>
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
              <span style={{ fontWeight: 600, fontSize: '1.1rem' }}>TOTAL FACTURA</span>
              <span style={{ fontWeight: 700, fontSize: '1.5rem' }}>
                {totalFactura.toFixed(2)}€
              </span>
            </div>

            <div className="form-group" style={{ marginTop: '1.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  checked={formData.esDesepsaGeneral}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    esDesepsaGeneral: e.target.checked,
                    projectes: e.target.checked ? [] : formData.projectes
                  })}
                  disabled={camposBloquejats}
                />
                Despesa general (no imputable a cap projecte)
              </label>
            </div>

            {!formData.esDesepsaGeneral && (
              <div className="form-group">
                <label>Projecte Vinculat (opcional)</label>
                <SearchableSelect
                  value={formData.projectes[0] || ''}
                  onChange={(value) => setFormData({ 
                    ...formData, 
                    projectes: value ? [value] : [] 
                  })}
                  options={[
                    { value: '', label: 'Cap projecte' },
                    ...projectes.map(p => ({
                      value: p.codi,
                      label: `${p.codi} - ${p.titol}`
                    }))
                  ]}
                  placeholder="Buscar projecte per codi o nom..."
                  disabled={camposBloquejats}
                />
              </div>
            )}

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
              <label>Factura PDF *</label>
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

      <div className="modal-footer" style={{ flexShrink: 0 }}>
        {editingFactura && onDelete && !camposBloquejats && (
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
          if (esNova && !haCambiat) {
            onClose();
            return;
          }
          
          const facturaCompleta = prepararFactura();
          if (!facturaCompleta) {
            alert('Omple tots els camps obligatoris, assegura\'t que tots els conceptes siguin vàlids i puja una factura PDF');
            return;
          }
          saveNow();
          onClose();
        }}>
          Acceptar
        </button>
      </div>
    </div>
  </div>
);
}
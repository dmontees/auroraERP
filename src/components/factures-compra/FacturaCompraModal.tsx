import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Lock } from 'lucide-react';
import type { FacturaCompra } from '../../types/facturaCompra';
import type { AlbaraCompra } from '../../types/albara';
import type { Proveidor } from '../../types/proveidor';
import type { Projecte } from '../../types/projecte';
import SearchableSelect from '../common/SearchableSelect';
import { useAutoSave } from '../../hooks/useAutoSave';
import PagamentsManager from './shared/PagamentsManager';
import PDFUploader from './shared/PDFUploader';
import { usePagaments } from './hooks/usePagaments';
import { calcularImpostos, determinarEstat } from './utils/facturesCalculations';
import { storage } from '../../utils/storageManager';

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
      let descripcioNeta = editingFactura.concepte;
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

  const [formData, setFormData] = useState<Omit<FacturaCompra, 'baseImposable' | 'ivaImport' | 'irpfImport' | 'totalGasto' | 'pendentPagament' | 'estat' | 'pagaments' | 'totalPagat'>>(
    editingFactura ? {
      codi: editingFactura.codi,
      tipus: editingFactura.tipus,
      proveidor: editingFactura.proveidor,
      numFacturaProveidor: editingFactura.numFacturaProveidor,
      dataGasto: editingFactura.dataGasto,
      dataVenciment: editingFactura.dataVenciment,
      ivaPercent: editingFactura.ivaPercent,
      irpfPercent: editingFactura.irpfPercent,
      projectes: editingFactura.projectes,
      esDesepsaGeneral: editingFactura.esDesepsaGeneral,
      concepte: editingFactura.concepte,
      documentPDF: editingFactura.documentPDF,
      documentPDFName: editingFactura.documentPDFName,
      notes: editingFactura.notes,
      createdAt: editingFactura.createdAt
    } : {
      codi: nextCode,
      tipus: 'factura-compra',
      proveidor: '',
      numFacturaProveidor: '',
      dataGasto: new Date().toISOString().split('T')[0],
      dataVenciment: '',
      ivaPercent: 21,
      irpfPercent: 0,
      projectes: [],
      esDesepsaGeneral: false,
      concepte: '',
      documentPDF: undefined,
      documentPDFName: undefined,
      notes: '',
      createdAt: new Date().toISOString()
    }
  );

  const { pagaments, setPagaments, afegirPagament, eliminarPagament, totalPagat } = usePagaments(
    editingFactura?.pagaments || []
  );

  const [pdfFileName, setPdfFileName] = useState<string>(editingFactura?.documentPDFName || '');

  // Vinculació a projecte — pregunta obligatòria
  const [vinculatProjecte, setVinculatProjecte] = useState<boolean | null>(() => {
    if (!editingFactura) return null; // nova: sense resposta
    if (editingFactura.esDesepsaGeneral) return false;
    return editingFactura.projectes?.length > 0 ? true : false;
  });
  const [albaransLinked, setAlbaransLinked] = useState<AlbaraCompra[]>(() => {
    if (editingFactura?.albaransVinculats?.length) {
      return storage.getAlbaransCompra().filter(a => editingFactura.albaransVinculats!.includes(a.codi));
    }
    return [];
  });
  const [showAlbaransNotif, setShowAlbaransNotif] = useState(false);

  const handleProjecteVinculatChange = (projecteCodi: string) => {
    setFormData(prev => ({ ...prev, projectes: projecteCodi ? [projecteCodi] : [] }));
    if (!projecteCodi || !formData.proveidor) { setAlbaransLinked([]); return; }
    const pendents = storage.getAlbaransCompra().filter(a =>
      a.proveidorCodi === formData.proveidor &&
      a.projecteCodi === projecteCodi &&
      a.estat === 'pendent-factura'
    );
    if (pendents.length > 0) {
      setConceptes(pendents.map(a => ({
        id: a.codi,
        descripcio: a.tipusLinia === 'rrhh'
          ? `${a.serveiNom || a.serveiCodi || ''} (${a.quantitat ?? ''} ${a.unitatNom || a.unitatCodi || ''})`
          : `${a.materialNom || a.materialCodi || ''}`,
        base: a.tipusLinia === 'rrhh' ? (a.cost || 0) : (a.preuProveidor || 0),
      })));
      setAlbaransLinked(pendents);
      setShowAlbaransNotif(true);
    } else {
      setAlbaransLinked([]);
      setShowAlbaransNotif(false);
    }
  };

  const esNova = !editingFactura;
  const [initialData] = useState(JSON.stringify({ formData, conceptes, pagaments }));
  const [haCambiat, setHaCambiat] = useState(false);

  useEffect(() => {
    setHaCambiat(JSON.stringify({ formData, conceptes, pagaments }) !== initialData);
  }, [formData, conceptes, pagaments, initialData]);

  const baseTotal = conceptes.reduce((sum, c) => sum + c.base, 0);
  const { ivaImport, irpfImport, total: totalFactura } = calcularImpostos(
    baseTotal,
    formData.ivaPercent,
    formData.irpfPercent
  );

  const pendentPagament = totalFactura - totalPagat;
  const camposBloquejats = totalPagat > 0;

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

  const prepararFactura = (): FacturaCompra | null => {
    if (!formData.proveidor || !formData.numFacturaProveidor || !formData.dataGasto) {
      return null;
    }

    if (vinculatProjecte === null) {
      return null;
    }

    if (conceptes.some(c => !c.descripcio || c.base === 0)) {
      return null;
    }

    const estat = determinarEstat(totalFactura, totalPagat, formData.dataVenciment);
    const conceptesCombinats = conceptes.map(c => `${c.descripcio}: ${c.base.toFixed(2)}€`).join(' | ');
    const esDesepsaGeneral = vinculatProjecte === false;
    const projectesOut = vinculatProjecte ? formData.projectes : [];

    return {
      ...formData,
      esDesepsaGeneral,
      projectes: projectesOut,
      albaransVinculats: albaransLinked.map(a => a.codi),
      concepte: conceptesCombinats,
      baseImposable: baseTotal,
      ivaImport,
      irpfImport,
      totalGasto: totalFactura,
      pendentPagament: Math.round(Math.max(0, pendentPagament) * 100) / 100,
      estat,
      pagaments,
      totalPagat
    };
  };

  const syncAlbaransAfterSave = (factura: FacturaCompra) => {
    const all = storage.getAlbaransCompra();
    // Primary: use stored albaransVinculats; fallback: find by facturaCodi (handles missing field)
    const codis: string[] = factura.albaransVinculats?.length
      ? factura.albaransVinculats
      : all.filter(a => a.facturaCodi === factura.codi).map(a => a.codi);
    if (!codis.length) return;
    // Treat any sub-cent remainder as fully paid
    const isPagat = Math.round((factura.pendentPagament || 0) * 100) / 100 <= 0 && (factura.totalPagat || 0) > 0;
    storage.setAlbaransCompra(all.map(a =>
      codis.includes(a.codi)
        ? { ...a, facturaCodi: factura.codi, estat: isPagat ? 'pagat' : 'factura-vinculada' }
        : a
    ));
  };

  const { saveNow } = useAutoSave(
    { formData, conceptes, pagaments },
    () => {
      const facturaCompleta = prepararFactura();
      if (facturaCompleta) {
        onSave(facturaCompleta);
        syncAlbaransAfterSave(facturaCompleta);
      }
    }
  );

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
    if (!editingFactura) return;
    
    if (totalPagat > 0) {
      alert('No es pot eliminar una factura amb pagaments registrats. Primer desbloqueja la factura.');
      return;
    }

    if (!confirm('Estàs segur que vols eliminar aquesta factura? Aquesta acció no es pot desfer.')) {
      return;
    }

    onDelete?.(editingFactura.codi);
    onClose();
  };

  const handleClose = () => {
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
            {pendentPagament <= 0.01 && totalPagat > 0 && (
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

          {/* Vinculació a projecte — pregunta obligatòria, BEFORE conceptes */}
          <div style={{
            marginTop: '1.5rem',
            padding: '1rem 1.25rem',
            background: 'var(--color-bg-tertiary)',
            borderRadius: '8px',
            border: `1px solid ${vinculatProjecte === null && !camposBloquejats ? '#fbbf24' : 'var(--color-border)'}`
          }}>
            <div style={{ fontWeight: 600, marginBottom: '0.75rem', fontSize: '0.9rem' }}>
              Aquesta factura està vinculada a un projecte?
              {vinculatProjecte === null && !camposBloquejats && (
                <span style={{ marginLeft: '0.5rem', color: '#f59e0b', fontSize: '0.8rem' }}>— Requerida</span>
              )}
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              {(['Sí', 'No'] as const).map(opt => {
                const val = opt === 'Sí';
                const selected = vinculatProjecte === val;
                return (
                  <button
                    key={opt}
                    type="button"
                    disabled={camposBloquejats}
                    onClick={() => {
                      setVinculatProjecte(val);
                      if (!val) { setFormData(prev => ({ ...prev, projectes: [], esDesepsaGeneral: true })); setAlbaransLinked([]); setShowAlbaransNotif(false); }
                      else { setFormData(prev => ({ ...prev, esDesepsaGeneral: false })); }
                    }}
                    style={{
                      padding: '0.4rem 1.25rem', borderRadius: 6, fontWeight: 600, fontSize: '0.9rem', cursor: camposBloquejats ? 'not-allowed' : 'pointer',
                      background: selected ? (val ? '#dbeafe' : '#fef3c7') : 'var(--color-bg-secondary)',
                      border: `2px solid ${selected ? (val ? '#3b82f6' : '#f59e0b') : 'var(--color-border)'}`,
                      color: selected ? (val ? '#1e40af' : '#92400e') : 'var(--color-text-secondary)',
                    }}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>

            {vinculatProjecte === true && (
              <div style={{ marginTop: '0.75rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>
                  Projecte vinculat *
                </label>
                <SearchableSelect
                  value={formData.projectes[0] || ''}
                  onChange={handleProjecteVinculatChange}
                  options={[
                    { value: '', label: 'Selecciona un projecte...' },
                    ...projectes.map(p => ({ value: p.codi, label: `${p.codi} - ${p.titol}` }))
                  ]}
                  placeholder="Buscar projecte per codi o nom..."
                  disabled={camposBloquejats}
                />
                {showAlbaransNotif && albaransLinked.length > 0 && (
                  <div style={{ marginTop: '0.75rem', padding: '0.75rem 1rem', background: '#eff6ff', border: '1px solid #93c5fd', borderRadius: 6, fontSize: '0.85rem' }}>
                    <strong style={{ color: '#1e40af' }}>Albarans vinculats automàticament ({albaransLinked.length}):</strong>
                    <ul style={{ margin: '0.4rem 0 0 1rem', padding: 0, color: '#1e3a8a' }}>
                      {albaransLinked.map(a => (
                        <li key={a.codi} style={{ marginBottom: '0.2rem' }}>
                          {a.codi} — {a.tipusLinia === 'rrhh' ? `${a.serveiNom || a.serveiCodi} (${a.quantitat} ${a.unitatNom || a.unitatCodi})` : `${a.materialNom || a.materialCodi}`}
                          {' '}<strong>{(a.tipusLinia === 'rrhh' ? (a.cost || 0) : (a.preuProveidor || 0)).toFixed(2)} €</strong>
                        </li>
                      ))}
                    </ul>
                    <p style={{ margin: '0.5rem 0 0', color: '#64748b', fontStyle: 'italic', fontSize: '0.8rem' }}>
                      Els conceptes de la factura s'han pre-emplenat amb els imports dels albarans (importos estimats). Pots modificar-los.
                    </p>
                  </div>
                )}
                {vinculatProjecte === true && formData.projectes[0] && albaransLinked.length === 0 && !camposBloquejats && (
                  <p style={{ marginTop: '0.4rem', fontSize: '0.8rem', color: 'var(--color-text-tertiary)', fontStyle: 'italic' }}>
                    No s'han trobat albarans pendents d'aquest proveïdor per a aquest projecte.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Everything below is blocked until project question is answered */}
          <div style={{ opacity: vinculatProjecte === null && !camposBloquejats ? 0.35 : 1, pointerEvents: vinculatProjecte === null && !camposBloquejats ? 'none' : 'auto', transition: 'opacity 0.2s' }}>

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

          <PagamentsManager
            pagaments={pagaments}
            pendentPagament={pendentPagament}
            onAfegirPagament={handleAfegirPagament}
            onEliminarPagament={handleEliminarPagament}
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

          </div>{/* end blocking wrapper */}
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
          
          <button type="button" className="btn-primary" onClick={handleClose}>
            Acceptar
          </button>
        </div>
      </div>
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Lock } from 'lucide-react';
import { jsPDF } from 'jspdf';
import type { FacturaCompra, TipusDocumentCompra } from '../../types/facturaCompra';
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
import { appendCurrentDocumentRef, saveFiscalDocumentVersion } from '../../utils/fiscalDocumentStorage';
import { mirrorPurchaseInvoice } from '../../utils/documentMirrors';

interface FacturaCompraModalProps {
  onClose: () => void;
  onSave: (factura: FacturaCompra) => void;
  onDelete?: (codi: string) => void;
  nextCode: string;
  proveidors: Proveidor[];
  projectes: Projecte[];
  initialTipusDocument?: TipusDocumentCompra;
  initialAlbaraCodis?: string[];
  initialDraft?: {
    projecteCodi: string;
    proveidor?: string;
    concepte: string;
    base: number;
  } | null;
  editingFactura?: FacturaCompra | null;
}

interface ConcepteLinea {
  id: string;
  descripcio: string;
  base: number;
}

const TIPUS_DOCUMENT_LABELS: Record<TipusDocumentCompra, string> = {
  factura: 'Factura',
  factura_simplificada: 'Factura simplificada',
};

const getTipusDocument = (factura?: Partial<FacturaCompra> | null): TipusDocumentCompra =>
  (factura?.tipusDocument as string) === 'ticket'
    ? 'factura_simplificada'
    : factura?.tipusDocument ?? 'factura';

const albaraImport = (a: AlbaraCompra) =>
  a.tipusLinia === 'rrhh' ? (a.cost || 0) : (a.preuProveidor || 0);

const albaraDescripcio = (a: AlbaraCompra) =>
  a.tipusLinia === 'rrhh'
    ? `${a.serveiNom || a.serveiCodi || ''} (${a.quantitat ?? ''} ${a.unitatNom || a.unitatCodi || ''})`
    : `${a.materialNom || a.materialCodi || ''}`;

const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => resolve(event.target?.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });

async function convertImageToPdfDataUrl(file: File): Promise<string> {
  const imageData = await readFileAsDataUrl(file);
  const image = await loadImage(imageData);
  const orientation = image.width >= image.height ? 'landscape' : 'portrait';
  const pdf = new jsPDF({ orientation, unit: 'mm', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 10;
  const maxWidth = pageWidth - margin * 2;
  const maxHeight = pageHeight - margin * 2;
  const ratio = Math.min(maxWidth / image.width, maxHeight / image.height);
  const width = image.width * ratio;
  const height = image.height * ratio;
  const x = (pageWidth - width) / 2;
  const y = (pageHeight - height) / 2;
  pdf.addImage(imageData, file.type === 'image/png' ? 'PNG' : 'JPEG', x, y, width, height);
  return pdf.output('datauristring');
}

export default function FacturaCompraModal({
  onClose,
  onSave,
  onDelete,
  nextCode,
  proveidors,
  projectes,
  initialTipusDocument = 'factura',
  initialAlbaraCodis = [],
  initialDraft = null,
  editingFactura
}: FacturaCompraModalProps) {
  const initialAlbarans = !editingFactura && initialAlbaraCodis.length > 0
    ? storage.getAlbaransCompra().filter(a => initialAlbaraCodis.includes(a.codi))
    : [];
  
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

    if (initialAlbarans.length > 0) {
      return initialAlbarans.map(a => ({
        id: a.codi,
        descripcio: albaraDescripcio(a),
        base: albaraImport(a),
      }));
    }

    if (initialDraft) {
      return [{
        id: '1',
        descripcio: initialDraft.concepte,
        base: initialDraft.base,
      }];
    }
    
    return [{ id: '1', descripcio: '', base: 0 }];
  });

  const [formData, setFormData] = useState<Omit<FacturaCompra, 'baseImposable' | 'ivaImport' | 'irpfImport' | 'totalGasto' | 'pendentPagament' | 'estat' | 'pagaments' | 'totalPagat'>>(
    editingFactura ? {
      codi: editingFactura.codi,
      tipus: editingFactura.tipus,
      tipusDocument: getTipusDocument(editingFactura),
      proveidor: editingFactura.proveidor,
      emissorNom: editingFactura.emissorNom || '',
      numFacturaProveidor: editingFactura.numFacturaProveidor,
      dataGasto: editingFactura.dataGasto,
      dataVenciment: editingFactura.dataVenciment,
      ivaPercent: editingFactura.ivaPercent,
      irpfPercent: editingFactura.irpfPercent,
      projectes: editingFactura.projectes,
      esDepesaGeneral: editingFactura.esDepesaGeneral,
      concepte: editingFactura.concepte,
      documentPDF: editingFactura.documentPDF,
      documentPDFName: editingFactura.documentPDFName,
      documentsGenerats: editingFactura.documentsGenerats,
      ivaDeduible: editingFactura.ivaDeduible ?? getTipusDocument(editingFactura) === 'factura',
      notes: editingFactura.notes,
      createdAt: editingFactura.createdAt
    } : {
      codi: nextCode,
      tipus: 'factura-compra',
      tipusDocument: initialTipusDocument,
      proveidor: initialDraft?.proveidor || '',
      emissorNom: '',
      numFacturaProveidor: '',
      dataGasto: new Date().toISOString().split('T')[0],
      dataVenciment: '',
      ivaPercent: 21,
      irpfPercent: 0,
      projectes: initialDraft?.projecteCodi
        ? [initialDraft.projecteCodi]
        : initialAlbarans[0]?.projecteCodi
          ? [initialAlbarans[0].projecteCodi]
          : [],
      esDepesaGeneral: false,
      concepte: '',
      documentPDF: undefined,
      documentPDFName: undefined,
      documentsGenerats: [],
      ivaDeduible: initialTipusDocument === 'factura',
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
    if (!editingFactura) return initialAlbarans.length > 0 || initialDraft ? true : null; // nova: sense resposta
    if (editingFactura.esDepesaGeneral) return false;
    return editingFactura.projectes?.length > 0 ? true : false;
  });
  const [albaransLinked, setAlbaransLinked] = useState<AlbaraCompra[]>(() => {
    if (editingFactura?.albaransVinculats?.length) {
      return storage.getAlbaransCompra().filter(a => editingFactura.albaransVinculats!.includes(a.codi));
    }
    return initialAlbarans;
  });
  const [showAlbaransNotif, setShowAlbaransNotif] = useState(initialAlbarans.length > 0);

  const handleProjecteVinculatChange = (projecteCodi: string) => {
    setFormData(prev => ({ ...prev, projectes: projecteCodi ? [projecteCodi] : [] }));
    if (!projecteCodi || !formData.proveidor) {
      setAlbaransLinked([]);
      setShowAlbaransNotif(false);
      return;
    }
    const pendents = storage.getAlbaransCompra().filter(a =>
      a.proveidorCodi === formData.proveidor &&
      a.projecteCodi === projecteCodi &&
      a.estat === 'pendent-factura'
    );
    if (pendents.length > 0) {
      setConceptes(pendents.map(a => ({
        id: a.codi,
        descripcio: albaraDescripcio(a),
        base: albaraImport(a),
      })));
      setAlbaransLinked(pendents);
      setShowAlbaransNotif(true);
    } else {
      setAlbaransLinked([]);
      setShowAlbaransNotif(false);
    }
  };

  const tipusDocument = getTipusDocument(formData);
  const esDocumentLleuger = tipusDocument === 'factura_simplificada';
  const proveidorObligatori = tipusDocument === 'factura';
  const projecteSeleccionat = formData.projectes[0] || '';
  const albaransPendentsProjecte = projecteSeleccionat
    ? storage.getAlbaransCompra().filter(a =>
      a.projecteCodi === projecteSeleccionat &&
      a.estat === 'pendent-factura' &&
      (!formData.proveidor || a.proveidorCodi === formData.proveidor)
    )
    : [];

  const syncConceptesAmbAlbarans = (albarans: AlbaraCompra[]) => {
    if (albarans.length === 0) {
      setConceptes([{ id: '1', descripcio: '', base: 0 }]);
      return;
    }
    setConceptes(albarans.map(a => ({
      id: a.codi,
      descripcio: albaraDescripcio(a),
      base: albaraImport(a),
    })));
  };

  const toggleAlbaraManual = (albara: AlbaraCompra) => {
    const exists = albaransLinked.some(a => a.codi === albara.codi);
    const next = exists
      ? albaransLinked.filter(a => a.codi !== albara.codi)
      : [...albaransLinked, albara];
    setAlbaransLinked(next);
    syncConceptesAmbAlbarans(next);
    setShowAlbaransNotif(next.length > 0);
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

  const handleProveidorChange = (value: string) => {
    setFormData({ ...formData, proveidor: value });
    setAlbaransLinked([]);
    setShowAlbaransNotif(false);
  };

  const getValidationMessage = (): string | null => {
    if (!formData.dataGasto) {
      return 'Informa la data del document.';
    }

    if (proveidorObligatori && (!formData.proveidor || !formData.numFacturaProveidor)) {
      return 'Per a una factura completa cal seleccionar un proveidor i informar el numero de factura.';
    }

    if (esDocumentLleuger && !formData.proveidor && !formData.emissorNom?.trim()) {
      return 'Per a una factura simplificada sense proveidor cal informar el camp Emissor.';
    }

    if (esDocumentLleuger && !formData.documentPDF) {
      return 'Per a una factura simplificada cal adjuntar el PDF del document.';
    }

    if (vinculatProjecte === null) {
      return 'Indica si aquesta despesa esta vinculada a un projecte.';
    }

    if (vinculatProjecte === true && formData.projectes.length === 0) {
      return 'Selecciona el projecte vinculat a aquesta despesa.';
    }

    if (conceptes.some(c => !c.descripcio || c.base === 0)) {
      return 'Revisa els conceptes: tots han de tenir descripcio i import.';
    }

    return null;
  };

  const prepararFactura = (): FacturaCompra | null => {
    if (getValidationMessage()) {
      return null;
    }

    const estat = determinarEstat(totalFactura, totalPagat, formData.dataVenciment);
    const conceptesCombinats = conceptes.map(c => `${c.descripcio}: ${c.base.toFixed(2)}€`).join(' | ');
    const esDepesaGeneral = vinculatProjecte === false;
    const projectesOut = vinculatProjecte ? formData.projectes : [];

    return {
      ...formData,
      esDepesaGeneral,
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
    const codis = factura.albaransVinculats || [];
    // Treat any sub-cent remainder as fully paid
    const isPagat = Math.round((factura.pendentPagament || 0) * 100) / 100 <= 0 && (factura.totalPagat || 0) > 0;
    storage.setAlbaransCompra(all.map(a =>
      codis.includes(a.codi)
        ? { ...a, facturaCodi: factura.codi, estat: isPagat ? 'pagat' : 'factura-vinculada' }
        : a.facturaCodi === factura.codi
          ? { ...a, facturaCodi: undefined, estat: 'pendent-factura' }
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

  const handlePDFUpload = async (file: File) => {
    try {
      const isImage = file.type === 'image/jpeg' || file.type === 'image/png';
      const documentPDF = isImage
        ? await convertImageToPdfDataUrl(file)
        : await readFileAsDataUrl(file);
      const fileName = isImage ? file.name.replace(/\.(jpe?g|png)$/i, '.pdf') : file.name;
      const displayName = `${formData.codi}_${TIPUS_DOCUMENT_LABELS[getTipusDocument(formData)]}_${fileName.replace(/\.[^.]+$/, '')}`;
      const fileRef = await saveFiscalDocumentVersion({
        kind: 'factura-compra',
        ownerCodi: formData.codi,
        dataGasto: formData.dataGasto,
        displayName,
        originalName: fileName,
        dataBase64: documentPDF,
        existingRefs: formData.documentsGenerats,
      });
      const rootPath = storage.getParametres().gestorDocumental?.rootPath;
      if (fileRef && rootPath) {
        await mirrorPurchaseInvoice(rootPath, formData, fileRef);
      }
      setPdfFileName(fileName);
      setFormData({
        ...formData,
        documentPDF,
        documentPDFName: fileName,
        documentsGenerats: fileRef
          ? appendCurrentDocumentRef(formData.documentsGenerats, fileRef)
          : formData.documentsGenerats,
      });
    } catch (error) {
      console.error('Error processant el document:', error);
      alert('No s\'ha pogut processar el document. Prova amb un altre PDF, JPG o PNG.');
    }
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
    
    const validationMessage = getValidationMessage();
    if (validationMessage) {
      alert(validationMessage);
      return;
    }

    const facturaCompleta = prepararFactura();
    if (!facturaCompleta) {
      alert('No s\'ha pogut preparar el document. Revisa les dades i torna-ho a provar.');
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
            📄 {editingFactura ? 'Editar' : 'Nova'} {TIPUS_DOCUMENT_LABELS[tipusDocument]} de Compra
            {pendentPagament <= 0.01 && totalPagat > 0 && (
              <span style={{
                marginLeft: '1rem',
                fontSize: '0.9rem',
                background: 'var(--color-success)',
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
            <label>Tipus document *</label>
            <select
              className="form-input"
              value={tipusDocument}
              onChange={(e) => {
                const nextTipus = e.target.value as TipusDocumentCompra;
                setFormData({
                  ...formData,
                  tipusDocument: nextTipus,
                  emissorNom: nextTipus === 'factura' ? '' : formData.emissorNom,
                  ivaDeduible: nextTipus === 'factura',
                });
                setAlbaransLinked([]);
                setShowAlbaransNotif(false);
              }}
              disabled={camposBloquejats}
            >
              <option value="factura">Factura</option>
              <option value="factura_simplificada">Factura simplificada</option>
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label>Proveïdor {proveidorObligatori ? '*' : '(opcional)'}</label>
              <SearchableSelect
                value={formData.proveidor}
                onChange={handleProveidorChange}
                options={proveidors.map(p => ({
                  value: p.codi,
                  label: p.nomComercial || p.nomFiscal
                }))}
                placeholder={proveidorObligatori ? 'Selecciona un proveïdor...' : 'Selecciona un proveïdor o informa emissor...'}
                disabled={camposBloquejats}
              />
            </div>

            <div className="form-group">
              <label>Núm. Document {proveidorObligatori ? '*' : '(opcional)'}</label>
              <input
                type="text"
                className="form-input"
                value={formData.numFacturaProveidor}
                onChange={(e) => setFormData({ ...formData, numFacturaProveidor: e.target.value })}
                placeholder={tipusDocument === 'factura_simplificada' ? 'Simplificada / SN' : 'FAC-2024-001'}
                required={proveidorObligatori}
                disabled={camposBloquejats}
              />
            </div>
          </div>

          {esDocumentLleuger && !formData.proveidor && (
            <div className="form-group">
              <label>Emissor *</label>
              <input
                type="text"
                className="form-input"
                value={formData.emissorNom || ''}
                onChange={(e) => setFormData({ ...formData, emissorNom: e.target.value })}
                placeholder="Restaurant, parking, taxi..."
                required
                disabled={camposBloquejats}
              />
            </div>
          )}

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
            border: `1px solid ${vinculatProjecte === null && !camposBloquejats ? 'var(--color-warning-light)' : 'var(--color-border)'}`
          }}>
            <div style={{ fontWeight: 600, marginBottom: '0.75rem', fontSize: '0.9rem' }}>
              Aquesta factura està vinculada a un projecte?
              {vinculatProjecte === null && !camposBloquejats && (
                <span style={{ marginLeft: '0.5rem', color: 'var(--color-warning)', fontSize: '0.8rem' }}>— Requerida</span>
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
                      if (!val) { setFormData(prev => ({ ...prev, projectes: [], esDepesaGeneral: true })); setAlbaransLinked([]); setShowAlbaransNotif(false); }
                      else { setFormData(prev => ({ ...prev, esDepesaGeneral: false })); }
                    }}
                    style={{
                      padding: '0.4rem 1.25rem', borderRadius: 6, fontWeight: 600, fontSize: '0.9rem', cursor: camposBloquejats ? 'not-allowed' : 'pointer',
                      background: selected ? (val ? 'var(--color-info-bg)' : 'var(--color-warning-bg)') : 'var(--color-bg-secondary)',
                      border: `2px solid ${selected ? (val ? 'var(--color-info)' : 'var(--color-warning)') : 'var(--color-border)'}`,
                      color: selected ? (val ? 'var(--color-info-dark)' : 'var(--color-warning-dark)') : 'var(--color-text-secondary)',
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
                  <div style={{ marginTop: '0.75rem', padding: '0.75rem 1rem', background: 'var(--color-info-bg-light)', border: '1px solid var(--color-info-border-strong)', borderRadius: 6, fontSize: '0.85rem' }}>
                    <strong style={{ color: 'var(--color-info-dark)' }}>Albarans vinculats automàticament ({albaransLinked.length}):</strong>
                    <ul style={{ margin: '0.4rem 0 0 1rem', padding: 0, color: 'var(--color-info-darker)' }}>
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
                {vinculatProjecte === true && formData.projectes[0] && albaransLinked.length === 0 && !camposBloquejats && (!esDocumentLleuger || albaransPendentsProjecte.length === 0) && (
                  <p style={{ marginTop: '0.4rem', fontSize: '0.8rem', color: 'var(--color-text-tertiary)', fontStyle: 'italic' }}>
                    No s'han trobat albarans pendents d'aquest proveïdor per a aquest projecte.
                  </p>
                )}
                {vinculatProjecte === true && formData.projectes[0] && esDocumentLleuger && albaransPendentsProjecte.length > 0 && !camposBloquejats && (
                  <div style={{ marginTop: '0.75rem', padding: '0.75rem 1rem', background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: 6 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                      Albarans pendents del projecte
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      {albaransPendentsProjecte.map(a => {
                        const selected = albaransLinked.some(linked => linked.codi === a.codi);
                        const prov = proveidors.find(p => p.codi === a.proveidorCodi);
                        return (
                          <label key={a.codi} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: '0.5rem', alignItems: 'center', fontSize: '0.82rem', cursor: 'pointer' }}>
                            <input type="checkbox" checked={selected} onChange={() => toggleAlbaraManual(a)} />
                            <span>
                              <strong>{a.codi}</strong>
                              {' '}-- {prov?.nomComercial || prov?.nomFiscal || a.proveidorCodi}
                              {' '}-- {albaraDescripcio(a)}
                            </span>
                            <strong>{albaraImport(a).toFixed(2)} EUR</strong>
                          </label>
                        );
                      })}
                    </div>
                  </div>
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
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                <input
                  type="checkbox"
                  checked={formData.ivaDeduible ?? tipusDocument === 'factura'}
                  onChange={(e) => setFormData({ ...formData, ivaDeduible: e.target.checked })}
                  disabled={camposBloquejats}
                />
                IVA deduible
              </label>
              {esDocumentLleuger && (
                <div style={{ fontSize: '0.78rem', color: 'var(--color-text-tertiary)', marginTop: '0.25rem', lineHeight: 1.4 }}>
                  Per defecte no deduible en factures simplificades.
                </div>
              )}
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
            required={esDocumentLleuger}
            allowImages={esDocumentLleuger}
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
                borderColor: 'var(--color-error-dark)',
                color: 'var(--color-error-dark)'
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

import React, { useState, useEffect } from 'react';
import { X, FileText, Trash2 } from 'lucide-react';
import type { FacturaVenta, AccioFactura, EstatFacturaVenta } from '../../types/facturaVenta';
import { ESTAT_FACTURA_COLORS } from '../../types/facturaVenta';
import type { Client } from '../../types/client';
import type { Projecte } from '../../types/projecte';
import type { Plantilla } from '../../types/parametres';
import type { Tasca } from '../../types/pressupost';
import TascaModal from '../pressupostos/TascaModal';
import MaterialModal from './MaterialModal';
import { useAutoSave } from '../../hooks/useAutoSave';
import { generarFacturaVentaPDF } from '../../utils/generarFacturaVentaPDF';
import { useCobros } from './hooks/useCobros';
import { useFacturaValidation } from './hooks/useFacturaValidation';
import { calcularImpostos, determinarEstat, calcularVenciment } from './utils/facturaCalculations';
import DadesTab from './tabs/DadesTab';
import TasquesTab from './tabs/TasquesTab';
import NotesTab from './tabs/NotesTab';
import PagamentTab from './tabs/PagamentTab';
import HistorialTab from './tabs/HistorialTab';
import { storage } from '../../utils/storageManager';

interface Props {
  onClose: () => void;
  onSave: (factura: FacturaVenta) => void;
  onDelete?: (codi: string) => void;
  nextCode: string;
  clients: Client[];
  projectes: Projecte[];
  plantilles: Plantilla[];
  editingFactura?: FacturaVenta | null;
  allFactures?: FacturaVenta[];
}

export default function FacturaVendaModal({
  onClose,
  onSave,
  onDelete,
  nextCode,
  clients,
  projectes,
  plantilles,
  editingFactura,
  allFactures = []
}: Props) {

  const [parametres, setParametres] = useState<any>({ serveis: [], unitats: [] });

  useEffect(() => {
    setParametres(storage.getParametres());
  }, []);

  const [activeTab, setActiveTab] = useState<'dades' | 'tasques' | 'notes' | 'pagament' | 'historial'>('dades');
  const [showTascaModal, setShowTascaModal] = useState(false);
  const [editingTasca, setEditingTasca] = useState<{ categoriaIndex: number; tascaIndex: number } | null>(null);
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<{ categoriaIndex: number; materialIndex: number } | null>(null);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [copyDialogProjecte, setCopyDialogProjecte] = useState<import('../../types/projecte').Projecte | null>(null);

  const [formData, setFormData] = useState<FacturaVenta>(
    editingFactura
    ? JSON.parse(JSON.stringify(editingFactura))
    : {
      codi: nextCode,
      tipus: 'normal',
      estat: 'borrador',
      client: '',
      projecte: undefined,
      dataFactura: new Date().toISOString().split('T')[0],
      dataVenciment: calcularVenciment(new Date().toISOString().split('T')[0]),
      dataEnviada: undefined,
      ivaPercent: 21,
      irpfPercent: 0,
      tasques: [],
      baseImposable: 0,
      ivaImport: 0,
      irpfImport: 0,
      totalFactura: 0,
      pagaments: [],
      totalPagat: 0,
      pendentCobrar: 0,
      observacions: '',
      plantillesSeleccionades: plantilles
        .filter(p => p.tipusPlantilla === 'TPL-00002' && p.perDefecte)
        .map(p => p.codi),
      plantillesText: plantilles
        .filter(p => p.tipusPlantilla === 'TPL-00002' && p.perDefecte)
        .map(p => p.text)
        .join('\n\n'),
      accions: [
        {
          data: new Date().toISOString(),
          descripcio: 'Factura creada',
          automatic: true
        }
      ]
    }
  );

  const clientBlocked = !formData.client;
  const client = clients.find(c => c.codi === formData.client);
  
  // Usar hook de validación
  const { validate, validatePagament } = useFacturaValidation(formData, client, allFactures);
  const validationResult = validate();

  const { saveNow } = useAutoSave(
    formData, 
    (data) => {
      const facturaCompleta = prepararFactura();
      if (facturaCompleta) {
        onSave(facturaCompleta);
      }
    }
  );

  // Auto-rellenar IVA y IRPF según cliente
  useEffect(() => {
    if (formData.client && !editingFactura) {
      const client = clients.find(c => c.codi === formData.client);
      if (client) {
        let ivaPercent = 21;
        if (client.tipusIVA === 'Exempt') ivaPercent = 0;
        else if (client.tipusIVA === 'Reduit') ivaPercent = 10;
        else if (client.tipusIVA === 'Superreduit') ivaPercent = 4;

        setFormData(prev => ({
          ...prev,
          ivaPercent,
          irpfPercent: client.retencio || 0
        }));
      }
    }
  }, [formData.client, clients, editingFactura]);

  // Auto-actualizar fecha vencimiento
  useEffect(() => {
    if (!editingFactura) {
      setFormData(prev => ({
        ...prev,
        dataVenciment: calcularVenciment(prev.dataFactura)
      }));
    }
  }, [formData.dataFactura, editingFactura]);

  // Calcular totales
  const calcularTotals = () => {
    let base = 0;
    formData.tasques.forEach(cat => {
      cat.tasques.forEach(tasca => {
        base += tasca.quantitat * tasca.preu;
      });
    });

    const { ivaImport, irpfImport, total } = calcularImpostos(base, formData.ivaPercent, formData.irpfPercent);
    const pendent = total - formData.totalPagat;

    return {
      baseImposable: base,
      ivaImport,
      irpfImport,
      totalFactura: total,
      pendentCobrar: Math.max(0, pendent)
    };
  };

  const totals = calcularTotals();
  const tePagaments = formData.pagaments.length > 0;
  const estaPagada = totals.pendentCobrar <= 0.01;
  const esEliminable = (formData.estat === 'borrador' || formData.estat === 'enviada') && !tePagaments;

  // Toggle plantilla
  const togglePlantilla = (codi: string) => {
    const plantilla = plantilles.find(p => p.codi === codi);
    const esPerDefecte = plantilla?.perDefecte || false;
    const estaSeleccionada = formData.plantillesSeleccionades.includes(codi);
  
    if (esPerDefecte && estaSeleccionada) return;
  
    let noves: string[];
    if (estaSeleccionada) {
      noves = formData.plantillesSeleccionades.filter(c => c !== codi);
    } else {
      noves = [...formData.plantillesSeleccionades, codi];
    }
  
    const textosSeleccionados = noves
      .map(codiPlantilla => {
        const p = plantilles.find(pl => pl.codi === codiPlantilla);
        return p?.text || '';
      })
      .filter(Boolean);
  
    setFormData(prev => ({
      ...prev,
      plantillesSeleccionades: noves,
      plantillesText: textosSeleccionados.join('\n\n')
    }));
  };

  // Gestión tasques
  const afegirTasca = (tasca: any) => {
    const categoria = tasca.categoria;

    const serveiData = parametres?.serveis?.find((s: any) => s.codi === tasca.servei);
    const unitatData = parametres?.unitats?.find((u: any) => u.codi === tasca.unitat);

    const tascaConvertida = {
      servei: serveiData?.nom || tasca.servei,
      descripcio: tasca.descripcio,
      quantitat: tasca.quantitat,
      unitat: unitatData?.nom || tasca.unitat,
      preu: tasca.tarifa,
      importe: tasca.importe
    };

    const nouTasques = [...formData.tasques];
    const catIndex = nouTasques.findIndex(c => c.categoria === categoria);

    if (catIndex >= 0) {
      if (editingTasca && editingTasca.categoriaIndex === catIndex) {
        nouTasques[catIndex].tasques[editingTasca.tascaIndex] = tascaConvertida;
      } else {
        nouTasques[catIndex].tasques.push(tascaConvertida);
      }
    } else {
      nouTasques.push({ categoria, tasques: [tascaConvertida] });
    }

    setFormData(prev => ({ ...prev, tasques: nouTasques }));
    setShowTascaModal(false);
    setEditingTasca(null);
  };

  const afegirMaterial = (material: Tasca) => {
    const nouTasques = [...formData.tasques];
    const catIndex = nouTasques.findIndex(c => c.categoria === 'MATERIALS');
    
    if (catIndex >= 0) {
      if (editingMaterial && editingMaterial.categoriaIndex === catIndex) {
        nouTasques[catIndex].tasques[editingMaterial.materialIndex] = material;
      } else {
        nouTasques[catIndex].tasques.push(material);
      }
    } else {
      nouTasques.push({ categoria: 'MATERIALS', tasques: [material] });
    }

    setFormData(prev => ({ ...prev, tasques: nouTasques }));
    setShowMaterialModal(false);
    setEditingMaterial(null);
  };

  const eliminarTasca = (catIndex: number, tascaIndex: number) => {
    const nouTasques = [...formData.tasques];
    nouTasques[catIndex].tasques.splice(tascaIndex, 1);
    
    if (nouTasques[catIndex].tasques.length === 0) {
      nouTasques.splice(catIndex, 1);
    }

    setFormData(prev => ({ ...prev, tasques: nouTasques }));
  };

  const eliminarCategoria = (catIndex: number) => {
    if (!confirm('Eliminar aquesta categoria i totes les seves tasques?')) return;
    
    const nouTasques = [...formData.tasques];
    nouTasques.splice(catIndex, 1);
    setFormData(prev => ({ ...prev, tasques: nouTasques }));
  };

  const moureCategoriaAmunt = (index: number) => {
    if (index === 0) return;
    const nouTasques = [...formData.tasques];
    [nouTasques[index - 1], nouTasques[index]] = [nouTasques[index], nouTasques[index - 1]];
    setFormData(prev => ({ ...prev, tasques: nouTasques }));
  };

  const moureCategoriaAvall = (index: number) => {
    if (index === formData.tasques.length - 1) return;
    const nouTasques = [...formData.tasques];
    [nouTasques[index], nouTasques[index + 1]] = [nouTasques[index + 1], nouTasques[index]];
    setFormData(prev => ({ ...prev, tasques: nouTasques }));
  };

  const moureTascaAmunt = (catIndex: number, tascaIndex: number) => {
    if (tascaIndex === 0) return;
    const nouTasques = [...formData.tasques];
    const tasques = nouTasques[catIndex].tasques;
    [tasques[tascaIndex - 1], tasques[tascaIndex]] = [tasques[tascaIndex], tasques[tascaIndex - 1]];
    setFormData(prev => ({ ...prev, tasques: nouTasques }));
  };

  const moureTascaAvall = (catIndex: number, tascaIndex: number) => {
    const nouTasques = [...formData.tasques];
    const tasques = nouTasques[catIndex].tasques;
    if (tascaIndex === tasques.length - 1) return;
    [tasques[tascaIndex], tasques[tascaIndex + 1]] = [tasques[tascaIndex + 1], tasques[tascaIndex]];
    setFormData(prev => ({ ...prev, tasques: nouTasques }));
  };

  const updateTasca = (catIndex: number, tascaIndex: number, field: string, value: any) => {
    const nouTasques = [...formData.tasques];
    (nouTasques[catIndex].tasques[tascaIndex] as any)[field] = value;
    setFormData(prev => ({ ...prev, tasques: nouTasques }));
  };

  const buscarTarifaTasca = (codiServei: string, codiUnitat: string): number => {
    const tarifaClient = client?.tarifes?.find(t => t.servei === codiServei && t.unitat === codiUnitat);
    if (tarifaClient) return tarifaClient.preu;
    
    const tarifaGeneral = parametres?.tarifes?.find((t: any) => t.servei === codiServei && t.unitat === codiUnitat);
    if (tarifaGeneral) return tarifaGeneral.preu;
    
    return 0;
  };

  // Vincular projecte
  const handleProjecteSeleccionat = (codiProjecte: string | undefined) => {
    if (!codiProjecte) {
      setFormData(prev => ({ ...prev, projecte: undefined }));
      return;
    }
    const projecte = projectes.find(p => p.codi === codiProjecte);
    if (!projecte) return;
    setCopyDialogProjecte(projecte);
  };

  const vincularProjecteEnStorage = (codiProjecte: string) => {
    const projectesStorage = storage.getProjectes();
    storage.setProjectes(projectesStorage.map((p: any) =>
      p.codi === codiProjecte ? { ...p, facturaAssociada: formData.codi } : p
    ));
  };

  const handleVincularSenseCopiar = (projecte: import('../../types/projecte').Projecte) => {
    setFormData(prev => ({ ...prev, projecte: projecte.codi }));
    vincularProjecteEnStorage(projecte.codi);
    setCopyDialogProjecte(null);
  };

  const handleCopiarDadesProjecte = (projecte: import('../../types/projecte').Projecte) => {
    const tascasCategoritzades: any[] = [];
    projecte.tasques.forEach(tasca => {
      let categoria = tascasCategoritzades.find(c => c.categoria === tasca.categoria);
      if (!categoria) {
        categoria = { categoria: tasca.categoria, tasques: [] };
        tascasCategoritzades.push(categoria);
      }
      categoria.tasques.push({
        id: tasca.id,
        servei: tasca.servei,
        descripcio: tasca.descripcio,
        quantitat: tasca.quantitat,
        unitat: tasca.unitat,
        preu: tasca.tarifa
      });
    });

    const clientData = clients.find(c => c.codi === projecte.client);
    let ivaPercent = 21;
    if (clientData?.tipusIVA === 'Exempt') ivaPercent = 0;
    else if (clientData?.tipusIVA === 'Reduit') ivaPercent = 10;
    else if (clientData?.tipusIVA === 'Superreduit') ivaPercent = 4;
    const irpfPercent = clientData?.retencio || 0;

    setFormData(prev => ({
      ...prev,
      client: projecte.client,
      projecte: projecte.codi,
      tasques: tascasCategoritzades,
      ivaPercent,
      irpfPercent,
      observacions: `Factura generada des del projecte ${projecte.codi}`,
      avisFacturacio: projecte.avisFacturacio ? { ...projecte.avisFacturacio } : prev.avisFacturacio,
      accions: [...prev.accions, {
        data: new Date().toISOString(),
        descripcio: `Dades copiades del projecte ${projecte.codi}`,
        automatic: true
      }]
    }));

    vincularProjecteEnStorage(projecte.codi);
    setCopyDialogProjecte(null);
  };

  // Preparar factura completa
  const prepararFactura = (): FacturaVenta | null => {
    if (!validationResult.isValid) {
      return null;
    }

    const estat = determinarEstat(
      totals.totalFactura,
      formData.totalPagat,
      formData.dataVenciment,
      formData.estat
    );

    return {
      ...formData,
      ...totals,
      estat
    };
  };

  // Eliminar
  const handleDelete = () => {
    if (!editingFactura) return;
    
    if (!esEliminable) {
      alert('No es pot eliminar una factura amb pagaments registrats o en un estat avançat');
      return;
    }
  
    onDelete?.(editingFactura.codi);
    onClose();
  };

  // Cambiar estado
  const canviarEstat = (nouEstat: EstatFacturaVenta) => {
    if (nouEstat === 'pagada-parcial' && formData.pagaments.length === 0) {
      alert('⚠️ No es pot canviar l\'estat a "Pagada Parcial" sense haver registrat cap pagament.');
      return;
    }
    
    if (nouEstat === 'pagada') {
      if (formData.pagaments.length === 0) {
        alert('⚠️ No es pot canviar l\'estat a "Pagada" sense haver registrat cap pagament.');
        return;
      }
      if (totals.pendentCobrar > 0) {
        alert('⚠️ No es pot canviar l\'estat a "Pagada" si encara queda pendent de cobrar.');
        return;
      }
    }

    const accio: AccioFactura = {
      data: new Date().toISOString(),
      descripcio: `Estat canviat a: ${ESTAT_FACTURA_COLORS[nouEstat].label}`,
      automatic: true
    };

    setFormData(prev => ({
      ...prev,
      estat: nouEstat,
      dataEnviada: nouEstat === 'enviada' && !prev.dataEnviada 
        ? new Date().toISOString() 
        : prev.dataEnviada,
      accions: [...prev.accions, accio]
    }));
  };

  const toggleAvisFacturacio = () => {
    const nouActiu = !(formData.avisFacturacio?.actiu ?? false);
    const nouAvis = { actiu: nouActiu, descripcio: formData.avisFacturacio?.descripcio || '' };
    setFormData(prev => ({ ...prev, avisFacturacio: nouAvis }));
    // Sincronitzar amb el projecte vinculat
    if (formData.projecte) {
      const projectes = storage.getProjectes();
      storage.setProjectes(projectes.map((p: any) =>
        p.codi === formData.projecte ? { ...p, avisFacturacio: nouAvis } : p
      ));
    }
  };

  const updateAvisDescripcio = (descripcio: string) => {
    const nouAvis = { actiu: formData.avisFacturacio?.actiu ?? false, descripcio };
    setFormData(prev => ({ ...prev, avisFacturacio: nouAvis }));
    if (formData.projecte) {
      const projectes = storage.getProjectes();
      storage.setProjectes(projectes.map((p: any) =>
        p.codi === formData.projecte ? { ...p, avisFacturacio: nouAvis } : p
      ));
    }
  };

  const generarPDF = (idioma: 'ca' | 'es' | 'en') => {
    if (formData.avisFacturacio?.actiu) {
      alert('⚠️ Hi ha un avís de facturació actiu.\n\nDesprés de solucionar el problema pendent, desactiva l\'avís abans de generar la factura en PDF.');
      return;
    }

    const facturaCompleta = prepararFactura();
    if (!facturaCompleta) {
      alert('Cal completar els camps obligatoris abans de generar el PDF');
      return;
    }

    const projectes = storage.getProjectes();

    const pdfBase64 = generarFacturaVentaPDF(facturaCompleta, clients, projectes, idioma);

    setFormData(prev => ({
      ...prev,
      documentPDF: pdfBase64,
      documentPDFName: `${facturaCompleta.codi}_factura.pdf`
    }));
  };

  const estatInfo = ESTAT_FACTURA_COLORS[formData.estat as EstatFacturaVenta] || ESTAT_FACTURA_COLORS['borrador'];

  return (
    <div className="modal-overlay">
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '1400px', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
      >
        {/* HEADER */}
        <div className="modal-header">
          <h2>
            <FileText size={24} />
            {editingFactura ? 'Editar' : 'Nova'} Factura - {formData.codi}
            {formData.tipus === 'rectificativa' && (
              <span style={{
                marginLeft: '1rem',
                fontSize: '0.85rem',
                background: '#dc2626',
                color: 'white',
                padding: '0.35rem 0.75rem',
                borderRadius: '6px',
                fontWeight: 600
              }}>
                NOTA DE CRÈDIT
              </span>
            )}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>

            <button
              type="button"
              onClick={() => setShowLanguageModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                background: '#dc2626',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.9rem'
              }}
              title="Descarregar PDF"
            >
              <FileText size={18} />
              PDF
            </button>

            {formData.projecte && (
              <div 
                onClick={() => {
                  storage.setNavigateTo({
                    type: 'projecte',
                    codi: formData.projecte as string
                  });
                  onClose();
                  setTimeout(() => {
                    window.dispatchEvent(new CustomEvent('navigate-to', { 
                      detail: { section: 'projectes', codi: formData.projecte } 
                    }));
                  }, 100);
                }}
                style={{
                  padding: '0.5rem 1rem',
                  background: '#dbeafe',
                  color: '#1e40af',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'opacity 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                title="Clic per obrir el projecte"
              >
                Projecte: {formData.projecte}
                {formData.avisFacturacio?.actiu && (
                  <span
                    title={formData.avisFacturacio.descripcio || 'Avís de facturació actiu'}
                    style={{ marginLeft: '0.4rem', fontSize: '0.9rem' }}
                  >
                    ⚠️
                  </span>
                )}
              </div>
            )}

            <label style={{ fontSize: '0.9rem', fontWeight: 600 }}>Estat:</label>
            <select
              className="form-input"
              value={formData.estat}
              onChange={(e) => canviarEstat(e.target.value as EstatFacturaVenta)}
              style={{
                padding: '0.5rem',
                borderRadius: '6px',
                fontWeight: 600,
                background: estatInfo.bg,
                color: estatInfo.text,
                border: 'none'
              }}
              disabled={estaPagada}
            >
              <option value="borrador">📝 Esborrany</option>
              <option value="enviada">📤 Enviada</option>
              <option value="pagada-parcial">🟡 Pagada Parcial</option>
              <option value="pagada">✅ Pagada</option>
              <option value="vencuda">🔴 Vençuda</option>
              <option value="cancelled">⚫ Cancel·lada</option>
            </select>

            <button
              type="button"
              onClick={() => {
                if (!formData.client) {
                  const factures = storage.getFacturesVenda();
                  const facturaExisteix = factures.some((f: any) => f.codi === formData.codi);
                  
                  if (facturaExisteix) {
                    const filteredFactures = factures.filter((f: any) => f.codi !== formData.codi);
                    storage.setFacturesVenda(filteredFactures);
                  }
                  onClose();
                  return;
                }
                
                const totalTasques = formData.tasques.reduce((sum, cat) => sum + cat.tasques.length, 0);
                if (totalTasques === 0) {
                  alert('⚠️ Cal afegir almenys una tasca per guardar la factura.');
                  return;
                }
                
                saveNow();
                onClose();
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px',
                background: 'transparent',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                color: 'var(--color-text-secondary)',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--color-bg-tertiary)';
                e.currentTarget.style.color = 'var(--color-text-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--color-text-secondary)';
              }}
              title="Tancar"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          {/* TABS */}
          <div style={{
            display: 'flex',
            borderBottom: '2px solid var(--color-border)',
            padding: '0 var(--spacing-xl)',
            flexShrink: 0
          }}>
            {[
              { id: 'dades', label: '1. Resum' },
              { id: 'tasques', label: '2. Tasques' },
              { id: 'notes', label: '3. Notes' },
              { id: 'pagament', label: '4. Pagament' },
              { id: 'historial', label: '5. Historial' }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  padding: '1rem 1.5rem',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: activeTab === tab.id ? '2px solid var(--color-accent-primary)' : '2px solid transparent',
                  color: activeTab === tab.id ? 'var(--color-accent-primary)' : 'var(--color-text-secondary)',
                  fontWeight: activeTab === tab.id ? 600 : 400,
                  cursor: 'pointer',
                  marginBottom: '-2px'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="modal-body" style={{ flex: 1, overflow: 'auto' }}>
            {activeTab === 'dades' && (
              <DadesTab
                formData={formData}
                setFormData={setFormData}
                clients={clients}
                projectes={projectes}
                totals={totals}
                clientBlocked={clientBlocked}
                tePagaments={tePagaments}
                warnings={validationResult.warnings}
                onToggleAvis={toggleAvisFacturacio}
                onUpdateAvisDescripcio={updateAvisDescripcio}
                onProjecteSeleccionat={handleProjecteSeleccionat}
              />
            )}

            {activeTab === 'tasques' && (
              <TasquesTab
                formData={formData}
                setFormData={setFormData}
                parametres={parametres}
                totals={totals}
                clientBlocked={clientBlocked}
                tePagaments={tePagaments}
                onShowTascaModal={() => setShowTascaModal(true)}
                onShowMaterialModal={() => setShowMaterialModal(true)}
                onEliminarTasca={eliminarTasca}
                onEliminarCategoria={eliminarCategoria}
                onMoureCategoriaAmunt={moureCategoriaAmunt}
                onMoureCategoriaAvall={moureCategoriaAvall}
                onMoureTascaAmunt={moureTascaAmunt}
                onMoureTascaAvall={moureTascaAvall}
                onUpdateTasca={updateTasca}
                onBuscarTarifa={buscarTarifaTasca}
              />
            )}

            {activeTab === 'notes' && (
              <NotesTab
                formData={formData}
                setFormData={setFormData}
                plantilles={plantilles}
                onTogglePlantilla={togglePlantilla}
                clientBlocked={clientBlocked}
                tePagaments={tePagaments}
              />
            )}

            {activeTab === 'pagament' && (
              <PagamentTab
                formData={formData}
                setFormData={setFormData}
                totals={totals}
              />
            )}

            {activeTab === 'historial' && (
              <HistorialTab
                formData={formData}
                setFormData={setFormData}
              />
            )}
          </div>

          {/* FOOTER */}
          <div className="modal-footer" style={{
            display: 'flex',
            justifyContent: editingFactura && esEliminable ? 'space-between' : 'flex-end',
            gap: '1rem',
            padding: 'var(--spacing-lg)',
            borderTop: '2px solid var(--color-border)',
            flexShrink: 0
          }}>
            {editingFactura && esEliminable && (
              <button
                type="button"
                onClick={handleDelete}
                className="btn-secondary"
                style={{
                  borderColor: '#dc2626',
                  color: '#dc2626'
                }}
              >
                <Trash2 size={18} />
                Eliminar
              </button>
            )}

            <button 
              type="button" 
              className="btn-primary" 
              onClick={() => {
                if (!formData.client) {
                  const factures = storage.getFacturesVenda();
                  const facturaExisteix = factures.some((f: any) => f.codi === formData.codi);
                  
                  if (facturaExisteix) {
                    const filteredFactures = factures.filter((f: any) => f.codi !== formData.codi);
                    storage.setFacturesVenda(filteredFactures);
                  }
                  onClose();
                  return;
                }
                
                const totalTasques = formData.tasques.reduce((sum, cat) => sum + cat.tasques.length, 0);
                if (totalTasques === 0) {
                  alert('⚠️ Cal afegir almenys una tasca per guardar la factura.');
                  return;
                }
                
                saveNow();
                onClose();
              }}
            >
              Acceptar
            </button>
          </div>
        </div>
      </div>

      {/* Modal Tasca */}
      {showTascaModal && (() => {
        return (
          <TascaModal
            onClose={() => {
              setShowTascaModal(false);
              setEditingTasca(null);
            }}
            onSave={afegirTasca}
            existingCategories={formData.tasques
              .map(c => c.categoria)
              .filter(cat => cat !== undefined && cat !== null)}
            editingTasca={
              editingTasca 
                ? formData.tasques[editingTasca.categoriaIndex].tasques[editingTasca.tascaIndex]
                : undefined
            }
            editingCategory={
              editingTasca
                ? formData.tasques[editingTasca.categoriaIndex].categoria
                : undefined
            }
            serveis={parametres?.serveis || []}
            unitats={parametres?.unitats || []}
            clientTarifes={client?.tarifes || []}
            parametres={parametres}
          />
        );
      })()}

      {/* Modal Material */}
      {showMaterialModal && (
        <MaterialModal
          onClose={() => {
            setShowMaterialModal(false);
            setEditingMaterial(null);
          }}
          onSave={afegirMaterial}
          editingMaterial={
            editingMaterial 
              ? formData.tasques[editingMaterial.categoriaIndex].tasques[editingMaterial.materialIndex]
              : undefined
          }
          materials={parametres?.materials || []}
          grups={parametres?.grupsMaterials || []}
        />
      )}

      {/* Dialog: copiar dades del projecte */}
      {copyDialogProjecte && (
        <div
          className="modal-overlay"
          onClick={() => setCopyDialogProjecte(null)}
          style={{ zIndex: 2000 }}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '500px' }}
          >
            <div className="modal-header">
              <h2 style={{ fontSize: '1.1rem' }}>
                Vincular projecte {copyDialogProjecte.codi}
              </h2>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: '0.75rem' }}>
                Vols copiar les dades del projecte <strong>{copyDialogProjecte.codi} – {copyDialogProjecte.titol}</strong> a aquesta factura?
              </p>
              <p style={{ fontSize: '0.88rem', color: 'var(--color-text-secondary)', lineHeight: '1.5' }}>
                Si copies les dades, s'importaran totes les tasques, el client, la configuració fiscal i l'avís de facturació.
                L'estat del projecte <strong>no canviarà</strong> i podràs continuar fent-ne el seguiment amb normalitat.
              </p>
              {copyDialogProjecte.facturaAssociada && (
                <div style={{
                  marginTop: '0.75rem',
                  padding: '0.6rem 0.9rem',
                  background: '#fef3c7',
                  border: '1px solid #fbbf24',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  color: '#92400e'
                }}>
                  ⚠️ Aquest projecte ja té la factura <strong>{copyDialogProjecte.facturaAssociada}</strong> vinculada. En continuar, s'actualitzarà el vincle.
                </div>
              )}
            </div>
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setCopyDialogProjecte(null)}
              >
                Cancel·lar
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => handleVincularSenseCopiar(copyDialogProjecte)}
              >
                Vincular sense copiar
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => handleCopiarDadesProjecte(copyDialogProjecte)}
              >
                Sí, copiar dades
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal idioma PDF */}
      {showLanguageModal && (
        <div 
          className="modal-overlay" 
          onClick={() => setShowLanguageModal(false)}
          style={{ zIndex: 2000 }}
        >
          <div 
            className="modal-content" 
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '400px' }}
          >
            <div className="modal-header">
              <h2>
                <FileText size={24} />
                Selecciona l'idioma del PDF
              </h2>
              <button className="modal-close" onClick={() => setShowLanguageModal(false)}>
                <X size={24} />
              </button>
            </div>

            <div className="modal-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => {
                    generarPDF('ca');
                    setShowLanguageModal(false);
                  }}
                  style={{ justifyContent: 'center', fontSize: '1rem', padding: '1rem' }}
                >
                  🇪🇸 Català
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => {
                    generarPDF('es');
                    setShowLanguageModal(false);
                  }}
                  style={{ justifyContent: 'center', fontSize: '1rem', padding: '1rem' }}
                >
                  🇪🇸 Castellano
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => {
                    generarPDF('en');
                    setShowLanguageModal(false);
                  }}
                  style={{ justifyContent: 'center', fontSize: '1rem', padding: '1rem' }}
                >
                  🇬🇧 English
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { X, FileText, Plus, Trash2, Euro, Clock } from 'lucide-react';
import type { FacturaVenta, AccioFactura, PagamentClient, EstatFacturaVenta } from '../../types/facturaVenta';
import { ESTAT_FACTURA_COLORS } from '../../types/facturaVenta';
import type { Client } from '../../types/client';
import type { Projecte } from '../../types/projecte';
import type { Plantilla } from '../../types/parametres';
import type { TascaCategoria, Tasca } from '../../types/pressupost';
import SearchableSelect from '../common/SearchableSelect';
import TascaModal from '../pressupostos/TascaModal';
import MaterialModal from './MaterialModal';
import { useAutoSave } from '../../hooks/useAutoSave';
import { generarFacturaVentaPDF } from '../../utils/generarFacturaVentaPDF';

interface Props {
  onClose: () => void;
  onSave: (factura: FacturaVenta) => void;
  onDelete?: (codi: string) => void;
  nextCode: string;
  clients: Client[];
  projectes: Projecte[];
  plantilles: Plantilla[];
  editingFactura?: FacturaVenta | null;
}

export default function FacturaVendaModal({
  onClose,
  onSave,
  onDelete,
  nextCode,
  clients,
  projectes,
  plantilles,
  editingFactura
}: Props) {

  const [parametres, setParametres] = useState<any>({ serveis: [], unitats: [] });

useEffect(() => {
  const saved = localStorage.getItem('plateaParametres');
  if (saved) {
    const params = JSON.parse(saved);
    setParametres(params);
  }
}, []);

  const [activeTab, setActiveTab] = useState<'dades' | 'tasques' | 'notes' | 'pagament' | 'historial'>('dades');
  const [showTascaModal, setShowTascaModal] = useState(false);
  const [editingTasca, setEditingTasca] = useState<{ categoriaIndex: number; tascaIndex: number } | null>(null);
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<{ categoriaIndex: number; materialIndex: number } | null>(null);

  // Calcular fecha de vencimiento por defecto (30 días después)
  const calcularDataVenciment = (dataFactura: string) => {
    const data = new Date(dataFactura);
    data.setDate(data.getDate() + 30);
    return data.toISOString().split('T')[0];
  };

  const [formData, setFormData] = useState<FacturaVenta>(
    editingFactura
    ? JSON.parse(JSON.stringify(editingFactura))
    : {
      codi: nextCode,
      estat: 'borrador',
      client: '',
      projecte: undefined,
      dataFactura: new Date().toISOString().split('T')[0],
      dataVenciment: calcularDataVenciment(new Date().toISOString().split('T')[0]),
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

  // Bloquear toda la ficha hasta que se seleccione un cliente
const clientBlocked = !formData.client;

  const { saveNow } = useAutoSave(
    formData, 
    (data) => {
      const facturaCompleta = prepararFactura();
      if (facturaCompleta) {
        onSave(facturaCompleta);
      }
    }
  );

  const [nouPagament, setNouPagament] = useState<Omit<PagamentClient, 'codi'>>({
    data: new Date().toISOString().split('T')[0],
    import: 0,
    metode: 'transferencia',
    referencia: ''
  });

  const [novaAccio, setNovaAccio] = useState({
    data: new Date().toISOString().split('T')[0],
    descripcio: ''
  });

  const [showLanguageModal, setShowLanguageModal] = useState(false);

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

  // Calcular totales
  const calcularTotals = () => {
    let base = 0;
    formData.tasques.forEach(cat => {
      cat.tasques.forEach(tasca => {
        base += tasca.quantitat * tasca.preu;
      });
    });

    const iva = (base * formData.ivaPercent) / 100;
    const irpf = (base * formData.irpfPercent) / 100;
    const total = base + iva - irpf;
    const pendent = total - formData.totalPagat;

    return {
      baseImposable: base,
      ivaImport: iva,
      irpfImport: irpf,
      totalFactura: total,
      pendentCobrar: Math.max(0, pendent)
    };
  };

  const totals = calcularTotals();

  // Bloqueo
  const tePagaments = formData.pagaments.length > 0;
  const estaPagada = totals.pendentCobrar <= 0.01;
  const esEliminable = formData.estat === 'borrador' && !tePagaments;

  // Auto-actualizar fecha vencimiento
  useEffect(() => {
    if (!editingFactura) {
      setFormData(prev => ({
        ...prev,
        dataVenciment: calcularDataVenciment(prev.dataFactura)
      }));
    }
  }, [formData.dataFactura, editingFactura]);

  // Actualizar texto de plantillas
  const actualitzarTextPlantilles = () => {
    const textosSeleccionados = formData.plantillesSeleccionades
      .map(codi => {
        const plantilla = plantilles.find(p => p.codi === codi);
        return plantilla?.text || '';
      })
      .filter(Boolean);
    
    setFormData(prev => ({
      ...prev,
      plantillesText: textosSeleccionados.join('\n\n')
    }));
  };

  // Toggle plantilla
  const togglePlantilla = (codi: string) => {
    const plantilla = plantilles.find(p => p.codi === codi);
    const esPerDefecte = plantilla?.perDefecte || false;
    const estaSeleccionada = formData.plantillesSeleccionades.includes(codi);
  
    // No permitir deseleccionar las por defecto
    if (esPerDefecte && estaSeleccionada) {
      return;
    }
  
    let noves: string[];
    if (estaSeleccionada) {
      noves = formData.plantillesSeleccionades.filter(c => c !== codi);
    } else {
      noves = [...formData.plantillesSeleccionades, codi];
    }
  
    // Actualizar texto con las nuevas plantillas seleccionadas
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

  // Añadir/editar tasca
  const afegirTasca = (tasca: Tasca, categoria: string) => {
    const nouTasques = [...formData.tasques];
    
    // Buscar si ya existe la categoría
    const catIndex = nouTasques.findIndex(c => c.categoria === categoria);
    
    if (catIndex >= 0) {
      // Categoría existe - añadir tarea
      if (editingTasca && editingTasca.categoriaIndex === catIndex) {
        // Editar tarea existente
        nouTasques[catIndex].tasques[editingTasca.tascaIndex] = tasca;
      } else {
        // Añadir nueva tarea a categoría existente
        nouTasques[catIndex].tasques.push(tasca);
      }
    } else {
      // Categoría nueva - crearla con la tarea
      nouTasques.push({
        categoria,
        tasques: [tasca]
      });
    }
  
    setFormData(prev => ({ ...prev, tasques: nouTasques }));
    setShowTascaModal(false);
    setEditingTasca(null);
  };

  // Añadir/editar material
const afegirMaterial = (material: Tasca) => {
  const nouTasques = [...formData.tasques];
  
  // Buscar categoría MATERIALS
  const catIndex = nouTasques.findIndex(c => c.categoria === 'MATERIALS');
  
  if (catIndex >= 0) {
    // Categoría existe
    if (editingMaterial && editingMaterial.categoriaIndex === catIndex) {
      // Editar material existente
      nouTasques[catIndex].tasques[editingMaterial.materialIndex] = material;
    } else {
      // Añadir nuevo material
      nouTasques[catIndex].tasques.push(material);
    }
  } else {
    // Crear categoría MATERIALS
    nouTasques.push({
      categoria: 'MATERIALS',
      tasques: [material]
    });
  }

  setFormData(prev => ({ ...prev, tasques: nouTasques }));
  setShowMaterialModal(false);
  setEditingMaterial(null);
};

  // Eliminar tasca
  const eliminarTasca = (catIndex: number, tascaIndex: number) => {
    const nouTasques = [...formData.tasques];
    nouTasques[catIndex].tasques.splice(tascaIndex, 1);
    
    // Si la categoría queda vacía, eliminarla
    if (nouTasques[catIndex].tasques.length === 0) {
      nouTasques.splice(catIndex, 1);
    }

    setFormData(prev => ({ ...prev, tasques: nouTasques }));
  };

  // Eliminar categoria
  const eliminarCategoria = (catIndex: number) => {
    if (!confirm('Eliminar aquesta categoria i totes les seves tasques?')) return;
    
    const nouTasques = [...formData.tasques];
    nouTasques.splice(catIndex, 1);
    setFormData(prev => ({ ...prev, tasques: nouTasques }));
  };

  // Mover categoria
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
// Mover tasca dentro de su categoría
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

// Buscar tarifa para una tarea
const buscarTarifaTasca = (codiServei: string, codiUnitat: string): number => {
  // 1. Buscar en tarifas del cliente
  const client = clients.find(c => c.codi === formData.client);
  const tarifaClient = client?.tarifes?.find(t => t.servei === codiServei && t.unitat === codiUnitat);
  if (tarifaClient) return tarifaClient.preu;
  
  // 2. Buscar en tarifas generales
  const tarifaGeneral = parametres?.tarifes?.find((t: any) => t.servei === codiServei && t.unitat === codiUnitat);
  if (tarifaGeneral) return tarifaGeneral.preu;
  
  return 0;
};

// Registrar pago
const registrarPagament = () => {
  if (nouPagament.import <= 0) {
    alert('L\'import ha de ser superior a 0');
    return;
  }

  if (nouPagament.import > totals.pendentCobrar) {
    alert('L\'import no pot ser superior al pendent');
    return;
  }

  const pagament: PagamentClient = {
    codi: `PAG-${String(formData.pagaments.length + 1).padStart(5, '0')}`,
    ...nouPagament
  };

  const novaAccioAuto: AccioFactura = {
    data: nouPagament.data,
    descripcio: `Pagament rebut: ${nouPagament.import.toFixed(2)}€`,
    automatic: true
  };

  // Calcular nuevo total pagado
  const nouTotalPagat = formData.totalPagat + nouPagament.import;
  const nouPendentCobrar = totals.totalFactura - nouTotalPagat;

  // Determinar nuevo estado automáticamente
  let nouEstat = formData.estat;
  if (nouPendentCobrar <= 0.01 && formData.estat !== 'cancelled') {
    nouEstat = 'pagada';
  } else if (nouTotalPagat > 0 && formData.estat !== 'cancelled') {
    nouEstat = 'pagada-parcial';
  }

  setFormData(prev => ({
    ...prev,
    pagaments: [...prev.pagaments, pagament],
    totalPagat: nouTotalPagat,
    estat: nouEstat,
    accions: [...prev.accions, novaAccioAuto]
  }));

  setNouPagament({
    data: new Date().toISOString().split('T')[0],
    import: 0,
    metode: 'transferencia',
    referencia: ''
  });
};

// Eliminar pago
const eliminarPagament = (codiPagament: string) => {
  const pagament = formData.pagaments.find(p => p.codi === codiPagament);
  if (!pagament) return;

  if (!confirm('Estàs segur que vols eliminar aquest pagament?')) return;

  // Calcular nuevo total pagado
  const nouTotalPagat = formData.totalPagat - pagament.import;
  const nouPendentCobrar = totals.totalFactura - nouTotalPagat;

  // Determinar nuevo estado automáticamente
  let nouEstat = formData.estat;
  if (nouPendentCobrar <= 0.01 && formData.estat !== 'cancelled') {
    nouEstat = 'pagada';
  } else if (nouTotalPagat > 0 && formData.estat !== 'cancelled') {
    nouEstat = 'pagada-parcial';
  } else if (nouTotalPagat === 0 && formData.estat === 'pagada-parcial') {
    // Si no hay pagos y estaba en pagada-parcial, volver a enviada
    nouEstat = 'enviada';
  }

  setFormData(prev => ({
    ...prev,
    pagaments: prev.pagaments.filter(p => p.codi !== codiPagament),
    totalPagat: nouTotalPagat,
    estat: nouEstat
  }));
};

  // Registrar acción manual
  const registrarAccio = () => {
    if (!novaAccio.descripcio.trim()) {
      alert('Introdueix una descripció per a l\'acció');
      return;
    }

    const accio: AccioFactura = {
      data: novaAccio.data,
      descripcio: novaAccio.descripcio,
      automatic: false
    };

    setFormData(prev => ({
      ...prev,
      accions: [...prev.accions, accio]
    }));

    setNovaAccio({
      data: new Date().toISOString().split('T')[0],
      descripcio: ''
    });
  };

// Preparar factura completa con estado calculado
const prepararFactura = (): FacturaVenta | null => {
  // Validación 1: Requiere cliente
  if (!formData.client) {
    return null;
  }
  
  // Validación 2: Requiere al menos una tarea (dentro de las categorías)
  const totalTasques = formData.tasques.reduce((sum, cat) => sum + cat.tasques.length, 0);
  if (totalTasques === 0) {
    return null;
  }

  // Determinar estado
  let estat: EstatFacturaVenta = formData.estat;
  
  if (estaPagada && estat !== 'cancelled') {
    estat = 'pagada';
  } else if (tePagaments && estat !== 'cancelled') {
    estat = 'pagada-parcial';
  } else if (estat === 'enviada' || estat === 'vencuda') {
    const avui = new Date();
    const venciment = new Date(formData.dataVenciment);
    if (avui > venciment && totals.pendentCobrar > 0) {
      estat = 'vencuda';
    }
  }

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
      alert('No es pot eliminar una factura enviada o amb pagaments registrats');
      return;
    }
  
    onDelete?.(editingFactura.codi);
    onClose();
  };

// Cambiar estado
const canviarEstat = (nouEstat: EstatFacturaVenta) => {
  // Validar cambio a "Pagada Parcial"
  if (nouEstat === 'pagada-parcial') {
    if (formData.pagaments.length === 0) {
      alert('⚠️ No es pot canviar l\'estat a "Pagada Parcial" sense haver registrat cap pagament.');
      return;
    }
  }
  
  // Validar cambio a "Pagada"
  if (nouEstat === 'pagada') {
    if (formData.pagaments.length === 0) {
      alert('⚠️ No es pot canviar l\'estat a "Pagada" sense haver registrat cap pagament.');
      return;
    }
    if (totals.pendentCobrar > 0) {
      alert('⚠️ No es pot canviar l\'estat a "Pagada" si encara queda pendent de cobrar. Registra tots els pagaments primer.');
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

  const generarPDF = (idioma: 'ca' | 'es' | 'en') => {
    const facturaCompleta = prepararFactura();
    if (!facturaCompleta) {
      alert('Cal completar els camps obligatoris abans de generar el PDF');
      return;
    }
    const projectesGuardats = localStorage.getItem('plateaProjectes');
    const projectes = projectesGuardats ? JSON.parse(projectesGuardats) : [];
    
    // Generar PDF y obtener base64
    const pdfBase64 = generarFacturaVentaPDF(facturaCompleta, clients, projectes, idioma);
    
    // Actualizar formData para que el autoguardado también incluya el PDF
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
  style={{ maxWidth: '1000px', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
>
          {/* HEADER DEL MODAL */}
        <div className="modal-header">
          <h2>
            <FileText size={24} />
            {editingFactura ? 'Editar' : 'Nova'} Factura - {formData.codi}
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

  {/* Indicador de proyecto asociado */}
{formData.projecte && (
  <div 
    onClick={() => {
        localStorage.setItem('plateaNavigateTo', JSON.stringify({
          type: 'projecte',
          codi: formData.projecte
        }));
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
    Projecte:<br /> {formData.projecte}
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
  
            {/* BOTÓN X PARA CERRAR */}
            <button
              type="button"
              onClick={() => {
                // Si no hay cliente, cerrar sin guardar
                if (!formData.client) {
                  const saved = localStorage.getItem('plateaFacturesVenta');
                  if (saved) {
                    const factures = JSON.parse(saved);
                    const facturaExisteix = factures.some((f: any) => f.codi === formData.codi);
                    
                    if (facturaExisteix) {
                      const filteredFactures = factures.filter((f: any) => f.codi !== formData.codi);
                      localStorage.setItem('plateaFacturesVenta', JSON.stringify(filteredFactures));
                    }
                  }
                  onClose();
                  return;
                }
                
                // Validar que tenga al menos una tarea
                const totalTasques = formData.tasques.reduce((sum, cat) => sum + cat.tasques.length, 0);
                if (totalTasques === 0) {
                  alert('⚠️ Cal afegir almenys una tasca per guardar la factura.');
                  return;
                }
                
                // Si todo OK, guardar y cerrar
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
          {/* PESTAÑAS DE NAVEGACIÓN */}
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
          
{/* PESTAÑA 1: DADES */}
{activeTab === 'dades' && (
  <div>
    {/* Dades Bàsiques */}
    <div style={{
      background: 'var(--color-bg-tertiary)',
      padding: '1.5rem',
      borderRadius: '8px',
      marginBottom: '1.5rem'
    }}>
      <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>
        📋 Dades Bàsiques
      </h3>

      <div className="form-group">
        <label>Codi</label>
        <input
          type="text"
          className="form-input"
          value={formData.codi}
          readOnly
          style={{ background: 'var(--color-bg-secondary)', cursor: 'not-allowed' }}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div className="form-group">
          <label>Data Factura *</label>
          <input
            type="date"
            className="form-input"
            value={formData.dataFactura}
            onChange={(e) => setFormData({ ...formData, dataFactura: e.target.value })}
            required
            disabled={clientBlocked || tePagaments}
          />
        </div>

        <div className="form-group">
          <label>Data Venciment *</label>
          <input
            type="date"
            className="form-input"
            value={formData.dataVenciment}
            onChange={(e) => setFormData({ ...formData, dataVenciment: e.target.value })}
            required
            disabled={clientBlocked || tePagaments}
          />
        </div>
      </div>

      <div className="form-group">
        <label>Client *</label>
        <SearchableSelect
          value={formData.client}
          onChange={(value) => setFormData({ ...formData, client: value })}
          options={clients.map(c => ({
            value: c.codi,
            label: c.nomComercial || c.nomFiscal
          }))}
          placeholder="Selecciona un client..."
          disabled={tePagaments}
        />
      </div>
    </div>
    {clientBlocked && (
  <div style={{ 
    padding: '1rem', 
    background: '#fef3c7', 
    border: '1px solid #fbbf24',
    borderRadius: '8px',
    marginBottom: '1rem',
    color: '#92400e'
  }}>
    ⚠️ Selecciona un client per continuar
  </div>
)}

    {/* Càlculs Fiscals */}
    <div style={{
      background: 'var(--color-bg-tertiary)',
      padding: '1.5rem',
      borderRadius: '8px',
      marginBottom: '1.5rem'
    }}>
      <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>
        💶 Càlculs Fiscals
      </h3>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div className="form-group">
          <label>IVA (%)</label>
          <input
            type="number"
            step="0.01"
            className="form-input"
            value={formData.ivaPercent}
            onChange={(e) => setFormData({ ...formData, ivaPercent: parseFloat(e.target.value) || 0 })}
            disabled={clientBlocked || tePagaments}
          />
        </div>

        <div className="form-group">
          <label>Base Imposable</label>
          <input
            type="text"
            className="form-input"
            value={`${totals.baseImposable.toFixed(2)}€`}
            readOnly
            style={{ background: 'var(--color-bg-secondary)', cursor: 'not-allowed' }}
          />
        </div>

        <div className="form-group">
          <label>IRPF (%)</label>
          <input
            type="number"
            step="0.01"
            className="form-input"
            value={formData.irpfPercent}
            onChange={(e) => setFormData({ ...formData, irpfPercent: parseFloat(e.target.value) || 0 })}
            disabled={clientBlocked || tePagaments}
          />
        </div>

        <div className="form-group">
          <label>IVA</label>
          <input
            type="text"
            className="form-input"
            value={`${totals.ivaImport.toFixed(2)}€`}
            readOnly
            style={{ background: 'var(--color-bg-secondary)', cursor: 'not-allowed' }}
          />
        </div>

        <div></div>

        <div className="form-group">
          <label>IRPF</label>
          <input
            type="text"
            className="form-input"
            value={`-${totals.irpfImport.toFixed(2)}€`}
            readOnly
            style={{ background: 'var(--color-bg-secondary)', cursor: 'not-allowed' }}
          />
        </div>
      </div>

      <div style={{
        marginTop: '1.5rem',
        padding: '1.5rem',
        background: 'var(--color-accent-primary)',
        color: 'white',
        borderRadius: '8px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <span style={{ fontSize: '1.3rem', fontWeight: 700 }}>TOTAL FACTURA</span>
        <span style={{ fontSize: '2rem', fontWeight: 700 }}>
          {totals.totalFactura.toFixed(2)}€
        </span>
      </div>
    </div>

    {/* Observacions */}
    <div style={{
      background: 'var(--color-bg-tertiary)',
      padding: '1.5rem',
      borderRadius: '8px'
    }}>
      <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>
        📝 Observacions del Client
      </h3>
      
      <textarea
        className="form-input"
        value={formData.observacions}
        onChange={(e) => setFormData({ ...formData, observacions: e.target.value })}
        rows={4}
        placeholder="Notes addicionals per al client..."
        disabled={clientBlocked || tePagaments}
      />
    </div>
  </div>
)}

{/* PESTAÑA 2: TASQUES */}
{activeTab === 'tasques' && (
  <div>
    {/* Projecte */}
    <div style={{
      background: 'var(--color-bg-tertiary)',
      padding: '1.5rem',
      borderRadius: '8px',
      marginBottom: '1.5rem'
    }}>
      <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>
        🎬 Projecte Vinculat
      </h3>
      
      <SearchableSelect
        value={formData.projecte || ''}
        onChange={(value) => setFormData({ ...formData, projecte: value || undefined })}
        options={[
          { value: '', label: 'Cap projecte' },
          ...projectes.map(p => ({
            value: p.codi,
            label: `${p.codi} - ${p.titol}`
          }))
        ]}
        placeholder="Selecciona un projecte (opcional)..."
        disabled={clientBlocked || tePagaments}
      />
    </div>

    {/* Tasques */}
    <div style={{
      background: 'var(--color-bg-tertiary)',
      padding: '1.5rem',
      borderRadius: '8px'
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '1rem'
      }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>
          📝 Tasques i Materials
        </h3>
        
        {!tePagaments && (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
<button
  type="button"
  onClick={() => {
    if (!formData.client) {
      alert('Selecciona primer un client a la pestanya "Dades"');
      setActiveTab('dades');
      return;
    }
    setShowTascaModal(true);
  }}
  className="btn-secondary"
  style={{ fontSize: '0.85rem' }}
  disabled={clientBlocked}
>
  <Plus size={16} />
  Afegir Tasca
</button>
<button
  type="button"
  onClick={() => {
    if (!formData.client) {
      alert('Selecciona primer un client a la pestanya "Dades"');
      setActiveTab('dades');
      return;
    }
    setShowMaterialModal(true);
  }}
  className="btn-secondary"
  style={{ fontSize: '0.85rem' }}
  disabled={clientBlocked}
>
  <Plus size={16} />
  Afegir Material
</button>
          </div>
        )}
      </div>

      {formData.tasques.length === 0 ? (
        <p style={{ 
          textAlign: 'center', 
          color: 'var(--color-text-tertiary)',
          padding: '2rem'
        }}>
          No hi ha tasques. Afegeix tasques per generar la factura.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {formData.tasques.map((categoria, catIndex) => (
  <div 
    key={catIndex}
    style={{
      background: 'var(--color-bg-secondary)',
      border: '1px solid var(--color-border)',
      borderRadius: '8px',
      overflow: 'hidden'
    }}
  >
    {/* Header Categoria */}
    <div style={{
      background: 'var(--color-accent-primary)',
      color: 'white',
      padding: '0.75rem 1rem',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }}>
<h4 style={{ fontSize: '1rem', fontWeight: 600, textTransform: 'uppercase' }}>
  {categoria.categoria === 'MATERIALS' 
    ? 'MATERIALS'
    : (parametres?.categories?.find(c => c.codi === categoria.categoria)?.nom || categoria.categoria)
      }
</h4>
      
      {!tePagaments && (
        <div style={{ display: 'flex', gap: '0.25rem' }}>
          <button
            type="button"
            onClick={() => moureCategoriaAmunt(catIndex)}
            disabled={catIndex === 0}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              color: 'white',
              padding: '0.25rem 0.5rem',
              borderRadius: '4px',
              cursor: catIndex === 0 ? 'not-allowed' : 'pointer',
              opacity: catIndex === 0 ? 0.5 : 1
            }}
          >
            ↑
          </button>
          <button
            type="button"
            onClick={() => moureCategoriaAvall(catIndex)}
            disabled={catIndex === formData.tasques.length - 1}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              color: 'white',
              padding: '0.25rem 0.5rem',
              borderRadius: '4px',
              cursor: catIndex === formData.tasques.length - 1 ? 'not-allowed' : 'pointer',
              opacity: catIndex === formData.tasques.length - 1 ? 0.5 : 1
            }}
          >
            ↓
          </button>
          <button
            type="button"
            onClick={() => eliminarCategoria(catIndex)}
            style={{
              background: 'rgba(220, 38, 38, 0.8)',
              border: 'none',
              color: 'white',
              padding: '0.25rem 0.5rem',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            <Trash2 size={14} />
          </button>
        </div>
      )}
    </div>

    {/* Tasques */}
    <div style={{ padding: '1rem' }}>
      {/* Headers de tabla */}
      <div style={{
  display: 'grid',
  gridTemplateColumns: tePagaments ? '1.2fr 2.5fr 0.9fr 0.9fr 1fr 1fr' : '1.2fr 2.5fr 0.9fr 0.9fr 1fr 1fr 60px',
  gap: '0.75rem',
  padding: '0.5rem 0.75rem',
  fontWeight: 600,
  fontSize: '0.85rem',
  color: 'var(--color-text-secondary)',
  borderBottom: '1px solid var(--color-border)',
  marginBottom: '0.5rem'
}}>
<div>Servei</div>
<div style={{ paddingLeft: '2rem' }}>Descripció</div>
<div style={{ textAlign: 'right', paddingRight: '0rem' }}>Quantitat</div>
<div style={{ paddingLeft: '1.8rem' }}>Unitat</div>
<div style={{ textAlign: 'right' }}>Preu</div>
<div style={{ textAlign: 'right' }}>Total</div>
  {!tePagaments && <div></div>}
</div>

      {categoria.tasques.map((tasca, tascaIndex) => (
       <div 
       key={tascaIndex}
       style={{
         display: 'grid',
         gridTemplateColumns: tePagaments ? '1.2fr 2.5fr 0.9fr 0.9fr 1fr 1fr' : '1.2fr 2.5fr 0.9fr 0.9fr 1fr 1fr 60px',
         gap: '0.75rem',
         alignItems: 'center',
         padding: '0.75rem',
         background: 'var(--color-bg-primary)',
         borderRadius: '6px',
         marginBottom: '0.5rem',
         border: '1px solid var(--color-border)'
       }}
     >
{/* Servei - Bloqueado para materiales */}
<div>
  {tePagaments || categoria.categoria === 'MATERIALS' ? (
    <div style={{ fontWeight: 600 }}>{tasca.servei}</div>
  ) : (
    <SearchableSelect
             value={
               // Encontrar el código del servicio basado en el nombre
               parametres?.serveis?.find((s: any) => s.nom === tasca.servei)?.codi || ''
             }
             onChange={(codiServei) => {
              const serveiData = parametres?.serveis?.find((s: any) => s.codi === codiServei);
              const nouTasques = [...formData.tasques];
              
              // Obtener código de unidad actual
              const unitatActual = nouTasques[catIndex].tasques[tascaIndex].unitat;
              const codiUnitat = parametres?.unitats?.find((u: any) => u.nom === unitatActual)?.codi;
              
              // Actualizar servei, descripció y precio
              nouTasques[catIndex].tasques[tascaIndex].servei = serveiData?.nom || codiServei;
              nouTasques[catIndex].tasques[tascaIndex].descripcio = serveiData?.descripcio || '';
              
              // Buscar nueva tarifa si hay unitat
              if (codiUnitat) {
                nouTasques[catIndex].tasques[tascaIndex].preu = buscarTarifaTasca(codiServei, codiUnitat);
              }
              
              setFormData(prev => ({ ...prev, tasques: nouTasques }));
            }}
             options={parametres?.serveis?.map((s: any) => ({ value: s.codi, label: s.nom })) || []}
             placeholder="Servei..."
           />
         )}
       </div>
       
       {/* Descripció - Editable */}
       <div>
         {tePagaments ? (
           <div style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
             {tasca.descripcio}
           </div>
         ) : (
           <textarea
             className="form-input"
             value={tasca.descripcio}
             onChange={(e) => {
               const nouTasques = [...formData.tasques];
               nouTasques[catIndex].tasques[tascaIndex].descripcio = e.target.value;
               setFormData(prev => ({ ...prev, tasques: nouTasques }));
             }}
             rows={2}
             style={{ 
               fontSize: '0.85rem',
               padding: '0.5rem',
               resize: 'vertical',
               minHeight: '60px'
             }}
           />
         )}
       </div>
       
       {/* Quantitat - Editable */}
       <div style={{ textAlign: 'right' }}>
         {tePagaments ? (
           <div style={{ fontWeight: 600 }}>{tasca.quantitat}</div>
         ) : (
           <input
             type="number"
             className="form-input"
             value={tasca.quantitat}
             onChange={(e) => {
               const nouTasques = [...formData.tasques];
               nouTasques[catIndex].tasques[tascaIndex].quantitat = parseFloat(e.target.value) || 0;
               setFormData(prev => ({ ...prev, tasques: nouTasques }));
             }}
             min="0"
             step="0.01"
             style={{ 
               fontSize: '0.85rem',
               padding: '0.5rem',
               textAlign: 'right'
             }}
           />
         )}
       </div>
       
{/* Unitat - Bloqueada para materiales */}
<div>
  {tePagaments || categoria.categoria === 'MATERIALS' ? (
    <div style={{ fontSize: '0.9rem', color: 'var(--color-text-tertiary)' }}>
      {tasca.unitat}
    </div>
  ) : (
    <SearchableSelect
      value={
        // Encontrar el código de la unidad basado en el nombre
        parametres?.unitats?.find((u: any) => u.nom === tasca.unitat)?.codi || ''
      }
      onChange={(codiUnitat) => {
        const unitatData = parametres?.unitats?.find((u: any) => u.codi === codiUnitat);
        const nouTasques = [...formData.tasques];
        
        // Obtener código de servicio actual
        const serveiActual = nouTasques[catIndex].tasques[tascaIndex].servei;
        const codiServei = parametres?.serveis?.find((s: any) => s.nom === serveiActual)?.codi;
        
        // Actualizar unitat
        nouTasques[catIndex].tasques[tascaIndex].unitat = unitatData?.nom || codiUnitat;
        
        // Buscar nueva tarifa si hay servei
        if (codiServei) {
          nouTasques[catIndex].tasques[tascaIndex].preu = buscarTarifaTasca(codiServei, codiUnitat);
        }
        
        setFormData(prev => ({ ...prev, tasques: nouTasques }));
      }}
      options={parametres?.unitats?.map((u: any) => ({ value: u.codi, label: u.nom })) || []}
      placeholder="Unitat..."
    />
  )}
</div>
       
       {/* Preu - Editable */}
       <div style={{ textAlign: 'right' }}>
         {tePagaments ? (
           <div>{tasca.preu.toFixed(2)}€</div>
         ) : (
           <input
             type="number"
             className="form-input"
             value={tasca.preu}
             onChange={(e) => {
               const nouTasques = [...formData.tasques];
               nouTasques[catIndex].tasques[tascaIndex].preu = parseFloat(e.target.value) || 0;
               setFormData(prev => ({ ...prev, tasques: nouTasques }));
             }}
             min="0"
             step="0.01"
             style={{ 
               fontSize: '0.85rem',
               padding: '0.5rem',
               textAlign: 'right'
             }}
           />
         )}
       </div>
       
       {/* Total - Calculado automáticamente, NO editable */}
       <div style={{ textAlign: 'right', fontWeight: 600, color: 'var(--color-accent-primary)' }}>
         {(tasca.quantitat * tasca.preu).toFixed(2)}€
       </div>
        
{/* Botones acción */}
{!tePagaments && (
    <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center' }}>
      <button
        type="button"
        onClick={() => moureTascaAmunt(catIndex, tascaIndex)}
        disabled={tascaIndex === 0}
        style={{
          background: 'transparent',
          border: '1px solid var(--color-border)',
          color: tascaIndex === 0 ? 'var(--color-text-tertiary)' : 'var(--color-text-secondary)',
          cursor: tascaIndex === 0 ? 'not-allowed' : 'pointer',
          padding: '0.25rem 0.4rem',
          borderRadius: '4px',
          fontSize: '0.75rem'
        }}
        title="Moure amunt"
      >
        ↑
      </button>
      <button
        type="button"
        onClick={() => moureTascaAvall(catIndex, tascaIndex)}
        disabled={tascaIndex === categoria.tasques.length - 1}
        style={{
          background: 'transparent',
          border: '1px solid var(--color-border)',
          color: tascaIndex === categoria.tasques.length - 1 ? 'var(--color-text-tertiary)' : 'var(--color-text-secondary)',
          cursor: tascaIndex === categoria.tasques.length - 1 ? 'not-allowed' : 'pointer',
          padding: '0.25rem 0.4rem',
          borderRadius: '4px',
          fontSize: '0.75rem'
        }}
        title="Moure avall"
      >
        ↓
      </button>
      <button
        type="button"
        onClick={() => eliminarTasca(catIndex, tascaIndex)}
        style={{
          background: 'transparent',
          border: 'none',
          color: '#dc2626',
          cursor: 'pointer',
          padding: '0.25rem'
        }}
        title="Eliminar"
      >
        <Trash2 size={16} />
      </button>
    </div>
  )}
      </div>
      ))}
    </div>
  </div>
))}
</div>
)}

{/* Totales */}
<div style={{
marginTop: '1.5rem',
padding: '1rem',
background: 'var(--color-bg-secondary)',
borderRadius: '8px',
border: '1px solid var(--color-border)'
}}>
<div style={{ 
  display: 'flex', 
  justifyContent: 'space-between',
  marginBottom: '0.5rem',
  fontSize: '0.95rem'
}}>
  <span>Subtotal (Base Imposable):</span>
  <span style={{ fontWeight: 600 }}>{totals.baseImposable.toFixed(2)}€</span>
</div>
<div style={{ 
  display: 'flex', 
  justifyContent: 'space-between',
  marginBottom: '0.5rem',
  fontSize: '0.95rem'
}}>
  <span>IVA ({formData.ivaPercent}%):</span>
  <span style={{ fontWeight: 600 }}>+{totals.ivaImport.toFixed(2)}€</span>
</div>
<div style={{ 
  display: 'flex', 
  justifyContent: 'space-between',
  marginBottom: '0.75rem',
  fontSize: '0.95rem'
}}>
  <span>IRPF ({formData.irpfPercent}%):</span>
  <span style={{ fontWeight: 600 }}>-{totals.irpfImport.toFixed(2)}€</span>
</div>
<div style={{
  borderTop: '2px solid var(--color-border)',
  paddingTop: '0.75rem',
  display: 'flex',
  justifyContent: 'space-between',
  fontSize: '1.2rem',
  fontWeight: 700
}}>
  <span>TOTAL:</span>
  <span style={{ color: 'var(--color-accent-primary)' }}>
    {totals.totalFactura.toFixed(2)}€
  </span>
</div>
</div>
</div>
</div>
)}

{/* PESTAÑA 3: NOTES */}
{activeTab === 'notes' && (
  <div>
    <div style={{
      background: 'var(--color-bg-tertiary)',
      padding: '1.5rem',
      borderRadius: '8px'
    }}>
      <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>
        📄 Plantilles Disponibles
      </h3>

{/* Checkboxes - solo títulos */}
<div style={{ marginBottom: '1.5rem' }}>
  {plantilles
    .filter(p => p.tipusPlantilla === 'TPL-00002')
    .map(plantilla => {
      const estaSeleccionada = formData.plantillesSeleccionades.includes(plantilla.codi);
      const esPerDefecte = plantilla.perDefecte;

      return (
        <label
          key={plantilla.codi}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.5rem',
            cursor: esPerDefecte && estaSeleccionada ? 'not-allowed' : 'pointer',
            opacity: esPerDefecte && estaSeleccionada ? 0.7 : 1
          }}
        >
          <input
            type="checkbox"
            checked={estaSeleccionada}
            onChange={() => togglePlantilla(plantilla.codi)}
            disabled={clientBlocked || esPerDefecte && estaSeleccionada}
          />
          <span style={{ fontWeight: 600 }}>
            {plantilla.titol}
            {esPerDefecte && (
              <span style={{
                marginLeft: '0.5rem',
                fontSize: '0.7rem',
                background: '#10b981',
                color: 'white',
                padding: '0.15rem 0.4rem',
                borderRadius: '3px',
                fontWeight: 600
              }}>
                PER DEFECTE
              </span>
            )}
          </span>
        </label>
      );
    })}
</div>

{/* Cuadro de texto editable */}
<div>
  <label style={{ fontWeight: 600, marginBottom: '0.5rem', display: 'block' }}>
    Text del Peu de Pàgina
  </label>
  <textarea
    className="form-input"
    value={formData.plantillesText}
    onChange={(e) => setFormData({ ...formData, plantillesText: e.target.value })}
    rows={10}
    placeholder="Selecciona plantilles per veure el text aquí..."
    disabled={clientBlocked || tePagaments}
    />
    </div>
  </div>
</div>
)}

{/* PESTAÑA 4: PAGAMENT */}
{activeTab === 'pagament' && (
  <div>
    {/* Pagaments */}
    <div style={{
      background: 'var(--color-bg-tertiary)',
      padding: '1.5rem',
      borderRadius: '8px'
    }}>
      <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>
        💰 Registre de Pagaments
      </h3>

      {/* Resumen */}
      <div style={{
        background: 'var(--color-bg-secondary)',
        padding: '1rem',
        borderRadius: '6px',
        marginBottom: '1.5rem'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <span>Total Factura:</span>
          <span style={{ fontWeight: 600 }}>{totals.totalFactura.toFixed(2)}€</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <span>Total Pagat:</span>
          <span style={{ fontWeight: 600, color: '#10b981' }}>{formData.totalPagat.toFixed(2)}€</span>
        </div>
        <div style={{
          borderTop: '2px solid var(--color-border)',
          paddingTop: '0.75rem',
          marginTop: '0.75rem',
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '1.2rem',
          fontWeight: 700
        }}>
          <span>PENDENT:</span>
          <span style={{ color: totals.pendentCobrar > 0 ? '#dc2626' : '#10b981' }}>
            {totals.pendentCobrar.toFixed(2)}€
          </span>
        </div>
      </div>

      {/* Tabla de pagos */}
      {formData.pagaments.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.75rem' }}>
            Pagaments Registrats
          </h4>
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
                  <td style={{ padding: '0.5rem' }}>
                    {new Date(pag.data).toLocaleDateString('ca-ES')}
                  </td>
                  <td style={{ padding: '0.5rem', fontWeight: 600 }}>
                    {pag.import.toFixed(2)}€
                  </td>
                  <td style={{ padding: '0.5rem' }}>{pag.metode}</td>
                  <td style={{ padding: '0.5rem' }}>{pag.referencia || '-'}</td>
                  <td style={{ padding: '0.5rem', textAlign: 'right' }}>
                    <button
                      type="button"
                      onClick={() => eliminarPagament(pag.codi)}
                      className="btn-secondary"
                      style={{
                        padding: '0.25rem 0.5rem',
                        fontSize: '0.75rem'
                      }}
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Registrar nuevo pago */}
      {totals.pendentCobrar > 0.01 && (
        <div>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.75rem' }}>
            Registrar Nou Pagament
          </h4>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '150px 120px 150px 1fr auto', 
            gap: '0.5rem', 
            alignItems: 'end' 
          }}>
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
                <option value="altres">Altres</option>
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
  </div>
)}

{/* PESTAÑA 5: HISTORIAL */}
{activeTab === 'historial' && (
  <div>
    {/* Historial */}
    <div style={{
      background: 'var(--color-bg-tertiary)',
      padding: '1.5rem',
      borderRadius: '8px',
      marginBottom: '1.5rem'
    }}>
      <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>
        📅 Historial d'Accions
      </h3>

      <div style={{ 
        maxHeight: '300px', 
        overflow: 'auto',
        background: 'var(--color-bg-secondary)',
        padding: '1rem',
        borderRadius: '6px'
      }}>
        {[...formData.accions].reverse().map((accio, index) => (
          <div 
            key={index}
            style={{
              padding: '0.75rem',
              borderBottom: index < formData.accions.length - 1 ? '1px solid var(--color-border)' : 'none',
              display: 'flex',
              gap: '0.75rem'
            }}
          >
            <Clock size={16} style={{ 
              marginTop: '0.25rem',
              color: accio.automatic ? 'var(--color-accent-primary)' : 'var(--color-text-secondary)'
            }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--color-text-tertiary)' }}>
                {new Date(accio.data).toLocaleString('ca-ES')}
              </div>
              <div style={{ marginTop: '0.25rem' }}>
                {accio.descripcio}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* Registrar Acció */}
    <div style={{
      background: 'var(--color-bg-tertiary)',
      padding: '1.5rem',
      borderRadius: '8px'
    }}>
      <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>
        ➕ Registrar Acció
      </h3>

      <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr auto', gap: '0.75rem', alignItems: 'end' }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label style={{ fontSize: '0.85rem' }}>Data</label>
          <input
            type="date"
            className="form-input"
            value={novaAccio.data}
            onChange={(e) => setNovaAccio({ ...novaAccio, data: e.target.value })}
          />
        </div>

        <div className="form-group" style={{ margin: 0 }}>
          <label style={{ fontSize: '0.85rem' }}>Descripció</label>
          <input
            type="text"
            className="form-input"
            value={novaAccio.descripcio}
            onChange={(e) => setNovaAccio({ ...novaAccio, descripcio: e.target.value })}
            placeholder="Ex: Recordatori enviat per correu"
          />
        </div>

        <button
          type="button"
          onClick={registrarAccio}
          className="btn-secondary"
          style={{ height: 'fit-content' }}
        >
          Registrar
        </button>
      </div>
    </div>
  </div>
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
    // Si no hay cliente, cerrar sin guardar
    if (!formData.client) {
      const saved = localStorage.getItem('plateaFacturesVenta');
      if (saved) {
        const factures = JSON.parse(saved);
        const facturaExisteix = factures.some((f: any) => f.codi === formData.codi);
        
        if (facturaExisteix) {
          const filteredFactures = factures.filter((f: any) => f.codi !== formData.codi);
          localStorage.setItem('plateaFacturesVenta', JSON.stringify(filteredFactures));
        }
      }
      onClose();
      return;
    }
    
    // Validar que tenga al menos una tarea
    const totalTasques = formData.tasques.reduce((sum, cat) => sum + cat.tasques.length, 0);
    if (totalTasques === 0) {
      alert('⚠️ Cal afegir almenys una tasca per guardar la factura.');
      return;
    }
    
    // Si todo OK, guardar y cerrar
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
        const client = clients.find(c => c.codi === formData.client);
        
        return (
          <TascaModal
          onClose={() => {
            setShowTascaModal(false);
            setEditingTasca(null);
          }}
          onSave={afegirTasca}
existingCategories={formData.tasques
  .map(c => c.categoria)
  .filter(cat => cat !== undefined && cat !== null)}          editingTasca={
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
      {/* MODAL DE SELECCIÓN DE IDIOMA PARA PDF */}
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
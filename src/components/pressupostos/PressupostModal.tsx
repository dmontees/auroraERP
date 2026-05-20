import { useState, useEffect } from 'react';
import { X, Check, FileText, Trash2, FolderKanban } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Pressupost, TascaPressupost } from '../../types/pressupost';
import type { Client } from '../../types/client';
import SearchableSelect from '../common/SearchableSelect';
import { generarPressupostPDF } from '../../utils/generarPressupostPDF';
import { useAutoSave } from '../../hooks/useAutoSave';
import { registrarCreacioProjecte } from '../../utils/projecteHistorial';

interface PressupostModalProps {
  onClose: () => void;
  onSave: (pressupost: Pressupost) => void;
  onDelete?: (codi: string) => void;
  nextCode: string;
  editingPressupost?: Pressupost | null;
}


// ============================================================================
// COMPONENTE: MODAL DE PRESSUPOST
// Formulario con 4 pestañas para crear/editar presupuestos
// ============================================================================

function PressupostModal({
  onClose,
  onSave,
  onDelete,
  nextCode,
  editingPressupost
}: PressupostModalProps) {
  const [activeTab, setActiveTab] = useState<'dades' | 'projecte' | 'gastos' | 'tasques' | 'notes'>('dades');
  const [recursCopiado, setRecursCopiado] = useState<string | null>(null);
  const [materialCopiado, setMaterialCopiado] = useState<string | null>(null);
  const [showAfegirTascaModal, setShowAfegirTascaModal] = useState(false);
  const [novaTascaForm, setNovaTascaForm] = useState({
  servei: '',
  descripcio: '',
  quantitat: 1,
  unitat: '',
  tarifa: 0
});
  const [plantillesSeleccionades, setPlantillesSeleccionades] = useState<string[]>([]);
  const [searchClient, setSearchClient] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);

  // Array de codis de plantilles

  const [formData, setFormData] = useState<Pressupost>(
    editingPressupost || {
      dataCreacio: new Date().toISOString().split('T')[0],
      codi: nextCode,
      client: '',
      data: new Date().toISOString().split('T')[0],
      dataVenciment: '',
      iva: 21,
      retencioIRPF: 0,
      contacte: '',
      observacionsClient: '',
      nomProjecte: '',
      modalitat: '',
      dataProjecte: '',
      numJornades: 0,
      detallsProjecte: '',
      materials: [],
      recursosHumans: [],
      tasques: [],
      estat: 'esborrany',
      notesAPeu: '',
      projecteVinculat: ''
    }
  );

  const { saveNow } = useAutoSave(formData, onSave);

  const pressupostBloquejat = !!(formData.projecteCreat || formData.projecteVinculat);

  // Cargar plantillas por defecto al abrir el modal
  useEffect(() => {
    const parametresGuardats = localStorage.getItem('plateaParametres');
    if (parametresGuardats) {
      const parametres = JSON.parse(parametresGuardats);
      const tipusPeuPagina = parametres.tipusPlantilles?.find((t: any) => t.nom === 'Peu de pàgina de pressupost');
      
      if (tipusPeuPagina) {
        const plantillesDefecte = (parametres.plantilles || [])
          .filter((p: any) => p.tipusPlantilla === tipusPeuPagina.codi && p.perDefecte)
          .map((p: any) => p.codi);
        
        setPlantillesSeleccionades(plantillesDefecte);
        
        // Si es un nuevo presupuesto, pre-llenar las notas
        if (!editingPressupost) {
          const textDefecte = (parametres.plantilles || [])
            .filter((p: any) => p.tipusPlantilla === tipusPeuPagina.codi && p.perDefecte)
            .map((p: any) => `• ${p.text}`)
            .join('\n');
          
          setFormData(prev => ({ ...prev, notesAPeu: textDefecte }));
        }
      }
    }
  }, [editingPressupost]);

  // Cargar datos necesarios
  const [clients, setClients] = useState<Client[]>([]);
  const [proveidors, setProveidors] = useState<Proveidor[]>([]);
  const [parametres, setParametres] = useState<Parametres | null>(null);

  useEffect(() => {
    const savedClients = localStorage.getItem('plateaClients');
    if (savedClients) setClients(JSON.parse(savedClients));
    
    const savedProveidors = localStorage.getItem('plateaProveidors');
    if (savedProveidors) setProveidors(JSON.parse(savedProveidors));
    
    const savedParametres = localStorage.getItem('plateaParametres');
    if (savedParametres) {
      const data = JSON.parse(savedParametres);
      setParametres(data);
    }
  }, []);

  const selectedClient = clients.find(c => c.codi === formData.client);
  const clientBlocked = !formData.client; // Bloquear campos hasta seleccionar cliente

// Auto-calcular fecha de vencimiento (30 días después de la fecha del presupuesto)
useEffect(() => {
  if (formData.data && !editingPressupost) {
    const fecha = new Date(formData.data);
    fecha.setDate(fecha.getDate() + 30);
    const fechaVencimiento = fecha.toISOString().split('T')[0];
    setFormData(prev => ({ ...prev, dataVenciment: fechaVencimiento }));
  }
}, [formData.data, editingPressupost]);

// Cerrar dropdown de clientes al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = () => setShowClientDropdown(false);
    if (showClientDropdown) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showClientDropdown]);

// Funciones para manejar el cambio de servei 
  const handleServeiChange = (codiServei: string) => {
    const serveiData = parametres?.serveis.find(s => s.codi === codiServei);
    setNovaTascaForm({
      ...novaTascaForm,
      servei: codiServei,
      descripcio: serveiData?.descripcio || '',
      unitat: '', // Reset unitat para forzar selección
      tarifa: 0
    });
  };

// Función para añadir la nueva tasca
const guardarNovaTasca = () => {
  if (!novaTascaForm.servei || !novaTascaForm.unitat) {
    alert('Has de seleccionar un servei i una unitat');
    return;
  }

  const serveiData = parametres?.serveis.find(s => s.codi === novaTascaForm.servei);
  const categoria = serveiData?.categoria || '';

  const novaTasca: TascaPressupost = {
    id: `task-${Date.now()}-${Math.random()}`,
    categoria: categoria,
    servei: novaTascaForm.servei,
    descripcio: novaTascaForm.descripcio,
    quantitat: novaTascaForm.quantitat,
    unitat: novaTascaForm.unitat,
    tarifa: novaTascaForm.tarifa,
    importe: novaTascaForm.quantitat * novaTascaForm.tarifa,
    ordre: formData.tasques.filter(t => t.categoria === categoria).length
  };

  setFormData({
    ...formData,
    tasques: [...formData.tasques, novaTasca]
  });

  // Reset y cerrar
  setNovaTascaForm({
    servei: '',
    descripcio: '',
    quantitat: 1,
    unitat: '',
    tarifa: 0
  });
  setShowAfegirTascaModal(false);
};

  const handleUnitatChange = (codiUnitat: string) => {
    const tarifaClient = novaTascaForm.servei ? buscarTarifaClient(novaTascaForm.servei, codiUnitat) : 0;
    setNovaTascaForm({
      ...novaTascaForm,
      unitat: codiUnitat,
      tarifa: tarifaClient || 0
    });
  };

  // ============================================================================
  // FUNCIONES: BUSCAR TARIFA AUTOMÁTICA
  // ============================================================================

  // Buscar tarifa para cliente (tarifas especiales > tarifas generales)
  const buscarTarifaClient = (servei: string, unitat: string): number | null => {
    if (!selectedClient || !parametres) return null;
    
    // 1. Buscar en tarifas especiales del cliente
    const tarifaClient = selectedClient.tarifesEspecials?.find(
      t => t.servei === servei && t.unitat === unitat
    );
    if (tarifaClient) return tarifaClient.preu;
    
    // 2. Buscar en tarifas generales
    const tarifaGeneral = parametres.tarifes.find(
      t => t.servei === servei && t.unitat === unitat
    );
    if (tarifaGeneral) return tarifaGeneral.preu;
    
    return null;
  };

// Buscar tarifa SOLO en proveedor (sin fallback a parámetros)
const buscarTarifaProveidor = (proveidorCodi: string, servei: string, unitat: string): number | null => {
  // Buscar ÚNICAMENTE en tarifas especiales del proveedor (servicio + unidad)
  const proveidor = proveidors.find(p => p.codi === proveidorCodi);
  if (proveidor?.tarifesEspecials) {
    const tarifaProveidor = proveidor.tarifesEspecials.find(
      t => t.servei === servei && t.unitat === unitat
    );
    if (tarifaProveidor) {
      return tarifaProveidor.preu;
    }
  }
  
  // Si el proveedor no tiene tarifa configurada, devolver 0
  return 0;
};

  // ============================================================================
  // FUNCIONES: MATERIALS
  // ============================================================================

  const afegirMaterial = () => {
    const nouMaterial: MaterialPressupost = {
      id: `mat-${Date.now()}-${Math.random()}`,
      grup: '',
      material: '',
      proveidor: '',
      preuProveidor: 0,
      preuPlatea: 0
    };
    setFormData({ ...formData, materials: [...formData.materials, nouMaterial] });
  };
  
  const generarPDF = (idioma: 'ca' | 'es' | 'en') => {
    generarPressupostPDF(formData, clients, idioma);
  };

  const actualitzarMaterial = (id: string, field: keyof MaterialPressupost, value: any) => {
    const nousMaterials = formData.materials.map(m => {
      if (m.id !== id) return m;
      
      const updated = { ...m, [field]: value };
      
      // Si cambia el material, auto-rellenar datos
      if (field === 'material' && parametres) {
        const materialData = parametres.materials.find(mat => mat.codi === value);
        if (materialData) {
          updated.grup = materialData.grup;
          updated.proveidor = materialData.proveidor;
          updated.preuProveidor = materialData.preuProveidor;
          updated.preuPlatea = materialData.preuPlatea;
        }
      }
      
      return updated;
    });
    
    setFormData({ ...formData, materials: nousMaterials });
  };

  const eliminarMaterial = (id: string) => {
    setFormData({ ...formData, materials: formData.materials.filter(m => m.id !== id) });
  };

  // ============================================================================
  // FUNCIONES: RECURSOS HUMANS
  // ============================================================================

  const afegirRecursHuma = () => {
    const nouRecurs: RecursHumaPressupost = {
      id: `rh-${Date.now()}-${Math.random()}`,
      proveidor: '',
      categoria: '',
      servei: '',
      quantitat: 1,
      unitat: '',
      tarifa: 0,
      importe: 0
    };
    setFormData({ ...formData, recursosHumans: [...formData.recursosHumans, nouRecurs] });
  };

  const actualitzarRecursHuma = (id: string, field: keyof RecursHumaPressupost, value: any) => {
    const nousRecursos = formData.recursosHumans.map(r => {
      if (r.id !== id) return r;
      
      const updated = { ...r, [field]: value };
      
      // Auto-rellenar categoría al seleccionar servicio
      if (field === 'servei' && parametres) {
        const serveiData = parametres.serveis.find(s => s.codi === value);
        if (serveiData) {
          updated.categoria = serveiData.categoria;
        }
      }
      
// Auto-buscar tarifa cuando cambia proveidor, servei o unitat
if ((field === 'proveidor' || field === 'servei' || field === 'unitat') && updated.servei && updated.unitat && updated.proveidor) {
  const tarifaAuto = buscarTarifaProveidor(updated.proveidor, updated.servei, updated.unitat);
  if (tarifaAuto !== null) {
    updated.tarifa = tarifaAuto;
  }
}
      
      // Recalcular importe
      updated.importe = updated.quantitat * updated.tarifa;
      
      return updated;
    });
    
    setFormData({ ...formData, recursosHumans: nousRecursos });
  };

  const eliminarRecursHuma = (id: string) => {
    setFormData({ ...formData, recursosHumans: formData.recursosHumans.filter(r => r.id !== id) });
  };

  // Trasladar recursos humans y materials a tasques automáticamente
  const trasladarRecursATaska = (recurs: RecursHumaPressupost) => {
    if (!recurs.servei || !recurs.unitat) return;
    
    const serveiData = parametres?.serveis.find(s => s.codi === recurs.servei);
    
    const novaTasca: TascaPressupost = {
      id: `task-${Date.now()}-${Math.random()}`,
      categoria: recurs.categoria,
      servei: recurs.servei,
      descripcio: serveiData?.descripcio || '',
      quantitat: recurs.quantitat,
      unitat: recurs.unitat,
      tarifa: buscarTarifaClient(recurs.servei, recurs.unitat) || 0,
      importe: 0,
      ordre: formData.tasques.length
    };
    
    novaTasca.importe = novaTasca.quantitat * novaTasca.tarifa;
    
    setFormData({ 
      ...formData, 
      tasques: [...formData.tasques, novaTasca] 
    });
    
    // Feedback visual
    setRecursCopiado(recurs.id);
    setTimeout(() => setRecursCopiado(null), 1500);
  };
  const trasladarMaterialATaska = (material: MaterialPressupost) => {
    if (!material.material || !material.grup) return;
    
    const materialData = parametres?.materials.find(m => m.codi === material.material);
    const grupData = parametres?.grupsMaterials.find(g => g.codi === material.grup);
    
    if (materialData && grupData) {
      const novaTasca: TascaPressupost = {
        id: `task-${Date.now()}-${Math.random()}`,
        categoria: 'MATERIALS',
        servei: grupData.nom,
        descripcio: grupData.nom,
        quantitat: 1,
        unitat: '',
        tarifa: material.preuPlatea,
        importe: material.preuPlatea,
        ordre: formData.tasques.length
      };
      
      setFormData({ 
        ...formData, 
        tasques: [...formData.tasques, novaTasca] 
      });
      
      // Feedback visual
      setMaterialCopiado(material.id);
      setTimeout(() => setMaterialCopiado(null), 1500);
    }
  };
  // ============================================================================
  // FUNCIONES: TASQUES
  // ============================================================================

  const afegirTasca = () => {
    const novaTasca: TascaPressupost = {
      id: `task-${Date.now()}-${Math.random()}`,
      categoria: '',
      servei: '',
      descripcio: '',
      quantitat: 1,
      unitat: '',
      tarifa: 0,
      importe: 0,
      ordre: formData.tasques.length
    };
    setFormData({ ...formData, tasques: [...formData.tasques, novaTasca] });
  };

  const actualitzarTasca = (id: string, field: keyof TascaPressupost, value: any) => {
    const novesTasques = formData.tasques.map(t => {
      if (t.id !== id) return t;
      
      const updated = { ...t, [field]: value };
      
      // Auto-rellenar al seleccionar servicio
      if (field === 'servei' && parametres) {
        const serveiData = parametres.serveis.find(s => s.codi === value);
        if (serveiData) {
          updated.categoria = serveiData.categoria;
          updated.descripcio = serveiData.descripcio;
        }
      }
      
      // Auto-buscar tarifa cuando se completa servei + unitat
      if ((field === 'servei' || field === 'unitat') && updated.servei && updated.unitat) {
        const tarifaAuto = buscarTarifaClient(updated.servei, updated.unitat);
        if (tarifaAuto !== null) {
          updated.tarifa = tarifaAuto;
        }
      }
      
      // Recalcular importe
      updated.importe = updated.quantitat * updated.tarifa;
      
      return updated;
    });
    
    setFormData({ ...formData, tasques: novesTasques });
  };

  const eliminarTasca = (id: string) => {
    setFormData({ ...formData, tasques: formData.tasques.filter(t => t.id !== id) });
  };

  const moureTasca = (id: string, direccio: 'amunt' | 'avall') => {
    const index = formData.tasques.findIndex(t => t.id === id);
    if (index === -1) return;
    
    const tasca = formData.tasques[index];
    
    // Buscar la siguiente/anterior tarea de la MISMA categoría
    let targetIndex = -1;
    
    if (direccio === 'amunt') {
      // Buscar hacia arriba
      for (let i = index - 1; i >= 0; i--) {
        if (formData.tasques[i].categoria === tasca.categoria) {
          targetIndex = i;
          break;
        }
      }
    } else {
      // Buscar hacia abajo
      for (let i = index + 1; i < formData.tasques.length; i++) {
        if (formData.tasques[i].categoria === tasca.categoria) {
          targetIndex = i;
          break;
        }
      }
    }
    
    // Si no hay tarea vecina en la misma categoría, no hacer nada
    if (targetIndex === -1) return;
    
    // Intercambiar
    const novesTasques = [...formData.tasques];
    [novesTasques[index], novesTasques[targetIndex]] = [novesTasques[targetIndex], novesTasques[index]];
    
    // Actualizar orden
    novesTasques.forEach((t, i) => t.ordre = i);
    
    setFormData({ ...formData, tasques: novesTasques });
  };

  const moureCategoría = (categoriaNom: string, direccio: 'amunt' | 'avall') => {
    // Agrupar per categoria
    const grups: { nom: string; tasques: TascaPressupost[] }[] = [];
    const categoriesVistes = new Set<string>();
    
    formData.tasques.forEach(tasca => {
      const catNom = tasca.categoria === 'MATERIALS' 
        ? 'Materials' 
        : parametres?.categories.find(c => c.codi === tasca.categoria)?.nom || 'Sense categoria';
      
      if (!categoriesVistes.has(catNom)) {
        categoriesVistes.add(catNom);
        grups.push({
          nom: catNom,
          tasques: formData.tasques.filter(t => {
            const tCatNom = t.categoria === 'MATERIALS' 
              ? 'Materials' 
              : parametres?.categories.find(c => c.codi === t.categoria)?.nom || 'Sense categoria';
            return tCatNom === catNom;
          })
        });
      }
    });
    
    const indexCategoria = grups.findIndex(g => g.nom === categoriaNom);
    if (indexCategoria === -1) return;
    
    const newIndex = direccio === 'amunt' ? indexCategoria - 1 : indexCategoria + 1;
    if (newIndex < 0 || newIndex >= grups.length) return;
    
    // Intercambiar grups
    [grups[indexCategoria], grups[newIndex]] = [grups[newIndex], grups[indexCategoria]];
    
    // Reconstruir array de tasques
    const novesTasques: TascaPressupost[] = [];
    grups.forEach(grup => {
      novesTasques.push(...grup.tasques);
    });
    
    // Actualizar ordre
    novesTasques.forEach((t, i) => t.ordre = i);
    
    setFormData({ ...formData, tasques: novesTasques });
  };

  
  // ============================================================================
  // CÁLCULOS TOTALES
  // ============================================================================

  const totalGastos = 
  formData.materials.reduce((sum, m) => sum + m.preuProveidor, 0) +
  formData.recursosHumans.reduce((sum, r) => sum + r.importe, 0);
  
  const totalPressupost = formData.tasques.reduce((sum, t) => sum + t.importe, 0);
  const benefici = totalPressupost - totalGastos;
  const percentBenefici = totalPressupost > 0 ? (benefici / totalPressupost) * 100 : 0;
  
  // Agrupar tasques por categoría (para renderizar)
  const tasquesAgrupades = formData.tasques.reduce((acc, tasca) => {
    const catNom = tasca.categoria === 'MATERIALS' 
      ? 'Materials' 
      : parametres?.categories.find(c => c.codi === tasca.categoria)?.nom || 'Sense categoria';
    if (!acc[catNom]) acc[catNom] = [];
    acc[catNom].push(tasca);
    return acc;
  }, {} as Record<string, TascaPressupost[]>);

  const crearProjecteDesdePressupost = () => {
    // Confirmar con el usuario
    if (!confirm('Vols crear un projecte nou a partir d\'aquest pressupost?')) {
      return;
    }
  
    // Fecha de aceptación
    const dataAcceptacio = new Date().toISOString().split('T')[0];
  
    // Cargar proyectos existentes
    const savedProjectes = localStorage.getItem('plateaProjectes');
    const projectesActuals = savedProjectes ? JSON.parse(savedProjectes) : [];
  
    // Generar código del nuevo proyecto
    const maxNum = projectesActuals.length === 0 
      ? 0 
      : Math.max(...projectesActuals.map((p: any) => parseInt(p.codi.split('-')[1])));
    const nouCodiProjecte = `PRJ-${String(maxNum + 1).padStart(5, '0')}`;
  
    // Crear el proyecto desde el presupuesto
    const nouProjecte = {
      codi: nouCodiProjecte,
      client: formData.client,
      pressupost: formData.codi,
      factura: undefined,
      titol: formData.nomProjecte,
      descripcio: formData.detallsProjecte || '',
      modalitat: formData.modalitat || '',
      servei: formData.tipusProducció || '',
      esDirect: formData.esDirect || false,
      dataInici: new Date().toISOString().split('T')[0],
      dataEntrega: formData.dataLliurament || new Date().toISOString().split('T')[0],
      dataFinalitzacio: undefined,
      estat: 'planificat',
      recursosHumans: formData.recursosHumans.map((r, index) => ({
        id: `rh-${Date.now()}-${index}`,
        categoria: r.categoria,
        servei: r.servei,
        unitat: r.unitat,
        quantitat: r.quantitat,
        preu: r.tarifa || 0,
        cost: r.importe || 0,
        ordre: index,
        proveidor: r.proveidor || ''
      })),
      materials: formData.materials.map((m, index) => ({
        id: `mat-${Date.now()}-${index}`,
        grup: m.grup,
        material: m.material,
        proveidor: m.proveidor || '',
        preuProveidor: m.preuProveidor || 0,
        preuPlatea: m.preuPlatea || 0
      })),
      ingresSenseIVA: formData.baseImposable,
      iva: formData.iva,
      ingresAmbIVA: formData.totalAmbIVA,
      gastosMaterials: formData.materials.reduce((sum, m) => sum + (m.preuProveidor || 0), 0),
      gastosHumans: formData.recursosHumans.reduce((sum, r) => sum + (r.importe || 0), 0),
      gastosTotals: formData.recursosHumans.reduce((sum, r) => sum + (r.importe || 0), 0) + 
                    formData.materials.reduce((sum, m) => sum + (m.preuProveidor || 0), 0),
      benefici: formData.totalAmbIVA - (formData.recursosHumans.reduce((sum, r) => sum + (r.importe || 0), 0) + 
                                        formData.materials.reduce((sum, m) => sum + (m.preuProveidor || 0), 0)),
      percentBenefici: 0,
      instruccionsClient: '',
      instruccionsProveidors: '',
      tasques: formData.tasques.map((t, index) => ({
        ...t,
        id: `task-${Date.now()}-${index}`
      })),
      facturat: false,
      arxivat: false,
      historial: []
    };
  
    // Registrar creación desde presupuesto en el historial
const nouProjecteAmbHistorial = registrarCreacioProjecte(
  nouProjecte as any,
  formData.codi
);

    // Guardar el proyecto
    const novosProjectes = [...projectesActuals, nouProjecteAmbHistorial];
    localStorage.setItem('plateaProjectes', JSON.stringify(novosProjectes));
  
// Actualizar el presupuesto con la referencia al proyecto Y la fecha de aceptación
const pressupostActualitzat = { 
  ...formData, 
  projecteCreat: nouCodiProjecte,
  dataAcceptacio: dataAcceptacio
};

setFormData(pressupostActualitzat);

// GUARDAR INMEDIATAMENTE el presupuesto en localStorage
const savedPressupostos = localStorage.getItem('plateaPressupostos');
const pressupostosActuals = savedPressupostos ? JSON.parse(savedPressupostos) : [];
const pressupostosActualitzats = pressupostosActuals.map((p: Pressupost) => 
  p.codi === formData.codi ? pressupostActualitzat : p
);
localStorage.setItem('plateaPressupostos', JSON.stringify(pressupostosActualitzats));

// También llamar a onSave para actualizar la lista en el componente padre
onSave(pressupostActualitzat);

// Mostrar confirmación
alert(`Projecte ${nouCodiProjecte} creat correctament!\n\nEl pressupost s'ha bloquejat automàticament.\n\nPots trobar el projecte al mòdul de Projectes.`);
  };

// Cargar proyectos para validación
const [projectes, setProjectes] = useState<any[]>([]);

useEffect(() => {
  const savedProjectes = localStorage.getItem('plateaProjectes');
  if (savedProjectes) setProjectes(JSON.parse(savedProjectes));
}, []);

// Validar si el presupuesto es eliminable
const esEliminable = editingPressupost ? (() => {
  // Solo esborrany
  if (formData.estat !== 'esborrany') return false;
  
  // No tiene proyecto creado existente
  if (formData.projecteCreat) {
    const projecteExisteix = projectes.some(p => p.codi === formData.projecteCreat);
    if (projecteExisteix) return false;
  }
  
  // No tiene proyecto vinculado existente
  if (formData.projecteVinculat) {
    const projecteExisteix = projectes.some(p => p.codi === formData.projecteVinculat);
    if (projecteExisteix) return false;
  }
  
  return true;
})() : false;

// Función eliminar
const handleDelete = () => {
  if (!editingPressupost) {
    return;
  }
  
  let motiu = '';
  
  if (formData.estat !== 'esborrany') {
    motiu = 'Només es poden eliminar pressupostos en estat "Esborrany".';
  } else if (formData.projecteCreat && projectes.some(p => p.codi === formData.projecteCreat)) {
    motiu = `Aquest pressupost té un projecte creat (${formData.projecteCreat}) i no es pot eliminar.`;
  } else if (formData.projecteVinculat && projectes.some(p => p.codi === formData.projecteVinculat)) {
    motiu = `Aquest pressupost està vinculat a un projecte (${formData.projecteVinculat}) i no es pot eliminar.`;
  }
  
  if (motiu) {
    alert(motiu);
    return;
  }
  
  if (confirm(`Estàs segur que vols eliminar el pressupost ${formData.codi}?\n\nAquesta acció no es pot desfer.`)) {
    onDelete?.(formData.codi);
    onClose();
  } else {
  }
};

  return (
    <div className="modal-overlay">
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '1000px', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
{/* HEADER DEL MODAL */}
<div className="modal-header">
          <h2>
            <FileText size={24} />
            {editingPressupost ? 'Editar' : 'Nou'} Pressupost - {formData.codi}
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
              
              {/* Botón Crear Projecte - solo si está aceptado y no tiene proyecto */}
              {formData.estat === 'acceptat' && !formData.projecteCreat && !formData.projecteVinculat && (
                <button
                  type="button"
                  onClick={crearProjecteDesdePressupost}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 1rem',
                    background: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '0.9rem'
                  }}
                  title="Crear projecte des d'aquest pressupost"
                >
                  <FolderKanban size={18} />
                  Crear Projecte
                </button>
              )}

              {/* Indicador de proyecto vinculado */}
{(formData.projecteVinculat || formData.projecteCreat) && (
  <div 
    onClick={() => {
      const codiProjecte = formData.projecteVinculat || formData.projecteCreat;
        localStorage.setItem('plateaNavigateTo', JSON.stringify({
          type: 'projecte',
          codi: codiProjecte
        }));
        onClose();
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('navigate-to', { 
            detail: { section: 'projectes', codi: codiProjecte } 
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
    Projecte {formData.projecteCreat ? 'Creat' : 'Vinculat'}:<br /> {formData.projecteVinculat || formData.projecteCreat}
  </div>
)}

              <label style={{ fontSize: '0.9rem', fontWeight: 600 }}>Estat:</label>
              <select
                className="form-input"
                value={formData.estat}
                onChange={(e) => setFormData({ ...formData, estat: e.target.value as any })}
                style={{
                  padding: '0.5rem',
                  borderRadius: '6px',
                  fontWeight: 600,
                  background: formData.estat === 'esborrany' ? '#fef3c7' :
                             formData.estat === 'enviat' ? '#dbeafe' :
                             formData.estat === 'acceptat' ? '#d1fae5' : '#fee2e2',
                  color: formData.estat === 'esborrany' ? '#92400e' :
                         formData.estat === 'enviat' ? '#1e40af' :
                         formData.estat === 'acceptat' ? '#065f46' : '#991b1b',
                  border: 'none'
                }}
              >
                <option value="esborrany">Esborrany</option>
                <option value="enviat">Enviat</option>
                <option value="acceptat">Acceptat</option>
                <option value="rebutjat">Rebutjat</option>
              </select>
              
              {/* BOTÓN X PARA CERRAR */}
              <button
                type="button"
                onClick={() => { saveNow(); onClose(); }}                style={{
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
              { id: 'dades', label: '1. Dades' },
              { id: 'projecte', label: '2. Detalls Projecte' },
              { id: 'gastos', label: '3. Despeses i materials' },
              { id: 'tasques', label: '4. Tasques' },
              { id: 'notes', label: '5. Notes a peu de pàgina' }
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
                <div className="form-group">
                  <label>Codi</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.codi}
                    disabled
                    style={{ background: 'var(--color-bg-tertiary)', cursor: 'not-allowed' }}
                  />
                </div>

<div className="form-group" style={{ position: 'relative' }}>
                  <label>Client *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={searchClient || (formData.client ? (clients.find(c => c.codi === formData.client)?.nomComercial || clients.find(c => c.codi === formData.client)?.nomFiscal || '') : '')}
                    onChange={(e) => {
                      setSearchClient(e.target.value);
                      setShowClientDropdown(true);
                    }}
                    onFocus={() => setShowClientDropdown(true)}
                    placeholder="Cerca client..."
                    disabled={pressupostBloquejat}
                    required
                  />
                  
                  {showClientDropdown && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      maxHeight: '200px',
                      overflowY: 'auto',
                      background: 'white',
                      border: '1px solid var(--color-border)',
                      borderRadius: '4px',
                      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                      zIndex: 1000,
                      marginTop: '0.25rem'
                    }}>
                      {clients
                        .filter(c => {
                          const searchLower = searchClient.toLowerCase();
                          const nom = (c.nomComercial || c.nomFiscal).toLowerCase();
                          return nom.includes(searchLower);
                        })
                        .map(c => (
                          <div
                            key={c.codi}
                            onClick={() => {
                              const ivaNumero = c.tipusIVA === 'Normal' ? 21 : 0;
                              
                              setFormData({
                                ...formData,
                                client: c.codi,
                                iva: ivaNumero,
                                retencioIRPF: c.retencio || 0
                              });
                              setSearchClient('');
                              setShowClientDropdown(false);
                            }}
                            style={{
                              padding: '0.75rem',
                              cursor: 'pointer',
                              borderBottom: '1px solid var(--color-border)',
                              transition: 'background 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-bg-tertiary)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                          >
                            <div style={{ fontWeight: 600 }}>
                              {c.nomComercial || c.nomFiscal}
                            </div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-tertiary)' }}>
                              {c.codi} • {c.nif}
                            </div>
                          </div>
                        ))}
                      {clients.filter(c => {
                        const searchLower = searchClient.toLowerCase();
                        const nom = (c.nomComercial || c.nomFiscal).toLowerCase();
                        return nom.includes(searchLower);
                      }).length === 0 && (
                        <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--color-text-tertiary)' }}>
                          No s'han trobat clients
                        </div>
                      )}
                    </div>
                  )}
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

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label>Data del pressupost *</label>
                    <input
                      type="date"
                      className="form-input"
                      value={formData.data}
                      onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                      disabled={clientBlocked || pressupostBloquejat}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Data de venciment</label>
                    <input
                      type="date"
                      className="form-input"
                      value={formData.dataVenciment}
                      onChange={(e) => setFormData({ ...formData, dataVenciment: e.target.value })}
                      disabled={clientBlocked || pressupostBloquejat}
                    />
                    <p style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginTop: '0.25rem' }}>
                      Per defecte: 30 dies des de la data del pressupost
                    </p>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label>IVA (%)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={formData.iva}
                      onChange={(e) => setFormData({ ...formData, iva: parseFloat(e.target.value) || 0 })}
                      disabled={clientBlocked || pressupostBloquejat}
                      min="0"
                      max="100"
                      step="0.1"
                    />
                  </div>
                  <div className="form-group">
                    <label>Retenció IRPF (%)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={formData.retencioIRPF}
                      onChange={(e) => setFormData({ ...formData, retencioIRPF: parseFloat(e.target.value) || 0 })}
                      disabled={clientBlocked || pressupostBloquejat}
                      min="0"
                      max="100"
                      step="0.1"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Contacte (opcional)</label>
                  <SearchableSelect
  value={formData.contacte}
  onChange={(value) => setFormData({ ...formData, contacte: value })}
  options={selectedClient?.contactes.map(c => ({ 
    value: c.codi, 
    label: `${c.nom} - ${c.correu}` 
  })) || []}
  placeholder="Cap contacte"
  disabled={clientBlocked || pressupostBloquejat}
/>
                </div>

                <div className="form-group">
                  <label>Observacions del client</label>
                  <textarea
                    className="form-input"
                    value={formData.observacionsClient}
                    onChange={(e) => setFormData({ ...formData, observacionsClient: e.target.value })}
                    rows={6}
                    style={{ resize: 'vertical' }}
                    disabled={clientBlocked || pressupostBloquejat}
                    placeholder="Instruccions i indicacions del client..."
                  />
                </div>
              </div>
            )}
{/* PESTAÑA 2: DETALLS PROJECTE */}
{activeTab === 'projecte' && (
              <div>
                <div className="form-group">
                  <label>Nom del projecte *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.nomProjecte}
                    onChange={(e) => setFormData({ ...formData, nomProjecte: e.target.value })}
                    disabled={clientBlocked || pressupostBloquejat}
                    required
                    placeholder="Ex: Cobertura esdeveniment corporatiu..."
                  />
                </div>

                <div className="form-group">
                  <label>Modalitat</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.modalitat}
                    onChange={(e) => setFormData({ ...formData, modalitat: e.target.value })}
                    disabled={clientBlocked || pressupostBloquejat}
                    placeholder="Ex: Streaming + Gravació..."
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label>Data del projecte</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.dataProjecte}
                      onChange={(e) => setFormData({ ...formData, dataProjecte: e.target.value })}
                      disabled={clientBlocked || pressupostBloquejat}
                      placeholder="Ex: 15-16 de maig de 2026..."
                    />
                  </div>
                  <div className="form-group">
                    <label>Nombre de jornades</label>
                    <input
                      type="number"
                      className="form-input"
                      value={formData.numJornades}
                      onChange={(e) => setFormData({ ...formData, numJornades: parseInt(e.target.value) || 0 })}
                      disabled={clientBlocked || pressupostBloquejat}
                      min="0"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Detalls del projecte</label>
                  <textarea
                    className="form-input"
                    value={formData.detallsProjecte}
                    onChange={(e) => setFormData({ ...formData, detallsProjecte: e.target.value })}
                    rows={8}
                    style={{ resize: 'vertical' }}
                    disabled={clientBlocked || pressupostBloquejat}
                    placeholder="Descripció detallada del projecte i la cobertura..."
                  />
                </div>
              </div>
            )}
{/* PESTAÑA 3: GASTOS */}
{activeTab === 'gastos' && (
              <div>
                {/* TOTAL GASTOS */}
                <div style={{ 
                  padding: '1rem', 
                  background: 'var(--color-bg-tertiary)', 
                  borderRadius: '8px',
                  marginBottom: '2rem',
                  textAlign: 'right'
                }}>
                  <span style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', marginRight: '1rem' }}>
                    Total Despeses:
                  </span>
                  <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                    {totalGastos.toFixed(2)}€
                  </span>
                </div>

                {/* TABLA 1: MATERIALS */}
                <div style={{ marginBottom: '3rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                      Materials
                    </h3>
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={afegirMaterial}
                      disabled={clientBlocked || pressupostBloquejat}
                    >
                      + Afegir Material
                    </button>
                  </div>

                  {formData.materials.length === 0 ? (
                    <p style={{ textAlign: 'center', color: 'var(--color-text-tertiary)', padding: '2rem' }}>
                      No hi ha materials. Fes clic a "Afegir Material".
                    </p>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
<thead>
  <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
    <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600 }}>Grup</th>
    <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600 }}>Material</th>
    <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600 }}>Proveïdor</th>
    <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, width: '100px' }}>Preu Prov.</th>
    <th style={{ textAlign: 'right', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, width: '100px' }}>Preu Platea</th>
    <th style={{ width: '50px' }}></th>
  </tr>
</thead>
  <tbody>
    {formData.materials.map((material) => {
      const grupData = parametres?.grupsMaterials.find(g => g.codi === material.grup);
      
      return (
        <tr key={material.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
          <td style={{ padding: '0.75rem' }}>
            {grupData?.nom || '-'}
          </td>
          <td style={{ padding: '0.75rem' }}>
            <SearchableSelect
              value={material.material}
              onChange={(value) => actualitzarMaterial(material.id, 'material', value)}
              options={parametres?.materials.filter(m => m.estat === 'actiu').map(m => ({ 
                value: m.codi, 
                label: m.material 
              })) || []}
              placeholder="Selecciona material..."
              disabled={pressupostBloquejat}
            />
          </td>
          <td style={{ padding: '0.75rem' }}>
            <SearchableSelect
              value={material.proveidor}
              onChange={(value) => actualitzarMaterial(material.id, 'proveidor', value)}
              options={proveidors.map(p => ({ 
                value: p.codi, 
                label: p.nomComercial || p.nomFiscal 
              }))}
              placeholder="Cap proveïdor"
              disabled={pressupostBloquejat}
            />
          </td>
          <td style={{ padding: '0.75rem', textAlign: 'right', width: '100px' }}>
            <input
              type="number"
              className="form-input"
              value={material.preuProveidor}
              onChange={(e) => actualitzarMaterial(material.id, 'preuProveidor', parseFloat(e.target.value) || 0)}
              min="0"
              step="0.01"
              style={{ 
                textAlign: 'right',
                MozAppearance: 'textfield'
              }}
              onWheel={(e) => e.currentTarget.blur()}
              disabled={pressupostBloquejat}
            />
          </td>
          <td style={{ padding: '0.75rem', textAlign: 'right', width: '100px' }}>
            <input
              type="number"
              className="form-input"
              value={material.preuPlatea}
              onChange={(e) => actualitzarMaterial(material.id, 'preuPlatea', parseFloat(e.target.value) || 0)}
              min="0"
              step="0.01"
              style={{ 
                textAlign: 'right',
                MozAppearance: 'textfield'
              }}
              onWheel={(e) => e.currentTarget.blur()}
              disabled={pressupostBloquejat}
            />
          </td>
          <td style={{ padding: '0.75rem', textAlign: 'center' }}>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => trasladarMaterialATaska(material)}
                disabled={!material.material || !material.grup || pressupostBloquejat}
                style={{
                  background: materialCopiado === material.id ? '#10b981' : 'transparent',
                  border: `1px solid ${materialCopiado === material.id ? '#10b981' : 'var(--color-border)'}`,
                  borderRadius: '4px',
                  color: materialCopiado === material.id ? 'white' : 'var(--color-accent-primary)',
                  cursor: material.material ? 'pointer' : 'not-allowed',
                  padding: '0.25rem 0.5rem',
                  fontSize: '0.85rem',
                  opacity: (material.material && material.grup) ? 1 : 0.5,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  transition: 'all 0.3s ease'
                }}
                title="Trasladar a tasques"
              >
                {materialCopiado === material.id ? (
                  <>
                    <Check size={14} />
                    Copiat
                  </>
                ) : (
                  '→ Tasques'
                )}
              </button>
              <button
                type="button"
                onClick={() => eliminarMaterial(material.id)}
                disabled={pressupostBloquejat}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--color-error)',
                  cursor: 'pointer',
                  padding: '0.25rem',
                  opacity: pressupostBloquejat ? 0.5 : 1
                }}
              >
                <Trash2 size={18} />
              </button>
            </div>
          </td>
        </tr>
      );
    })}
  </tbody>
</table>
                  )}
                </div>

                {/* TABLA 2: RECURSOS HUMANS */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <div>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                        Recursos Humans i Logística
                      </h3>
                      <p style={{ fontSize: '0.85rem', color: 'var(--color-text-tertiary)', fontStyle: 'italic', marginTop: '0.25rem' }}>
                        * Les despeses d'aquesta taula poden ser orientatius
                      </p>
                    </div>
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={afegirRecursHuma}
                      disabled={clientBlocked || pressupostBloquejat}
                    >
                      + Afegir Recurs
                    </button>
                  </div>

                  {formData.recursosHumans.length === 0 ? (
                    <p style={{ textAlign: 'center', color: 'var(--color-text-tertiary)', padding: '2rem' }}>
                      No hi ha recursos humans. Fes clic a "Afegir Recurs".
                    </p>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
<thead>
  <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
    <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600 }}>Proveïdor</th>
    <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600 }}>Categoria</th>
    <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600 }}>Servei</th>
    <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, width: '80px' }}>Quantitat</th>
    <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600 }}>Unitat</th>
    <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, width: '100px' }}>Preu Prov.</th>
    <th style={{ textAlign: 'right', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600 }}>Import (€)</th>
    <th style={{ width: '80px' }}></th>
  </tr>
</thead>
  <tbody>
    {formData.recursosHumans.map((recurs) => {
      const categoriaData = parametres?.categories.find(c => c.codi === recurs.categoria);
      
      return (
        <tr key={recurs.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
          <td style={{ padding: '0.75rem' }}>
            <SearchableSelect
              value={recurs.proveidor}
              onChange={(value) => actualitzarRecursHuma(recurs.id, 'proveidor', value)}
              options={proveidors.map(p => ({ 
                value: p.codi, 
                label: p.nomComercial || p.nomFiscal 
              }))}
              placeholder="Selecciona proveïdor..."
              disabled={pressupostBloquejat}
            />
          </td>
          <td style={{ padding: '0.75rem', color: 'var(--color-text-secondary)' }}>
            {categoriaData?.nom || '-'}
          </td>
          <td style={{ padding: '0.75rem' }}>
            <SearchableSelect
              value={recurs.servei}
              onChange={(value) => actualitzarRecursHuma(recurs.id, 'servei', value)}
              options={parametres?.serveis.map(s => ({ value: s.codi, label: s.nom })) || []}
              placeholder="Selecciona servei..."
              disabled={pressupostBloquejat}
            />
          </td>
          <td style={{ padding: '0.75rem', width: '80px' }}>
            <input
              type="number"
              className="form-input"
              value={recurs.quantitat}
              onChange={(e) => actualitzarRecursHuma(recurs.id, 'quantitat', parseFloat(e.target.value) || 0)}
              min="0"
              step="0.01"
              style={{ 
                textAlign: 'right',
                MozAppearance: 'textfield'
              }}
              onWheel={(e) => e.currentTarget.blur()}
              disabled={pressupostBloquejat}
            />
          </td>
          <td style={{ padding: '0.75rem' }}>
            <SearchableSelect
              value={recurs.unitat}
              onChange={(value) => actualitzarRecursHuma(recurs.id, 'unitat', value)}
              options={parametres?.unitats.map(u => ({ value: u.codi, label: u.nom })) || []}
              placeholder="Selecciona unitat..."
              disabled={pressupostBloquejat}
            />
          </td>
          <td style={{ padding: '0.75rem', width: '100px' }}>
  <input
    type="number"
    className="form-input"
    value={recurs.tarifa}
    onChange={(e) => actualitzarRecursHuma(recurs.id, 'tarifa', parseFloat(e.target.value) || 0)}
    min="0"
    step="0.01"
    style={{ 
      textAlign: 'right',
      MozAppearance: 'textfield'
    }}
    onWheel={(e) => e.currentTarget.blur()}
    disabled={pressupostBloquejat}
  />
</td>
          <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600 }}>
            {recurs.importe.toFixed(2)}€
          </td>
          <td style={{ padding: '0.75rem', textAlign: 'center' }}>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => trasladarRecursATaska(recurs)}
                disabled={!recurs.servei || !recurs.unitat || pressupostBloquejat}
                style={{
                  background: recursCopiado === recurs.id ? '#10b981' : 'transparent',
                  border: `1px solid ${recursCopiado === recurs.id ? '#10b981' : 'var(--color-border)'}`,
                  borderRadius: '4px',
                  color: recursCopiado === recurs.id ? 'white' : 'var(--color-accent-primary)',
                  cursor: (recurs.servei && recurs.unitat) ? 'pointer' : 'not-allowed',
                  padding: '0.25rem 0.5rem',
                  fontSize: '0.85rem',
                  opacity: (recurs.servei && recurs.unitat) ? 1 : 0.5,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  transition: 'all 0.3s ease'
                }}
                title="Trasladar a tasques"
              >
                {recursCopiado === recurs.id ? (
                  <>
                    <Check size={14} />
                    Copiat
                  </>
                ) : (
                  '→ Tasques'
                )}
              </button>
              <button
                type="button"
                onClick={() => eliminarRecursHuma(recurs.id)}
                disabled={pressupostBloquejat}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--color-error)',
                  cursor: 'pointer',
                  padding: '0.25rem',
                  opacity: pressupostBloquejat ? 0.5 : 1
                }}
              >
                <Trash2 size={18} />
              </button>
            </div>
          </td>
        </tr>
      );
    })}
  </tbody>
</table>
                  )}
                </div>
              </div>
            )}
{/* PESTAÑA 4: TASQUES */}
{activeTab === 'tasques' && (
              <div>
                {/* TOTALES SUPERIORES */}
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(4, 1fr)', 
                  gap: '1rem',
                  marginBottom: '2rem'
                }}>
                  <div style={{ 
                    padding: '1rem', 
                    background: 'var(--color-bg-tertiary)', 
                    borderRadius: '8px',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginBottom: '0.5rem' }}>
                      DESPESES
                    </div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                      {totalGastos.toFixed(2)}€
                    </div>
                  </div>
                  
                  <div style={{ 
                    padding: '1rem', 
                    background: 'var(--color-bg-tertiary)', 
                    borderRadius: '8px',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginBottom: '0.5rem' }}>
                      TOTAL PRESSUPOST
                    </div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                      {totalPressupost.toFixed(2)}€
                    </div>
                  </div>
                  
                  <div style={{ 
                    padding: '1rem', 
                    background: benefici >= 0 ? '#d1fae5' : '#fee2e2', 
                    borderRadius: '8px',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginBottom: '0.5rem' }}>
                      BENEFICI
                    </div>
                    <div style={{ 
                      fontSize: '1.25rem', 
                      fontWeight: 700, 
                      color: benefici >= 0 ? '#065f46' : '#991b1b'
                    }}>
                      {benefici.toFixed(2)}€
                    </div>
                  </div>
                  
                  <div style={{ 
                    padding: '1rem', 
                    background: benefici >= 0 ? '#d1fae5' : '#fee2e2', 
                    borderRadius: '8px',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginBottom: '0.5rem' }}>
                      % BENEFICI
                    </div>
                    <div style={{ 
                      fontSize: '1.25rem', 
                      fontWeight: 700, 
                      color: benefici >= 0 ? '#065f46' : '#991b1b'
                    }}>
                      {percentBenefici.toFixed(1)}%
                    </div>
                  </div>
                </div>

                {/* BOTÓN AFEGIR TASCA */}
                <div style={{ marginBottom: '1rem' }}>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => setShowAfegirTascaModal(true)}
                    disabled={clientBlocked}
                  >
                    + Afegir Tasca
                  </button>
                </div>

                {/* TABLA DE TASQUES AGRUPADAS POR CATEGORÍA */}
                {formData.tasques.length === 0 ? (
                  <p style={{ textAlign: 'center', color: 'var(--color-text-tertiary)', padding: '2rem' }}>
                    No hi ha tasques. Fes clic a "Afegir Tasca" o afegeix recursos humans a la pestanya anterior.
                  </p>
                ) : (
                  <div>
                    {Object.entries(tasquesAgrupades).map(([categoriaNom, tasques]) => (
                      <div key={categoriaNom} style={{ marginBottom: '2rem' }}>
{/* HEADER DE CATEGORÍA */}
                        <div style={{ 
                          background: 'var(--color-accent-primary)', 
                          color: 'white',
                          padding: '0.75rem 1rem',
                          fontWeight: 700,
                          fontSize: '0.95rem',
                          borderRadius: '4px 4px 0 0',
                          textTransform: 'uppercase',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <span>{categoriaNom}</span>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                              type="button"
                              onClick={() => moureCategoría(categoriaNom, 'amunt')}
                              style={{
                                background: 'rgba(255,255,255,0.2)',
                                border: '1px solid rgba(255,255,255,0.4)',
                                borderRadius: '4px',
                                color: 'white',
                                cursor: 'pointer',
                                padding: '0.25rem 0.5rem',
                                fontSize: '0.75rem',
                                fontWeight: 'bold'
                              }}
                              title="Moure categoria amunt"
                            >
                              ▲
                            </button>
                            <button
                              type="button"
                              onClick={() => moureCategoría(categoriaNom, 'avall')}
                              style={{
                                background: 'rgba(255,255,255,0.2)',
                                border: '1px solid rgba(255,255,255,0.4)',
                                borderRadius: '4px',
                                color: 'white',
                                cursor: 'pointer',
                                padding: '0.25rem 0.5rem',
                                fontSize: '0.75rem',
                                fontWeight: 'bold'
                              }}
                              title="Moure categoria avall"
                            >
                              ▼
                            </button>
                          </div>
                        </div>

                        {/* TABLA DE TASQUES DE ESTA CATEGORÍA */}
                        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1rem' }}>
                        <thead>
  <tr style={{ borderBottom: '2px solid var(--color-border)', background: 'var(--color-bg-tertiary)' }}>
    <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, width: '180px' }}>Servei</th>
    <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, width: '35%' }}>Descripció</th>
    <th style={{ textAlign: 'right', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, width: '60px' }}>Quantitat</th>
    <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, width: '180px' }}>Unitat</th>
    <th style={{ textAlign: 'right', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, width: '130px' }}>Tarifa (€)</th>
    <th style={{ textAlign: 'right', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, width: '120px' }}>Import (€)</th>
    <th style={{ width: '100px' }}></th>
  </tr>
</thead>
                          <tbody>
                            {tasques.map((tasca) => {
                              const serveiData = parametres?.serveis.find(s => s.codi === tasca.servei);
                              const unitatData = parametres?.unitats.find(u => u.codi === tasca.unitat);
                              
                              return (
                                <tr key={tasca.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
<td style={{ padding: '0.75rem' }}>
                                    {tasca.categoria === 'MATERIALS' ? (
                                      <div style={{ 
                                        padding: '0.5rem',
                                        background: 'var(--color-bg-tertiary)',
                                        borderRadius: '4px',
                                        color: 'var(--color-text-secondary)',
                                        fontSize: '0.9rem'
                                      }}>
                                        {tasca.servei}
                                      </div>
                                    ) : (
                                      <SearchableSelect
  value={tasca.servei}
  onChange={(value) => actualitzarTasca(tasca.id, 'servei', value)}
  options={parametres?.serveis.map(s => ({ value: s.codi, label: s.nom })) || []}
  placeholder="Selecciona servei..."
  disabled={pressupostBloquejat}
/>
                                    )}
                                  </td>
                                  <td style={{ padding: '0.75rem' }}>
                                    <textarea
                                      className="form-input"
                                      value={tasca.descripcio}
                                      onChange={(e) => actualitzarTasca(tasca.id, 'descripcio', e.target.value)}
                                      rows={2}
                                      style={{ resize: 'vertical' }}
                                      placeholder="Descripció del servei..."
                                      disabled={pressupostBloquejat}
                                    />
                                  </td>
                                  <td style={{ padding: '0.75rem' }}>
                                    <input
                                      type="number"
                                      className="form-input"
                                      value={tasca.quantitat}
                                      onChange={(e) => actualitzarTasca(tasca.id, 'quantitat', parseFloat(e.target.value) || 0)}
                                      min="0"
                                      step="0.01"
                                      style={{ textAlign: 'right' }}
                                      disabled={pressupostBloquejat}
                                    />
                                  </td>
                                  <td style={{ padding: '0.75rem' }}>
                                    {tasca.categoria === 'MATERIALS' ? (
                                      <div style={{ 
                                        padding: '0.5rem',
                                        background: 'var(--color-bg-tertiary)',
                                        borderRadius: '4px',
                                        color: 'var(--color-text-tertiary)',
                                        fontSize: '0.9rem',
                                        textAlign: 'center'
                                      }}>
                                        -
                                      </div>
                                    ) : (
                                      <SearchableSelect
  value={tasca.unitat}
  onChange={(value) => actualitzarTasca(tasca.id, 'unitat', value)}
  options={parametres?.unitats.map(u => ({ value: u.codi, label: u.nom })) || []}
  placeholder="Selecciona unitat..."
  disabled={pressupostBloquejat}
/>
                                    )}
                                  </td>
                                  <td style={{ padding: '0.75rem' }}>
                                    <input
                                      type="number"
                                      className="form-input"
                                      value={tasca.tarifa}
                                      onChange={(e) => actualitzarTasca(tasca.id, 'tarifa', parseFloat(e.target.value) || 0)}
                                      min="0"
                                      step="0.01"
                                      style={{ textAlign: 'right' }}
                                      disabled={pressupostBloquejat}
                                    />
                                  </td>
                                  <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 700, fontSize: '1rem' }}>
                                    {tasca.importe.toFixed(2)}€
                                  </td>
                                  <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                                    <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center' }}>
                                      <button
                                        type="button"
                                        onClick={() => moureTasca(tasca.id, 'amunt')}
                                        style={{
                                          background: 'transparent',
                                          border: '1px solid var(--color-border)',
                                          borderRadius: '4px',
                                          color: 'var(--color-text-secondary)',
                                          cursor: 'pointer',
                                          padding: '0.25rem',
                                          display: 'flex',
                                          alignItems: 'center'
                                        }}
                                        title="Moure amunt"
                                      >
                                        ▲
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => moureTasca(tasca.id, 'avall')}
                                        style={{
                                          background: 'transparent',
                                          border: '1px solid var(--color-border)',
                                          borderRadius: '4px',
                                          color: 'var(--color-text-secondary)',
                                          cursor: 'pointer',
                                          padding: '0.25rem',
                                          display: 'flex',
                                          alignItems: 'center'
                                        }}
                                        title="Moure avall"
                                      >
                                        ▼
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => eliminarTasca(tasca.id)}
                                        disabled={pressupostBloquejat}
                                        style={{
                                          background: 'transparent',
                                          border: 'none',
                                          color: 'var(--color-error)',
                                          cursor: 'pointer',
                                          padding: '0.25rem',
                                          opacity: pressupostBloquejat ? 0.5 : 1
                                        }}
                                      >
                                        <Trash2 size={18} />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ))}
                  </div>
                )}
          {/* MODAL AFEGIR TASCA */}
{showAfegirTascaModal && (
  <div className="modal-overlay" onClick={() => setShowAfegirTascaModal(false)}>
    <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
      <div className="modal-header">
        <h2>Afegir Tasca</h2>
        <button className="modal-close" onClick={() => { saveNow(); onClose(); }}>
          <X size={24} />
        </button>
      </div>
      
      <div className="modal-body">
      <div className="form-group">
  <label>Servei *</label>
  <SearchableSelect
    value={novaTascaForm.servei}
    onChange={(value) => {
      // Buscar el servicio seleccionado
      const serveiData = parametres?.serveis.find(s => s.codi === value);
      
      // Actualizar servei y descripción automáticamente
      setNovaTascaForm({ 
        ...novaTascaForm, 
        servei: value,
        descripcio: serveiData?.descripcio || '' // Auto-rellenar descripción
      });
    }}
    options={parametres?.serveis.map(s => ({ value: s.codi, label: s.nom })) || []}
    placeholder="Selecciona servei..."
    disabled={pressupostBloquejat}
  />
</div>

<div className="form-group">
  <label>Descripció</label>
  <textarea
    className="form-input"
    value={novaTascaForm.descripcio}
    onChange={(e) => setNovaTascaForm({ ...novaTascaForm, descripcio: e.target.value })}
    disabled={pressupostBloquejat}
    rows={3}
    placeholder="Descripció del servei..."
  />
</div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="form-group">
            <label>Quantitat *</label>
            <input
              type="number"
              className="form-input"
              value={novaTascaForm.quantitat}
              onChange={(e) => setNovaTascaForm({ ...novaTascaForm, quantitat: parseFloat(e.target.value) || 0 })}
              min="0"
              step="0.01"
              disabled={pressupostBloquejat}
            />
          </div>

          <div className="form-group">
            <label>Unitat *</label>
            <select
              className="form-input"
              value={novaTascaForm.unitat}
              onChange={(e) => handleUnitatChange(e.target.value)}
              disabled={pressupostBloquejat}
            >
              <option value="">Selecciona unitat...</option>
              {parametres?.unitats.map(u => (
                <option key={u.codi} value={u.codi}>{u.nom}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label>Tarifa (€)</label>
          <input
            type="number"
            className="form-input"
            value={novaTascaForm.tarifa}
            onChange={(e) => setNovaTascaForm({ ...novaTascaForm, tarifa: parseFloat(e.target.value) || 0 })}
            min="0"
            step="0.01"
            disabled={pressupostBloquejat}
          />
        </div>

        <div style={{ 
          padding: '1rem', 
          background: 'var(--color-bg-tertiary)', 
          borderRadius: '6px',
          marginTop: '1rem'
        }}>
          <strong>Import total:</strong> {(novaTascaForm.quantitat * novaTascaForm.tarifa).toFixed(2)}€
        </div>
      </div>

      <div className="modal-footer">
        <button 
          type="button" 
          className="btn-secondary" 
          onClick={() => setShowAfegirTascaModal(false)}
        >
          Cancel·lar
        </button>
        <button 
          type="button" 
          className="btn-primary" 
          onClick={guardarNovaTasca}
        >
          Afegir Tasca
        </button>
      </div>
    </div>
  </div>
)}
              </div>
                    )}

{/* PESTAÑA 5: NOTES A PEU DE PÀGINA */}
{activeTab === 'notes' && (
          <div>
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '1rem' }}>
                Plantilles disponibles
              </h3>
              
              {(() => {
                const parametresGuardats = localStorage.getItem('plateaParametres');
                if (!parametresGuardats) return <p style={{ color: 'var(--color-text-tertiary)' }}>No hi ha plantilles disponibles</p>;
                
                const parametres = JSON.parse(parametresGuardats);
                const tipusPeuPagina = parametres.tipusPlantilles?.find((t: any) => t.nom === 'Peu de pàgina de pressupost');
                
                if (!tipusPeuPagina) return <p style={{ color: 'var(--color-text-tertiary)' }}>No hi ha plantilles de peu de pàgina</p>;
                
                const plantillesPeu = (parametres.plantilles || []).filter((p: any) => p.tipusPlantilla === tipusPeuPagina.codi);
                
                if (plantillesPeu.length === 0) return <p style={{ color: 'var(--color-text-tertiary)' }}>No hi ha plantilles creades</p>;
                
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {plantillesPeu.map((plantilla: any) => {
                      const isChecked = plantillesSeleccionades.includes(plantilla.codi);
                      const isDisabled = plantilla.perDefecte;
                      
                      return (
<label
                          key={plantilla.codi}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.5rem 0.75rem',
                            background: isChecked ? 'var(--color-bg-tertiary)' : 'transparent',
                            border: '1px solid var(--color-border)',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              
                              if (checked) {
                                // Añadir plantilla
                                setPlantillesSeleccionades(prev => [...prev, plantilla.codi]);
                                setFormData(prev => ({
                                  ...prev,
                                  notesAPeu: prev.notesAPeu 
                                    ? `${prev.notesAPeu}\n• ${plantilla.text}`
                                    : `• ${plantilla.text}`
                                }));
                              } else {
                                // Eliminar plantilla
                                setPlantillesSeleccionades(prev => prev.filter(c => c !== plantilla.codi));
                                // El usuario debe eliminar el texto manualmente del textarea
                              }
                            }}
                            disabled={clientBlocked || pressupostBloquejat}
                            style={{
                              width: '18px',
                              height: '18px',
                              cursor: 'pointer'
                            }}
                          />
                          <div style={{ flex: 1 }}>
                          <div style={{ flex: 1, fontSize: '0.9rem', fontWeight: 500, color: 'var(--color-text-primary)' }}>
                            {plantilla.titol}
                            {plantilla.perDefecte && (
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
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            <div className="form-group" style={{ marginTop: '2rem' }}>
              <label style={{ fontSize: '1rem', fontWeight: 600 }}>
                Notes a peu de pàgina
                <span style={{ fontSize: '0.85rem', fontWeight: 400, color: 'var(--color-text-tertiary)', marginLeft: '0.5rem' }}>
                  (Text editable)
                </span>
              </label>
              <textarea
                className="form-input"
                value={formData.notesAPeu}
                onChange={(e) => setFormData({ ...formData, notesAPeu: e.target.value })}
                rows={12}
                style={{ resize: 'vertical', fontFamily: 'monospace' }}
                placeholder="Les notes seleccionades apareixeran aquí. Podeu editar el text lliurement..."
                disabled={pressupostBloquejat}
              />
            </div>
          </div>
        )}
        </div>

{/* FOOTER DEL MODAL */}
<div className="modal-footer" style={{
  display: 'flex',
  justifyContent: editingPressupost && esEliminable ? 'space-between' : 'flex-end',
  gap: '1rem',
  flexShrink: 0
}}>
  {editingPressupost && esEliminable && (
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
  
  <button type="button" className="btn-primary" onClick={() => {
    saveNow();
    onClose();
  }}>
    Acceptar
  </button>
</div>
</div>
</div>

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
        
// COMPONENTE: Placeholder de Sección
// ============================================================================

function SectionPlaceholder({ section }: { section: Exclude<Section, 'dashboard'> }) {
  const sectionContent: Record<Exclude<Section, 'dashboard'>, { title: string; features: string[] }> = {
    'projectes': {
      title: 'Gestió de Projectes Audiovisuals',
      features: [
        '📋 Llista de projectes actius, completats i en planificació',
        '🎬 Detalls de producció: tipus, data, client, pressupost',
        '📊 Seguiment de fases: preproducció, producció, postproducció',
        '💰 Vinculació amb pressupostos i factures',
        '👥 Assignació d\'equip tècnic i col·laboradors'
      ]
    },
    'clients': {
      title: 'Base de Dades de Clients',
      features: [
        '👤 Informació completa: nom, empresa, contacte, CIF',
        '📞 Dades de contacte i adreça',
        '📝 Historial de projectes realitzats',
        '💶 Facturació total i pendent',
        '🏷️ Etiquetes i categorització (discogràfica, corporatiu, cultural)'
      ]
    },
    'proveidors': {
      title: 'Gestió de Proveïdors',
      features: [
        '🎥 Col·laboradors tècnics: càmeres, so, il·luminació',
        '🏢 Empreses de lloguer d\'equips',
        '✏️ Freelancers: editors, motion graphics, coloristes',
        '📋 Condicions comercials i tarifes',
        '📊 Historial de col·laboracions i facturació'
      ]
    },
    'pressupostos': {
      title: 'Creació de Pressupostos',
      features: [
        '📝 Plantilles per tipus de producció (directe, guionitzada, reportatge)',
        '💰 Desglossament detallat: preproducció, producció, postproducció',
        '➕ Conceptes personalitzables i línies de detall',
        '📈 Càlcul automàtic d\'IVA i totals',
        '📄 Generació de PDF professional amb logotip de Platea Films'
      ]
    },
    'factures-venda': {
      title: 'Factures Emeses',
      features: [
        '🧾 Numeració automàtica correlativa',
        '📅 Data d\'emissió i venciment',
        '🔗 Vinculació amb projectes i pressupostos',
        '✅ Estats: pendent, cobrada, vençuda',
        '📊 Exportació per a gestoria'
      ]
    },
    'factures-compra': {
      title: 'Factures de Proveïdors',
      features: [
        '📥 Registre de factures rebudes',
        '🔗 Associació a projectes específics',
        '💳 Control de pagaments i venciments',
        '📊 Desglossament d\'IVA i IRPF',
        '📁 Emmagatzematge de documents digitalitzats'
      ]
    },
    'resultats': {
      title: 'Anàlisi de Resultats',
      features: [
        '💹 Marge de benefici per projecte',
        '📊 Comparativa: ingressos vs despeses',
        '📈 Gràfics d\'evolució temporal',
        '🎯 Rendibilitat per tipus de producció',
        '📉 Projectes més/menys rendibles'
      ]
    },
    'parts-treball': {
      title: 'Registre d\'Hores',
      features: [
        '⏱️ Part diari de treball de l\'equip',
        '🔗 Vinculació a projectes',
        '👥 Registre per col·laborador',
        '📅 Calendari de disponibilitat',
        '💰 Càlcul de costos reals de mà d\'obra'
      ]
    },
    'calendari': {
      title: 'Planificació Temporal',
      features: [
        '📅 Vista mensual de produccions',
        '🎬 Dates clau: rodatges, lliuraments, esdeveniments',
        '⚠️ Alertes de venciments (pressupostos, factures)',
        '👥 Disponibilitat de l\'equip',
        '🔄 Sincronització amb eines externes (opcional)'
      ]
    }
  };

  const content = sectionContent[section];

  return (
    <div className="section-placeholder">
      <div className="placeholder-card">
        <div className="placeholder-header">
          <div className="status-badge">En desenvolupament</div>
          <h3>{content.title}</h3>
        </div>
        
        <div className="placeholder-content">
          <p className="placeholder-intro">
            Aquesta secció inclourà les següents funcionalitats:
          </p>
          
          <ul className="feature-list">
            {content.features.map((feature, index) => (
              <li key={index} className="feature-item">
                {feature}
              </li>
            ))}
          </ul>

          <div className="placeholder-footer">
            <div className="info-box">
              <strong>📍 Estat actual:</strong> Estructura base creada. Els components 
              funcionals s'implementaran progressivament.
            </div>
            <div className="info-box">
              <strong>💾 Emmagatzematge:</strong> Les dades es desaran a localStorage 
              del navegador inicialment. Més endavant es podrà migrar a una base de dades.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
// ============================================================================
// COMPONENTE: MODAL DE MATERIAL
// ============================================================================

function MaterialModal({
  material,
  onClose,
  onSave,
  onMarcarNoUtilitzat,
  onReactivar,
  nextCode,
  grups,
  proveidors
}: {
  material: Material | null;
  onClose: () => void;
  onSave: (material: Material) => void;
  onMarcarNoUtilitzat: (codi: string) => void;
  onReactivar: (codi: string) => void;
  nextCode: string;
  grups: GrupMaterial[];
  proveidors: Proveidor[];
}) {
  const [formData, setFormData] = useState<Material>(
    material || {
      codi: nextCode,
      material: '',
      grup: '',
      proveidor: '',
      enllacAlquiler: '',
      preuProveidor: 0,
      preuPlatea: 0,
      estat: 'actiu'
    }
  );
  
  const [showAfegirTascaModal, setShowAfegirTascaModal] = useState(false);

// Estado inicial para detectar cambios
const { handleCloseWithConfirm, resetEstadoInicial } = useUnsavedChanges(formData, editingPressupost);

const esNoUtilitzat = formData.estat === 'no_utilitzat';

  return (
<div className="modal-overlay" onClick={() => handleCloseWithConfirm(onClose)}
>
        <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <h2>
            <Building size={24} />
            {material ? 'Editar' : 'Nou'} Material
            {esNoUtilitzat && (
              <span style={{
                marginLeft: '0.5rem',
                fontSize: '0.75rem',
                background: '#6b7280',
                color: 'white',
                padding: '0.25rem 0.5rem',
                borderRadius: '4px',
                fontWeight: 700
              }}>
                NO UTILITZAT
              </span>
            )}
          </h2>
          <button className="modal-close" onClick={() => { saveNow(); onClose(); }}>
  <X size={24} />
</button>
        </div>

        <div>
          <div className="modal-body">
            <div className="form-group">
              <label>Codi</label>
              <input
                type="text"
                className="form-input"
                value={formData.codi}
                disabled
                style={{ background: 'var(--color-bg-tertiary)', cursor: 'not-allowed' }}
              />
            </div>

            <div className="form-group">
              <label>Material (marca i model) *</label>
              <input
                type="text"
                className="form-input"
                value={formData.material}
                onChange={(e) => setFormData({ ...formData, material: e.target.value })}
                required
                disabled={esNoUtilitzat}
                placeholder="Ex: Sony FX6, Aputure 300d II..."
              />
            </div>

            <div className="form-group">
              <label>Grup *</label>
              <select
                className="form-input"
                value={formData.grup}
                onChange={(e) => setFormData({ ...formData, grup: e.target.value })}
                required
                disabled={esNoUtilitzat || pressupostBloquejat}
              >
                <option value="">Selecciona un grup...</option>
                {grups.map(g => (
                  <option key={g.codi} value={g.codi}>{g.nom}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Proveïdor (opcional)</label>
              <select
                className="form-input"
                value={formData.proveidor}
                onChange={(e) => setFormData({ ...formData, proveidor: e.target.value })}
                disabled={esNoUtilitzat || pressupostBloquejat}
              >
                <option value="">Cap proveïdor</option>
                {proveidors.map(p => (
                  <option key={p.codi} value={p.codi}>
                    {p.nomComercial || p.nomFiscal}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Enllaç d'alquiler (opcional)</label>
              <input
                type="url"
                className="form-input"
                value={formData.enllacAlquiler}
                onChange={(e) => setFormData({ ...formData, enllacAlquiler: e.target.value })}
                disabled={esNoUtilitzat}
                placeholder="https://..."
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label>Preu proveïdor (€)</label>
                <input
                  type="number"
                  className="form-input"
                  value={formData.preuProveidor}
                  onChange={(e) => setFormData({ ...formData, preuProveidor: parseFloat(e.target.value) })}
                  min="0"
                  step="0.01"
                  disabled={esNoUtilitzat}
                />
              </div>
              <div className="form-group">
                <label>Preu Platea Films (€) *</label>
                <input
                  type="number"
                  className="form-input"
                  value={formData.preuPlatea}
                  onChange={(e) => setFormData({ ...formData, preuPlatea: parseFloat(e.target.value) })}
                  min="0"
                  step="0.01"
                  required
                  disabled={esNoUtilitzat || pressupostBloquejat}
                />
              </div>
            </div>

            {material && (
              <div style={{ 
                marginTop: '1.5rem', 
                padding: '1rem', 
                background: 'var(--color-bg-tertiary)', 
                borderRadius: '8px' 
              }}>
                {esNoUtilitzat ? (
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => {
                      onReactivar(formData.codi);
                      onClose();
                    }}
                    style={{ width: '100%' }}
                  >
                    🔄 Reactivar material
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      if (confirm('Estàs segur que vols marcar aquest material com a no utilitzat?')) {
                        onMarcarNoUtilitzat(formData.codi);
                        onClose();
                      }
                    }}
                    style={{ 
                      width: '100%',
                      borderColor: 'var(--color-error)',
                      color: 'var(--color-error)'
                    }}
                  >
                    ❌ Marcar com a no utilitzat
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              {esNoUtilitzat ? 'Tancar' : 'Cancel·lar'}
            </button>
            {!esNoUtilitzat && (
              <button type="submit" className="btn-primary">
                Desar Material
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default PressupostModal;
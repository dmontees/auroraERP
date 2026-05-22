import { useState, useEffect, useRef } from 'react';
import { X, Trash2, Check, FileText, FolderKanban, ChevronUp, ChevronDown, Download, Upload } from 'lucide-react';
import DocumentModal from './DocumentModal';
import type { Projecte, TascaProjecte, RecursHumaProjecte, MaterialProjecte } from '../../types/projecte';
import type { Client } from '../../types/client';
import type { Parametres } from '../../types/parametres';
import type { Proveidor } from '../../types/proveidor';
import SearchableSelect from '../common/SearchableSelect';
import type { Pressupost } from '../../types/pressupost';
import type { FacturaVenta } from '../../types/factura-venta';
import type { DocumentProjecte } from '../../types/projecte';
import { useAutoSave } from '../../hooks/useAutoSave';
import {
  afegirEntradaHistorial,
  registrarCreacioProjecte,
  registrarCanviEstat,
  registrarTascaAfegida,
  registrarTascaEliminada,
  registrarGastoAfegit,
  registrarGastoEliminat,
  registrarGastoTrasladatATasca,
  registrarPressupostVinculat,
  registrarPressupostDesvinculat,
  registrarFacturaVinculada,
  registrarFacturaDesvinculada,
  registrarDocumentAfegit,
  registrarDocumentEliminat,
  obtenirHistorialOrdenat,
  obtenirIconaHistorial,
  obtenirColorHistorial
} from '../../utils/projecteHistorial';

interface ProjecteModalProps {
  projecte: Projecte | null;
  onClose: () => void;
  onSave: (projecte: Projecte) => void;
  onCrearFactura?: (projecte: Projecte) => void;
  nextCode: string;
  clients: Client[];
  parametres: Parametres | null;
  proveidors: Proveidor[];
}
// Helper para detectar si hay cambios (misma lógica que useAutoSave)
function hasRealProjectData(data: any): boolean {
  return (
    data.pressupost || 
    data.factura ||
    data.titol || 
    data.client || 
    data.descripcio ||
    data.recursosHumans?.length > 0 ||
    data.materials?.length > 0 ||
    data.tasques?.length > 0 ||
    data.modalitat || 
    data.servei ||
    data.dataEntrega || 
    data.dataFinalitzacio ||
    data.instruccionsClient || 
    data.instruccionsProveidors ||
    (data.estat && data.estat !== 'esborrany') ||
    data.historial?.length > 1
  );
}
function ProjecteModal({
  projecte,
  onClose,
  onSave,
  onCrearFactura,
  nextCode,
  clients,
  parametres,
  proveidors
}: ProjecteModalProps) {
  const [activeTab, setActiveTab] = useState<'dades' | 'despeses' | 'tasques' | 'instruccions' | 'historial'>('dades');
  const [recursCopiado, setRecursCopiado] = useState<string | null>(null);
  const [materialCopiado, setMaterialCopiado] = useState<string | null>(null);
  const [searchClient, setSearchClient] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [showVincularPressupostModal, setShowVincularPressupostModal] = useState(false);
  const [showVincularFacturaModal, setShowVincularFacturaModal] = useState(false);
  const [pressupostos, setPressupostos] = useState<Pressupost[]>([]);
  const [factures, setFactures] = useState<FacturaVenta[]>([]);
  const [formData, setFormData] = useState<Projecte>(
    projecte || {
      codi: nextCode,
      client: '',
      pressupost: undefined,
      factura: undefined,
      titol: '',
      descripcio: '',
      modalitat: '',
      servei: '',
      esDirect: false,
      dataInici: new Date().toISOString().split('T')[0],
      dataEntrega: '',
      dataFinalitzacio: undefined,
      estat: 'esborrany',
      recursosHumans: [],
      materials: [],
      ingresSenseIVA: 0,
      iva: 21,
      ingresAmbIVA: 0,
      gastosMaterials: 0,
      gastosHumans: 0,
      gastosTotals: 0,
      benefici: 0,
      percentBenefici: 0,
      instruccionsClient: '',
      instruccionsProveidors: '',
      tasques: [],
      facturat: false,
      arxivat: false,
      historial: []
    }
  );
  // Recargar formData cuando cambie el projecte
useEffect(() => {
  if (projecte) {
    // Recargar desde localStorage para tener la versión más reciente
    const savedProjectes = localStorage.getItem('plateaProjectes');
    if (savedProjectes) {
      const projectes = JSON.parse(savedProjectes);
      const projecteActualitzat = projectes.find((p: Projecte) => p.codi === projecte.codi);
      if (projecteActualitzat) {
        setFormData(JSON.parse(JSON.stringify(projecteActualitzat)));
      }
    }
  }
}, [projecte]);

  const { saveNow } = useAutoSave(formData, onSave);
  
  const estatAnteriorRef = useRef<string>(formData.estat);

  // Registrar creación del proyecto (solo cuando es nuevo)
useEffect(() => {
  // Solo ejecutar cuando es un proyecto nuevo (projecte === null)
  if (!projecte && formData.codi === nextCode) {
    // Verificar si ya tiene historial (por si se ejecuta más de una vez)
    if (!formData.historial || formData.historial.length === 0) {
      const projecteAmbHistorial = registrarCreacioProjecte(formData);
      setFormData(projecteAmbHistorial);
    }
  }
}, []); // Array vacío para que solo se ejecute una vez al montar

  // Bloquear proyecto si tiene factura asociada
  const esBloquejat = !!formData.facturaAssociada;

  // Cargar presupuestos y facturas
useEffect(() => {
  const savedPressupostos = localStorage.getItem('plateaPressupostos');
  if (savedPressupostos) setPressupostos(JSON.parse(savedPressupostos));
  
  const savedFactures = localStorage.getItem('plateaFacturesVenda');
  if (savedFactures) setFactures(JSON.parse(savedFactures));
}, []);
const [showAfegirTascaModal, setShowAfegirTascaModal] = useState(false);
const [novaTascaForm, setNovaTascaForm] = useState<TascaProjecte>({
  id: '',
  categoria: '',
  servei: '',
  descripcio: '',
  quantitat: 1,
  unitat: '',
  tarifa: 0,
  importe: 0,
  ordre: 0
});
const [showAfegirRecursModal, setShowAfegirRecursModal] = useState(false);
const [tipusRecurs, setTipusRecurs] = useState<'huma' | 'material'>('huma');
const [nouRecursForm, setNouRecursForm] = useState<RecursHumaProjecte>({
  id: '',
  categoria: '',
  servei: '',
  unitat: '',
  quantitat: 1,
  preu: 0,
  cost: 0,
  ordre: 0,
  proveidor: ''
});
const [nouMaterialForm, setNouMaterialForm] = useState<MaterialProjecte>({
  id: '',
  grup: '',
  material: '',
  proveidor: '',
  preuProveidor: 0,
  preuPlatea: 0
});
  
  // Calcular campos automáticos
  useEffect(() => {
    const gastosHumans = formData.recursosHumans.reduce((sum, r) => sum + r.cost, 0);
    const gastosMaterials = formData.materials.reduce((sum, m) => sum + m.preuPlatea, 0);
    
    const ingresAmbIVA = formData.ingresSenseIVA * (1 + formData.iva / 100);
    const gastosTotals = gastosMaterials + gastosHumans;
    const benefici = ingresAmbIVA - gastosTotals;
    const percentBenefici = ingresAmbIVA > 0 ? (benefici / ingresAmbIVA) * 100 : 0;
  
    setFormData(prev => ({
      ...prev,
      gastosMaterials,
      gastosHumans,
      ingresAmbIVA,
      gastosTotals,
      benefici,
      percentBenefici
    }));
  }, [formData.ingresSenseIVA, formData.iva, formData.recursosHumans, formData.materials]);

  // Cliente seleccionado
const selectedClient = clients.find(c => c.codi === formData.client);

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

// ============================================================================
// FUNCIONES CRUD - RECURSOS HUMANS
// ============================================================================
const afegirRecursHuma = () => {
  setNouRecursForm({
    id: `rh-${Date.now()}`,
    categoria: '',
    servei: '',
    unitat: '',
    quantitat: 1,
    preu: 0,
    cost: 0,
    ordre: formData.recursosHumans.length,
    proveidor: ''
  });
  setTipusRecurs('huma');
  setShowAfegirRecursModal(true);
};

// Buscar tarifa para proveedor
const buscarTarifaProveidor = (proveidorCodi: string, servei: string, unitat: string): number => {
  if (!proveidorCodi || !parametres) return 0;
  
  const proveidor = proveidors.find(p => p.codi === proveidorCodi);
  if (!proveidor) return 0;
  
  // Buscar en tarifas especiales del proveedor
  const tarifaProveidor = proveidor.tarifesEspecials?.find(
    t => t.servei === servei && t.unitat === unitat
  );
  
  return tarifaProveidor?.preu || 0;
};

const handleRecursServeiChange = (serveiCodi: string) => {
  const serveiData = parametres?.serveis.find(s => s.codi === serveiCodi);
  const novaData = {
    ...nouRecursForm,
    servei: serveiCodi,
    categoria: serveiData?.categoria || ''
  };
  
  // Si ya hay proveedor y unidad, buscar tarifa
  if (novaData.proveidor && novaData.unitat) {
    const preu = buscarTarifaProveidor(novaData.proveidor, serveiCodi, novaData.unitat);
    novaData.preu = preu;
    novaData.cost = novaData.quantitat * preu;
  }
  
  setNouRecursForm(novaData);
};

const handleRecursProveidorChange = (proveidorCodi: string) => {
  const novaData = { ...nouRecursForm, proveidor: proveidorCodi };
  
  // Si ya hay servicio y unidad, buscar tarifa
  if (novaData.servei && novaData.unitat) {
    const preu = buscarTarifaProveidor(proveidorCodi, novaData.servei, novaData.unitat);
    novaData.preu = preu;
    novaData.cost = novaData.quantitat * preu;
  }
  
  setNouRecursForm(novaData);
};

const handleRecursUnitatChange = (unitatCodi: string) => {
  const novaData = { ...nouRecursForm, unitat: unitatCodi };
  
  // Si ya hay proveedor y servicio, buscar tarifa
  if (novaData.proveidor && novaData.servei) {
    const preu = buscarTarifaProveidor(novaData.proveidor, novaData.servei, unitatCodi);
    novaData.preu = preu;
    novaData.cost = novaData.quantitat * preu;
  }
  
  setNouRecursForm(novaData);
};

const actualitzarRecursHuma = (id: string, field: keyof RecursHumaProjecte, value: any) => {
  const nousRecursos = formData.recursosHumans.map(r => {
    if (r.id !== id) return r;
     
   const updated = { ...r, [field]: value };
     
   // Si cambia servicio, actualizar categoría
    if (field === 'servei') {
     const serveiData = parametres?.serveis.find(s => s.codi === value);
      if (serveiData) {
       updated.categoria = serveiData.categoria;
     }
   }
     
   // Recalcular cost si cambia cantidad o precio
   if (field === 'quantitat' || field === 'preu') {
     updated.cost = updated.quantitat * updated.preu;
   }
     
   return updated;
 });
   
   setFormData({ ...formData, recursosHumans: nousRecursos });
 };
 
const eliminarRecursHuma = (id: string) => {
 const recursAEliminar = formData.recursosHumans.find(r => r.id === id);
 
 if (recursAEliminar) {
   const serveiData = parametres?.serveis.find(s => s.codi === recursAEliminar.servei);
   const nomServei = serveiData?.nom || recursAEliminar.servei;
   
   const projecteAmbHistorial = registrarGastoEliminat(
     formData,
     nomServei,
     recursAEliminar.cost
   );
   
   setFormData({ 
     ...projecteAmbHistorial, 
     recursosHumans: projecteAmbHistorial.recursosHumans.filter(r => r.id !== id) 
   });
 } else {
   setFormData({ 
     ...formData, 
     recursosHumans: formData.recursosHumans.filter(r => r.id !== id) 
   });
 }
};

const guardarNouRecurs = () => {
  if (!nouRecursForm.servei || !nouRecursForm.unitat) {
    alert('Has de seleccionar un servei i una unitat');
    return;
  }

  const recursComplet = {
    ...nouRecursForm,
    cost: nouRecursForm.quantitat * nouRecursForm.preu
  };
  
// Buscar nombres para el historial
const serveiData = parametres?.serveis.find(s => s.codi === recursComplet.servei);
const nomServei = serveiData?.nom || recursComplet.servei;
const categoriaData = parametres?.categories.find(c => c.codi === recursComplet.categoria);
const nomCategoria = categoriaData?.nom || recursComplet.categoria || 'Recurs humà';

// Registrar en el historial
const projecteAmbHistorial = registrarGastoAfegit(
  formData,
  `${nomCategoria} - ${nomServei}`,
  recursComplet.cost
);
  
  setFormData({ 
    ...projecteAmbHistorial, 
    recursosHumans: [...projecteAmbHistorial.recursosHumans, recursComplet] 
  });
  
  setShowAfegirRecursModal(false);
};


// ============================================================================
// FUNCIONES CRUD - MATERIALS
// ============================================================================
const afegirMaterial = () => {
  setNouMaterialForm({
    id: `mat-${Date.now()}`,
    grup: '',
    material: '',
    proveidor: '',
    preuProveidor: 0,
    preuPlatea: 0
  });
  setTipusRecurs('material');
  setShowAfegirRecursModal(true);
};

const handleMaterialChange = (materialCodi: string) => {
  const materialData = parametres?.materials.find(m => m.codi === materialCodi);
  if (materialData) {
    setNouMaterialForm({
      ...nouMaterialForm,
      material: materialCodi,
      grup: materialData.grup,
      preuProveidor: materialData.preuProveidor,
      preuPlatea: materialData.preuPlatea
    });
  }
};

const guardarNouMaterial = () => {
  if (!nouMaterialForm.material) {
    alert('Has de seleccionar un material');
    return;
  }
  
  // Buscar nombre del material para el historial
  const materialData = parametres?.materials.find(m => m.codi === nouMaterialForm.material);
  const nomMaterial = materialData?.material || nouMaterialForm.material;
  const grupData = parametres?.grupsMaterials.find(g => g.codi === nouMaterialForm.grup);
  const nomGrup = grupData?.nom || nouMaterialForm.grup;
  
  // Registrar en el historial
  const projecteAmbHistorial = registrarGastoAfegit(
    formData,
    `${nomGrup} - ${nomMaterial}`,
    nouMaterialForm.preuProveidor
  );
  
  setFormData({ 
    ...projecteAmbHistorial, 
    materials: [...projecteAmbHistorial.materials, nouMaterialForm] 
  });
  
  setShowAfegirRecursModal(false);
};

  const actualitzarMaterial = (id: string, field: keyof MaterialProjecte, value: any) => {
    const nousMaterials = formData.materials.map(m => 
      m.id === id ? { ...m, [field]: value } : m
    );
    setFormData({ ...formData, materials: nousMaterials });
  };

  const eliminarMaterial = (id: string) => {
    const materialAEliminar = formData.materials.find(m => m.id === id);
    
    if (materialAEliminar) {
      const projecteAmbHistorial = registrarGastoEliminat(
        formData,
        `${materialAEliminar.grup || 'Material'} - ${materialAEliminar.material || ''}`,
        materialAEliminar.preuProveidor
      );
      
      setFormData({ 
        ...projecteAmbHistorial, 
        materials: projecteAmbHistorial.materials.filter(m => m.id !== id) 
      });
    } else {
      setFormData({ 
        ...formData, 
        materials: formData.materials.filter(m => m.id !== id) 
      });
    }
  };

  // ============================================================================
// TRASLADAR A TASQUES
// ============================================================================
const trasladarRecursATaska = (recurs: RecursHumaProjecte) => {
  if (!recurs.servei || !recurs.unitat) return;
  
  const serveiData = parametres?.serveis.find(s => s.codi === recurs.servei);
  
  // Buscar tarifa automáticamente (cliente especial > general)
  const tarifaAuto = buscarTarifaClient(recurs.servei, recurs.unitat);
  const tarifa = tarifaAuto !== null ? tarifaAuto : 0;
  
  const novaTasca: TascaProjecte = {
    id: `task-${Date.now()}-${Math.random()}`,
    categoria: recurs.categoria,
    servei: recurs.servei,
    descripcio: serveiData?.descripcio || '',
    quantitat: recurs.quantitat,
    unitat: recurs.unitat,
    tarifa: tarifa,  // ← Usar tarifa automática
    importe: recurs.quantitat * tarifa,  // ← Recalcular con tarifa correcta
    ordre: formData.tasques.length
  };
  
  setFormData({ 
    ...formData, 
    tasques: [...formData.tasques, novaTasca] 
  });

  // Feedback visual
  setRecursCopiado(recurs.id);
  setTimeout(() => setRecursCopiado(null), 1500);
};

const trasladarMaterialATaska = (material: MaterialProjecte) => {
  if (!material.material || !material.grup) return;
  
  const materialData = parametres?.materials.find(m => m.codi === material.material);
  const grupData = parametres?.grupsMaterials.find(g => g.codi === material.grup);
  
  if (materialData && grupData) {
    // Para materiales, usar el precio de Platea directamente
    // (no tiene sentido buscar tarifa por servicio/unidad)
    const novaTasca: TascaProjecte = {
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
  // FUNCIONES CRUD - TASQUES
  // ============================================================================
  const afegirTasca = () => {
    setNovaTascaForm({
      id: `task-${Date.now()}`,
      categoria: '',
      servei: '',
      descripcio: '',
      quantitat: 1,
      unitat: '',
      tarifa: 0,
      importe: 0,
      ordre: formData.tasques.length
    });
    setShowAfegirTascaModal(true);
  };

  const handleServeiChange = (serveiCodi: string) => {
    const serveiData = parametres?.serveis.find(s => s.codi === serveiCodi);
    const novaData = {
      ...novaTascaForm,
      servei: serveiCodi,
      categoria: serveiData?.categoria || '',
      descripcio: serveiData?.descripcio || ''
    };
    
    // Si ya hay unidad seleccionada, buscar tarifa automáticamente
    if (novaData.unitat) {
      const tarifaAuto = buscarTarifaClient(serveiCodi, novaData.unitat);
      if (tarifaAuto !== null) {
        novaData.tarifa = tarifaAuto;
      }
    }
    
    setNovaTascaForm(novaData);
  };
  
  const handleUnitatChange = (unitatCodi: string) => {
    const novaData = { ...novaTascaForm, unitat: unitatCodi };
    
    // Si ya hay servicio seleccionado, buscar tarifa automáticamente
    if (novaData.servei) {
      const tarifaAuto = buscarTarifaClient(novaData.servei, unitatCodi);
      if (tarifaAuto !== null) {
        novaData.tarifa = tarifaAuto;
      }
    }
    
    setNovaTascaForm(novaData);
  };
  
  const guardarNovaTasca = () => {
    if (!novaTascaForm.servei || !novaTascaForm.unitat) {
      alert('Has de seleccionar un servei i una unitat');
      return;
    }
    
    const tascaCompleta = {
      ...novaTascaForm,
      importe: novaTascaForm.quantitat * novaTascaForm.tarifa
    };
    
    const novesTasques = [...formData.tasques, tascaCompleta];
    
    // Registrar en el historial
    const projecteAmbHistorial = registrarTascaAfegida(
      formData,
      1,
      tascaCompleta.importe
    );
    
    setFormData({ 
      ...projecteAmbHistorial, 
      tasques: novesTasques 
    });
    
    setShowAfegirTascaModal(false);
  };


  const actualitzarTasca = (id: string, field: keyof TascaProjecte, value: any) => {
    const novesTasques = formData.tasques.map(t => {
      if (t.id !== id) return t;
      
      const updated = { ...t, [field]: value };
      
      if (field === 'servei') {
        const serveiData = parametres?.serveis.find(s => s.codi === value);
        if (serveiData) {
          updated.categoria = serveiData.categoria;
          updated.descripcio = serveiData.descripcio || '';
        }
      }
      
      if (field === 'quantitat' || field === 'tarifa') {
        updated.importe = updated.quantitat * updated.tarifa;
      }
      
      return updated;
    });
    
    setFormData({ ...formData, tasques: novesTasques });
  };

  const eliminarTasca = (id: string) => {
    const tascaAEliminar = formData.tasques.find(t => t.id === id);
    
    if (tascaAEliminar) {
      const projecteAmbHistorial = registrarTascaEliminada(
        formData,
        tascaAEliminar.descripcio || tascaAEliminar.servei,
        tascaAEliminar.importe
      );
      
      setFormData({ 
        ...projecteAmbHistorial, 
        tasques: projecteAmbHistorial.tasques.filter(t => t.id !== id) 
      });
    } else {
      setFormData({ 
        ...formData, 
        tasques: formData.tasques.filter(t => t.id !== id) 
      });
    }
  };

  const moureTasca = (index: number, direccio: 'amunt' | 'avall') => {
    const novesTasques = [...formData.tasques];
    const nouIndex = direccio === 'amunt' ? index - 1 : index + 1;
    
    if (nouIndex < 0 || nouIndex >= novesTasques.length) return;
    
    [novesTasques[index], novesTasques[nouIndex]] = [novesTasques[nouIndex], novesTasques[index]];
    
    novesTasques.forEach((t, i) => t.ordre = i);
    
    setFormData({ ...formData, tasques: novesTasques });
  };
  // Agrupar tasques por categoría
  const tasquesAgrupades = formData.tasques.reduce((acc, tasca) => {
    const catNom = tasca.categoria === 'MATERIALS' 
      ? 'Materials' 
      : parametres?.categories.find(c => c.codi === tasca.categoria)?.nom || 'Sense categoria';
    if (!acc[catNom]) acc[catNom] = [];
    acc[catNom].push(tasca);
    return acc;
  }, {} as Record<string, TascaProjecte[]>);

  const moureCategoría = (categoriaNom: string, direccio: 'amunt' | 'avall') => {
    const categoriesOrdenades = Object.keys(tasquesAgrupades);
    const indexActual = categoriesOrdenades.indexOf(categoriaNom);
    
    if (direccio === 'amunt' && indexActual > 0) {
      // Intercambiar ordre de todas las tareas de ambas categorías
      const categoriaAnterior = categoriesOrdenades[indexActual - 1];
      const tasquesActuals = tasquesAgrupades[categoriaNom];
      const tasquesAnteriors = tasquesAgrupades[categoriaAnterior];
      
      const minOrdreAnterior = Math.min(...tasquesAnteriors.map(t => t.ordre));
      const minOrdreActual = Math.min(...tasquesActuals.map(t => t.ordre));
      
      const novesTasques = formData.tasques.map(t => {
        if (tasquesActuals.includes(t)) {
          return { ...t, ordre: t.ordre - (minOrdreActual - minOrdreAnterior) };
        }
        if (tasquesAnteriors.includes(t)) {
          return { ...t, ordre: t.ordre + tasquesActuals.length };
        }
        return t;
      }).sort((a, b) => a.ordre - b.ordre);
      
      setFormData({ ...formData, tasques: novesTasques });
    } else if (direccio === 'avall' && indexActual < categoriesOrdenades.length - 1) {
      const categoriaSeguent = categoriesOrdenades[indexActual + 1];
      moureCategoría(categoriaSeguent, 'amunt');
    }
  };

  const eliminarProjecte = () => {
    if (!confirm(`Estàs segur que vols eliminar el projecte ${formData.codi}?\n\nAquesta acció no es pot desfer.`)) {
      return;
    }
  
    // Si el proyecto tiene presupuesto vinculado, desvincularlo
    if (formData.pressupost) {
      const savedPressupostos = localStorage.getItem('plateaPressupostos');
      if (savedPressupostos) {
        const pressupostos = JSON.parse(savedPressupostos);
        const pressupostosActualitzats = pressupostos.map((p: any) => {
          // Desvincular si fue creado desde este proyecto
          if (p.codi === formData.pressupost && p.projecteCreat === formData.codi) {
            return {
              ...p,
              projecteCreat: undefined,
              dataAcceptacio: undefined
            };
          }
          // Desvincular si fue vinculado manualmente
          if (p.codi === formData.pressupost && p.projecteVinculat === formData.codi) {
            return {
              ...p,
              projecteVinculat: undefined
            };
          }
          return p;
        });
        localStorage.setItem('plateaPressupostos', JSON.stringify(pressupostosActualitzats));
      }
    }
  
    // Si el proyecto tiene factura asociada, desvincularla
    if (formData.facturaAssociada) {
      const savedFactures = localStorage.getItem('plateaFacturesVenda');
      if (savedFactures) {
        const factures = JSON.parse(savedFactures);
        const facturesActualitzades = factures.map((f: any) => {
          if (f.codi === formData.facturaAssociada && f.projecte === formData.codi) {
            return {
              ...f,
              projecte: undefined
            };
          }
          return f;
        });
        localStorage.setItem('plateaFacturesVenda', JSON.stringify(facturesActualitzades));
      }
    }
  
    // Eliminar el proyecto
    const savedProjectes = localStorage.getItem('plateaProjectes');
    if (savedProjectes) {
      const projectes = JSON.parse(savedProjectes);
      const projectesActualitzats = projectes.filter((p: any) => p.codi !== formData.codi);
      localStorage.setItem('plateaProjectes', JSON.stringify(projectesActualitzats));
    }
  
    alert('Projecte eliminat correctament.');
    onClose();
  };
  
// Crear factura desde proyecto
const crearFacturaDesdeProjecte = () => {
  if (onCrearFactura) {
    onCrearFactura(formData);
  }
};

// Añadir documento
const afegirDocument = (document: DocumentProjecte) => {
  // Registrar en el historial
  const projecteAmbHistorial = registrarDocumentAfegit(
    formData,
    document.nom,
    document.tipus
  );
  
  setFormData({
    ...projecteAmbHistorial,
    documents: [...(projecteAmbHistorial.documents || []), document]
  });
  
  setShowDocumentModal(false);
};

// Eliminar documento
const eliminarDocument = (docId: string) => {
  if (confirm('Segur que vols eliminar aquest document?')) {
    const documentAEliminar = formData.documents?.find(d => d.id === docId);
    
    if (documentAEliminar) {
      const projecteAmbHistorial = registrarDocumentEliminat(
        formData,
        documentAEliminar.nom
      );
      
      setFormData({
        ...projecteAmbHistorial,
        documents: projecteAmbHistorial.documents?.filter(d => d.id !== docId) || []
      });
    } else {
      setFormData(prev => ({
        ...prev,
        documents: prev.documents?.filter(d => d.id !== docId) || []
      }));
    }
  }
};

// Descargar documento
const descarregarDocument = (doc: DocumentProjecte) => {
  const link = window.document.createElement('a');
  link.href = doc.fitxer;
  link.download = doc.nomFitxer;
  link.click();
};

// Vincular pressupost
const vincularPressupost = (codiPressupost: string) => {
  if (!codiPressupost) return;
  
  // Registrar en el historial
  const projecteAmbHistorial = registrarPressupostVinculat(formData, codiPressupost);
  const projecteActualitzat = { ...projecteAmbHistorial, pressupost: codiPressupost };

  // Guardar proyecto inmediatamente en localStorage
  const savedProjectes = localStorage.getItem('plateaProjectes');
  const projectes = savedProjectes ? JSON.parse(savedProjectes) : [];
  const projectesActualitzats = projectes.map((p: Projecte) => 
    p.codi === formData.codi ? projecteActualitzat : p
  );
  localStorage.setItem('plateaProjectes', JSON.stringify(projectesActualitzats));
  
  // Actualizar el presupuesto para que apunte a este proyecto
  const pressupostosActualitzats = pressupostos.map(p => 
    p.codi === codiPressupost 
      ? { ...p, projecteVinculat: formData.codi }
      : p
  );
  localStorage.setItem('plateaPressupostos', JSON.stringify(pressupostosActualitzats));
  setPressupostos(pressupostosActualitzats);
  
  // Actualizar formData local
  setFormData(projecteActualitzat);
  
  // Notificar al padre para que actualice su lista
  onSave(projecteActualitzat);
  
  // Cerrar solo el modal de vinculación (NO la ficha del proyecto)
  setShowVincularPressupostModal(false);
};

// Vincular factura
const vincularFactura = (codiFactura: string) => {
  if (!codiFactura) return;
  
  // Registrar en el historial
  const projecteAmbHistorial = registrarFacturaVinculada(formData, codiFactura);
  const projecteActualitzat = { ...projecteAmbHistorial, facturaAssociada: codiFactura };
 
  // Guardar proyecto inmediatamente en localStorage
  const savedProjectes = localStorage.getItem('plateaProjectes');
  const projectes = savedProjectes ? JSON.parse(savedProjectes) : [];
  const projectesActualitzats = projectes.map((p: Projecte) => 
    p.codi === formData.codi ? projecteActualitzat : p
  );
  localStorage.setItem('plateaProjectes', JSON.stringify(projectesActualitzats));
  
  // Actualizar la factura para que apunte a este proyecto
  const facturesActualitzades = factures.map(f => 
    f.codi === codiFactura 
      ? { ...f, projecte: formData.codi }
      : f
  );
  localStorage.setItem('plateaFacturesVenda', JSON.stringify(facturesActualitzades));
  setFactures(facturesActualitzades);
  
  // Actualizar formData local
  setFormData(projecteActualitzat);
  
  // Notificar al padre para que actualice su lista
  onSave(projecteActualitzat);
  
  // Cerrar solo el modal de vinculación (NO la ficha del proyecto)
  setShowVincularFacturaModal(false);
};

return (
  <div className="modal-overlay">
    <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '1400px', maxHeight: '95vh', display: 'flex', flexDirection: 'column' }}>
      <div className="modal-header">
  <h2>
    <FileText size={24} />
    {formData.esImportat && '📥 '}
    {projecte ? 'Editar' : 'Nou'} Projecte - {formData.codi}
    {formData.esImportat && (
      <span style={{
        marginLeft: '0.5rem',
        padding: '0.25rem 0.5rem',
        borderRadius: '4px',
        fontSize: '0.75rem',
        fontWeight: 600,
        background: '#e0e7ff',
        color: '#4338ca'
      }}>
        Importat
      </span>
    )}
  </h2>
  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>

{/* Botón Crear Factura */}
{projecte && 
 formData.estat === 'entregat' && 
 !formData.facturaAssociada && !formData.facturaHistorica && (
  <button
    type="button"
    onClick={() => {
      if (confirm('Estàs segur que vols crear una factura des d\'aquest projecte?\n\nLa factura es crearà amb totes les tasques i el projecte quedarà vinculat i bloquejat.')) {
        saveNow();
        if (onCrearFactura) {
          onCrearFactura(formData);
        }
      }
    }}
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
    title="Crear factura des d'aquest projecte"
  >
    <FileText size={18} />
    Crear Factura
  </button>
)}

    {/* Indicador Pressupost Vinculat */}
    {formData.pressupost && (
      <div 
      onClick={() => {
          // Guardar en localStorage qué abrir
          localStorage.setItem('plateaNavigateTo', JSON.stringify({
            type: 'pressupost',
            codi: formData.pressupost
          }));
          
          // Cerrar modal
          onClose();
          
          // Dar tiempo para que se cierre el modal antes de cambiar de sección
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('navigate-to', { 
              detail: { section: 'pressupostos', codi: formData.pressupost } 
            }));
          }, 100);
      }}
        style={{
          padding: '0.5rem 1rem',
          background: '#fef3c7',
          color: '#92400e',
          borderRadius: '6px',
          fontSize: '0.85rem',
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'opacity 0.2s'
        }}
        onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
        onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
        title="Clic per obrir el pressupost"
      >
      Pressupost: <br /> {formData.pressupost}
      </div>
    )}

{/* Indicador Factura Associada o Històrica */}
{formData.facturaHistorica ? (
  // Factura histórica (importada)
  <div 
    style={{
      padding: '0.75rem 1rem',
      background: '#fef3c7',
      border: '1px solid #fbbf24',
      borderRadius: '6px',
      fontSize: '0.85rem',
      fontWeight: 600,
      color: '#92400e'
    }}
    title="Factura històrica (importada)"
  >
    <div style={{ marginBottom: '0.25rem' }}>
      📋 Factura: {formData.facturaHistorica.numero}
    </div>
    <div style={{ fontSize: '0.8rem', fontWeight: 'normal' }}>
      Data: {new Date(formData.facturaHistorica.data).toLocaleDateString('ca-ES')}
    </div>
    <div style={{ 
      fontSize: '0.75rem', 
      marginTop: '0.25rem',
      fontStyle: 'italic',
      opacity: 0.8
    }}>
      ⚠️ Factura històrica (importada)
    </div>
  </div>
) : formData.facturaAssociada ? (
  // Factura real vinculada
  <div 
    onClick={() => {
      // Guardar en localStorage qué abrir
      localStorage.setItem('plateaNavigateTo', JSON.stringify({
        type: 'factura',
        codi: formData.facturaAssociada
      }));
      
      // Cerrar modal
      onClose();
      
      // Dar tiempo para que se cierre el modal antes de cambiar de sección
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('navigate-to', { 
          detail: { section: 'factures-venda', codi: formData.facturaAssociada } 
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
    title="Clic per obrir la factura"
  >
    Factura:<br />{formData.facturaAssociada}
  </div>
) : null}

    {/* Dropdown Estado */}
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <label style={{ fontSize: '0.9rem', fontWeight: 600 }}>Estat:</label>
      <select
        className="form-input"
        value={formData.estat}
        onChange={(e) => {
    const nouEstat = e.target.value as any;
    const estatAnterior = estatAnteriorRef.current;
    
    // Registrar cambio de estado en el historial
    if (nouEstat !== estatAnterior) {
      const projecteAmbHistorial = registrarCanviEstat(
        formData,
        estatAnterior,
        nouEstat
      );
      
      setFormData({ 
        ...projecteAmbHistorial, 
        estat: nouEstat 
      });
      
      estatAnteriorRef.current = nouEstat;
    } else {
      setFormData({ ...formData, estat: nouEstat });
    }
  }}
  onClick={(e) => e.stopPropagation()}
        disabled={esBloquejat}
        style={{
          padding: '0.5rem',
          borderRadius: '6px',
          fontWeight: 600,
          fontSize: '0.85rem',
          background: 
            formData.estat === 'esborrany' ? '#fef3c7' :
            formData.estat === 'planificat' ? '#dbeafe' :
            formData.estat === 'en_curs' ? '#fef9c3' :
            formData.estat === 'post_produccio' ? '#e0e7ff' :
            formData.estat === 'entregat' ? '#d1fae5' :
            formData.estat === 'facturat' ? '#d1fae5' : '#fee2e2',
          color: 
            formData.estat === 'esborrany' ? '#92400e' :
            formData.estat === 'planificat' ? '#1e40af' :
            formData.estat === 'en_curs' ? '#854d0e' :
            formData.estat === 'post_produccio' ? '#3730a3' :
            formData.estat === 'entregat' ? '#065f46' :
            formData.estat === 'facturat' ? '#065f46' : '#991b1b',
          border: 'none',
          cursor: 'pointer'
        }}
      >
        <option value="esborrany">Esborrany</option>
        <option value="planificat">Planificat</option>
        <option value="en_curs">En curs</option>
        <option value="post_produccio">Post producció</option>
        <option value="entregat">Entregat</option>
        <option value="facturat">Facturat</option>
        <option value="cancelat">Cancel·lat</option>
      </select>
    </div>

{/* Botón Cerrar */}
<button
  type="button"
  onClick={() => {
    // Detectar si hay cambios
    const tieneCanvis = hasRealProjectData(formData);
    
    // Si no hay cambios
    if (!tieneCanvis) {
      // Si el proyecto ya fue guardado, eliminarlo
      const saved = localStorage.getItem('plateaProjectes');
      if (saved) {
        const projectes = JSON.parse(saved);
        const projecteExisteix = projectes.some((p: any) => p.codi === formData.codi);
        
        if (projecteExisteix) {
          // Eliminar el proyecto vacío
          const filteredProjectes = projectes.filter((p: any) => p.codi !== formData.codi);
          localStorage.setItem('plateaProjectes', JSON.stringify(filteredProjectes));
        }
      }
      onClose();
      return;
    }
    
    // Si hay cambios, validar campos obligatorios
    if (!formData.client || !formData.titol || !formData.dataEntrega) {
      alert('⚠️ Falten camps obligatoris:\n\n• Client\n• Títol del projecte\n• Data d\'entrega\n\nOmple aquests camps abans de tancar.');
      return;
    }
    
    // Si todo OK, guardar y cerrar
    saveNow();
    onClose();
  }}
  className="modal-close"
>
  <X size={24} />
</button>
  </div>
</div>

        {/* PESTAÑAS */}
        <div style={{
          display: 'flex',
          borderBottom: '2px solid var(--color-border)',
          marginBottom: '1.5rem',
          gap: '0.5rem',
          overflowX: ''
        }}>
          {[
            { id: 'dades', label: 'Dades Generals' },
            { id: 'despeses', label: 'Despeses' },
            { id: 'tasques', label: 'Tasques' },
            { id: 'instruccions', label: 'Instruccions' },
            { id: 'historial', label: 'Historial' }
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                padding: '0.75rem 1.5rem',
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === tab.id ? '2px solid var(--color-accent-primary)' : '2px solid transparent',
                color: activeTab === tab.id ? 'var(--color-accent-primary)' : 'var(--color-text-secondary)',
                fontWeight: activeTab === tab.id ? 600 : 400,
                cursor: 'pointer',
                marginBottom: '-2px',
                whiteSpace: 'nowrap'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="modal-body" style={{ flex: 1, overflow: 'auto' }}>

            {/* PESTAÑA: DADES GENERALS */}
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
                    disabled={esBloquejat}
                    onFocus={() => setShowClientDropdown(true)}
                    placeholder="Cerca client..."
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
                              setFormData({
                                ...formData,
                                client: c.codi
                              });
                              setSearchClient('');
                              setShowClientDropdown(false);
                            }}
                            style={{
                              padding: '0.5rem 0.75rem',
                              cursor: 'pointer',
                              borderBottom: '1px solid var(--color-border)',
                              transition: 'background 0.2s',
                              fontSize: '0.85rem'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-bg-tertiary)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                          >
                            <div style={{ fontWeight: 600 }}>
                              {c.nomComercial || c.nomFiscal}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-tertiary)' }}>
                              {c.codi} • {c.nif}
                            </div>
                          </div>
                        ))}
                      {clients.filter(c => {
                        const searchLower = searchClient.toLowerCase();
                        const nom = (c.nomComercial || c.nomFiscal).toLowerCase();
                        return nom.includes(searchLower);
                      }).length === 0 && (
                        <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: '0.85rem' }}>
                          No s'han trobat clients
                        </div>
                      )}
                    </div>
                  )}
                </div>

                
                <div className="form-group">
                  <label>Títol del Projecte *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.titol}
                    onChange={(e) => setFormData({ ...formData, titol: e.target.value })}
                    disabled={esBloquejat}
                    placeholder="Títol descriptiu del projecte..."
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Descripció</label>
                  <textarea
                    className="form-input"
                    value={formData.descripcio}
                    onChange={(e) => setFormData({ ...formData, descripcio: e.target.value })}
                    rows={4}
                    disabled={esBloquejat}
                    placeholder="Descripció detallada del projecte..."
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label>Modalitat</label>
                    <SearchableSelect
                      value={formData.modalitat}
                      onChange={(value) => setFormData({ ...formData, modalitat: value })}
                      disabled={esBloquejat}
                      options={parametres?.modalitats?.map(m => ({ value: m.codi, label: m.nom })) || []}
                      placeholder="Selecciona modalitat..."
                    />
                  </div>

                  <div className="form-group">
                    <label>Tipus de producció</label>
                    <SearchableSelect
                      value={formData.servei}
                      onChange={(value) => setFormData({ ...formData, servei: value })}
                      disabled={esBloquejat}
                      options={parametres?.tipusProduccio?.map(t => ({ value: t.codi, label: t.nom })) || []}
                      placeholder="Selecciona tipus..."
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formData.esDirect}
                      onChange={(e) => setFormData({ ...formData, esDirect: e.target.checked })}
                      disabled={esBloquejat}
                    />
                    És gravació en directe
                  </label>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label>Data d'inici de rodatge</label>
                    <input
                      type="date"
                      className="form-input"
                      value={formData.dataInici}
                      onChange={(e) => setFormData({ ...formData, dataInici: e.target.value })}
                      disabled={esBloquejat}
                    />
                  </div>

                  <div className="form-group">
                    <label>Data d'entrega *</label>
                    <input
                      type="date"
                      className="form-input"
                      value={formData.dataEntrega}
                      onChange={(e) => setFormData({ ...formData, dataEntrega: e.target.value })}
                      disabled={esBloquejat}
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            {/* PESTAÑA: DESPESES */}
            {activeTab === 'despeses' && (
              <div>
                {/* TABLA 1: RECURSOS HUMANS */}
                <div style={{ marginBottom: '3rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                      Recursos Humans i Logística
                    </h3>
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={afegirRecursHuma}
                      disabled={esBloquejat}
                    >
                      + Afegir Recurs/Material
                    </button>
                  </div>

                  {formData.recursosHumans.length === 0 ? (
                    <p style={{ textAlign: 'center', color: 'var(--color-text-tertiary)', padding: '2rem' }}>
                      No hi ha recursos humans. Fes clic a "Afegir Recurs Humà".
                    </p>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                          <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, width: '150px' }}>Proveïdor</th>
                          <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600 }}>Servei</th>
                          <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, width: '120px' }}>Categoria</th>
                          <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, width: '120px' }}>Unitat</th>
                          <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, width: '80px' }}>Quantitat</th>
                          <th style={{ textAlign: 'center', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, width: '80px' }}>Preu Prov.</th>
                          <th style={{ textAlign: 'center', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, width: '100px' }}>Cost</th>
                          <th style={{ width: '100px' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {formData.recursosHumans.map((recurs) => {
                          const categoriaData = parametres?.categories.find(c => c.codi === recurs.categoria);
                          
                          return (
                            <tr key={recurs.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                              <td style={{ padding: '0.75rem', width: '150px' }}>
                                <SearchableSelect
                                  value={recurs.proveidor || ''}
                                  onChange={(value) => actualitzarRecursHuma(recurs.id, 'proveidor', value)}
                                  disabled={esBloquejat}
                                  options={[
                                    { value: '', label: 'Cap proveïdor' },
                                    ...proveidors.map(p => ({ 
                                      value: p.codi, 
                                      label: p.nomComercial || p.nomFiscal 
                                    }))
                                  ]}
                                  placeholder="Cap proveïdor"
                                />
                              </td>
                              
                              <td style={{ padding: '0.75rem' }}>
                                <SearchableSelect
                                  value={recurs.servei}
                                  onChange={(value) => actualitzarRecursHuma(recurs.id, 'servei', value)}
                                  disabled={esBloquejat}
                                  options={parametres?.serveis.map(s => ({ value: s.codi, label: s.nom })) || []}
                                  placeholder="Selecciona servei..."
                                />
                              </td>
                              
                              <td style={{ padding: '0.75rem', width: '120px' }}>
                                <input
                                  type="text"
                                  className="form-input"
                                  value={categoriaData?.nom || ''}
                                  disabled
                                  style={{ background: 'var(--color-bg-tertiary)', cursor: 'not-allowed', fontSize: '0.85rem' }}
                                  placeholder="Auto"
                                />
                              </td>
                              
                              <td style={{ padding: '0.75rem', width: '120px' }}>
                                <SearchableSelect
                                  value={recurs.unitat}
                                  onChange={(value) => actualitzarRecursHuma(recurs.id, 'unitat', value)}
                                  disabled={esBloquejat}
                                  options={parametres?.unitats.map(u => ({ value: u.codi, label: u.nom })) || []}
                                  placeholder="Unitat..."
                                />
                              </td>
                              
                              <td style={{ padding: '0.75rem', textAlign: 'right', width: '80px' }}>
                                <input
                                  type="number"
                                  className="form-input"
                                  value={recurs.quantitat}
                                  onChange={(e) => actualitzarRecursHuma(recurs.id, 'quantitat', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                                  disabled={esBloquejat}
                                  min="0"
                                  step="0.01"
                                  style={{ textAlign: 'right' }}
                                />
                              </td>
                              
                              <td style={{ padding: '0.75rem', textAlign: 'right', width: '80px' }}>
                                <input
                                  type="number"
                                  className="form-input"
                                  value={recurs.preu}
                                  onChange={(e) => actualitzarRecursHuma(recurs.id, 'preu', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                                  disabled={esBloquejat}
                                  min="0"
                                  step="0.01"
                                  style={{ textAlign: 'right' }}
                                />
                              </td>
                              
                              <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600, width: '100px' }}>
                              {(recurs.cost || 0).toFixed(2)}€
                              </td>
                              
                              <td style={{ padding: '0.75rem', textAlign: 'center', width: '100px' }}>
                                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                  <button
                                    type="button"
                                    onClick={() => trasladarRecursATaska(recurs)}
                                    disabled={!recurs.servei || !recurs.unitat || esBloquejat}
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
                                    disabled={esBloquejat}
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
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* TABLA 2: MATERIALS */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                      Materials
                    </h3>
                  </div>

                  {formData.materials.length === 0 ? (
                    <p style={{ textAlign: 'center', color: 'var(--color-text-tertiary)', padding: '2rem' }}>
                      No hi ha materials. Fes clic a "Afegir Material".
                    </p>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                          <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, width: '120px' }}>Grup</th>
                          <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600 }}>Material</th>
                          <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, width: '150px' }}>Proveïdor</th>
                          <th style={{ textAlign: 'center', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, width: '90px' }}>Preu Prov.</th>
                          <th style={{ textAlign: 'center', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, width: '90px' }}>Preu Platea</th>
                          <th style={{ width: '100px' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {formData.materials.map((material) => {
                          const grupData = parametres?.grupsMaterials.find(g => g.codi === material.grup);
                          
                          return (
                            <tr key={material.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                              <td style={{ padding: '0.75rem', width: '120px' }}>
                                <input
                                  type="text"
                                  className="form-input"
                                  value={grupData?.nom || ''}
                                  disabled
                                  style={{ background: 'var(--color-bg-tertiary)', cursor: 'not-allowed', fontSize: '0.85rem' }}
                                  placeholder="Auto"
                                />
                              </td>
                              
                              <td style={{ padding: '0.75rem' }}>
                              <SearchableSelect
  value={material.material}
  onChange={(value) => {
    const materialData = parametres?.materials.find(m => m.codi === value);
    if (materialData) {
      // Actualizar TODO de una vez
      const nousMaterials = formData.materials.map(m => 
        m.id === material.id 
          ? { 
              ...m, 
              material: value,
              grup: materialData.grup,
              preuProveidor: materialData.preuProveidor,
              preuPlatea: materialData.preuPlatea
            }
          : m
      );
      setFormData({ ...formData, materials: nousMaterials });
    }
  }}
  disabled={esBloquejat}
  options={parametres?.materials.filter(m => m.estat === 'actiu').map(m => ({ 
    value: m.codi, 
    label: m.material 
  })) || []}
  placeholder="Selecciona material..."
/>
</td>
                              
                              <td style={{ padding: '0.75rem', width: '150px' }}>
                                <SearchableSelect
                                  value={material.proveidor}
                                  onChange={(value) => actualitzarMaterial(material.id, 'proveidor', value)}
                                  disabled={esBloquejat}

                                  options={[
                                    { value: '', label: 'Cap proveïdor' },
                                    ...proveidors.map(p => ({ 
                                      value: p.codi, 
                                      label: p.nomComercial || p.nomFiscal 
                                    }))
                                  ]}
                                  placeholder="Cap proveïdor"
                                />
                              </td>
                              
                              <td style={{ padding: '0.75rem', textAlign: 'right', width: '90px' }}>
                                <input
                                  type="number"
                                  className="form-input"
                                  value={material.preuProveidor}
                                  onChange={(e) => actualitzarMaterial(material.id, 'preuProveidor', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                                  disabled={esBloquejat}
                                  min="0"
                                  step="0.01"
                                  style={{ textAlign: 'right' }}
                                />
                              </td>
                              
                              <td style={{ padding: '0.75rem', textAlign: 'right', width: '90px' }}>
                                <input
                                  type="number"
                                  className="form-input"
                                  value={material.preuPlatea}
                                  onChange={(e) => actualitzarMaterial(material.id, 'preuPlatea', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                                  disabled={esBloquejat}
                                  min="0"
                                  step="0.01"
                                  style={{ textAlign: 'right' }}
                                />
                              </td>
                              
                              <td style={{ padding: '0.75rem', textAlign: 'center', width: '100px' }}>
                                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                  <button
                                    type="button"
                                    onClick={() => trasladarMaterialATaska(material)}
                                    disabled={!material.material || !material.grup || esBloquejat}
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
                                    disabled={esBloquejat}
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

            {/* PESTAÑA: TASQUES */}
            {activeTab === 'tasques' && (
              <div>
                {/* CARDS SUPERIORES */}
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(4, 1fr)', 
                  gap: '1rem',
                  marginBottom: '2rem'
                }}>
                  <div style={{ 
                    padding: '1rem',
                    background: 'var(--color-bg-secondary)',
                    borderRadius: '8px',
                    border: '1px solid var(--color-border)'
                  }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginBottom: '0.5rem' }}>
                      TOTAL DESPESES
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ef4444' }}>
                      {(() => {
                        const costRecursos = formData.recursosHumans.reduce((sum, r) => sum + r.cost, 0);
                        const costMaterials = formData.materials.reduce((sum, m) => sum + m.preuProveidor, 0);
                        return (costRecursos + costMaterials).toFixed(2);
                      })()}€
                    </div>
                  </div>

                  <div style={{ 
                    padding: '1rem',
                    background: 'var(--color-bg-secondary)',
                    borderRadius: '8px',
                    border: '1px solid var(--color-border)'
                  }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginBottom: '0.5rem' }}>
                      TOTAL FACTURACIÓ
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-accent-primary)' }}>
                      {formData.tasques.reduce((sum, t) => sum + t.importe, 0).toFixed(2)}€
                    </div>
                  </div>

                  <div style={{ 
                    padding: '1rem',
                    background: 'var(--color-bg-secondary)',
                    borderRadius: '8px',
                    border: '1px solid var(--color-border)'
                  }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginBottom: '0.5rem' }}>
                      BENEFICI
                    </div>
                    <div style={{ 
                      fontSize: '1.5rem', 
                      fontWeight: 700, 
                      color: (() => {
                        const totalFacturacio = formData.tasques.reduce((sum, t) => sum + t.importe, 0);
                        const totalDespeses = formData.recursosHumans.reduce((sum, r) => sum + r.cost, 0) + 
                                             formData.materials.reduce((sum, m) => sum + m.preuProveidor, 0);
                        return (totalFacturacio - totalDespeses) >= 0 ? '#10b981' : '#ef4444';
                      })()
                    }}>
                      {(() => {
                        const totalFacturacio = formData.tasques.reduce((sum, t) => sum + t.importe, 0);
                        const totalDespeses = formData.recursosHumans.reduce((sum, r) => sum + r.cost, 0) + 
                                             formData.materials.reduce((sum, m) => sum + m.preuProveidor, 0);
                        return (totalFacturacio - totalDespeses).toFixed(2);
                      })()}€
                    </div>
                  </div>

                  <div style={{ 
                    padding: '1rem',
                    background: 'var(--color-bg-secondary)',
                    borderRadius: '8px',
                    border: '1px solid var(--color-border)'
                  }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginBottom: '0.5rem' }}>
                      % BENEFICI
                    </div>
                    <div style={{ 
                      fontSize: '1.5rem', 
                      fontWeight: 700, 
                      color: (() => {
                        const totalFacturacio = formData.tasques.reduce((sum, t) => sum + t.importe, 0);
                        const totalDespeses = formData.recursosHumans.reduce((sum, r) => sum + r.cost, 0) + 
                                             formData.materials.reduce((sum, m) => sum + m.preuProveidor, 0);
                        const percentBenefici = totalFacturacio > 0 ? ((totalFacturacio - totalDespeses) / totalFacturacio) * 100 : 0;
                        return percentBenefici >= 0 ? '#10b981' : '#ef4444';
                      })()
                    }}>
                      {(() => {
                        const totalFacturacio = formData.tasques.reduce((sum, t) => sum + t.importe, 0);
                        const totalDespeses = formData.recursosHumans.reduce((sum, r) => sum + r.cost, 0) + 
                                             formData.materials.reduce((sum, m) => sum + m.preuProveidor, 0);
                        const percentBenefici = totalFacturacio > 0 ? ((totalFacturacio - totalDespeses) / totalFacturacio) * 100 : 0;
                        return percentBenefici.toFixed(1);
                      })()}%
                    </div>
                  </div>
                </div>

                {/* TABLA TASQUES */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                    Tasques del Projecte
                  </h3>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={afegirTasca}
                    disabled={esBloquejat}
                  >
                    + Afegir Tasca
                  </button>
                </div>

                {formData.tasques.length === 0 ? (
  <p style={{ textAlign: 'center', color: 'var(--color-text-tertiary)', padding: '2rem' }}>
    No hi ha tasques. Fes clic a "Afegir Tasca" o trasllada recursos/materials des de la pestanya Despeses.
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

        {/* TABLA DE TASQUES */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--color-border)', background: 'var(--color-bg-tertiary)' }}>
              <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, width: '150px' }}>Servei</th>
              <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, width: '35%' }}>Descripció</th>
              <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, width: '80px' }}>Quantitat</th>
              <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, width: '120px' }}>Unitat</th>
              <th style={{ textAlign: 'center', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, width: '110px' }}>Tarifa (€)</th>
              <th style={{ textAlign: 'right', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, width: '120px' }}>Import (€)</th>
              <th style={{ width: '100px' }}></th>
            </tr>
          </thead>
          <tbody>
            {tasques.map((tasca) => (
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
                      disabled={esBloquejat}
                      options={parametres?.serveis.map(s => ({ value: s.codi, label: s.nom })) || []}
                      placeholder="Servei..."
                    />
                  )}
                </td>
                <td style={{ padding: '0.75rem' }}>
                  <textarea
                    className="form-input"
                    value={tasca.descripcio}
                    onChange={(e) => actualitzarTasca(tasca.id, 'descripcio', e.target.value)}
                    rows={2}
                    disabled={esBloquejat}
                    style={{ resize: 'vertical' }}
                    placeholder="Descripció..."
                  />
                </td>
                <td style={{ padding: '0.75rem' }}>
                  <input
                    type="number"
                    className="form-input"
                    value={tasca.quantitat}
                    onChange={(e) => actualitzarTasca(tasca.id, 'quantitat', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                    disabled={esBloquejat}
                    min="0"
                    step="0.01"
                    style={{ textAlign: 'right' }}
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
                      disabled={esBloquejat}
                      options={parametres?.unitats.map(u => ({ value: u.codi, label: u.nom })) || []}
                      placeholder="Unitat..."
                    />
                  )}
                </td>
                <td style={{ padding: '0.75rem' }}>
                  <input
                    type="number"
                    className="form-input"
                    value={tasca.tarifa}
                    onChange={(e) => actualitzarTasca(tasca.id, 'tarifa', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                    disabled={esBloquejat}
                    min="0"
                    step="0.01"
                    style={{ textAlign: 'right' }}
                  />
                </td>
                <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 700, fontSize: '1rem' }}>
                  {tasca.importe.toFixed(2)}€
                </td>
                <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                  <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center' }}>
                    <button
                      type="button"
                      onClick={() => moureTasca(tasques.indexOf(tasca), 'amunt')}
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
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      onClick={() => moureTasca(tasques.indexOf(tasca), 'avall')}
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
                    >
                      ▼
                    </button>
                    <button
                      type="button"
                      onClick={() => eliminarTasca(tasca.id)}
                      disabled={esBloquejat}
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
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ))}
  </div>
)}
</div>
)}

            {/* PESTAÑA: INSTRUCCIONS */}
            {activeTab === 'instruccions' && (
              <div>
                <div className="form-group">
                  <label>Instruccions del Client</label>
                  <textarea
                    className="form-input"
                    value={formData.instruccionsClient}
                    onChange={(e) => setFormData({ ...formData, instruccionsClient: e.target.value })}
                    rows={5}
                    disabled={esBloquejat}
                    style={{ fontSize: '0.85rem', lineHeight: '1.4' }}
                    placeholder="Escriu aquí les instruccions, requisits o preferències del client..."
                  />
                  <p style={{ fontSize: '0.8rem', color: 'var(--color-text-tertiary)', marginTop: '0.5rem' }}>
                    Aquest camp és només de referència interna per l'equip.
                  </p>
                </div>

                <div className="form-group">
                  <label>Instruccions per Proveïdors</label>
                  <textarea
                    className="form-input"
                    value={formData.instruccionsProveidors}
                    onChange={(e) => setFormData({ ...formData, instruccionsProveidors: e.target.value })}
                    rows={5}
                    disabled={esBloquejat}
                    style={{ fontSize: '0.85rem', lineHeight: '1.4' }}
                    placeholder="Escriu aquí les instruccions específiques per als proveïdors externs..."
                  />
                  <p style={{ fontSize: '0.8rem', color: 'var(--color-text-tertiary)', marginTop: '0.5rem' }}>
                    Aquesta informació es pot compartir amb els col·laboradors externs assignats a les tasques.
                  </p>
                </div>
              </div>
            )}

            {/* PESTAÑA: HISTORIAL */}
{activeTab === 'historial' && (
  <div className="tab-content">
    <div className="form-section">
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
  <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
    Documents Vinculats
  </h3>
  <div style={{ display: 'flex', gap: '0.5rem' }}>
  {!formData.pressupost && !esBloquejat && (
  <button
    type="button"
    onClick={() => setShowVincularPressupostModal(true)}
    className="btn-secondary"
    style={{ fontSize: '0.85rem' }}
    title="Vincular pressupost existent"
  >
    <FileText size={16} />
    Vincular Pressupost
  </button>
)}

{!formData.facturaAssociada && !esBloquejat && (
  <button
    type="button"
    onClick={() => setShowVincularFacturaModal(true)}
    className="btn-secondary"
    style={{ fontSize: '0.85rem' }}
    title="Vincular factura existent"
  >
    <FileText size={16} />
    Vincular Factura
  </button>
)}

<button
  type="button"
  onClick={() => setShowDocumentModal(true)}
  className="btn-secondary"
  style={{ fontSize: '0.85rem' }}
>
  <Upload size={16} />
  Afegir Document
</button>
  </div>
</div>
      
      <div style={{ 
        padding: '1rem', 
        background: 'var(--color-bg-tertiary)', 
        borderRadius: '6px',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem'
      }}>
       {/* Pressupost Vinculat */}
{formData.pressupost && (
  <div 
    onClick={() => {
        localStorage.setItem('plateaNavigateTo', JSON.stringify({
          type: 'pressupost',
          codi: formData.pressupost
        }));
        onClose();
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('navigate-to', { 
            detail: { section: 'pressupostos', codi: formData.pressupost } 
          }));
        }, 100);
    }}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      padding: '0.75rem',
      background: 'var(--color-bg-primary)',
      border: '1px solid var(--color-border)',
      borderRadius: '6px',
      cursor: 'pointer',
      transition: 'all 0.2s'
    }}
    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-bg-tertiary)'}
    onMouseLeave={(e) => e.currentTarget.style.background = 'var(--color-bg-primary)'}
  >
    <FileText size={20} style={{ color: 'var(--color-accent-primary)', flexShrink: 0 }} />
    <div style={{ flex: 1 }}>
      <div style={{ fontWeight: 600, color: 'var(--color-text-primary)', fontSize: '0.9rem' }}>
        Pressupost Vinculat
      </div>
      <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>
        {formData.pressupost}
      </div>
    </div>
  </div>
)}

       {/* Factura Associada */}
{formData.facturaAssociada && (
  <div 
    onClick={() => {
        localStorage.setItem('plateaNavigateTo', JSON.stringify({
          type: 'factura',
          codi: formData.facturaAssociada
        }));
        onClose();
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('navigate-to', { 
            detail: { section: 'factures-venda', codi: formData.facturaAssociada } 
          }));
        }, 100);
    }}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      padding: '0.75rem',
      background: 'var(--color-bg-primary)',
      border: '1px solid var(--color-border)',
      borderRadius: '6px',
      cursor: 'pointer',
      transition: 'all 0.2s'
    }}
    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-bg-tertiary)'}
    onMouseLeave={(e) => e.currentTarget.style.background = 'var(--color-bg-primary)'}
  >
    <FileText size={20} style={{ color: 'var(--color-accent-primary)', flexShrink: 0 }} />
    <div style={{ flex: 1 }}>
      <div style={{ fontWeight: 600, color: 'var(--color-text-primary)', fontSize: '0.9rem' }}>
        Factura Associada
      </div>
      <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>
        {formData.facturaAssociada}
      </div>
    </div>
  </div>
)}

        {/* Documentos Añadidos Manualmente */}
        {formData.documents && formData.documents.length > 0 && (
          formData.documents.map(doc => (
            <div
              key={doc.id}
              style={{
                padding: '0.75rem',
                background: 'white',
                border: '1px solid var(--color-border)',
                borderRadius: '6px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div>
                <div><strong>{doc.tipus}:</strong> {doc.nom}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-tertiary)', marginTop: '0.25rem' }}>
                  {doc.nomFitxer} • {new Date(doc.dataAfegit).toLocaleDateString('ca-ES')}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => descarregarDocument(doc)}
                  style={{
                    padding: '0.25rem 0.5rem',
                    background: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.85rem'
                  }}
                  title="Descarregar"
                >
                  <Download size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => eliminarDocument(doc.id)}
                  style={{
                    padding: '0.25rem 0.5rem',
                    background: '#dc2626',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    opacity: 1
                  }}
                  title="Eliminar"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))
        )}

        {/* Mensaje si no hay documentos */}
        {!formData.pressupost && !formData.facturaAssociada && (!formData.documents || formData.documents.length === 0) && (
          <div style={{ textAlign: 'center', color: 'var(--color-text-tertiary)', padding: '1rem' }}>
            No hi ha documents vinculats
          </div>
        )}
      </div>
    </div>

    <div>
    <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--color-text-primary)' }}>
      Timeline del Projecte
    </h3>
    
    <div style={{ 
      padding: '1.5rem',
      background: 'var(--color-bg-secondary)',
      borderRadius: '8px',
      border: '1px solid var(--color-border)'
    }}>
      {formData.historial && formData.historial.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {obtenirHistorialOrdenat(formData).map((entrada) => (
            <div key={entrada.id} style={{ display: 'flex', gap: '1rem', alignItems: 'start' }}>
              <div style={{ 
                width: '8px', 
                height: '8px', 
                borderRadius: '50%', 
                background: obtenirColorHistorial(entrada.tipus),
                marginTop: '0.5rem',
                flexShrink: 0
              }} />
              <div style={{ flex: 1 }}>
                <div style={{ 
                  fontSize: '0.85rem', 
                  color: 'var(--color-text-tertiary)',
                  marginBottom: '0.25rem'
                }}>
                  {new Date(entrada.data).toLocaleDateString('ca-ES', { 
                    day: '2-digit', 
                    month: '2-digit', 
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
                <div style={{ 
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <span>{obtenirIconaHistorial(entrada)}</span>
                  <span>{entrada.descripcio}</span>
                </div>
                {entrada.detalls && (
                  <div style={{ 
                    fontSize: '0.85rem', 
                    color: 'var(--color-text-secondary)',
                    marginTop: '0.25rem'
                  }}>
                    {entrada.detalls}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ 
          padding: '2rem', 
          textAlign: 'center',
          color: 'var(--color-text-tertiary)',
          fontStyle: 'italic'
        }}>
          No hi ha esdeveniments registrats encara
        </div>
      )}
</div>
  </div>
  </div>
)}
</div>

{/* MODAL FOOTER */}
<div className="modal-footer" style={{
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            flexShrink: 0
          }}>
            {/* Botón Eliminar - izquierda */}
{projecte && !esBloquejat && (formData.estat === 'esborrany' || formData.estat === 'planificat') && (
  <button
    type="button"
    onClick={eliminarProjecte}
                className="btn-secondary"
                style={{
                  borderColor: '#dc2626',
                  color: '#dc2626',
                  marginRight: 'auto'
                }}
              >
                <Trash2 size={18} />
                Eliminar
              </button>
            )}

            {/* Botones de acción - derecha */}
            <div style={{ display: 'flex', gap: '1rem' }}>
            <button 
  type="button" 
  className="btn-primary" 
  onClick={() => {
    // Detectar si hay cambios
    const tieneCanvis = hasRealProjectData(formData);
    
    // Si no hay cambios
    if (!tieneCanvis) {
      // Si el proyecto ya fue guardado, eliminarlo
      const saved = localStorage.getItem('plateaProjectes');
      if (saved) {
        const projectes = JSON.parse(saved);
        const projecteExisteix = projectes.some((p: any) => p.codi === formData.codi);
        
        if (projecteExisteix) {
          // Eliminar el proyecto vacío
          const filteredProjectes = projectes.filter((p: any) => p.codi !== formData.codi);
          localStorage.setItem('plateaProjectes', JSON.stringify(filteredProjectes));
        }
      }
      onClose();
      return;
    }
    
    // Si hay cambios, validar campos obligatorios
    if (!formData.client || !formData.titol || !formData.dataEntrega) {
      alert('⚠️ Falten camps obligatoris:\n\n• Client\n• Títol del projecte\n• Data d\'entrega\n\nOmple aquests camps abans de guardar.');
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

{/* MODAL AFEGIR TASCA */}
{showAfegirTascaModal && (
  <div className="modal-overlay" onClick={(e) => {
    e.stopPropagation();
    setShowAfegirTascaModal(false);
  }}>
    <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
      <div className="modal-header">
        <h2>Afegir Tasca</h2>
        <button className="modal-close" onClick={() => setShowAfegirTascaModal(false)} disabled={esBloquejat}>
          <X size={24} />
        </button>
      </div>
      
      <div className="modal-body">
        <div className="form-group">
          <label>Servei *</label>
          <select
            className="form-input"
            value={novaTascaForm.servei}
            onChange={(e) => handleServeiChange(e.target.value)}
            disabled={esBloquejat}
          >
            <option value="">Selecciona servei...</option>
            {parametres?.serveis.map(s => (
              <option key={s.codi} value={s.codi}>{s.nom}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Descripció</label>
          <textarea
            className="form-input"
            value={novaTascaForm.descripcio}
            onChange={(e) => setNovaTascaForm({ ...novaTascaForm, descripcio: e.target.value })}
            disabled={esBloquejat}
            rows={3}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="form-group">
            <label>Quantitat *</label>
            <input
              type="number"
              className="form-input"
              value={novaTascaForm.quantitat}
              onChange={(e) => setNovaTascaForm({ ...novaTascaForm, quantitat: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
              disabled={esBloquejat}
              min="0"
              step="0.01"
            />
          </div>

          <div className="form-group">
            <label>Unitat *</label>
            <select
              className="form-input"
              value={novaTascaForm.unitat}
              onChange={(e) => handleUnitatChange(e.target.value)}
              disabled={esBloquejat}
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
            onChange={(e) => setNovaTascaForm({ ...novaTascaForm, tarifa: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
            disabled={esBloquejat}
            min="0"
            step="0.01"
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
{/* MODAL AFEGIR RECURS/MATERIAL */}
{showAfegirRecursModal && (
  <div className="modal-overlay" onClick={(e) => {
    e.stopPropagation();
    setShowAfegirRecursModal(false);
  }}>
    <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
      <div className="modal-header">
        <h2>Afegir {tipusRecurs === 'huma' ? 'Recurs Humà' : 'Material'}</h2>
        <button className="modal-close" onClick={() => setShowAfegirRecursModal(false)}>
          <X size={24} />
        </button>
      </div>
      
      {/* SWITCHERS */}
      <div style={{ 
        display: 'flex', 
        gap: '0.5rem',
        padding: '0 1.5rem',
        borderBottom: '1px solid var(--color-border)'
      }}>
        <button
          type="button"
          onClick={() => setTipusRecurs('huma')}
          style={{
            padding: '0.75rem 1.5rem',
            background: 'transparent',
            border: 'none',
            borderBottom: tipusRecurs === 'huma' ? '2px solid var(--color-accent-primary)' : '2px solid transparent',
            color: tipusRecurs === 'huma' ? 'var(--color-accent-primary)' : 'var(--color-text-secondary)',
            fontWeight: tipusRecurs === 'huma' ? 600 : 400,
            cursor: 'pointer',
            marginBottom: '-1px'
          }}
        >
          Recurs Humà
        </button>
        <button
          type="button"
          onClick={() => setTipusRecurs('material')}
          style={{
            padding: '0.75rem 1.5rem',
            background: 'transparent',
            border: 'none',
            borderBottom: tipusRecurs === 'material' ? '2px solid var(--color-accent-primary)' : '2px solid transparent',
            color: tipusRecurs === 'material' ? 'var(--color-accent-primary)' : 'var(--color-text-secondary)',
            fontWeight: tipusRecurs === 'material' ? 600 : 400,
            cursor: 'pointer',
            marginBottom: '-1px'
          }}
        >
          Material
        </button>
      </div>
      
      <div className="modal-body">
        {tipusRecurs === 'huma' ? (
          // FORMULARIO RECURS HUMÀ
          <>
            <div className="form-group">
              <label>Proveïdor</label>
              <SearchableSelect
                value={nouRecursForm.proveidor}
                onChange={handleRecursProveidorChange}
                options={[
                  { value: '', label: 'Cap proveïdor' },
                  ...proveidors.map(p => ({ 
                    value: p.codi, 
                    label: p.nomComercial || p.nomFiscal 
                  }))
                ]}
                placeholder="Cap proveïdor"
              />
            </div>

            <div className="form-group">
              <label>Servei *</label>
              <SearchableSelect
                value={nouRecursForm.servei}
                onChange={handleRecursServeiChange}
                options={parametres?.serveis.map(s => ({ value: s.codi, label: s.nom })) || []}
                placeholder="Selecciona servei..."
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label>Quantitat *</label>
                <input
                  type="number"
                  className="form-input"
                  value={nouRecursForm.quantitat}
                  onChange={(e) => {
                    const quantitat = e.target.value === '' ? 0 : parseFloat(e.target.value);
                    setNouRecursForm({
                      ...nouRecursForm,
                      quantitat,
                      cost: quantitat * nouRecursForm.preu
                    });
                  }}
                  min="0"
                  step="0.01"
                />
              </div>

              <div className="form-group">
                <label>Unitat *</label>
                <SearchableSelect
                  value={nouRecursForm.unitat}
                  onChange={handleRecursUnitatChange}
                  options={parametres?.unitats.map(u => ({ value: u.codi, label: u.nom })) || []}
                  placeholder="Selecciona unitat..."
                />
              </div>
            </div>

            <div className="form-group">
              <label>Preu (€)</label>
              <input
                type="number"
                className="form-input"
                value={nouRecursForm.preu}
                onChange={(e) => {
                  const preu = e.target.value === '' ? 0 : parseFloat(e.target.value);
                  setNouRecursForm({
                    ...nouRecursForm,
                    preu,
                    cost: nouRecursForm.quantitat * preu
                  });
                }}
                min="0"
                step="0.01"
              />
              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-tertiary)', marginTop: '0.25rem' }}>
                {nouRecursForm.proveidor && nouRecursForm.servei && nouRecursForm.unitat 
                  ? 'Tarifa del proveïdor carregada automàticament'
                  : 'Selecciona proveïdor, servei i unitat per carregar la tarifa'}
              </p>
            </div>

            <div style={{ 
              padding: '1rem', 
              background: 'var(--color-bg-tertiary)', 
              borderRadius: '6px',
              marginTop: '1rem'
            }}>
              <strong>Cost total:</strong> {nouRecursForm.cost.toFixed(2)}€
            </div>
          </>
        ) : (
          // FORMULARIO MATERIAL
          <>
            <div className="form-group">
              <label>Proveïdor</label>
              <SearchableSelect
                value={nouMaterialForm.proveidor}
                onChange={(value) => setNouMaterialForm({ ...nouMaterialForm, proveidor: value })}
                options={[
                  { value: '', label: 'Cap proveïdor' },
                  ...proveidors.map(p => ({ 
                    value: p.codi, 
                    label: p.nomComercial || p.nomFiscal 
                  }))
                ]}
                placeholder="Cap proveïdor"
              />
            </div>

            <div className="form-group">
              <label>Material *</label>
              <SearchableSelect
                value={nouMaterialForm.material}
                onChange={handleMaterialChange}
                options={parametres?.materials.filter(m => m.estat === 'actiu').map(m => ({ 
                  value: m.codi, 
                  label: m.material 
                })) || []}
                placeholder="Selecciona material..."
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label>Preu Proveïdor (€)</label>
                <input
                  type="number"
                  className="form-input"
                  value={nouMaterialForm.preuProveidor}
                  onChange={(e) => setNouMaterialForm({ 
                    ...nouMaterialForm, 
                    preuProveidor: e.target.value === '' ? 0 : parseFloat(e.target.value) 
                  })}
                  min="0"
                  step="0.01"
                />
              </div>

              <div className="form-group">
                <label>Preu Platea (€)</label>
                <input
                  type="number"
                  className="form-input"
                  value={nouMaterialForm.preuPlatea}
                  onChange={(e) => setNouMaterialForm({ 
                    ...nouMaterialForm, 
                    preuPlatea: e.target.value === '' ? 0 : parseFloat(e.target.value) 
                  })}
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-tertiary)', marginTop: '0.5rem' }}>
              Els preus es carreguen automàticament des dels paràmetres del material
            </p>
          </>
        )}
      </div>

      <div className="modal-footer">
        <button 
          type="button" 
          className="btn-secondary" 
          onClick={() => setShowAfegirRecursModal(false)}
        >
          Cancel·lar
        </button>
        <button 
          type="button" 
          className="btn-primary" 
          onClick={tipusRecurs === 'huma' ? guardarNouRecurs : guardarNouMaterial}
        >
          Afegir {tipusRecurs === 'huma' ? 'Recurs' : 'Material'}
        </button>
      </div>
    </div>
  </div>
)}

      {/* Modal Afegir Document */}
{showDocumentModal && (
  <DocumentModal
    onClose={() => setShowDocumentModal(false)}
    onSave={afegirDocument}
  />
)}
{/* Modal Vincular Pressupost */}
{showVincularPressupostModal && (
  <div className="modal-overlay" onClick={() => setShowVincularPressupostModal(false)}>
    <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
      <div className="modal-header">
        <h2>
          <FileText size={24} />
          Vincular Pressupost
        </h2>
        <button className="modal-close" onClick={() => setShowVincularPressupostModal(false)}>
          <X size={24} />
        </button>
      </div>
      
      <div className="modal-body">
        <p style={{ marginBottom: '1rem', color: 'var(--color-text-secondary)' }}>
          Selecciona un pressupost existent per vincular a aquest projecte:
        </p>
        
        <SearchableSelect
          value=""
          onChange={vincularPressupost}
          options={pressupostos
            .filter(p => p.client === formData.client && !p.projecteCreat && !p.projecteVinculat)
            .map(p => ({
              value: p.codi,
              label: `${p.codi} - ${p.nomProjecte || 'Sense nom'} (${p.estat})`
            }))}
          placeholder="Selecciona pressupost..."
        />
        
        {pressupostos.filter(p => p.client === formData.client && !p.projecteCreat && !p.projecteVinculat).length === 0 && (
          <p style={{ marginTop: '1rem', color: 'var(--color-text-tertiary)', fontStyle: 'italic' }}>
            No hi ha pressupostos disponibles per vincular (mateix client i sense projecte associat)
          </p>
        )}
      </div>
      
      <div className="modal-footer">
        <button type="button" className="btn-secondary" onClick={() => setShowVincularPressupostModal(false)}>
          Cancel·lar
        </button>
      </div>
    </div>
  </div>
)}

{/* Modal Vincular Factura */}
{showVincularFacturaModal && (
  <div className="modal-overlay" onClick={() => setShowVincularFacturaModal(false)}>
    <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
      <div className="modal-header">
        <h2>
          <FileText size={24} />
          Vincular Factura
        </h2>
        <button className="modal-close" onClick={() => setShowVincularFacturaModal(false)}>
          <X size={24} />
        </button>
      </div>
      
      <div className="modal-body">
        <p style={{ marginBottom: '1rem', color: 'var(--color-text-secondary)' }}>
          Selecciona una factura existent per vincular a aquest projecte:
        </p>
        
        <SearchableSelect
          value=""
          onChange={vincularFactura}
          options={factures
            .filter(f => f.client === formData.client && !f.projecte)
            .map(f => ({
              value: f.codi,
              label: `${f.codi} - ${f.concepte || 'Sense concepte'} (${f.totalAmbIVA ? f.totalAmbIVA.toFixed(2) : '0.00'}€)`
            }))}
          placeholder="Selecciona factura..."
        />
        
        {factures.filter(f => f.client === formData.client && !f.projecte).length === 0 && (
          <p style={{ marginTop: '1rem', color: 'var(--color-text-tertiary)', fontStyle: 'italic' }}>
            No hi ha factures disponibles per vincular (mateix client i sense projecte associat)
          </p>
        )}
      </div>
      
      <div className="modal-footer">
        <button type="button" className="btn-secondary" onClick={() => setShowVincularFacturaModal(false)}>
          Cancel·lar
        </button>
      </div>
    </div>
  </div>
)}
      </div>
  );
}

export default ProjecteModal;
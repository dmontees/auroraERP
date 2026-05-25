import { useState, useEffect, useRef } from 'react';
import { storage } from '../../utils/storageManager';
import { getNextTdCodi, syncAlbaransForProject, checkEliminarLinia, deleteAlbaraForLinia } from '../../utils/albaraSync';
import { syncProjectDatesToGoogle, isGoogleCalendarConnected } from '../../utils/googleCalendarSync';
import { ChevronLeft, Trash2, FileText } from 'lucide-react';
import DocumentModal from './DocumentModal';
import type { Projecte, TascaProjecte, RecursHumaProjecte, MaterialProjecte, DocumentProjecte } from '../../types/projecte';
import type { Client } from '../../types/client';
import type { Parametres } from '../../types/parametres';
import type { Proveidor } from '../../types/proveidor';
import type { Pressupost } from '../../types/pressupost';
import type { FacturaVenta } from '../../types/factura-venta';
import { useAutoSave } from '../../hooks/useAutoSave';
import {
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
} from '../../utils/projecteHistorial';

import ResumTab from './tabs/ResumTab';
import DadesTab from './tabs/DadesTab';
import DespesesTab from './tabs/DespesesTab';
import TasquesTab from './tabs/TasquesTab';
import InstruccionsTab from './tabs/InstruccionsTab';
import FeedbackTab from './tabs/FeedbackTab';
import HistorialTab from './tabs/HistorialTab';
import PagamentsProveidorsTab from './tabs/PagamentsProveidorsTab';

import AfegirTascaModal from './modals/AfegirTascaModal';
import AfegirRecursModal from './modals/AfegirRecursModal';
import VincularModal from './modals/VincularModal';

interface ProjecteDetailViewProps {
  projecte: Projecte | null;
  onBack: () => void;
  onSave: (projecte: Projecte) => void;
  onCrearFactura?: (projecte: Projecte) => void;
  nextCode: string;
  clients: Client[];
  parametres: Parametres | null;
  proveidors: Proveidor[];
}

function migrateProjecteIds(data: Projecte): Projecte {
  const materials = (data.materials || []).map((m: MaterialProjecte, i: number) =>
    m.id ? m : { ...m, id: `mat-legacy-${i}-${Date.now()}` }
  );
  const recursosHumans = (data.recursosHumans || []).map((r: RecursHumaProjecte, i: number) =>
    r.id ? r : { ...r, id: `rh-legacy-${i}-${Date.now()}` }
  );
  return { ...data, materials, recursosHumans };
}

function hasRealProjectData(data: any): boolean {
  return (
    data.pressupost || data.factura || data.titol || data.client || data.descripcio ||
    data.recursosHumans?.length > 0 || data.materials?.length > 0 || data.tasques?.length > 0 ||
    data.modalitat || data.servei || data.dataEntrega ||
    data.datesRodatge?.length > 0 || data.datesEntrega?.length > 0 ||
    data.dataFinalitzacio || data.instruccionsClient || data.instruccionsProveidors ||
    (data.estat && data.estat !== 'esborrany') || data.historial?.length > 1
  );
}

const ESTAT_BG: Record<string, string> = {
  esborrany: '#fef3c7', planificat: '#fed7aa', rodatge: '#fee2e2',
  edicio: '#bfdbfe', esperant_feedback: '#f9fafb', revisio: '#3b82f6',
  acabat: '#d1fae5', facturat: '#059669',
};
const ESTAT_COLOR: Record<string, string> = {
  esborrany: '#92400e', planificat: '#9a3412', rodatge: '#991b1b',
  edicio: '#1e3a8a', esperant_feedback: '#374151', revisio: '#ffffff',
  acabat: '#065f46', facturat: '#ffffff',
};

function ProjecteDetailView({
  projecte, onBack, onSave, onCrearFactura, nextCode, clients, parametres, proveidors
}: ProjecteDetailViewProps) {
  const [activeTab, setActiveTab] = useState<'resum' | 'dades' | 'despeses' | 'tasques' | 'instruccions' | 'feedback' | 'historial' | 'pagaments'>('resum');
  const [recursCopiado, setRecursCopiado] = useState<string | null>(null);
  const [materialCopiado, setMaterialCopiado] = useState<string | null>(null);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [showVincularPressupostModal, setShowVincularPressupostModal] = useState(false);
  const [showVincularFacturaModal, setShowVincularFacturaModal] = useState(false);
  const [pressupostos, setPressupostos] = useState<Pressupost[]>([]);
  const [factures, setFactures] = useState<FacturaVenta[]>([]);

  const [formData, setFormData] = useState<Projecte>(() => {
    if (!projecte) return {
      codi: nextCode, client: '', pressupost: undefined, factura: undefined,
      titol: '', descripcio: '', modalitat: '', servei: '', esDirect: false,
      datesRodatge: [], datesEntrega: [], estat: 'esborrany',
      recursosHumans: [], materials: [],
      ingresSenseIVA: 0, iva: 21, ingresAmbIVA: 0,
      gastosMaterials: 0, gastosHumans: 0, gastosTotals: 0,
      benefici: 0, percentBenefici: 0,
      instruccionsClient: '', instruccionsProveidors: '',
      tasques: [], facturat: false, arxivat: false, historial: []
    };
    return migrateProjecteIds(projecte);
  });

  useEffect(() => {
    if (projecte) {
      const projectes = storage.getProjectes();
      const updated = projectes.find((p: Projecte) => p.codi === projecte.codi);
      if (updated) {
        const data = JSON.parse(JSON.stringify(updated));
        if ((!data.datesRodatge || data.datesRodatge.length === 0) && data.dataInici) {
          data.datesRodatge = [{ id: `rod-${Date.now()}`, data: data.dataInici, hora: '', nota: '' }];
        }
        if ((!data.datesEntrega || data.datesEntrega.length === 0) && data.dataEntrega) {
          data.datesEntrega = [{ id: `ent-${Date.now()}`, data: data.dataEntrega, nota: '' }];
        }
        setFormData(migrateProjecteIds(data));
      }
    }
  }, [projecte]);

  const handleSaveWithSync = (data: Projecte) => {
    onSave(data);
    syncAlbaransForProject(data, parametres);
    if (isGoogleCalendarConnected()) {
      const oldProjecte = projecte;
      syncProjectDatesToGoogle(data, oldProjecte, clients).then(updated => {
        const hasDiff =
          JSON.stringify(updated.datesRodatge) !== JSON.stringify(data.datesRodatge) ||
          JSON.stringify(updated.datesEntrega) !== JSON.stringify(data.datesEntrega);
        if (hasDiff) {
          setFormData(updated);
          const stored = storage.getProjectes();
          storage.setProjectes(stored.map((p: Projecte) => p.codi === updated.codi ? updated : p));
        }
      }).catch(console.error);
    }
  };

  const { saveNow } = useAutoSave(formData, handleSaveWithSync);
  const estatAnteriorRef = useRef<string>(formData.estat);

  useEffect(() => {
    if (!projecte && formData.codi === nextCode) {
      if (!formData.historial || formData.historial.length === 0) {
        setFormData(registrarCreacioProjecte(formData));
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setPressupostos(storage.getPressupostos());
    setFactures(storage.getFacturesVenda());
  }, []);

  const esBloquejat = formData.estat === 'facturat' || formData.estat === 'acabat';

  const avisActiu = formData.avisFacturacio?.actiu;
  const avisDescripcio = formData.avisFacturacio?.descripcio;
  useEffect(() => {
    if (!formData.facturaAssociada) return;
    const facturesAll = storage.getFacturesVenda();
    const facturaLinked = facturesAll.find((f: any) => f.codi === formData.facturaAssociada);
    if (!facturaLinked) return;
    const nouAvis = { actiu: avisActiu ?? false, descripcio: avisDescripcio ?? '' };
    if (facturaLinked.avisFacturacio?.actiu !== nouAvis.actiu || facturaLinked.avisFacturacio?.descripcio !== nouAvis.descripcio) {
      storage.setFacturesVenda(facturesAll.map((f: any) =>
        f.codi === formData.facturaAssociada ? { ...f, avisFacturacio: nouAvis } : f
      ));
    }
  }, [avisActiu, avisDescripcio, formData.facturaAssociada]);

  useEffect(() => {
    const gastosHumans = formData.recursosHumans.reduce((sum, r) => sum + r.cost, 0);
    const gastosMaterials = formData.materials.reduce((sum, m) => sum + m.preuPlatea, 0);
    const ingresAmbIVA = formData.ingresSenseIVA * (1 + formData.iva / 100);
    const gastosTotals = gastosMaterials + gastosHumans;
    const benefici = ingresAmbIVA - gastosTotals;
    const percentBenefici = ingresAmbIVA > 0 ? (benefici / ingresAmbIVA) * 100 : 0;
    setFormData(prev => ({ ...prev, gastosMaterials, gastosHumans, ingresAmbIVA, gastosTotals, benefici, percentBenefici }));
  }, [formData.ingresSenseIVA, formData.iva, formData.recursosHumans, formData.materials]);

  // ─── Tarifes ────────────────────────────────────────────────────────────────
  const selectedClient = clients.find(c => c.codi === formData.client);

  const buscarTarifaClient = (servei: string, unitat: string): number | null => {
    if (!selectedClient || !parametres) return null;
    const tarifaClient = selectedClient.tarifesEspecials?.find(t => t.servei === servei && t.unitat === unitat);
    if (tarifaClient) return tarifaClient.preu;
    return parametres.tarifes.find(t => t.servei === servei && t.unitat === unitat)?.preu ?? null;
  };

  const buscarTarifaProveidor = (proveidorCodi: string, servei: string, unitat: string): number => {
    if (!proveidorCodi || !parametres) return 0;
    const prov = proveidors.find(p => p.codi === proveidorCodi);
    return prov?.tarifesEspecials?.find(t => t.servei === servei && t.unitat === unitat)?.preu || 0;
  };

  // ─── CRUD Recursos Humans ────────────────────────────────────────────────────
  const [showAfegirRecursModal, setShowAfegirRecursModal] = useState(false);
  const [tipusRecurs, setTipusRecurs] = useState<'huma' | 'material'>('huma');
  const [nouRecursForm, setNouRecursForm] = useState<RecursHumaProjecte>({
    id: '', categoria: '', servei: '', unitat: '', quantitat: 1, preu: 0, cost: 0, ordre: 0, proveidor: ''
  });
  const [nouMaterialForm, setNouMaterialForm] = useState<MaterialProjecte>({
    id: '', grup: '', material: '', proveidor: '', preuProveidor: 0, preuPlatea: 0
  });

  const afegirRecursHuma = () => {
    setNouRecursForm({ id: `rh-${Date.now()}`, categoria: '', servei: '', unitat: '', quantitat: 1, preu: 0, cost: 0, ordre: formData.recursosHumans.length, proveidor: '' });
    setTipusRecurs('huma');
    setShowAfegirRecursModal(true);
  };

  const handleRecursServeiChange = (serveiCodi: string) => {
    const serveiData = parametres?.serveis.find(s => s.codi === serveiCodi);
    const novaData = { ...nouRecursForm, servei: serveiCodi, categoria: serveiData?.categoria || '' };
    if (novaData.proveidor && novaData.unitat) {
      const preu = buscarTarifaProveidor(novaData.proveidor, serveiCodi, novaData.unitat);
      novaData.preu = preu;
      novaData.cost = novaData.quantitat * preu;
    }
    setNouRecursForm(novaData);
  };

  const handleRecursProveidorChange = (proveidorCodi: string) => {
    const novaData = { ...nouRecursForm, proveidor: proveidorCodi };
    const trb = proveidors.find(p => p.codi === proveidorCodi && p.tipus === 'Treballador');
    if (trb) {
      novaData.preu = (trb.salariDiari || 0) * (1 + (trb.percentatgeSSEmpresa ?? 30.2) / 100);
      const jornada = parametres?.unitats.find(u => u.nom.toLowerCase().includes('jornada'));
      if (jornada) novaData.unitat = jornada.codi;
      if (trb.serveisAssociats?.length) {
        novaData.servei = trb.serveisAssociats[0];
        const serveiData = parametres?.serveis.find(s => s.codi === trb.serveisAssociats![0]);
        if (serveiData) novaData.categoria = serveiData.categoria;
      }
    } else if (novaData.servei && novaData.unitat) {
      const preu = buscarTarifaProveidor(proveidorCodi, novaData.servei, novaData.unitat);
      novaData.preu = preu;
    }
    novaData.cost = novaData.quantitat * novaData.preu;
    setNouRecursForm(novaData);
  };

  const handleRecursUnitatChange = (unitatCodi: string) => {
    const novaData = { ...nouRecursForm, unitat: unitatCodi };
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
      if (field === 'servei') {
        const serveiData = parametres?.serveis.find(s => s.codi === value);
        if (serveiData) updated.categoria = serveiData.categoria;
      }
      if (field === 'proveidor') {
        if (value && !updated.tdCodi) updated.tdCodi = getNextTdCodi(formData);
        const trb = proveidors.find(p => p.codi === value && p.tipus === 'Treballador');
        if (trb) {
          updated.preu = (trb.salariDiari || 0) * (1 + (trb.percentatgeSSEmpresa ?? 30.2) / 100);
          const jornada = parametres?.unitats.find(u => u.nom.toLowerCase().includes('jornada'));
          if (jornada) updated.unitat = jornada.codi;
          if (trb.serveisAssociats?.length) {
            updated.servei = trb.serveisAssociats[0];
            const serveiData = parametres?.serveis.find(s => s.codi === trb.serveisAssociats![0]);
            if (serveiData) updated.categoria = serveiData.categoria;
          }
        }
      }
      if (field === 'quantitat' || field === 'preu' || field === 'proveidor') {
        updated.cost = updated.quantitat * updated.preu;
      }
      return updated;
    });
    setFormData({ ...formData, recursosHumans: nousRecursos });
  };

  const eliminarRecursHuma = (id: string) => {
    const recursAEliminar = formData.recursosHumans.find(r => r.id === id);
    if (recursAEliminar) {
      const bloqueig = checkEliminarLinia(recursAEliminar.tdCodi);
      if (bloqueig) { alert(bloqueig); return; }
      deleteAlbaraForLinia(recursAEliminar.tdCodi);
      const nomServei = parametres?.serveis.find(s => s.codi === recursAEliminar.servei)?.nom || recursAEliminar.servei;
      const projecteAmbHistorial = registrarGastoEliminat(formData, nomServei, recursAEliminar.cost);
      setFormData({ ...projecteAmbHistorial, recursosHumans: projecteAmbHistorial.recursosHumans.filter(r => r.id !== id) });
    } else {
      setFormData({ ...formData, recursosHumans: formData.recursosHumans.filter(r => r.id !== id) });
    }
  };

  const guardarNouRecurs = () => {
    if (!nouRecursForm.servei || !nouRecursForm.unitat) {
      alert('Has de seleccionar un servei i una unitat');
      return;
    }
    const cost = nouRecursForm.quantitat * nouRecursForm.preu;
    const tdCodi = nouRecursForm.proveidor ? getNextTdCodi(formData) : undefined;
    const recursComplet = { ...nouRecursForm, cost, tdCodi };
    const nomServei = parametres?.serveis.find(s => s.codi === recursComplet.servei)?.nom || recursComplet.servei;
    const nomCategoria = parametres?.categories.find(c => c.codi === recursComplet.categoria)?.nom || recursComplet.categoria || 'Recurs humà';
    const projecteAmbHistorial = registrarGastoAfegit(formData, `${nomCategoria} - ${nomServei}`, recursComplet.cost);
    setFormData({ ...projecteAmbHistorial, recursosHumans: [...projecteAmbHistorial.recursosHumans, recursComplet] });
    setShowAfegirRecursModal(false);
  };

  const trasladarRecursATaska = (recurs: RecursHumaProjecte) => {
    if (!recurs.servei || !recurs.unitat) return;
    const serveiData = parametres?.serveis.find(s => s.codi === recurs.servei);
    const tarifaAuto = buscarTarifaClient(recurs.servei, recurs.unitat);
    const tarifa = tarifaAuto !== null ? tarifaAuto : 0;
    const novaTasca: TascaProjecte = {
      id: `task-${Date.now()}-${Math.random()}`,
      categoria: recurs.categoria, servei: recurs.servei,
      descripcio: serveiData?.descripcio || '',
      quantitat: recurs.quantitat, unitat: recurs.unitat,
      tarifa, importe: recurs.quantitat * tarifa, ordre: formData.tasques.length
    };
    setFormData({ ...formData, tasques: [...formData.tasques, novaTasca] });
    setRecursCopiado(recurs.id);
    setTimeout(() => setRecursCopiado(null), 1500);
  };

  // ─── CRUD Materials ──────────────────────────────────────────────────────────
  const afegirMaterial = () => {
    setNouMaterialForm({ id: `mat-${Date.now()}`, grup: '', material: '', proveidor: '', preuProveidor: 0, preuPlatea: 0 });
    setTipusRecurs('material');
    setShowAfegirRecursModal(true);
  };

  const handleMaterialChange = (materialCodi: string) => {
    const materialData = parametres?.materials.find(m => m.codi === materialCodi);
    if (materialData) {
      setNouMaterialForm({ ...nouMaterialForm, material: materialCodi, grup: materialData.grup, preuProveidor: materialData.preuProveidor, preuPlatea: materialData.preuPlatea });
    }
  };

  const guardarNouMaterial = () => {
    if (!nouMaterialForm.material) { alert('Has de seleccionar un material'); return; }
    const tdCodi = nouMaterialForm.proveidor ? getNextTdCodi(formData) : undefined;
    const materialAGuardar = { ...nouMaterialForm, tdCodi };
    const materialData = parametres?.materials.find(m => m.codi === materialAGuardar.material);
    const nomMaterial = materialData?.material || materialAGuardar.material;
    const nomGrup = parametres?.grupsMaterials.find(g => g.codi === materialAGuardar.grup)?.nom || materialAGuardar.grup;
    const projecteAmbHistorial = registrarGastoAfegit(formData, `${nomGrup} - ${nomMaterial}`, materialAGuardar.preuProveidor);
    setFormData({ ...projecteAmbHistorial, materials: [...projecteAmbHistorial.materials, materialAGuardar] });
    setShowAfegirRecursModal(false);
  };

  const actualitzarMaterial = (id: string, field: keyof MaterialProjecte, value: any) => {
    setFormData(prev => ({ ...prev, materials: prev.materials.map(m => m.id === id ? { ...m, [field]: value } : m) }));
  };

  const eliminarMaterial = (id: string) => {
    setFormData(prev => {
      const materialAEliminar = prev.materials.find(m => m.id === id);
      if (materialAEliminar) {
        const bloqueig = checkEliminarLinia(materialAEliminar.tdCodi);
        if (bloqueig) { alert(bloqueig); return prev; }
        deleteAlbaraForLinia(materialAEliminar.tdCodi);
        const projecteAmbHistorial = registrarGastoEliminat(prev, `${materialAEliminar.grup || 'Material'} - ${materialAEliminar.material || ''}`, materialAEliminar.preuProveidor);
        return { ...projecteAmbHistorial, materials: projecteAmbHistorial.materials.filter(m => m.id !== id) };
      }
      return { ...prev, materials: prev.materials.filter(m => m.id !== id) };
    });
  };

  const trasladarMaterialATaska = (material: MaterialProjecte) => {
    if (!material.material || !material.grup) return;
    const materialData = parametres?.materials.find(m => m.codi === material.material);
    const grupData = parametres?.grupsMaterials.find(g => g.codi === material.grup);
    if (materialData && grupData) {
      const novaTasca: TascaProjecte = {
        id: `task-${Date.now()}-${Math.random()}`, categoria: 'MATERIALS',
        servei: grupData.nom, descripcio: grupData.nom,
        quantitat: 1, unitat: '', tarifa: material.preuPlatea,
        importe: material.preuPlatea, ordre: formData.tasques.length
      };
      setFormData({ ...formData, tasques: [...formData.tasques, novaTasca] });
      setMaterialCopiado(material.id);
      setTimeout(() => setMaterialCopiado(null), 1500);
    }
  };

  // ─── CRUD Tasques ────────────────────────────────────────────────────────────
  const [showAfegirTascaModal, setShowAfegirTascaModal] = useState(false);
  const [novaTascaForm, setNovaTascaForm] = useState<TascaProjecte>({
    id: '', categoria: '', servei: '', descripcio: '', quantitat: 1, unitat: '', tarifa: 0, importe: 0, ordre: 0
  });

  const afegirTasca = () => {
    setNovaTascaForm({ id: `task-${Date.now()}`, categoria: '', servei: '', descripcio: '', quantitat: 1, unitat: '', tarifa: 0, importe: 0, ordre: formData.tasques.length });
    setShowAfegirTascaModal(true);
  };

  const handleServeiChange = (serveiCodi: string) => {
    const serveiData = parametres?.serveis.find(s => s.codi === serveiCodi);
    const novaData = { ...novaTascaForm, servei: serveiCodi, categoria: serveiData?.categoria || '', descripcio: serveiData?.descripcio || '' };
    if (novaData.unitat) {
      const tarifaAuto = buscarTarifaClient(serveiCodi, novaData.unitat);
      if (tarifaAuto !== null) novaData.tarifa = tarifaAuto;
    }
    setNovaTascaForm(novaData);
  };

  const handleUnitatChange = (unitatCodi: string) => {
    const novaData = { ...novaTascaForm, unitat: unitatCodi };
    if (novaData.servei) {
      const tarifaAuto = buscarTarifaClient(novaData.servei, unitatCodi);
      if (tarifaAuto !== null) novaData.tarifa = tarifaAuto;
    }
    setNovaTascaForm(novaData);
  };

  const guardarNovaTasca = () => {
    if (!novaTascaForm.servei || !novaTascaForm.unitat) { alert('Has de seleccionar un servei i una unitat'); return; }
    const tascaCompleta = {
      ...novaTascaForm,
      id: novaTascaForm.id || `tasca-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      importe: novaTascaForm.quantitat * novaTascaForm.tarifa
    };
    const projecteAmbHistorial = registrarTascaAfegida(formData, 1, tascaCompleta.importe);
    setFormData({ ...projecteAmbHistorial, tasques: [...formData.tasques, tascaCompleta] });
    setShowAfegirTascaModal(false);
  };

  const actualitzarTasca = (id: string, field: keyof TascaProjecte, value: any) => {
    const novesTasques = formData.tasques.map(t => {
      if (t.id !== id) return t;
      const updated = { ...t, [field]: value };
      if (field === 'servei') {
        const serveiData = parametres?.serveis.find(s => s.codi === value);
        if (serveiData) { updated.categoria = serveiData.categoria; updated.descripcio = serveiData.descripcio || ''; }
      }
      if (field === 'quantitat' || field === 'tarifa') updated.importe = updated.quantitat * updated.tarifa;
      return updated;
    });
    setFormData({ ...formData, tasques: novesTasques });
  };

  const eliminarTasca = (id: string) => {
    const tascaAEliminar = formData.tasques.find(t => t.id === id);
    if (tascaAEliminar) {
      const projecteAmbHistorial = registrarTascaEliminada(formData, tascaAEliminar.descripcio || tascaAEliminar.servei, tascaAEliminar.importe);
      setFormData({ ...projecteAmbHistorial, tasques: projecteAmbHistorial.tasques.filter(t => t.id !== id) });
    } else {
      setFormData({ ...formData, tasques: formData.tasques.filter(t => t.id !== id) });
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
      const categoriaAnterior = categoriesOrdenades[indexActual - 1];
      const tasquesActuals = tasquesAgrupades[categoriaNom];
      const tasquesAnteriors = tasquesAgrupades[categoriaAnterior];
      const minOrdreAnterior = Math.min(...tasquesAnteriors.map(t => t.ordre));
      const minOrdreActual = Math.min(...tasquesActuals.map(t => t.ordre));
      const novesTasques = formData.tasques.map(t => {
        if (tasquesActuals.includes(t)) return { ...t, ordre: t.ordre - (minOrdreActual - minOrdreAnterior) };
        if (tasquesAnteriors.includes(t)) return { ...t, ordre: t.ordre + tasquesActuals.length };
        return t;
      }).sort((a, b) => a.ordre - b.ordre);
      setFormData({ ...formData, tasques: novesTasques });
    } else if (direccio === 'avall' && indexActual < categoriesOrdenades.length - 1) {
      moureCategoría(categoriesOrdenades[indexActual + 1], 'amunt');
    }
  };

  // ─── Documents ───────────────────────────────────────────────────────────────
  const afegirDocument = (document: DocumentProjecte) => {
    const projecteAmbHistorial = registrarDocumentAfegit(formData, document.nom, document.tipus);
    setFormData({ ...projecteAmbHistorial, documents: [...(projecteAmbHistorial.documents || []), document] });
    setShowDocumentModal(false);
  };

  const eliminarDocument = (docId: string) => {
    if (!confirm('Segur que vols eliminar aquest document?')) return;
    const documentAEliminar = formData.documents?.find(d => d.id === docId);
    if (documentAEliminar) {
      const projecteAmbHistorial = registrarDocumentEliminat(formData, documentAEliminar.nom);
      setFormData({ ...projecteAmbHistorial, documents: projecteAmbHistorial.documents?.filter(d => d.id !== docId) || [] });
    } else {
      setFormData(prev => ({ ...prev, documents: prev.documents?.filter(d => d.id !== docId) || [] }));
    }
  };

  const descarregarDocument = (doc: DocumentProjecte) => {
    const link = window.document.createElement('a');
    link.href = doc.fitxer;
    link.download = doc.nomFitxer;
    link.click();
  };

  // ─── Vincular ────────────────────────────────────────────────────────────────
  const vincularPressupost = (codiPressupost: string) => {
    if (!codiPressupost) return;
    const projecteAmbHistorial = registrarPressupostVinculat(formData, codiPressupost);
    const projecteActualitzat = { ...projecteAmbHistorial, pressupost: codiPressupost };
    storage.setProjectes(storage.getProjectes().map((p: Projecte) => p.codi === formData.codi ? projecteActualitzat : p));
    const pressupostosActualitzats = pressupostos.map(p => p.codi === codiPressupost ? { ...p, projecteVinculat: formData.codi } : p);
    storage.setPressupostos(pressupostosActualitzats);
    setPressupostos(pressupostosActualitzats);
    setFormData(projecteActualitzat);
    onSave(projecteActualitzat);
    setShowVincularPressupostModal(false);
  };

  const vincularFactura = (codiFactura: string) => {
    if (!codiFactura) return;
    const projecteAmbHistorial = registrarFacturaVinculada(formData, codiFactura);
    const projecteActualitzat = { ...projecteAmbHistorial, facturaAssociada: codiFactura };
    storage.setProjectes(storage.getProjectes().map((p: Projecte) => p.codi === formData.codi ? projecteActualitzat : p));
    const facturesActualitzades = factures.map(f => f.codi === codiFactura ? { ...f, projecte: formData.codi } : f);
    storage.setFacturesVenda(facturesActualitzades);
    setFactures(facturesActualitzades);
    setFormData(projecteActualitzat);
    onSave(projecteActualitzat);
    setShowVincularFacturaModal(false);
  };

  // ─── Eliminar ────────────────────────────────────────────────────────────────
  const eliminarProjecte = () => {
    if (!confirm(`Estàs segur que vols eliminar el projecte ${formData.codi}?\n\nAquesta acció no es pot desfer.`)) return;
    if (formData.pressupost) {
      storage.setPressupostos(storage.getPressupostos().map((p: any) => {
        if (p.codi === formData.pressupost && p.projecteCreat === formData.codi) return { ...p, projecteCreat: undefined, dataAcceptacio: undefined };
        if (p.codi === formData.pressupost && p.projecteVinculat === formData.codi) return { ...p, projecteVinculat: undefined };
        return p;
      }));
    }
    if (formData.facturaAssociada) {
      storage.setFacturesVenda(storage.getFacturesVenda().map((f: any) =>
        f.codi === formData.facturaAssociada && f.projecte === formData.codi ? { ...f, projecte: undefined } : f
      ));
    }
    storage.setProjectes(storage.getProjectes().filter((p: any) => p.codi !== formData.codi));
    alert('Projecte eliminat correctament.');
    onBack();
  };

  // ─── Marcar Acabat ───────────────────────────────────────────────────────────
  const marcarAcabat = () => {
    if (!confirm('Estàs segur que el client ha validat el projecte? L\'estat canviarà a "Acabat".')) return;
    const dataValidacio = new Date().toISOString().split('T')[0];
    setFormData(prev => ({
      ...prev, estat: 'acabat',
      feedback: { ...(prev.feedback || { validat: false }), validat: true, dataValidacio }
    }));
  };

  // ─── Tornar ──────────────────────────────────────────────────────────────────
  const handleBack = () => {
    const tieneCanvis = hasRealProjectData(formData);
    if (!tieneCanvis) {
      const projectesExistents = storage.getProjectes();
      if (projectesExistents.some((p: any) => p.codi === formData.codi)) {
        storage.setProjectes(projectesExistents.filter((p: any) => p.codi !== formData.codi));
      }
      onBack();
      return;
    }
    if (!formData.client || !formData.titol) {
      alert('⚠️ Falten camps obligatoris:\n\n• Client\n• Títol del projecte\n\nOmple aquests camps abans de sortir.');
      return;
    }
    saveNow();
    onBack();
  };

  // ─── Navigate away ───────────────────────────────────────────────────────────
  const navigateToPressupost = (codi: string) => {
    saveNow();
    storage.setNavigateTo({ type: 'pressupost', codi });
    onBack();
    setTimeout(() => window.dispatchEvent(new CustomEvent('navigate-to', { detail: { section: 'pressupostos', codi } })), 100);
  };

  const navigateToFactura = (codi: string) => {
    saveNow();
    storage.setNavigateTo({ type: 'factura', codi });
    onBack();
    setTimeout(() => window.dispatchEvent(new CustomEvent('navigate-to', { detail: { section: 'factures-venda', codi } })), 100);
  };

  // ─── RENDER ──────────────────────────────────────────────────────────────────
  const TABS = [
    { id: 'resum', label: 'Resum' },
    { id: 'dades', label: 'Dades Generals' },
    { id: 'despeses', label: 'Despeses' },
    { id: 'tasques', label: 'Tasques' },
    { id: 'instruccions', label: 'Instruccions' },
    { id: 'feedback', label: 'Feedback' },
    { id: 'historial', label: 'Historial' },
    { id: 'pagaments', label: 'Pagaments Proveïdors' },
  ] as const;

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

        {/* ── BREADCRUMB ── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.6rem', paddingBottom: '1rem',
          borderBottom: '1px solid var(--color-border)', marginBottom: '1.25rem',
          flexWrap: 'wrap', minHeight: '48px',
        }}>
          <button
            type="button"
            onClick={handleBack}
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.35rem 0.75rem', background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: '6px', cursor: 'pointer', fontSize: '0.83rem', fontWeight: 500, color: 'var(--color-text-secondary)', flexShrink: 0 }}
          >
            <ChevronLeft size={15} />
            Projectes
          </button>
          <span style={{ color: 'var(--color-text-tertiary)', fontSize: '0.9rem' }}>/</span>
          <span style={{ fontSize: '0.82rem', color: 'var(--color-text-tertiary)', fontFamily: 'monospace', fontWeight: 500, flexShrink: 0 }}>
            {formData.codi}
          </span>
          {formData.titol && (
            <>
              <span style={{ color: 'var(--color-text-tertiary)', fontSize: '0.9rem' }}>—</span>
              <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '280px' }}>
                {formData.titol}
              </span>
            </>
          )}

          {/* Actions */}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>

            {/* Crear Factura */}
            {projecte && formData.estat === 'acabat' && !formData.facturaAssociada && !formData.facturaHistorica && (
              <button
                type="button"
                onClick={() => {
                  if (confirm('Estàs segur que vols crear una factura des d\'aquest projecte?\n\nLa factura es crearà amb totes les tasques i el projecte quedarà vinculat i bloquejat.')) {
                    saveNow();
                    if (onCrearFactura) onCrearFactura(formData);
                  }
                }}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.9rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
              >
                <FileText size={15} />
                Crear Factura
              </button>
            )}

            {/* Pressupost badge */}
            {formData.pressupost && (
              <div
                onClick={() => navigateToPressupost(formData.pressupost!)}
                style={{ padding: '0.35rem 0.75rem', background: '#fef3c7', color: '#92400e', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', border: '1px solid #fbbf24', whiteSpace: 'nowrap' }}
                title="Clic per obrir el pressupost"
              >
                📄 {formData.pressupost}
              </div>
            )}

            {/* Factura badge */}
            {formData.facturaHistorica ? (
              <div style={{ padding: '0.35rem 0.75rem', background: '#fef3c7', border: '1px solid #fbbf24', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, color: '#92400e', whiteSpace: 'nowrap' }}>
                📋 {formData.facturaHistorica.numero}
              </div>
            ) : formData.facturaAssociada ? (
              <div
                onClick={() => navigateToFactura(formData.facturaAssociada!)}
                style={{ padding: '0.35rem 0.75rem', background: '#dbeafe', color: '#1e40af', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', border: '1px solid #93c5fd', whiteSpace: 'nowrap' }}
                title="Clic per obrir la factura"
              >
                🧾 {formData.facturaAssociada}
              </div>
            ) : null}

            {/* Estat dropdown */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-text-secondary)', flexShrink: 0 }}>Estat:</label>
              <select
                className="form-input"
                value={formData.estat}
                onChange={(e) => {
                  const nouEstat = e.target.value as any;
                  const estatAnterior = estatAnteriorRef.current;
                  if (nouEstat !== estatAnterior) {
                    const projecteAmbHistorial = registrarCanviEstat(formData, estatAnterior, nouEstat);
                    setFormData({ ...projecteAmbHistorial, estat: nouEstat });
                    estatAnteriorRef.current = nouEstat;
                  } else {
                    setFormData({ ...formData, estat: nouEstat });
                  }
                }}
                style={{
                  padding: '0.4rem 0.6rem', borderRadius: '6px', fontWeight: 600, fontSize: '0.82rem',
                  border: '1px solid var(--color-border)', cursor: 'pointer',
                  background: ESTAT_BG[formData.estat] || '#f3f4f6',
                  color: ESTAT_COLOR[formData.estat] || '#374151',
                }}
              >
                <option value="esborrany">Esborrany</option>
                <option value="planificat">Planificat</option>
                <option value="rodatge">Rodatge</option>
                <option value="edicio">Edició</option>
                <option value="esperant_feedback">Esperant Feedback</option>
                <option value="revisio">Revisió</option>
                <option value="acabat">Acabat</option>
                <option value="facturat">Facturat</option>
              </select>
            </div>

            {/* Eliminar */}
            {projecte && !esBloquejat && (formData.estat === 'esborrany' || formData.estat === 'planificat') && !formData.facturaAssociada && !formData.facturaHistorica && (
              <button
                type="button"
                onClick={eliminarProjecte}
                className="btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', borderColor: '#dc2626', color: '#dc2626', padding: '0.4rem 0.75rem', fontSize: '0.82rem' }}
              >
                <Trash2 size={14} />
                Eliminar
              </button>
            )}
          </div>
        </div>

        {/* ── TABS ── */}
        <div className="projecte-tabs-bar" style={{ display: 'flex', borderBottom: '2px solid var(--color-border)', marginBottom: '1.5rem', gap: '0.25rem', overflowX: 'auto' }}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '0.65rem 1.25rem', background: 'transparent', border: 'none',
                borderBottom: activeTab === tab.id ? '2px solid var(--color-accent-primary)' : '2px solid transparent',
                color: activeTab === tab.id ? 'var(--color-accent-primary)' : 'var(--color-text-secondary)',
                fontWeight: activeTab === tab.id ? 600 : 400,
                cursor: 'pointer', marginBottom: '-2px', whiteSpace: 'nowrap', fontSize: '0.88rem'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── CONTENT ── */}
        <div>
          {activeTab === 'resum' && (
            <ResumTab
              formData={formData}
              setFormData={setFormData}
              clients={clients}
              parametres={parametres}
              proveidors={proveidors}
              pressupostos={pressupostos}
              esBloquejat={esBloquejat}
              onNavigateToPressupost={navigateToPressupost}
              onNavigateToFactura={navigateToFactura}
            />
          )}

          {activeTab === 'dades' && (
            <DadesTab formData={formData} setFormData={setFormData} clients={clients} parametres={parametres} esBloquejat={esBloquejat} />
          )}

          {activeTab === 'despeses' && (
            <DespesesTab
              formData={formData} setFormData={setFormData} parametres={parametres}
              proveidors={proveidors} esBloquejat={esBloquejat}
              recursCopiado={recursCopiado} materialCopiado={materialCopiado}
              onAfegirRecursHuma={afegirRecursHuma}
              onActualitzarRecursHuma={actualitzarRecursHuma}
              onEliminarRecursHuma={eliminarRecursHuma}
              onTrasladarRecursATaska={trasladarRecursATaska}
              onActualitzarMaterial={actualitzarMaterial}
              onEliminarMaterial={eliminarMaterial}
              onTrasladarMaterialATaska={trasladarMaterialATaska}
            />
          )}

          {activeTab === 'tasques' && (
            <TasquesTab
              formData={formData} parametres={parametres} esBloquejat={esBloquejat}
              tasquesAgrupades={tasquesAgrupades}
              onAfegirTasca={afegirTasca}
              onActualitzarTasca={actualitzarTasca}
              onEliminarTasca={eliminarTasca}
              onMoureTasca={moureTasca}
              onMoureCategoría={moureCategoría}
            />
          )}

          {activeTab === 'instruccions' && (
            <InstruccionsTab formData={formData} setFormData={setFormData} esBloquejat={esBloquejat} />
          )}

          {activeTab === 'feedback' && (
            <FeedbackTab formData={formData} setFormData={setFormData} esBloquejat={esBloquejat} onMarcarAcabat={marcarAcabat} />
          )}

          {activeTab === 'historial' && (
            <HistorialTab
              formData={formData} esBloquejat={esBloquejat}
              onShowDocumentModal={() => setShowDocumentModal(true)}
              onShowVincularPressupostModal={() => setShowVincularPressupostModal(true)}
              onShowVincularFacturaModal={() => setShowVincularFacturaModal(true)}
              onEliminarDocument={eliminarDocument}
              onDescarregarDocument={descarregarDocument}
              onClose={handleBack}
            />
          )}

          {activeTab === 'pagaments' && (
            <PagamentsProveidorsTab projecteCodi={formData.codi} proveidors={proveidors} parametres={parametres} />
          )}
        </div>
      </div>

      {/* ── SECONDARY MODALS ── */}
      {showAfegirTascaModal && (
        <AfegirTascaModal
          novaTascaForm={novaTascaForm} setNovaTascaForm={setNovaTascaForm}
          parametres={parametres} esBloquejat={esBloquejat}
          onServeiChange={handleServeiChange} onUnitatChange={handleUnitatChange}
          onGuardar={guardarNovaTasca} onClose={() => setShowAfegirTascaModal(false)}
        />
      )}

      {showAfegirRecursModal && (
        <AfegirRecursModal
          tipusRecurs={tipusRecurs} setTipusRecurs={setTipusRecurs}
          nouRecursForm={nouRecursForm} setNouRecursForm={setNouRecursForm}
          nouMaterialForm={nouMaterialForm} setNouMaterialForm={setNouMaterialForm}
          parametres={parametres} proveidors={proveidors}
          onRecursServeiChange={handleRecursServeiChange}
          onRecursProveidorChange={handleRecursProveidorChange}
          onRecursUnitatChange={handleRecursUnitatChange}
          onMaterialChange={handleMaterialChange}
          onGuardarRecurs={guardarNouRecurs} onGuardarMaterial={guardarNouMaterial}
          onClose={() => setShowAfegirRecursModal(false)}
        />
      )}

      {showDocumentModal && (
        <DocumentModal onClose={() => setShowDocumentModal(false)} onSave={afegirDocument} />
      )}

      {showVincularPressupostModal && (
        <VincularModal
          tipus="pressupost" pressupostos={pressupostos} clientCodi={formData.client}
          onVincular={vincularPressupost} onClose={() => setShowVincularPressupostModal(false)}
        />
      )}

      {showVincularFacturaModal && (
        <VincularModal
          tipus="factura" factures={factures} clientCodi={formData.client}
          onVincular={vincularFactura} onClose={() => setShowVincularFacturaModal(false)}
        />
      )}
    </>
  );
}

export default ProjecteDetailView;

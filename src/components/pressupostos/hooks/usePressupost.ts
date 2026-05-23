import { useState, useEffect, useCallback } from 'react';
import type { Pressupost, TascaPressupost, MaterialPressupost, RecursHumaPressupost } from '../../../types/pressupost';
import type { Client } from '../../../types/client';
import type { Proveidor } from '../../../types/proveidor';
import { storage } from '../../../utils/storageManager';
import { registrarCreacioProjecte } from '../../../utils/projecteHistorial';

interface UsePressupostProps {
  initialPressupost: Pressupost | null;
  nextCode: string;
}

export function usePressupost({ initialPressupost, nextCode }: UsePressupostProps) {
  
  // ============================================================================
  // ESTADO PRINCIPAL
  // ============================================================================
  
  const [formData, setFormData] = useState<Pressupost>(
    initialPressupost || {
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

  const [plantillesSeleccionades, setPlantillesSeleccionades] = useState<string[]>([]);
  const [recursCopiado, setRecursCopiado] = useState<string | null>(null);
  const [materialCopiado, setMaterialCopiado] = useState<string | null>(null);

  // ============================================================================
  // DATOS RELACIONADOS
  // ============================================================================
  
  const [clients, setClients] = useState<Client[]>([]);
  const [proveidors, setProveidors] = useState<Proveidor[]>([]);
  const [parametres, setParametres] = useState<any>(null);
  const [projectes, setProjectes] = useState<any[]>([]);

  useEffect(() => {
    setClients(storage.getClients());
    setProveidors(storage.getProveidors());
    setParametres(storage.getParametres());
    
    setProjectes(storage.getProjectes());
  }, []);

  const selectedClient = clients.find(c => c.codi === formData.client);
  const clientBlocked = !formData.client;
  const pressupostBloquejat = !!(formData.projecteCreat || formData.projecteVinculat);

  // ============================================================================
  // CARGAR PLANTILLAS POR DEFECTO
  // ============================================================================
  
  useEffect(() => {
    const parametresData = storage.getParametres();
    const tipusPeuPagina = (parametresData as any).tipusPlantilles?.find((t: any) => t.nom === 'Peu de pàgina de pressupost');

    if (tipusPeuPagina) {
      const plantillesDefecte = (parametresData.plantilles || [])
        .filter((p: any) => p.tipusPlantilla === tipusPeuPagina.codi && p.perDefecte)
        .map((p: any) => p.codi);

      setPlantillesSeleccionades(plantillesDefecte);

      if (!initialPressupost) {
        const textDefecte = (parametresData.plantilles || [])
          .filter((p: any) => p.tipusPlantilla === tipusPeuPagina.codi && p.perDefecte)
          .map((p: any) => `• ${p.text}`)
          .join('\n');

        setFormData(prev => ({ ...prev, notesAPeu: textDefecte }));
      }
    }
  }, [initialPressupost]);

  // ============================================================================
  // AUTO-CALCULAR FECHA DE VENCIMIENTO
  // ============================================================================
  
  useEffect(() => {
    if (formData.data && !initialPressupost) {
      const fecha = new Date(formData.data);
      fecha.setDate(fecha.getDate() + 30);
      const fechaVencimiento = fecha.toISOString().split('T')[0];
      setFormData(prev => ({ ...prev, dataVenciment: fechaVencimiento }));
    }
  }, [formData.data, initialPressupost]);

  // ============================================================================
  // FUNCIONES: BUSCAR TARIFA AUTOMÁTICA
  // ============================================================================

  const buscarTarifaClient = useCallback((servei: string, unitat: string): number | null => {
    if (!selectedClient || !parametres) return null;
    
    const tarifaClient = selectedClient.tarifesEspecials?.find(
      t => t.servei === servei && t.unitat === unitat
    );
    if (tarifaClient) return tarifaClient.preu;
    
    const tarifaGeneral = parametres.tarifes.find(
      t => t.servei === servei && t.unitat === unitat
    );
    if (tarifaGeneral) return tarifaGeneral.preu;
    
    return null;
  }, [selectedClient, parametres]);

  const buscarTarifaProveidor = useCallback((proveidorCodi: string, servei: string, unitat: string): number | null => {
    const proveidor = proveidors.find(p => p.codi === proveidorCodi);
    if (proveidor?.tarifesEspecials) {
      const tarifaProveidor = proveidor.tarifesEspecials.find(
        t => t.servei === servei && t.unitat === unitat
      );
      if (tarifaProveidor) return tarifaProveidor.preu;
    }
    return 0;
  }, [proveidors]);

  // ============================================================================
  // FUNCIONES: MATERIALS
  // ============================================================================

  const afegirMaterial = useCallback(() => {
    const nouMaterial: MaterialPressupost = {
      id: `mat-${Date.now()}-${Math.random()}`,
      grup: '',
      material: '',
      proveidor: '',
      preuProveidor: 0,
      preuPlatea: 0
    };
    setFormData(prev => ({ ...prev, materials: [...prev.materials, nouMaterial] }));
  }, []);

  const actualitzarMaterial = useCallback((id: string, field: keyof MaterialPressupost, value: any) => {
    const nousMaterials = formData.materials.map(m => {
      if (m.id !== id) return m;
      
      const updated = { ...m, [field]: value };
      
      if (field === 'material' && parametres) {
        const materialData = parametres.materials.find((mat: any) => mat.codi === value);
        if (materialData) {
          updated.grup = materialData.grup;
          updated.proveidor = materialData.proveidor;
          updated.preuProveidor = materialData.preuProveidor;
          updated.preuPlatea = materialData.preuPlatea;
        }
      }
      
      return updated;
    });
    
    setFormData(prev => ({ ...prev, materials: nousMaterials }));
  }, [formData.materials, parametres]);

  const eliminarMaterial = useCallback((id: string) => {
    setFormData(prev => ({ ...prev, materials: prev.materials.filter(m => m.id !== id) }));
  }, []);

  const trasladarMaterialATaska = useCallback((material: MaterialPressupost) => {
    if (!material.material || !material.grup) return;
    
    const materialData = parametres?.materials.find((m: any) => m.codi === material.material);
    const grupData = parametres?.grupsMaterials.find((g: any) => g.codi === material.grup);
    
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
      
      setFormData(prev => ({ ...prev, tasques: [...prev.tasques, novaTasca] }));
      
      setMaterialCopiado(material.id);
      setTimeout(() => setMaterialCopiado(null), 1500);
    }
  }, [formData.tasques.length, parametres]);

  // ============================================================================
  // FUNCIONES: RECURSOS HUMANS
  // ============================================================================

  const afegirRecursHuma = useCallback(() => {
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
    setFormData(prev => ({ ...prev, recursosHumans: [...prev.recursosHumans, nouRecurs] }));
  }, []);

  const actualitzarRecursHuma = useCallback((id: string, field: keyof RecursHumaPressupost, value: any) => {
    const nousRecursos = formData.recursosHumans.map(r => {
      if (r.id !== id) return r;

      const updated = { ...r, [field]: value };

      if (field === 'servei' && parametres) {
        const serveiData = parametres.serveis.find((s: any) => s.codi === value);
        if (serveiData) {
          updated.categoria = serveiData.categoria;
        }
      }

      if (field === 'proveidor') {
        const trb = proveidors.find(p => p.codi === value && p.tipus === 'Treballador');
        if (trb) {
          updated.tarifa = (trb.salariDiari || 0) * (1 + (trb.percentatgeSSEmpresa ?? 30.2) / 100);
          const jornada = parametres?.unitats.find((u: any) => u.nom.toLowerCase().includes('jornada'));
          if (jornada) updated.unitat = jornada.codi;
          if (trb.serveisAssociats?.length) {
            updated.servei = trb.serveisAssociats[0];
            const serveiData = parametres?.serveis.find((s: any) => s.codi === trb.serveisAssociats![0]);
            if (serveiData) updated.categoria = serveiData.categoria;
          }
        } else if (updated.servei && updated.unitat) {
          const tarifaAuto = buscarTarifaProveidor(value, updated.servei, updated.unitat);
          if (tarifaAuto !== null) updated.tarifa = tarifaAuto;
        }
      } else if ((field === 'servei' || field === 'unitat') && updated.servei && updated.unitat && updated.proveidor) {
        const trb = proveidors.find(p => p.codi === updated.proveidor && p.tipus === 'Treballador');
        if (!trb) {
          const tarifaAuto = buscarTarifaProveidor(updated.proveidor, updated.servei, updated.unitat);
          if (tarifaAuto !== null) updated.tarifa = tarifaAuto;
        }
      }

      updated.importe = updated.quantitat * updated.tarifa;

      return updated;
    });

    setFormData(prev => ({ ...prev, recursosHumans: nousRecursos }));
  }, [formData.recursosHumans, parametres, proveidors, buscarTarifaProveidor]);

  const eliminarRecursHuma = useCallback((id: string) => {
    setFormData(prev => ({ ...prev, recursosHumans: prev.recursosHumans.filter(r => r.id !== id) }));
  }, []);

  const trasladarRecursATaska = useCallback((recurs: RecursHumaPressupost) => {
    if (!recurs.servei || !recurs.unitat) return;
    
    const serveiData = parametres?.serveis.find((s: any) => s.codi === recurs.servei);
    
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
    
    setFormData(prev => ({ ...prev, tasques: [...prev.tasques, novaTasca] }));
    
    setRecursCopiado(recurs.id);
    setTimeout(() => setRecursCopiado(null), 1500);
  }, [formData.tasques.length, parametres, buscarTarifaClient]);

  // ============================================================================
  // FUNCIONES: TASQUES
  // ============================================================================

  const afegirTasca = useCallback(() => {
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
    setFormData(prev => ({ ...prev, tasques: [...prev.tasques, novaTasca] }));
  }, [formData.tasques.length]);

  const actualitzarTasca = useCallback((id: string, field: keyof TascaPressupost, value: any) => {
    const novesTasques = formData.tasques.map(t => {
      if (t.id !== id) return t;
      
      const updated = { ...t, [field]: value };
      
      if (field === 'servei' && parametres) {
        const serveiData = parametres.serveis.find((s: any) => s.codi === value);
        if (serveiData) {
          updated.categoria = serveiData.categoria;
          updated.descripcio = serveiData.descripcio;
        }
      }
      
      if ((field === 'servei' || field === 'unitat') && updated.servei && updated.unitat) {
        const tarifaAuto = buscarTarifaClient(updated.servei, updated.unitat);
        if (tarifaAuto !== null) {
          updated.tarifa = tarifaAuto;
        }
      }
      
      updated.importe = updated.quantitat * updated.tarifa;
      
      return updated;
    });
    
    setFormData(prev => ({ ...prev, tasques: novesTasques }));
  }, [formData.tasques, parametres, buscarTarifaClient]);

  const eliminarTasca = useCallback((id: string) => {
    setFormData(prev => ({ ...prev, tasques: prev.tasques.filter(t => t.id !== id) }));
  }, []);

  const moureTasca = useCallback((id: string, direccio: 'amunt' | 'avall') => {
    const index = formData.tasques.findIndex(t => t.id === id);
    if (index === -1) return;
    
    const tasca = formData.tasques[index];
    let targetIndex = -1;
    
    if (direccio === 'amunt') {
      for (let i = index - 1; i >= 0; i--) {
        if (formData.tasques[i].categoria === tasca.categoria) {
          targetIndex = i;
          break;
        }
      }
    } else {
      for (let i = index + 1; i < formData.tasques.length; i++) {
        if (formData.tasques[i].categoria === tasca.categoria) {
          targetIndex = i;
          break;
        }
      }
    }
    
    if (targetIndex === -1) return;
    
    const novesTasques = [...formData.tasques];
    [novesTasques[index], novesTasques[targetIndex]] = [novesTasques[targetIndex], novesTasques[index]];
    
    novesTasques.forEach((t, i) => t.ordre = i);
    
    setFormData(prev => ({ ...prev, tasques: novesTasques }));
  }, [formData.tasques]);

  const moureCategoría = useCallback((categoriaNom: string, direccio: 'amunt' | 'avall') => {
    const grups: { nom: string; tasques: TascaPressupost[] }[] = [];
    const categoriesVistes = new Set<string>();
    
    formData.tasques.forEach(tasca => {
      const catNom = tasca.categoria === 'MATERIALS' 
        ? 'Materials' 
        : parametres?.categories.find((c: any) => c.codi === tasca.categoria)?.nom || 'Sense categoria';
      
      if (!categoriesVistes.has(catNom)) {
        categoriesVistes.add(catNom);
        grups.push({
          nom: catNom,
          tasques: formData.tasques.filter(t => {
            const tCatNom = t.categoria === 'MATERIALS' 
              ? 'Materials' 
              : parametres?.categories.find((c: any) => c.codi === t.categoria)?.nom || 'Sense categoria';
            return tCatNom === catNom;
          })
        });
      }
    });
    
    const indexCategoria = grups.findIndex(g => g.nom === categoriaNom);
    if (indexCategoria === -1) return;
    
    const newIndex = direccio === 'amunt' ? indexCategoria - 1 : indexCategoria + 1;
    if (newIndex < 0 || newIndex >= grups.length) return;
    
    [grups[indexCategoria], grups[newIndex]] = [grups[newIndex], grups[indexCategoria]];
    
    const novesTasques: TascaPressupost[] = [];
    grups.forEach(grup => {
      novesTasques.push(...grup.tasques);
    });
    
    novesTasques.forEach((t, i) => t.ordre = i);
    
    setFormData(prev => ({ ...prev, tasques: novesTasques }));
  }, [formData.tasques, parametres]);

  // ============================================================================
  // CREAR PROJECTE DESDE PRESSUPOST
  // ============================================================================

  const crearProjecteDesdePressupost = useCallback(() => {
    if (!confirm('Vols crear un projecte nou a partir d\'aquest pressupost?')) {
      return;
    }
  
    const dataAcceptacio = new Date().toISOString().split('T')[0];
  
    const projectesActuals = storage.getProjectes();
  
    const maxNum = projectesActuals.length === 0 
      ? 0 
      : Math.max(...projectesActuals.map((p: any) => parseInt(p.codi.split('-')[1])));
    const nouCodiProjecte = `PRJ-${String(maxNum + 1).padStart(5, '0')}`;
  
    const nouProjecte = {
      codi: nouCodiProjecte,
      client: formData.client,
      pressupost: formData.codi,
      factura: undefined,
      titol: formData.nomProjecte,
      descripcio: formData.detallsProjecte || '',
      modalitat: formData.modalitat || '',
      servei: (formData as any).tipusProducció || '',
      esDirect: (formData as any).esDirect || false,
      dataInici: new Date().toISOString().split('T')[0],
      dataEntrega: (formData as any).dataLliurament || '',
      datesRodatge: [],
      datesEntrega: (formData as any).dataLliurament
        ? [{ id: `ent-${Date.now()}`, data: (formData as any).dataLliurament, nota: '' }]
        : [],
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
      ingresSenseIVA: (formData as any).baseImposable,
      iva: formData.iva,
      ingresAmbIVA: (formData as any).totalAmbIVA,
      gastosMaterials: formData.materials.reduce((sum, m) => sum + (m.preuProveidor || 0), 0),
      gastosHumans: formData.recursosHumans.reduce((sum, r) => sum + (r.importe || 0), 0),
      gastosTotals: formData.recursosHumans.reduce((sum, r) => sum + (r.importe || 0), 0) + 
                    formData.materials.reduce((sum, m) => sum + (m.preuProveidor || 0), 0),
      benefici: (formData as any).totalAmbIVA - (formData.recursosHumans.reduce((sum, r) => sum + (r.importe || 0), 0) + 
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
  
    const nouProjecteAmbHistorial = registrarCreacioProjecte(nouProjecte as any, formData.codi);

    const novosProjectes = [...projectesActuals, nouProjecteAmbHistorial];
    storage.setProjectes(novosProjectes);
  
    const pressupostActualitzat = { 
      ...formData, 
      projecteCreat: nouCodiProjecte,
      dataAcceptacio: dataAcceptacio
    };

    setFormData(pressupostActualitzat);

    const pressupostosActuals = storage.getPressupostos();
    const pressupostosActualitzats = pressupostosActuals.map((p: Pressupost) =>
      p.codi === formData.codi ? pressupostActualitzat : p
    );
    storage.setPressupostos(pressupostosActualitzats);

    alert(`Projecte ${nouCodiProjecte} creat correctament!\n\nEl pressupost s'ha bloquejat automàticament.\n\nPots trobar el projecte al mòdul de Projectes.`);
    
    return pressupostActualitzat;
  }, [formData]);

  // ============================================================================
  // CÁLCULOS TOTALES
  // ============================================================================

  const totalGastos = formData.materials.reduce((sum, m) => sum + m.preuProveidor, 0) +
    formData.recursosHumans.reduce((sum, r) => sum + r.importe, 0);
  
  const totalPressupost = formData.tasques.reduce((sum, t) => sum + t.importe, 0);
  const benefici = totalPressupost - totalGastos;
  const percentBenefici = totalPressupost > 0 ? (benefici / totalPressupost) * 100 : 0;
  
  const tasquesAgrupades = formData.tasques.reduce((acc, tasca) => {
    const catNom = tasca.categoria === 'MATERIALS' 
      ? 'Materials' 
      : parametres?.categories.find((c: any) => c.codi === tasca.categoria)?.nom || 'Sense categoria';
    if (!acc[catNom]) acc[catNom] = [];
    acc[catNom].push(tasca);
    return acc;
  }, {} as Record<string, TascaPressupost[]>);

  // ============================================================================
  // VALIDACIONES
  // ============================================================================

  const esEliminable = initialPressupost ? (() => {
    if (formData.estat !== 'esborrany') return false;
    
    if (formData.projecteCreat) {
      const projecteExisteix = projectes.some(p => p.codi === formData.projecteCreat);
      if (projecteExisteix) return false;
    }
    
    if (formData.projecteVinculat) {
      const projecteExisteix = projectes.some(p => p.codi === formData.projecteVinculat);
      if (projecteExisteix) return false;
    }
    
    return true;
  })() : false;

  // ============================================================================
  // RETURN
  // ============================================================================

  return {
    // Estado
    formData,
    setFormData,
    plantillesSeleccionades,
    setPlantillesSeleccionades,
    recursCopiado,
    materialCopiado,
    
    // Datos relacionados
    clients,
    proveidors,
    parametres,
    projectes,
    selectedClient,
    clientBlocked,
    pressupostBloquejat,
    
    // Funciones tarifas
    buscarTarifaClient,
    buscarTarifaProveidor,
    
    // Funciones materials
    afegirMaterial,
    actualitzarMaterial,
    eliminarMaterial,
    trasladarMaterialATaska,
    
    // Funciones recursos humans
    afegirRecursHuma,
    actualitzarRecursHuma,
    eliminarRecursHuma,
    trasladarRecursATaska,
    
    // Funciones tasques
    afegirTasca,
    actualitzarTasca,
    eliminarTasca,
    moureTasca,
    moureCategoría,
    
    // Proyecto
    crearProjecteDesdePressupost,
    
    // Cálculos
    totalGastos,
    totalPressupost,
    benefici,
    percentBenefici,
    tasquesAgrupades,
    
    // Validaciones
    esEliminable
  };
}
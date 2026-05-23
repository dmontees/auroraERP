import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Proveidor, Tarifa, DocumentProveidor } from '../../../types/proveidor';
import type { Client } from '../../../types/client';
import { storage } from '../../../utils/storageManager';

interface UseProveidorProps {
  initialProveidor?: Proveidor | null;
  nextCode: string;
  tipus: 'Proveïdor' | 'Acreedor' | 'Treballador';
}

export function useProveidor({ initialProveidor, nextCode, tipus }: UseProveidorProps) {
  // ============================================================================
  // ESTADO PRINCIPAL
  // ============================================================================
  
  const [formData, setFormData] = useState<Proveidor>(() => {
    // Si hay un proveedor existente, asegurar que tenga las propiedades nuevas
    if (initialProveidor) {
      return {
        ...initialProveidor,
        categories: initialProveidor.categories || [], // <-- PROTECCIÓN
        documents: initialProveidor.documents || []    // <-- PROTECCIÓN
      };
    }
    
    // Nuevo proveedor
    const base = {
      codi: nextCode,
      tipus: tipus,
      dataAlta: new Date().toISOString().split('T')[0],
      nomFiscal: '',
      nomComercial: '',
      pais: 'Espanya' as const,
      domicili: '',
      nif: '',
      telefon: '',
      correuElectronic: '',
      web: '',
      notesInternes: '',
      tipusIVA: 'Normal' as const,
      retencio: 0,
      tarifesEspecials: [],
      categories: [],
      documents: []
    };
    if (tipus === 'Treballador') {
      return {
        ...base,
        actiu: true,
        percentatgeSSEmpresa: 30.2,
        percentatgeSSTreballador: 6.35,
        percentatgeIRPF: 15,
        salariDiari: 0,
        serveisAssociats: []
      };
    }
    return base;
  });

  // ============================================================================
  // DATOS RELACIONADOS (cargados desde storage)
  // ============================================================================
  
  const [parametres, setParametres] = useState<any>(null);
  const [allProveidors, setAllProveidors] = useState<Proveidor[]>([]);
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [facturesCompra, setFacturesCompra] = useState<any[]>([]);
  const [pressupostos, setPressupostos] = useState<any[]>([]);
  const [projectes, setProjectes] = useState<any[]>([]);

  useEffect(() => {
    setParametres(storage.getParametres());
    setAllProveidors(storage.getProveidors());
    setAllClients(storage.getClients());
    setFacturesCompra(storage.getFacturesCompra());
    setPressupostos(storage.getPressupostos());
    setProjectes(storage.getProjectes());
  }, []);

  // ============================================================================
  // ESTADÍSTICAS HISTORIAL
  // ============================================================================

  const historial = useMemo(() => {
    if (!initialProveidor) return null;

    // Facturas de compra
    const facturesProveidor = facturesCompra.filter(f => f.proveidor === initialProveidor.codi);
    const totalFacturat = facturesProveidor.reduce((sum, f) => sum + (f.total || 0), 0);
    const ultimaFactura = facturesProveidor.length > 0
      ? facturesProveidor.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())[0].data
      : null;

    // Presupuestos relacionados
    const presssupostosRelacionats = pressupostos.filter(p =>
      p.materials.some((m: any) => m.proveidor === initialProveidor.codi) ||
      p.recursosHumans.some((r: any) => r.proveidor === initialProveidor.codi)
    );

    // Proyectos relacionados
    const projectesRelacionats = projectes.filter(p => p.proveidor === initialProveidor.codi);

    return {
      totalFacturat,
      numFactures: facturesProveidor.length,
      ultimaFactura,
      mitjanaFactura: facturesProveidor.length > 0 ? totalFacturat / facturesProveidor.length : 0,
      factures: facturesProveidor,
      pressupostos: presssupostosRelacionats,
      projectes: projectesRelacionats
    };
  }, [initialProveidor, facturesCompra, pressupostos, projectes]);

  // ============================================================================
  // VALIDACIONES
  // ============================================================================
  
  const hasRealData = useMemo(() => {
    if (formData.tipus === 'Treballador') {
      return !!(formData.nomFiscal || formData.nomComercial);
    }
    return !!(
      formData.nomFiscal ||
      formData.nomComercial ||
      formData.nif ||
      formData.pais !== 'Espanya' ||
      formData.domicili ||
      formData.telefon ||
      formData.correuElectronic ||
      formData.web ||
      formData.notesInternes ||
      formData.tarifesEspecials.length > 0 ||
      formData.categories.length > 0 ||
      formData.documents.length > 0 ||
      formData.tipusIVA !== 'Normal' ||
      formData.retencio !== 0
    );
  }, [formData]);

  const esEnUs = useMemo(() => {
    if (!initialProveidor) return false;
    const codi = initialProveidor.codi;

    if ((parametres?.materials || []).some((m: any) => m.proveidor === codi)) return true;

    if (facturesCompra.some((f: any) => f.tipus === 'factura-compra' && f.proveidor === codi)) return true;

    if (pressupostos.some((p: any) =>
      p.materials?.some((m: any) => m.proveidor === codi) ||
      p.recursosHumans?.some((r: any) => r.proveidor === codi)
    )) return true;

    if (projectes.some((p: any) =>
      p.materials?.some((m: any) => m.proveidor === codi) ||
      p.recursosHumans?.some((r: any) => r.proveidor === codi)
    )) return true;

    return false;
  }, [initialProveidor, parametres, facturesCompra, pressupostos, projectes]);

  const esEliminable = useMemo(() => {
    return initialProveidor && !esEnUs;
  }, [initialProveidor, esEnUs]);

  const hasValidData = useMemo(() => {
    return formData.nomFiscal.trim().length > 0;
  }, [formData.nomFiscal]);

  const shouldWarn = useMemo(() => {
    return hasRealData && !hasValidData;
  }, [hasRealData, hasValidData]);

  // ============================================================================
  // FUNCIONES: CATEGORIES
  // ============================================================================

  const toggleCategoria = useCallback((categoriaCodi: string) => {
    console.log('🔵 Toggle categoria llamado:', categoriaCodi);
    console.log('🔵 Categories actuales:', formData.categories);
    console.log('🔵 FormData completo:', formData);

    setFormData(prev => {
      const categories = prev.categories || [];
      const newCategories = categories.includes(categoriaCodi)
        ? categories.filter(c => c !== categoriaCodi)
        : [...categories, categoriaCodi];

        console.log('🔵 Categories antiguas:', categories);
        console.log('🔵 Nuevas categories:', newCategories);

      return { ...prev, categories: newCategories };
    });
  }, [formData.categories]);

  // ============================================================================
  // FUNCIONES: DOCUMENTS
  // ============================================================================

  const afegirDocument = useCallback((document: Omit<DocumentProveidor, 'id'>) => {
    const nouDocument: DocumentProveidor = {
      ...document,
      id: `doc-${Date.now()}-${Math.random()}`
    };
    setFormData(prev => ({
      ...prev,
      documents: [...prev.documents, nouDocument]
    }));
  }, []);

  const eliminarDocument = useCallback((id: string) => {
    setFormData(prev => ({
      ...prev,
      documents: prev.documents.filter(d => d.id !== id)
    }));
  }, []);

  // ============================================================================
  // FUNCIONES: TARIFES
  // ============================================================================

  const getNextTarifaCode = useCallback(() => {
    const tarifesGenerals = parametres?.tarifes || [];
    const tarifesProveidors = allProveidors.flatMap(p => p.tarifesEspecials || []);
    const tarifesClients = allClients.flatMap(c => c.tarifesEspecials || []);
    const tarifesActuals = formData.tarifesEspecials || [];
    const totesTarifes = [...tarifesGenerals, ...tarifesProveidors, ...tarifesClients, ...tarifesActuals];
    
    if (totesTarifes.length === 0) return 'TRF-00001';
    
    const maxCodi = Math.max(...totesTarifes.map(t => parseInt(t.codi.split('-')[1])));
    return `TRF-${String(maxCodi + 1).padStart(5, '0')}`;
  }, [parametres, allProveidors, allClients, formData.tarifesEspecials]);

  const copiarTarifesGenerals = useCallback(() => {
    if (!parametres?.tarifes) return;
    
    let nextCodeNum = parseInt(getNextTarifaCode().split('-')[1]);
    
    const tarifesCopiades = parametres.tarifes.map((t: any) => ({
      codi: `TRF-${String(nextCodeNum++).padStart(5, '0')}`,
      servei: t.servei,
      unitat: t.unitat,
      preu: t.preu
    }));
    
    setFormData(prev => ({ ...prev, tarifesEspecials: tarifesCopiades }));
  }, [parametres, getNextTarifaCode]);

  const afegirTarifaEspecial = useCallback(() => {
    const novaTarifa: Tarifa = {
      codi: getNextTarifaCode(),
      servei: '',
      unitat: '',
      preu: 0
    };
    
    setFormData(prev => ({
      ...prev,
      tarifesEspecials: [...(prev.tarifesEspecials || []), novaTarifa]
    }));
  }, [getNextTarifaCode]);

  const actualitzarTarifaEspecial = useCallback((index: number, field: keyof Tarifa, value: string | number) => {
    setFormData(prev => {
      const novesTarifes = [...(prev.tarifesEspecials || [])];
      novesTarifes[index] = { ...novesTarifes[index], [field]: value };
      return { ...prev, tarifesEspecials: novesTarifes };
    });
  }, []);

  const eliminarTarifaEspecial = useCallback((index: number) => {
    setFormData(prev => ({
      ...prev,
      tarifesEspecials: (prev.tarifesEspecials || []).filter((_, i) => i !== index)
    }));
  }, []);

  const netejaTarifes = useCallback(() => {
    setFormData(prev => ({ ...prev, tarifesEspecials: [] }));
  }, []);

  // ============================================================================
  // RETORNO DEL HOOK
  // ============================================================================
  
  return {
    // Estado
    formData,
    setFormData,
    
    // Datos relacionados
    parametres,
    
    // Historial
    historial,
    
    // Validaciones
    hasRealData,
    hasValidData,
    shouldWarn,
    esEnUs,
    esEliminable,
    
    // Funciones categorías
    toggleCategoria,
    
    // Funciones documentos
    afegirDocument,
    eliminarDocument,
    
    // Funciones tarifas
    getNextTarifaCode,
    copiarTarifesGenerals,
    afegirTarifaEspecial,
    actualitzarTarifaEspecial,
    eliminarTarifaEspecial,
    netejaTarifes
  };
}
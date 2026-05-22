import { useState, useEffect, useMemo } from 'react';
import type { 
  Parametres,
  Servei,
  Unitat,
  Categoria,
  Material,
  GrupMaterial,
  TipusPlantilla,
  Plantilla,
  Modalitat
} from '../../../types/parametres';
import { storage } from '../../../utils/storageManager';

// ============================================================================
// HOOK: useParametres
// Gestión centralizada de todos los parámetros de la aplicación
// ============================================================================

const DEFAULT_GRUPS_MATERIALS: GrupMaterial[] = [
  { codi: 'GRM-00001', nom: 'Càmeres', esDefault: true },
  { codi: 'GRM-00002', nom: 'Suports i il·luminació', esDefault: true },
  { codi: 'GRM-00003', nom: 'Sistema de gravació so', esDefault: true },
  { codi: 'GRM-00004', nom: 'Equipament realització', esDefault: true }
];

const DEFAULT_TIPUS_PLANTILLES: TipusPlantilla[] = [
  { codi: 'TPL-00001', nom: 'Peu de pàgina de pressupost', esDefault: true },
  { codi: 'TPL-00002', nom: 'Peu de pàgina de factures', esDefault: true }
];

const DEFAULT_PLANTILLES: Plantilla[] = [
  { 
    codi: 'PLT-00001', 
    tipusPlantilla: 'TPL-00001', 
    titol: 'Reserves de dates', 
    text: 'Les dates no es reserven fins a la signatura i aprovació del pressupost.',
    perDefecte: true
  },
  { 
    codi: 'PLT-00002', 
    tipusPlantilla: 'TPL-00001', 
    titol: 'Preus de transport i allotjament', 
    text: 'Els preus de transport i allotjament són orientatius i poden variar segons disponibilitat i tarifa del moment de la reserva.',
    perDefecte: false
  },
  { 
    codi: 'PLT-00003', 
    tipusPlantilla: 'TPL-00001', 
    titol: 'Aparcament', 
    text: "El preu de l'aparcament s'inclourà a la factura final si no es disposa d'aparcament gratuït a la localització de gravació.",
    perDefecte: true
  },
  { 
    codi: 'PLT-00004', 
    tipusPlantilla: 'TPL-00001', 
    titol: 'Terminis de pagament', 
    text: "El termini de pagament és de 30 dies des de la data d'emissió de la factura.",
    perDefecte: true
  },
  { 
    codi: 'PLT-00005', 
    tipusPlantilla: 'TPL-00001', 
    titol: 'Material addicional', 
    text: "Qualsevol material o servei addicional no especificat al pressupost serà facturat a part prèvia aprovació del client.",
    perDefecte: true
  },
  { 
    codi: 'PLT-00006', 
    tipusPlantilla: 'TPL-00001', 
    titol: 'Validesa del pressupost', 
    text: 'Aquest pressupost té una validesa de 30 dies des de la data d\'emissió.',
    perDefecte: false
  },
  { 
    codi: 'PLT-00007', 
    tipusPlantilla: 'TPL-00002', 
    titol: 'Venciment de Pagament', 
    text: 'El termini de pagament d\'aquesta factura és de 30 dies des de la data d\'emissió.',
    perDefecte: true
  },
  { 
    codi: 'PLT-00008', 
    tipusPlantilla: 'TPL-00002', 
    titol: 'Avís Legal', 
    text: 'En cas de demora en el pagament, es podran aplicar els interessos legals vigents.\nAquesta factura es considera acceptada si no es reclama en un termini de 7 dies.',
    perDefecte: true
  }
];

const DEFAULT_MODALITATS: Modalitat[] = [
  { codi: 'MOD-00001', nom: 'Autoria DVD', color: '#8b5cf6', descripcio: '' },
  { codi: 'MOD-00002', nom: 'Concert', color: '#ec4899', descripcio: '' },
  { codi: 'MOD-00003', nom: 'Coordinació', color: '#f59e0b', descripcio: '' },
  { codi: 'MOD-00004', nom: 'Corporatiu', color: '#10b981', descripcio: '' },
  { codi: 'MOD-00005', nom: 'Ponència', color: '#06b6d4', descripcio: '' },
  { codi: 'MOD-00006', nom: 'Promo Xarxes', color: '#ef4444', descripcio: '' },
  { codi: 'MOD-00007', nom: 'Reforç Edició', color: '#6366f1', descripcio: '' },
  { codi: 'MOD-00008', nom: 'Teatre', color: '#a855f7', descripcio: '' },
  { codi: 'MOD-00009', nom: 'Dansa', color: '#f97316', descripcio: '' },
  { codi: 'MOD-00010', nom: 'Videoclip', color: '#14b8a6', descripcio: '' },
  { codi: 'MOD-00011', nom: 'Reportatge', color: '#84cc16', descripcio: '' },
  { codi: 'MOD-00012', nom: 'Making Of', color: '#64748b', descripcio: '' }
];

const DEFAULT_TIPUS_PRODUCCIO = [
  { codi: 'TP-00001', nom: 'Peça llarga', esDefault: true },
  { codi: 'TP-00002', nom: 'Autoria DVD', esDefault: true },
  { codi: 'TP-00003', nom: 'Peça curta', esDefault: true },
  { codi: 'TP-00004', nom: 'Edició reforç', esDefault: true },
  { codi: 'TP-00005', nom: 'Cartelleria', esDefault: true },
  { codi: 'TP-00006', nom: 'Coordinació', esDefault: true },
  { codi: 'TP-00007', nom: 'Realització', esDefault: true },
  { codi: 'TP-00008', nom: 'Lyric video', esDefault: true },
  { codi: 'TP-00009', nom: 'Subtítols', esDefault: true },
  { codi: 'TP-00010', nom: 'Producció TV', esDefault: true }
];

const DEFAULT_CATEGORIES_PROVEIDORS = [
  { codi: 'CATPROV-001', nom: 'Audio', color: '#3b82f6' },
  { codi: 'CATPROV-002', nom: 'Audio - clàssica', color: '#8b5cf6' },
  { codi: 'CATPROV-003', nom: 'Fotografia', color: '#f59e0b' },
  { codi: 'CATPROV-004', nom: 'Operador de càmera', color: '#ef4444' },
  { codi: 'CATPROV-005', nom: 'Operador de drone', color: '#10b981' },
  { codi: 'CATPROV-006', nom: 'Streaming', color: '#14b8a6' },
  { codi: 'CATPROV-007', nom: 'Suport tècnic', color: '#6366f1' },
  { codi: 'CATPROV-008', nom: 'Suport tècnic realització', color: '#ec4899' }
];

export function useParametres() {
  const [parametres, setParametres] = useState<Parametres>({
    serveis: [],
    unitats: [],
    tarifes: [],
    categories: [],
    grupsMaterials: DEFAULT_GRUPS_MATERIALS,
    materials: [],
    tipusPlantilles: DEFAULT_TIPUS_PLANTILLES,
    plantilles: DEFAULT_PLANTILLES,
    modalitats: DEFAULT_MODALITATS,
    categoriesProveidors: DEFAULT_CATEGORIES_PROVEIDORS,
    dadesEmpresa: {
      nomFiscal: '',
      nomComercial: '',
      nif: '',
      domicili: '',
      codiPostal: '',
      poblacio: '',
      provincia: '',
      telefon: '',
      email: '',
      web: '',
      logo: null,
      ibanDefecte: '',
      observacionsFactura: ''
    }
  });

  // Cargar y migrar datos
  useEffect(() => {
    const loaded = storage.getParametres();
    
    if (!loaded || Object.keys(loaded).length === 0) {
      // Primera carga - usar defaults
      const initialData: Parametres = {
        serveis: [],
        unitats: [],
        tarifes: [],
        categories: [],
        grupsMaterials: DEFAULT_GRUPS_MATERIALS,
        materials: [],
        tipusPlantilles: DEFAULT_TIPUS_PLANTILLES,
        plantilles: DEFAULT_PLANTILLES,
        modalitats: DEFAULT_MODALITATS,
        tipusProduccio: DEFAULT_TIPUS_PRODUCCIO,
        categoriesProveidors: DEFAULT_CATEGORIES_PROVEIDORS,
        dadesEmpresa: parametres.dadesEmpresa
      };
      setParametres(initialData);
      storage.setParametres(initialData);
      return;
    }

    // Migración de datos antiguos
    let needsUpdate = false;
    const data = { ...loaded };

    // Asegurar tipusPlantilles
    if (!data.tipusPlantilles?.some((t: any) => t.codi === 'TPL-00002')) {
      data.tipusPlantilles = [...(data.tipusPlantilles || []), DEFAULT_TIPUS_PLANTILLES[1]];
      needsUpdate = true;
    }

    // Migrar plantillas antiguas de factura
    const plantillesAntiguaFactura = ['PLT-00007', 'PLT-00008', 'PLT-00009'];
    const tePlantillesAntiguaFactura = data.plantilles?.some((p: any) => 
      plantillesAntiguaFactura.includes(p.codi) && p.titol === 'Agraïment'
    );

    if (tePlantillesAntiguaFactura) {
      data.plantilles = data.plantilles.filter((p: any) => p.tipusPlantilla !== 'TPL-00002');
      data.plantilles = [...data.plantilles, ...DEFAULT_PLANTILLES.filter(p => p.tipusPlantilla === 'TPL-00002')];
      needsUpdate = true;
    }

    const migratedData = {
      ...data,
      categories: data.categories || [],
      grupsMaterials: data.grupsMaterials || DEFAULT_GRUPS_MATERIALS,
      materials: data.materials || [],
      modalitats: data.modalitats && data.modalitats.length > 0 ? data.modalitats : DEFAULT_MODALITATS,
      tipusProduccio: data.tipusProduccio || DEFAULT_TIPUS_PRODUCCIO,
      categoriesProveidors: data.categoriesProveidors && data.categoriesProveidors.length > 0 
        ? data.categoriesProveidors 
        : DEFAULT_CATEGORIES_PROVEIDORS
    };

    setParametres(migratedData);
    
    if (needsUpdate) {
      storage.setParametres(migratedData);
    }
  }, []);

  // Guardar parámetros
  const saveParametres = (newParametres: Parametres) => {
    setParametres(newParametres);
    storage.setParametres(newParametres);
  };

  // ============================================================================
  // VALIDACIONES (con caché para optimización)
  // ============================================================================

  const serveiEnUs = useMemo(() => (codiServei: string): boolean => {
    return parametres.tarifes.some(t => t.servei === codiServei);
  }, [parametres.tarifes]);

  const unitatEnUs = useMemo(() => (codiUnitat: string): boolean => {
    return parametres.tarifes.some(t => t.unitat === codiUnitat);
  }, [parametres.tarifes]);

  const materialEnUs = (codiMaterial: string): boolean => {
    const pressupostos = storage.getPressupostos();
    const enPressupostos = pressupostos.some((p: any) => 
      p.materials?.some((m: any) => m.material === codiMaterial)
    );
    
    const projectes = storage.getProjectes();
    const enProjectes = projectes.some((p: any) => 
      p.materials?.some((m: any) => m.material === codiMaterial)
    );
    
    const factures = storage.getFacturesVenda();
    const enFactures = factures.some((f: any) => 
      f.tasques?.some((t: any) => 
        t.categoria === 'MATERIALS' && 
        t.servei && 
        parametres.materials.some(mat => mat.codi === codiMaterial && mat.material === t.servei)
      )
    );
    
    return enPressupostos || enProjectes || enFactures;
  };

  const categoriaEnUs = useMemo(() => (codiCategoria: string): boolean => {
    return (parametres.serveis || []).some(s => s.categoria === codiCategoria);
  }, [parametres.serveis]);

  // ============================================================================
  // GENERADORES DE CÓDIGOS
  // ============================================================================

  const getNextCode = (prefix: string, items: any[]): string => {
    if (items.length === 0) return `${prefix}-00001`;
    const maxCodi = Math.max(...items.map(item => parseInt(item.codi.split('-')[1])));
    return `${prefix}-${String(maxCodi + 1).padStart(5, '0')}`;
  };

  const getNextMaterialCode = () => getNextCode('MAT', parametres.materials);
  const getNextModalitatCode = () => getNextCode('MOD', parametres.modalitats || []);
  
  const getNextTarifaCode = (): string => {
    const tarifesGenerals = parametres.tarifes || [];
    const clients = storage.getClients();
    const tarifesClients = clients.flatMap((c: any) => c.tarifesEspecials || []);
    const proveidors = storage.getProveidors();
    const tarifesProveidors = proveidors.flatMap((p: any) => p.tarifesEspecials || []);
    
    const totesTarifes = [...tarifesGenerals, ...tarifesClients, ...tarifesProveidors];
    return getNextCode('TRF', totesTarifes);
  };

  // ============================================================================
  // OPERACIONS CATEGORIES
  // ============================================================================

  const afegirCategoria = () => {
    const categories = parametres.categories || [];
    const novaCategoria: Categoria = {
      codi: getNextCode('CAT', categories),
      nom: ''
    };
    saveParametres({ ...parametres, categories: [...categories, novaCategoria] });
  };

  const actualitzarCategoria = (index: number, nom: string) => {
    const categories = parametres.categories || [];
    const novesCategories = [...categories];
    novesCategories[index] = { ...novesCategories[index], nom };
    saveParametres({ ...parametres, categories: novesCategories });
  };

  const eliminarCategoria = (index: number) => {
    const categories = parametres.categories || [];
    saveParametres({ ...parametres, categories: categories.filter((_, i) => i !== index) });
  };

  // ============================================================================
  // OPERACIONS SERVEIS
  // ============================================================================

  const afegirServei = () => {
    const nouServei: Servei = {
      codi: getNextCode('SRV', parametres.serveis),
      nom: '',
      descripcio: '',
      categoria: ''
    };
    saveParametres({ ...parametres, serveis: [...parametres.serveis, nouServei] });
  };

  const actualitzarServei = (index: number, field: keyof Servei, value: string) => {
    const nousServeis = [...parametres.serveis];
    nousServeis[index] = { ...nousServeis[index], [field]: value };
    saveParametres({ ...parametres, serveis: nousServeis });
  };

  const eliminarServei = (index: number) => {
    saveParametres({ ...parametres, serveis: parametres.serveis.filter((_, i) => i !== index) });
  };

  // ============================================================================
  // OPERACIONS UNITATS
  // ============================================================================

  const afegirUnitat = () => {
    const novaUnitat: Unitat = {
      codi: getNextCode('UNT', parametres.unitats),
      nom: ''
    };
    saveParametres({ ...parametres, unitats: [...parametres.unitats, novaUnitat] });
  };

  const actualitzarUnitat = (index: number, field: keyof Unitat, value: string) => {
    const novesUnitats = [...parametres.unitats];
    novesUnitats[index] = { ...novesUnitats[index], [field]: value };
    saveParametres({ ...parametres, unitats: novesUnitats });
  };

  const eliminarUnitat = (index: number) => {
    saveParametres({ ...parametres, unitats: parametres.unitats.filter((_, i) => i !== index) });
  };

  // ============================================================================
  // OPERACIONS TARIFES
  // ============================================================================

  const afegirTarifa = () => {
    const novaTarifa = {
      codi: getNextTarifaCode(),
      servei: '',
      unitat: '',
      preu: 0
    };
    saveParametres({ ...parametres, tarifes: [...parametres.tarifes, novaTarifa] });
  };

  const actualitzarTarifa = (index: number, field: string, value: string | number) => {
    const novesTarifes = [...parametres.tarifes];
    (novesTarifes[index] as any)[field] = value;
    saveParametres({ ...parametres, tarifes: novesTarifes });
  };

  const eliminarTarifa = (index: number) => {
    saveParametres({ ...parametres, tarifes: parametres.tarifes.filter((_, i) => i !== index) });
  };

  // ============================================================================
  // OPERACIONS GRUPS MATERIALS
  // ============================================================================

  const afegirGrupMaterial = () => {
    const nouGrup: GrupMaterial = {
      codi: getNextCode('GRM', parametres.grupsMaterials),
      nom: '',
      esDefault: false
    };
    saveParametres({ ...parametres, grupsMaterials: [...parametres.grupsMaterials, nouGrup] });
  };

  const actualitzarGrupMaterial = (index: number, nom: string) => {
    const nousGrups = [...parametres.grupsMaterials];
    nousGrups[index] = { ...nousGrups[index], nom };
    saveParametres({ ...parametres, grupsMaterials: nousGrups });
  };

  const eliminarGrupMaterial = (index: number) => {
    const grup = parametres.grupsMaterials[index];
    if (grup.esDefault) return;
    
    const materialEnGrup = parametres.materials.some(m => m.grup === grup.codi);
    if (materialEnGrup) {
      alert('No es pot eliminar aquest grup perquè té materials assignats.');
      return;
    }
    saveParametres({ ...parametres, grupsMaterials: parametres.grupsMaterials.filter((_, i) => i !== index) });
  };

  // ============================================================================
  // OPERACIONS MATERIALS
  // ============================================================================

  const afegirMaterial = (material: Material) => {
    saveParametres({ ...parametres, materials: [...parametres.materials, material] });
  };

  const actualitzarMaterial = (material: Material) => {
    saveParametres({ 
      ...parametres, 
      materials: parametres.materials.map(m => m.codi === material.codi ? material : m) 
    });
  };

  const marcarNoUtilitzat = (codi: string) => {
    saveParametres({
      ...parametres,
      materials: parametres.materials.map(m => 
        m.codi === codi ? { ...m, estat: 'no_utilitzat' } : m
      )
    });
  };

  const reactivarMaterial = (codi: string) => {
    saveParametres({
      ...parametres,
      materials: parametres.materials.map(m => 
        m.codi === codi ? { ...m, estat: 'actiu' } : m
      )
    });
  };

  const eliminarMaterial = (codi: string) => {
    if (materialEnUs(codi)) {
      alert('No es pot eliminar aquest material perquè està en ús en pressupostos, projectes o factures.');
      return;
    }
    
    if (confirm('Estàs segur que vols eliminar aquest material? Aquesta acció no es pot desfer.')) {
      saveParametres({
        ...parametres,
        materials: parametres.materials.filter(m => m.codi !== codi)
      });
    }
  };

  // ============================================================================
  // OPERACIONS TIPUS PLANTILLES
  // ============================================================================

  const afegirTipusPlantilla = () => {
    const nouTipus: TipusPlantilla = {
      codi: getNextCode('TPL', parametres.tipusPlantilles),
      nom: '',
      esDefault: false
    };
    saveParametres({ ...parametres, tipusPlantilles: [...parametres.tipusPlantilles, nouTipus] });
  };

  const actualitzarTipusPlantilla = (index: number, nom: string) => {
    const nousTipus = [...parametres.tipusPlantilles];
    nousTipus[index] = { ...nousTipus[index], nom };
    saveParametres({ ...parametres, tipusPlantilles: nousTipus });
  };

  const eliminarTipusPlantilla = (index: number) => {
    const tipus = parametres.tipusPlantilles[index];
    if (tipus.esDefault) {
      alert('No es pot eliminar aquest tipus per defecte.');
      return;
    }
    const plantillesEnTipus = parametres.plantilles.some(p => p.tipusPlantilla === tipus.codi);
    if (plantillesEnTipus) {
      alert('No es pot eliminar aquest tipus perquè té plantilles assignades.');
      return;
    }
    saveParametres({ ...parametres, tipusPlantilles: parametres.tipusPlantilles.filter((_, i) => i !== index) });
  };

  // ============================================================================
  // OPERACIONS PLANTILLES
  // ============================================================================

  const afegirPlantilla = (plantilla: Plantilla) => {
    saveParametres({ ...parametres, plantilles: [...parametres.plantilles, plantilla] });
  };

  const actualitzarPlantilla = (index: number, field: keyof Plantilla, value: string | boolean) => {
    const novesPlantilles = [...parametres.plantilles];
    (novesPlantilles[index] as any)[field] = value;
    saveParametres({ ...parametres, plantilles: novesPlantilles });
  };

  const eliminarPlantilla = (index: number) => {
    saveParametres({ ...parametres, plantilles: parametres.plantilles.filter((_, i) => i !== index) });
  };

  const getNextPlantillaCode = () => getNextCode('PLT', parametres.plantilles);

  // ============================================================================
  // OPERACIONS MODALITATS
  // ============================================================================

  const afegirModalitat = (modalitat: Modalitat) => {
    saveParametres({ ...parametres, modalitats: [...(parametres.modalitats || []), modalitat] });
  };

  const actualitzarModalitat = (modalitat: Modalitat) => {
    saveParametres({
      ...parametres,
      modalitats: parametres.modalitats.map(m => m.codi === modalitat.codi ? modalitat : m)
    });
  };

  const eliminarModalitat = (codi: string) => {
    if (confirm('Estàs segur que vols eliminar aquesta modalitat?')) {
      saveParametres({
        ...parametres,
        modalitats: parametres.modalitats.filter(m => m.codi !== codi)
      });
    }
  };

  // ============================================================================
  // CATEGORIES PROVEIDORS
  // ============================================================================

  const afegirCategoriaProveidor = () => {
    const categories = parametres.categoriesProveidors || [];
    const nouCodi = `CATPROV-${String(categories.length + 1).padStart(3, '0')}`;
    const novaCategoria = {
      codi: nouCodi,
      nom: '',
      color: '#3b82f6'
    };
    
    saveParametres({
      ...parametres,
      categoriesProveidors: [...categories, novaCategoria]
    });
  };

  const actualitzarCategoriaProveidor = (codi: string, field: string, value: any) => {
    const categories = parametres.categoriesProveidors || [];
    const categoriesActualitzades = categories.map((cat: any) =>
      cat.codi === codi ? { ...cat, [field]: value } : cat
    );
    
    saveParametres({
      ...parametres,
      categoriesProveidors: categoriesActualitzades
    });
  };

  const eliminarCategoriaProveidor = (codi: string) => {
    // Verificar si está en uso
    const proveidors = storage.getProveidors();
    const enUs = proveidors.some((p: any) => p.categories?.includes(codi));
    
    if (enUs) {
      alert('No es pot eliminar aquesta categoria perquè està en ús per algun proveïdor.');
      return;
    }

    const categories = parametres.categoriesProveidors || [];
    const categoriesActualitzades = categories.filter((cat: any) => cat.codi !== codi);
    
    saveParametres({
      ...parametres,
      categoriesProveidors: categoriesActualitzades
    });
  };

  const categoriaProveidorEnUs = (codi: string): boolean => {
    const proveidors = storage.getProveidors();
    return proveidors.some((p: any) => p.categories?.includes(codi));
  };

  // ============================================================================
  // RETURN
  // ============================================================================

  return {
    parametres,
    saveParametres,
    
    // Validaciones
    serveiEnUs,
    unitatEnUs,
    materialEnUs,
    categoriaEnUs,
    
    // Generadores de códigos
    getNextMaterialCode,
    getNextModalitatCode,
    getNextPlantillaCode,
    
    // Categories
    afegirCategoria,
    actualitzarCategoria,
    eliminarCategoria,
    
    // Serveis
    afegirServei,
    actualitzarServei,
    eliminarServei,
    
    // Unitats
    afegirUnitat,
    actualitzarUnitat,
    eliminarUnitat,
    
    // Tarifes
    afegirTarifa,
    actualitzarTarifa,
    eliminarTarifa,
    
    // Grups Materials
    afegirGrupMaterial,
    actualitzarGrupMaterial,
    eliminarGrupMaterial,
    
    // Materials
    afegirMaterial,
    actualitzarMaterial,
    marcarNoUtilitzat,
    reactivarMaterial,
    eliminarMaterial,
    
    // Tipus Plantilles
    afegirTipusPlantilla,
    actualitzarTipusPlantilla,
    eliminarTipusPlantilla,
    
    // Plantilles
    afegirPlantilla,
    actualitzarPlantilla,
    eliminarPlantilla,
    
    // Modalitats
    afegirModalitat,
    actualitzarModalitat,
    eliminarModalitat,
    
    // Categories proveidors
    afegirCategoriaProveidor,
    actualitzarCategoriaProveidor,
    eliminarCategoriaProveidor,
    categoriaProveidorEnUs
  };
}
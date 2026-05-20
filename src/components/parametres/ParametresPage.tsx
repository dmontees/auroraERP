import { useState, useEffect } from 'react';
import { 
  Settings, 
  X,
  Trash2,
  FileText
} from 'lucide-react';
import type { 
  Parametres,
  Servei,
  Unitat,
  Categoria,
  Material,
  GrupMaterial,
  TipusPlantilla,
  Plantilla,
  DadesEmpresa
} from '../../types/parametres';
import MaterialModal from './MaterialModal';
import PlantillaModal from './PlantillaModal';

// ============================================================================
// COMPONENTE: SECCIÓN DE PARÀMETRES
// Configuración de servicios, unidades, tarifas y datos de empresa
// ============================================================================

function ParametresSection() {
  const [activeTab, setActiveTab] = useState<'serveis' | 'unitats' | 'tarifes' | 'materials' | 'plantilles' | 'modalitats' | 'empresa'>('serveis');
  const [showCategoriesModal, setShowCategoriesModal] = useState(false);
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [showGrupsModal, setShowGrupsModal] = useState(false);
  const [showTipusPlantillesModal, setShowTipusPlantillesModal] = useState(false);
  const [showPlantillaModal, setShowPlantillaModal] = useState(false);
  const [editingPlantilla, setEditingPlantilla] = useState<Plantilla | null>(null);
  const [parametres, setParametres] = useState<Parametres>({
    serveis: [],
    unitats: [],
    tarifes: [],
    categories: [],
    grupsMaterials: [
      { codi: 'GRM-00001', nom: 'Càmeres', esDefault: true },
      { codi: 'GRM-00002', nom: 'Suports i il·luminació', esDefault: true },
      { codi: 'GRM-00003', nom: 'Sistema de gravació so', esDefault: true },
      { codi: 'GRM-00004', nom: 'Equipament realització', esDefault: true }
    ],
    materials: [],
    tipusPlantilles: [
      { codi: 'TPL-00001', nom: 'Peu de pàgina de pressupost', esDefault: true },
      { codi: 'TPL-00002', nom: 'Peu de pàgina de factures', esDefault: true }
    ],
    plantilles: [
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
    ],
    modalitats: [],
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
// Cargar parámetros desde localStorage
useEffect(() => {
  const saved = localStorage.getItem('plateaParametres');
  
  const defaultModalitats = [
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
  
  const defaultTipusPlantilles = [
    { codi: 'TPL-00001', nom: 'Peu de pàgina de pressupost', esDefault: true },
    { codi: 'TPL-00002', nom: 'Peu de pàgina de factures', esDefault: true }
  ];
  
  const defaultPlantilles = [
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
  
  if (saved) {
    const data = JSON.parse(saved);
    
// Migración: reemplazar plantillas de factura antiguas
let needsUpdate = false;

if (!data.tipusPlantilles?.some((t: any) => t.codi === 'TPL-00002')) {
  data.tipusPlantilles = [...(data.tipusPlantilles || []), defaultTipusPlantilles[1]];
  needsUpdate = true;
}

// FORZAR: Eliminar plantillas antiguas de factura y añadir las nuevas
const plantillesAntiguaFactura = ['PLT-00007', 'PLT-00008', 'PLT-00009'];
const tePlantillesAntiguaFactura = data.plantilles?.some((p: any) => 
  plantillesAntiguaFactura.includes(p.codi) && p.titol === 'Agraïment'
);

if (tePlantillesAntiguaFactura) {
  // Eliminar todas las plantillas de factura antiguas
  data.plantilles = data.plantilles.filter((p: any) => p.tipusPlantilla !== 'TPL-00002');
  // Añadir las nuevas
  data.plantilles = [...data.plantilles, ...defaultPlantilles.filter(p => p.tipusPlantilla === 'TPL-00002')];
  needsUpdate = true;
}
    
    const migratedData = {
      ...data,
      categories: data.categories || [],
      grupsMaterials: data.grupsMaterials || [
        { codi: 'GRM-00001', nom: 'Càmeres', esDefault: true },
        { codi: 'GRM-00002', nom: 'Suports i il·luminació', esDefault: true },
        { codi: 'GRM-00003', nom: 'Sistema de gravació so', esDefault: true },
        { codi: 'GRM-00004', nom: 'Equipament realització', esDefault: true }
      ],
      materials: data.materials || [],
      modalitats: data.modalitats && data.modalitats.length > 0 ? data.modalitats : defaultModalitats,
      tipusProduccio: data.tipusProduccio || [
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
      ]
    };
    setParametres(migratedData);
    
    if (needsUpdate) {
      localStorage.setItem('plateaParametres', JSON.stringify(migratedData));
    }
  } else {
    const initialData: Parametres = {
      serveis: [],
      unitats: [],
      tarifes: [],
      categories: [],
      grupsMaterials: [
        { codi: 'GRM-00001', nom: 'Càmeres', esDefault: true },
        { codi: 'GRM-00002', nom: 'Suports i il·luminació', esDefault: true },
        { codi: 'GRM-00003', nom: 'Sistema de gravació so', esDefault: true },
        { codi: 'GRM-00004', nom: 'Equipament realització', esDefault: true }
      ],
      materials: [],
      tipusPlantilles: defaultTipusPlantilles,
      plantilles: defaultPlantilles,
      modalitats: defaultModalitats,
      tipusProduccio: [
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
      ],
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
    };
    setParametres(initialData);
    localStorage.setItem('plateaParametres', JSON.stringify(initialData));
  }
}, []);

  // Guardar parámetros en localStorage
  const saveParametres = (newParametres: Parametres) => {
    setParametres(newParametres);
    localStorage.setItem('plateaParametres', JSON.stringify(newParametres));
  };


  // Verificar si un servicio está en uso (tarifas, presupuestos, facturas, tarifas de clients)
const serveiEnUs = (codiServei: string): boolean => {
  const enTarifes = parametres.tarifes.some(t => t.servei === codiServei);
  
  return enTarifes; // || enPressupostos || enFactures || enTarifesClients;
};

// Verificar si una unitat está en uso (tarifas, presupuestos, facturas, tarifas de clients)
const unitatEnUs = (codiUnitat: string): boolean => {
  const enTarifes = parametres.tarifes.some(t => t.unitat === codiUnitat);
  
  return enTarifes; // || enPressupostos || enFactures || enTarifesClients;
};

// Verificar si un material está en uso (presupuestos, proyectos, facturas)
const materialEnUs = (codiMaterial: string): boolean => {
  // Verificar en presupuestos
  const savedPressupostos = localStorage.getItem('plateaPressupostos');
  const pressupostos = savedPressupostos ? JSON.parse(savedPressupostos) : [];
  const enPressupostos = pressupostos.some((p: any) => 
    p.materials?.some((m: any) => m.material === codiMaterial)
  );
  
  // Verificar en proyectos
  const savedProjectes = localStorage.getItem('plateaProjectes');
  const projectes = savedProjectes ? JSON.parse(savedProjectes) : [];
  const enProjectes = projectes.some((p: any) => 
    p.materials?.some((m: any) => m.material === codiMaterial)
  );
  
  // Verificar en facturas de venta
  const savedFactures = localStorage.getItem('plateaFactures');
  const factures = savedFactures ? JSON.parse(savedFactures) : [];
  const enFactures = factures.some((f: any) => 
    f.tasques?.some((t: any) => t.categoria === 'MATERIALS' && t.servei && parametres.materials.some(mat => mat.codi === codiMaterial && mat.material === t.servei))
  );
  
  return enPressupostos || enProjectes || enFactures;
};

// Verificar si una categoria está en uso
const categoriaEnUs = (codiCategoria: string): boolean => {
  return (parametres.serveis || []).some(s => s.categoria === codiCategoria);
};

// CATEGORIES
const afegirCategoria = () => {
  const categories = parametres.categories || [];
  const maxCodi = categories.length === 0 
    ? 0 
    : Math.max(...categories.map(c => parseInt(c.codi.split('-')[1])));
  
  const novaCategoria: Categoria = {
    codi: `CAT-${String(maxCodi + 1).padStart(5, '0')}`,
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

  // SERVEIS
const afegirServei = () => {
  const maxCodi = parametres.serveis.length === 0 
    ? 0 
    : Math.max(...parametres.serveis.map(s => parseInt(s.codi.split('-')[1])));
  
  const nouServei: Servei = {
    codi: `SRV-${String(maxCodi + 1).padStart(5, '0')}`,
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

// UNITATS
const afegirUnitat = () => {
  const maxCodi = parametres.unitats.length === 0 
    ? 0 
    : Math.max(...parametres.unitats.map(u => parseInt(u.codi.split('-')[1])));
  
  const novaUnitat: Unitat = {
    codi: `UNT-${String(maxCodi + 1).padStart(5, '0')}`,
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

// TARIFES
const afegirTarifa = () => {
  // Obtener tarifas generales
  const tarifesGenerals = parametres.tarifes || [];
  
  // Obtener tarifas especiales de todos los clientes
  const savedClients = localStorage.getItem('plateaClients');
  const clients = savedClients ? JSON.parse(savedClients) : [];
  const tarifesClients = clients.flatMap((c: Client) => c.tarifesEspecials || []);
  
  // Obtener tarifas especiales de todos los proveedores
  const savedProveidors = localStorage.getItem('plateaProveidors');
  const proveidors = savedProveidors ? JSON.parse(savedProveidors) : [];
  const tarifesProveidors = proveidors.flatMap((p: Proveidor) => p.tarifesEspecials || []);
  
  // Combinar todas las tarifas para calcular el código más alto
  const totesTarifes = [...tarifesGenerals, ...tarifesClients, ...tarifesProveidors];
  
  const maxCodi = totesTarifes.length === 0 
    ? 0 
    : Math.max(...totesTarifes.map(t => parseInt(t.codi.split('-')[1])));
  
  const novaTarifa: Tarifa = {
    codi: `TRF-${String(maxCodi + 1).padStart(5, '0')}`,
    servei: '',
    unitat: '',
    preu: 0
  };
  saveParametres({ ...parametres, tarifes: [...parametres.tarifes, novaTarifa] });
};

  const actualitzarTarifa = (index: number, field: keyof Tarifa, value: string | number) => {
    const novesTarifes = [...parametres.tarifes];
    novesTarifes[index] = { ...novesTarifes[index], [field]: value };
    saveParametres({ ...parametres, tarifes: novesTarifes });
  };

  const eliminarTarifa = (index: number) => {
    saveParametres({ ...parametres, tarifes: parametres.tarifes.filter((_, i) => i !== index) });
  };

// GRUPS MATERIALS
const afegirGrupMaterial = () => {
  const maxCodi = parametres.grupsMaterials.length === 0 
    ? 0 
    : Math.max(...parametres.grupsMaterials.map(g => parseInt(g.codi.split('-')[1])));
  
  const nouGrup: GrupMaterial = {
    codi: `GRM-${String(maxCodi + 1).padStart(5, '0')}`,
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
  // No permitir eliminar grupos default
  if (grup.esDefault) return;
  // Verificar que no haya materiales usando este grupo
  const materialEnGrup = parametres.materials.some(m => m.grup === grup.codi);
  if (materialEnGrup) {
    alert('No es pot eliminar aquest grup perquè té materials assignats.');
    return;
  }
  saveParametres({ ...parametres, grupsMaterials: parametres.grupsMaterials.filter((_, i) => i !== index) });
};

// MATERIALS
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

const getNextMaterialCode = () => {
  if (parametres.materials.length === 0) return 'MAT-00001';
  const maxCodi = Math.max(...parametres.materials.map(m => parseInt(m.codi.split('-')[1])));
  return `MAT-${String(maxCodi + 1).padStart(5, '0')}`;
};

// TIPUS PLANTILLES
const afegirTipusPlantilla = () => {
  const maxCodi = parametres.tipusPlantilles.length === 0 
    ? 0 
    : Math.max(...parametres.tipusPlantilles.map(t => parseInt(t.codi.split('-')[1])));
  
  const nouTipus: TipusPlantilla = {
    codi: `TPL-${String(maxCodi + 1).padStart(5, '0')}`,
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

const actualitzarPlantilla = (index: number, field: keyof Plantilla, value: string | boolean) => {
  const novesPlantilles = [...parametres.plantilles];
  novesPlantilles[index] = { ...novesPlantilles[index], [field]: value };
  saveParametres({ ...parametres, plantilles: novesPlantilles });
};

const eliminarPlantilla = (index: number) => {
  saveParametres({ ...parametres, plantilles: parametres.plantilles.filter((_, i) => i !== index) });
};

// MODALITATS
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

const getNextModalitatCode = () => {
  if (!parametres.modalitats || parametres.modalitats.length === 0) return 'MOD-00001';
  const maxNum = Math.max(...parametres.modalitats.map(m => parseInt(m.codi.split('-')[1])));
  return `MOD-${String(maxNum + 1).padStart(5, '0')}`;
};

  return (
    <div>

{/* PESTAÑAS DE NAVEGACIÓ */}
<div style={{
        display: 'flex',
        borderBottom: '2px solid var(--color-border)',
        marginBottom: '1.5rem',
        gap: '0.5rem'
      }}>
{[
          { id: 'serveis', label: 'Serveis' },
          { id: 'unitats', label: 'Unitats' },
          { id: 'tarifes', label: 'Tarifes' },
          { id: 'materials', label: 'Materials' },
          { id: 'plantilles', label: 'Plantilles' },
          { id: 'modalitats', label: 'Modalitats' },
          { id: 'empresa', label: 'Dades Empresa' }
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
              marginBottom: '-2px'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* PESTAÑA: SERVEIS */}
      {activeTab === 'serveis' && (
        <div className="placeholder-card">
<div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem' }}>
  <button className="btn-primary" onClick={afegirServei}>
    + Afegir Servei
  </button>
  <button className="btn-secondary" onClick={() => setShowCategoriesModal(true)}>
    Gestionar Categories
  </button>
</div>

          {parametres.serveis.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--color-text-tertiary)', padding: '2rem' }}>
              No hi ha serveis definits. Fes clic a "Afegir Servei" per crear-ne un.
            </p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
<thead>
  <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
    <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600 }}>Codi</th>
    <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600 }}>Categoria</th>
    <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600 }}>Nom</th>
    <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600 }}>Descripció</th>
    <th style={{ width: '50px' }}></th>
  </tr>
</thead>
<tbody>
  {parametres.serveis.map((servei, index) => {
    const categoria = parametres.categories.find(c => c.codi === servei.categoria);
    
    return (
      <tr key={servei.codi} style={{ borderBottom: '1px solid var(--color-border)' }}>
        <td style={{ padding: '0.75rem', fontSize: '0.85rem', color: 'var(--color-text-tertiary)' }}>
          {servei.codi}
        </td>
        <td style={{ padding: '0.75rem' }}>
          {serveiEnUs(servei.codi) ? (
            categoria?.nom || '-'
          ) : (
            <select
              className="form-input"
              value={servei.categoria}
              onChange={(e) => actualitzarServei(index, 'categoria', e.target.value)}
              style={{ padding: '0.5rem' }}
            >
              <option value="">Sense categoria</option>
              {(parametres.categories || []).map(c => (
                <option key={c.codi} value={c.codi}>{c.nom}</option>
              ))}
            </select>
          )}
        </td>
        <td style={{ padding: '0.75rem' }}>
          {serveiEnUs(servei.codi) ? (
            servei.nom
          ) : (
            <input
              type="text"
              className="form-input"
              value={servei.nom}
              onChange={(e) => actualitzarServei(index, 'nom', e.target.value)}
              style={{ padding: '0.5rem' }}
              placeholder="Nom del servei"
            />
          )}
        </td>
        <td style={{ padding: '0.75rem' }}>
          {serveiEnUs(servei.codi) ? (
            servei.descripcio
          ) : (
            <input
              type="text"
              className="form-input"
              value={servei.descripcio}
              onChange={(e) => actualitzarServei(index, 'descripcio', e.target.value)}
              style={{ padding: '0.5rem' }}
              placeholder="Descripció"
            />
          )}
        </td>
        <td style={{ padding: '0.75rem', textAlign: 'center' }}>
          {!serveiEnUs(servei.codi) && (
            <button
              type="button"
              onClick={() => eliminarServei(index)}
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
          )}
        </td>
      </tr>
    );
  })}
</tbody>
            </table>
          )}
        </div>
      )}

      {/* PESTAÑA: UNITATS */}
      {activeTab === 'unitats' && (
        <div className="placeholder-card">
          <div style={{ marginBottom: '1rem' }}>
            <button className="btn-primary" onClick={afegirUnitat}>
              + Afegir Unitat
            </button>
          </div>

          {parametres.unitats.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--color-text-tertiary)', padding: '2rem' }}>
              No hi ha unitats definides. Fes clic a "Afegir Unitat" per crear-ne una.
            </p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                  <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600 }}>Codi</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600 }}>Nom</th>
                  <th style={{ width: '50px' }}></th>
                </tr>
              </thead>
              <tbody>
                {parametres.unitats.map((unitat, index) => (
                  <tr key={unitat.codi} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '0.5rem', fontSize: '0.85rem', color: 'var(--color-text-tertiary)' }}>
                      {unitat.codi}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
  {unitatEnUs(unitat.codi) ? (
    unitat.nom
  ) : (
    <input
      type="text"
      className="form-input"
      value={unitat.nom}
      onChange={(e) => actualitzarUnitat(index, 'nom', e.target.value)}
      style={{ padding: '0.5rem' }}
      placeholder="Jornada completa, Hora, Càmera..."
    />
  )}
</td>
                    <td style={{ padding: '0.75rem', textAlign: 'center' }}>
  {!unitatEnUs(unitat.codi) && (
    <button
      type="button"
      onClick={() => eliminarUnitat(index)}
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
  )}
</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* PESTAÑA: TARIFES */}
      {activeTab === 'tarifes' && (
        <div className="placeholder-card">
          <div style={{ marginBottom: '1rem' }}>
            <button className="btn-primary" onClick={afegirTarifa}>
              + Afegir Tarifa
            </button>
          </div>

          {parametres.tarifes.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--color-text-tertiary)', padding: '2rem' }}>
              No hi ha tarifes definides. Primer defineix serveis i unitats, després crea tarifes.
            </p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                  <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600 }}>Codi</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600 }}>Servei</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600 }}>Unitat</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600 }}>Preu (€)</th>
                  <th style={{ width: '50px' }}></th>
                </tr>
              </thead>
              <tbody>
                {parametres.tarifes.map((tarifa, index) => (
                  <tr key={tarifa.codi} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '0.5rem', fontSize: '0.85rem', color: 'var(--color-text-tertiary)' }}>
                      {tarifa.codi}
                    </td>
                    <td style={{ padding: '0.5rem' }}>
                      <select
                        className="form-input"
                        value={tarifa.servei}
                        onChange={(e) => actualitzarTarifa(index, 'servei', e.target.value)}
                        style={{ padding: '0.5rem' }}
                      >
                        <option value="">Selecciona servei...</option>
                        {parametres.serveis.map(s => (
                          <option key={s.codi} value={s.codi}>{s.nom}</option>
                        ))}
                      </select>
                    </td>
                    <td style={{ padding: '0.5rem' }}>
                      <select
                        className="form-input"
                        value={tarifa.unitat}
                        onChange={(e) => actualitzarTarifa(index, 'unitat', e.target.value)}
                        style={{ padding: '0.5rem' }}
                      >
                        <option value="">Selecciona unitat...</option>
                        {parametres.unitats.map(u => (
                          <option key={u.codi} value={u.codi}>{u.nom}</option>
                        ))}
                      </select>
                    </td>
                    <td style={{ padding: '0.5rem' }}>
                      <input
                        type="number"
                        className="form-input"
                        value={tarifa.preu}
                        onChange={(e) => actualitzarTarifa(index, 'preu', parseFloat(e.target.value))}
                        style={{ padding: '0.5rem' }}
                        step="0.01"
                        min="0"
                      />
                    </td>
                    <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => eliminarTarifa(index)}
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
      {/* PESTAÑA: MATERIALS */}
      {activeTab === 'materials' && (
        <div>
          <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem' }}>
            <button className="btn-primary" onClick={() => {
              setEditingMaterial(null);
              setShowMaterialModal(true);
            }}>
              + Afegir Material
            </button>
            <button className="btn-secondary" onClick={() => setShowGrupsModal(true)}>
              Gestionar Grups
            </button>
          </div>

          {/* MATERIALS ACTIVOS - Agrupados */}
          {parametres.grupsMaterials.map(grup => {
            const materialsGrup = parametres.materials.filter(m => m.grup === grup.codi && m.estat === 'actiu');
            
            return (
              <div key={grup.codi} style={{ marginBottom: '2rem' }}>
                <h3 style={{ 
                  fontSize: '1.1rem', 
                  fontWeight: 600, 
                  marginBottom: '1rem',
                  color: 'var(--color-text-primary)',
                  borderBottom: '2px solid var(--color-border)',
                  paddingBottom: '0.5rem'
                }}>
                  {grup.nom}
                </h3>
                
                {materialsGrup.length === 0 ? (
                  <p style={{ 
                    color: 'var(--color-text-tertiary)', 
                    fontStyle: 'italic',
                    padding: '1rem'
                  }}>
                    No hi ha materials en aquest grup
                  </p>
                ) : (
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', 
                    gap: '1rem' 
                  }}>
                    {materialsGrup.map(material => (
                      <div
                        key={material.codi}
                        onClick={() => {
                          setEditingMaterial(material);
                          setShowMaterialModal(true);
                        }}
                        style={{
                          padding: '1rem',
                          background: 'var(--color-bg-secondary)',
                          border: '1px solid var(--color-border)',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          transition: 'all var(--transition-base)',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                        }}
                        className="table-row-hover"
                      >
                        <div style={{ 
                          fontSize: '0.75rem', 
                          color: 'var(--color-text-tertiary)',
                          marginBottom: '0.5rem'
                        }}>
                          {material.codi}
                        </div>
                        <div style={{ 
                          fontWeight: 600,
                          color: 'var(--color-text-primary)',
                          marginBottom: '0.5rem'
                        }}>
                          {material.material}
                        </div>
                        <div style={{ 
                          fontSize: '0.9rem',
                          color: 'var(--color-accent-primary)',
                          fontWeight: 500
                        }}>
                          {material.preuPlatea}€
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* MATERIALS NO UTILITZATS */}
          {parametres.materials.some(m => m.estat === 'no_utilitzat') && (
            <div style={{ 
              marginTop: '3rem',
              padding: '1.5rem',
              background: 'var(--color-bg-tertiary)',
              border: '2px dashed var(--color-border)',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ 
                fontSize: '1.1rem', 
                fontWeight: 600, 
                marginBottom: '1rem',
                color: 'var(--color-text-secondary)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <span style={{
                  background: 'var(--color-text-tertiary)',
                  color: 'white',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '4px',
                  fontSize: '0.75rem',
                  fontWeight: 700
                }}>
                  NO UTILITZAT
                </span>
                Materials fora de servei
              </h3>
              
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', 
                gap: '1rem' 
              }}>
                {parametres.materials.filter(m => m.estat === 'no_utilitzat').map(material => {
                  const grup = parametres.grupsMaterials.find(g => g.codi === material.grup);
                  
                  return (
                    <div
                      key={material.codi}
                      onClick={() => {
                        setEditingMaterial(material);
                        setShowMaterialModal(true);
                      }}
                      style={{
                        padding: '1rem',
                        background: '#f5f5f5',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        opacity: 0.7,
                        position: 'relative'
                      }}
                      className="table-row-hover"
                    >
                      <div style={{
                        position: 'absolute',
                        top: '0.5rem',
                        right: '0.5rem',
                        background: '#6b7280',
                        color: 'white',
                        padding: '0.15rem 0.4rem',
                        borderRadius: '3px',
                        fontSize: '0.65rem',
                        fontWeight: 700
                      }}>
                        INACTIU
                      </div>
                      <div style={{ 
                        fontSize: '0.75rem', 
                        color: 'var(--color-text-tertiary)',
                        marginBottom: '0.5rem'
                      }}>
                        {material.codi} • {grup?.nom}
                      </div>
                      <div style={{ 
                        fontWeight: 600,
                        color: 'var(--color-text-secondary)',
                        marginBottom: '0.5rem'
                      }}>
                        {material.material}
                      </div>
                      <div style={{ 
                        fontSize: '0.9rem',
                        color: 'var(--color-text-tertiary)',
                        fontWeight: 500
                      }}>
                        {material.preuPlatea}€
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

{/* PESTAÑA: PLANTILLES */}
{activeTab === 'plantilles' && (
        <div className="placeholder-card">
          <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem' }}>
          <button className="btn-primary" onClick={() => {
              setEditingPlantilla(null);
              setShowPlantillaModal(true);
            }}>
              + Afegir Plantilla
            </button>
            <button className="btn-secondary" onClick={() => setShowTipusPlantillesModal(true)}>
              Gestionar Tipus
            </button>
          </div>

          {parametres.plantilles.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--color-text-tertiary)', padding: '2rem' }}>
              No hi ha plantilles definides. Fes clic a "Afegir Plantilla" per crear-ne una.
            </p>
          ) : (
            <div>
              {/* Agrupar plantillas por tipo */}
              {parametres.tipusPlantilles.map(tipus => {
                const plantillesTipus = parametres.plantilles.filter(p => p.tipusPlantilla === tipus.codi);
                if (plantillesTipus.length === 0) return null;

                return (
                  <div key={tipus.codi} style={{ marginBottom: '2rem' }}>
                    {/* Header del tipo */}
                    <div style={{ 
                      background: 'var(--color-accent-primary)', 
                      color: 'white',
                      padding: '0.75rem 1rem',
                      fontWeight: 700,
                      fontSize: '0.95rem',
                      borderRadius: '4px 4px 0 0',
                      textTransform: 'uppercase'
                    }}>
                      {tipus.nom}
                    </div>

                    {/* Tabla de plantillas */}
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1rem' }}>
                    <thead>
                        <tr style={{ borderBottom: '2px solid var(--color-border)', background: 'var(--color-bg-tertiary)' }}>
                          <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, width: '12%' }}>Codi</th>
                          <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, width: '18%' }}>Títol</th>
                          <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, width: '35%' }}>Text</th>
                          <th style={{ textAlign: 'center', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, width: '10%' }}>Per defecte</th>
                          <th style={{ width: '50px' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {plantillesTipus.map((plantilla, globalIndex) => {
                          const realIndex = parametres.plantilles.findIndex(p => p.codi === plantilla.codi);
                          
                          return (
<tr 
                              key={plantilla.codi} 
                              onClick={() => {
                                setEditingPlantilla(plantilla);
                                setShowPlantillaModal(true);
                              }}
                              style={{ 
                                borderBottom: '1px solid var(--color-border)',
                                cursor: 'pointer'
                              }}
                              className="table-row-hover"
                            >
                              <td style={{ padding: '0.75rem', fontSize: '0.85rem', color: 'var(--color-text-tertiary)' }}>
                                {plantilla.codi}
                              </td>
                              <td style={{ padding: '0.75rem' }}>
                                {plantilla.titol || <span style={{ color: 'var(--color-text-tertiary)', fontStyle: 'italic' }}>Sense títol</span>}
                              </td>
                              <td style={{ padding: '0.75rem', whiteSpace: 'pre-wrap' }}>
                                {plantilla.text || <span style={{ color: 'var(--color-text-tertiary)', fontStyle: 'italic' }}>Sense text</span>}
                              </td>
                              <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                                {plantilla.perDefecte ? (
                                  <span style={{
                                    background: '#10b981',
                                    color: 'white',
                                    padding: '0.25rem 0.6rem',
                                    borderRadius: '4px',
                                    fontSize: '0.75rem',
                                    fontWeight: 600
                                  }}>
                                    SÍ
                                  </span>
                                ) : (
                                  <span style={{ color: 'var(--color-text-tertiary)', fontSize: '0.85rem' }}>No</span>
                                )}
                              </td>
                              <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (confirm('Segur que vols eliminar aquesta plantilla?')) {
                                      eliminarPlantilla(realIndex);
                                    }
                                  }}
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
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })}

{/* Plantillas sin tipo asignado */}
{parametres.plantilles.filter(p => !p.tipusPlantilla).length > 0 && (
                <div style={{ marginBottom: '2rem' }}>
                  <div style={{ 
                    background: '#6b7280', 
                    color: 'white',
                    padding: '0.75rem 1rem',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    borderRadius: '4px 4px 0 0',
                    textTransform: 'uppercase'
                  }}>
                    Sense tipus assignat
                  </div>

                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid var(--color-border)', background: 'var(--color-bg-tertiary)' }}>
                        <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, width: '15%' }}>Codi</th>
                        <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, width: '20%' }}>Tipus</th>
                        <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, width: '20%' }}>Títol</th>
                        <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, width: '40%' }}>Text</th>
                        <th style={{ width: '50px' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {parametres.plantilles.filter(p => !p.tipusPlantilla).map((plantilla) => {
                        const realIndex = parametres.plantilles.findIndex(p => p.codi === plantilla.codi);
                        
                        return (
                            <tr 
                            key={plantilla.codi}
                            onClick={() => {
                              setEditingPlantilla(plantilla);
                              setShowPlantillaModal(true);
                            }}
                            style={{ 
                              borderBottom: '1px solid var(--color-border)',
                              cursor: 'pointer'
                            }}
                            className="table-row-hover"
                          >
                            <td style={{ padding: '0.75rem', fontSize: '0.85rem', color: 'var(--color-text-tertiary)' }}>
                              {plantilla.codi}
                            </td>
                            <td style={{ padding: '0.75rem', color: 'var(--color-text-tertiary)', fontStyle: 'italic' }}>
                              Sense tipus
                            </td>
                            <td style={{ padding: '0.75rem' }}>
                              {plantilla.titol || <span style={{ color: 'var(--color-text-tertiary)', fontStyle: 'italic' }}>Sense títol</span>}
                            </td>
                            <td style={{ padding: '0.75rem', whiteSpace: 'pre-wrap' }}>
                              {plantilla.text || <span style={{ color: 'var(--color-text-tertiary)', fontStyle: 'italic' }}>Sense text</span>}
                            </td>
                            <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                            <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation(); // Evita que se abra el modal
                                  if (confirm('Segur que vols eliminar aquesta plantilla?')) {
                                    eliminarPlantilla(realIndex);
                                  }
                                }}
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
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

{/* PESTAÑA: MODALITATS */}
{activeTab === 'modalitats' && (
  <div>
    <div style={{ marginBottom: '1.5rem' }}>
      <button 
        className="btn-primary" 
        onClick={() => {
          const nouCodi = getNextModalitatCode();
          const novaModalitat: Modalitat = {
            codi: nouCodi,
            nom: '',
            color: '#3b82f6',
            descripcio: ''
          };
          afegirModalitat(novaModalitat);
        }}
      >
        + Afegir Modalitat
      </button>
    </div>

    {!parametres.modalitats || parametres.modalitats.length === 0 ? (
      <p style={{ textAlign: 'center', color: 'var(--color-text-tertiary)', padding: '3rem' }}>
        No hi ha modalitats definides. Fes clic a "Afegir Modalitat" per crear-ne una.
      </p>
    ) : (
      <div className="placeholder-card">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
              <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600 }}>Codi</th>
              <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600 }}>Nom</th>
              <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600 }}>Color</th>
              <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600 }}>Descripció</th>
              <th style={{ width: '100px' }}></th>
            </tr>
          </thead>
          <tbody>
            {parametres.modalitats.map((modalitat, index) => (
              <tr key={modalitat.codi} style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td style={{ padding: '0.75rem', color: 'var(--color-text-tertiary)', fontSize: '0.85rem' }}>
                  {modalitat.codi}
                </td>
                <td style={{ padding: '0.75rem' }}>
                  <input
                    type="text"
                    className="form-input"
                    value={modalitat.nom}
                    onChange={(e) => actualitzarModalitat({ ...modalitat, nom: e.target.value })}
                    placeholder="Nom de la modalitat..."
                  />
                </td>
                <td style={{ padding: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input
                      type="color"
                      value={modalitat.color}
                      onChange={(e) => actualitzarModalitat({ ...modalitat, color: e.target.value })}
                      style={{ width: '40px', height: '40px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                    />
                    <span style={{ 
                      padding: '0.25rem 0.75rem',
                      background: modalitat.color,
                      color: 'white',
                      borderRadius: '4px',
                      fontSize: '0.85rem',
                      fontWeight: 600
                    }}>
                      {modalitat.nom || 'Sense nom'}
                    </span>
                  </div>
                </td>
                <td style={{ padding: '0.75rem' }}>
                  <input
                    type="text"
                    className="form-input"
                    value={modalitat.descripcio || ''}
                    onChange={(e) => actualitzarModalitat({ ...modalitat, descripcio: e.target.value })}
                    placeholder="Descripció opcional..."
                  />
                </td>
                <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                  <button
                    type="button"
                    onClick={() => eliminarModalitat(modalitat.codi)}
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
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </div>
)}

{/* PESTAÑA: DADES EMPRESA */}
{activeTab === 'empresa' && (
        <div className="placeholder-card">
          <form onSubmit={(e) => {
            e.preventDefault();
          }}>
            {/* LOGO DE L'EMPRESA */}
            <div className="form-group" style={{ marginBottom: '2rem' }}>
              <label style={{ fontSize: '1rem', fontWeight: 600 }}>🎨 Logo de l'empresa</label>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-tertiary)', marginTop: '0.25rem', marginBottom: '1rem' }}>
                Aquest logo apareixerà en tots els pressupostos, factures i documents generats
              </p>
              <div style={{ 
                display: 'flex', 
                gap: '2rem',
                alignItems: 'flex-start'
              }}>
                {/* PREVIEW DEL LOGO */}
                <div style={{
                  width: '250px',
                  height: '150px',
                  border: '2px dashed var(--color-border)',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: '#f9fafb',
                  padding: '1rem'
                }}>
                  {parametres.dadesEmpresa.logo ? (
                    <img 
                      src={parametres.dadesEmpresa.logo} 
                      alt="Logo empresa" 
                      style={{ 
                        maxWidth: '100%', 
                        maxHeight: '100%',
                        objectFit: 'contain'
                      }} 
                    />
                  ) : (
                    <span style={{ color: 'var(--color-text-tertiary)', fontSize: '0.85rem', textAlign: 'center' }}>
                      Sense logo
                    </span>
                  )}
                </div>

                {/* CONTROLES */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/svg+xml"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (file.size > 2 * 1024 * 1024) {
                          alert('El fitxer és massa gran. Màxim 2MB.');
                          return;
                        }
                        
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          const base64 = event.target?.result as string;
                          saveParametres({
                            ...parametres,
                            dadesEmpresa: { ...parametres.dadesEmpresa, logo: base64 }
                          });
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    style={{ 
                      padding: '0.5rem',
                      border: '1px solid var(--color-border)',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  />
                  <p style={{ fontSize: '0.85rem', color: 'var(--color-text-tertiary)', margin: 0 }}>
                    Formats: PNG, JPG, SVG • Màxim 2MB
                  </p>
                  {parametres.dadesEmpresa.logo && (
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => saveParametres({
                        ...parametres,
                        dadesEmpresa: { ...parametres.dadesEmpresa, logo: null }
                      })}
                      style={{ 
                        background: 'var(--color-error)', 
                        color: 'white',
                        alignSelf: 'flex-start'
                      }}
                    >
                      Eliminar logo
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '2rem', marginBottom: '1.5rem' }}></div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label>🏢 Nom fiscal *</label>
        <input
          type="text"
          className="form-input"
          value={parametres.dadesEmpresa.nomFiscal}
          onChange={(e) => saveParametres({
            ...parametres,
            dadesEmpresa: { ...parametres.dadesEmpresa, nomFiscal: e.target.value }
          })}
          required
        />
      </div>
      <div className="form-group">
        <label>Nom comercial</label>
        <input
          type="text"
          className="form-input"
          value={parametres.dadesEmpresa.nomComercial}
          onChange={(e) => saveParametres({
            ...parametres,
            dadesEmpresa: { ...parametres.dadesEmpresa, nomComercial: e.target.value }
          })}
        />
      </div>
    </div>

    <div className="form-group">
      <label>NIF *</label>
      <input
        type="text"
        className="form-input"
        value={parametres.dadesEmpresa.nif}
        onChange={(e) => saveParametres({
          ...parametres,
          dadesEmpresa: { ...parametres.dadesEmpresa, nif: e.target.value }
        })}
        required
      />
    </div>
    <div className="form-group">
      <label>Domicili *</label>
      <textarea
        className="form-input"
        value={parametres.dadesEmpresa.domicili}
        onChange={(e) => saveParametres({
          ...parametres,
          dadesEmpresa: { ...parametres.dadesEmpresa, domicili: e.target.value }
        })}
        rows={3}
        style={{ resize: 'vertical' }}
        required
      />
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
      <div className="form-group">
        <label>Telèfon</label>
        <input
          type="tel"
          className="form-input"
          value={parametres.dadesEmpresa.telefon}
          onChange={(e) => saveParametres({
            ...parametres,
            dadesEmpresa: { ...parametres.dadesEmpresa, telefon: e.target.value }
          })}
        />
      </div>
      <div className="form-group">
        <label>Correu electrònic</label>
        <input
          type="email"
          className="form-input"
          value={parametres.dadesEmpresa.email}
          onChange={(e) => saveParametres({
            ...parametres,
            dadesEmpresa: { ...parametres.dadesEmpresa, email: e.target.value }
          })}
        />
      </div>
    </div>

    <div className="form-group">
      <label>Web</label>
      <input
        type="url"
        className="form-input"
        value={parametres.dadesEmpresa.web}
        onChange={(e) => saveParametres({
          ...parametres,
          dadesEmpresa: { ...parametres.dadesEmpresa, web: e.target.value }
        })}
      />
    </div>

    <div className="form-group">
      <label>IBAN per defecte</label>
      <input
        type="text"
        className="form-input"
        value={parametres.dadesEmpresa.ibanDefecte}
        onChange={(e) => saveParametres({
          ...parametres,
          dadesEmpresa: { ...parametres.dadesEmpresa, ibanDefecte: e.target.value }
        })}
        placeholder="ES00 0000 0000 0000 0000 0000"
      />
    </div>

    <div className="form-group">
      <label>Observacions per a factures (text per defecte)</label>
      <textarea
        className="form-input"
        value={parametres.dadesEmpresa.observacionsFactura}
        onChange={(e) => saveParametres({
          ...parametres,
          dadesEmpresa: { ...parametres.dadesEmpresa, observacionsFactura: e.target.value }
        })}
        rows={4}
        placeholder="Text que apareixerà per defecte a les factures..."
        style={{ resize: 'vertical' }}
        />
      </div>
    </form>
  </div>
)}
{/* MODAL DE GESTIÓ DE CATEGORIES */}
{showCategoriesModal && (
        <div className="modal-overlay" onClick={() => setShowCategoriesModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2>
                <Settings size={24} />
                Gestió de Categories
              </h2>
              <button className="modal-close" onClick={() => setShowCategoriesModal(false)}>
                <X size={24} />
              </button>
            </div>

            <div className="modal-body">
              <div style={{ marginBottom: '1rem' }}>
                <button className="btn-primary" onClick={afegirCategoria}>
                  + Afegir Categoria
                </button>
              </div>

              {(!parametres.categories || parametres.categories.length === 0) ? (
                <p style={{ textAlign: 'center', color: 'var(--color-text-tertiary)', padding: '2rem' }}>
                  No hi ha categories definides.
                </p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                      <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600 }}>Codi</th>
                      <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600 }}>Nom</th>
                      <th style={{ width: '50px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                  {(parametres.categories || []).map((categoria, index) => (
                    <tr key={categoria.codi} style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <td style={{ padding: '0.75rem', fontSize: '0.85rem', color: 'var(--color-text-tertiary)' }}>
                          {categoria.codi}
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          {categoriaEnUs(categoria.codi) ? (
                            categoria.nom
                          ) : (
                            <input
                              type="text"
                              className="form-input"
                              value={categoria.nom}
                              onChange={(e) => actualitzarCategoria(index, e.target.value)}
                              style={{ padding: '0.5rem' }}
                              placeholder="Nom de la categoria"
                            />
                          )}
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                          {!categoriaEnUs(categoria.codi) && (
                            <button
                              type="button"
                              onClick={() => eliminarCategoria(index)}
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
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn-primary" onClick={() => setShowCategoriesModal(false)}>
                Tancar
              </button>
            </div>
          </div>
        </div>
      )}
      {/* MODAL: GESTIÓ DE MATERIAL */}
      {showMaterialModal && (
  <MaterialModal
    material={editingMaterial}
    onClose={() => {
      setShowMaterialModal(false);
      setEditingMaterial(null);
    }}
    onSave={(material) => {
      if (editingMaterial) {
        actualitzarMaterial(material);
      } else {
        afegirMaterial(material);
      }
      setShowMaterialModal(false);
      setEditingMaterial(null);
    }}
    onDelete={eliminarMaterial}
    onMarcarNoUtilitzat={marcarNoUtilitzat}
    onReactivar={reactivarMaterial}
    nextCode={getNextMaterialCode()}
    grups={parametres.grupsMaterials}
    proveidors={(() => {
      const saved = localStorage.getItem('plateaProveidors');
      return saved ? JSON.parse(saved) : [];
    })()}
    materialEnUs={editingMaterial ? materialEnUs(editingMaterial.codi) : false}
  />
)}

      {/* MODAL: GESTIÓ DE GRUPS */}
      {showGrupsModal && (
        <div className="modal-overlay" onClick={() => setShowGrupsModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2>
                <Settings size={24} />
                Gestió de Grups de Materials
              </h2>
              <button className="modal-close" onClick={() => setShowGrupsModal(false)}>
                <X size={24} />
              </button>
            </div>

            <div className="modal-body">
              <div style={{ marginBottom: '1rem' }}>
                <button className="btn-primary" onClick={afegirGrupMaterial}>
                  + Afegir Grup
                </button>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                    <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600 }}>Codi</th>
                    <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600 }}>Nom</th>
                    <th style={{ width: '50px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {parametres.grupsMaterials.map((grup, index) => (
                    <tr key={grup.codi} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '0.75rem', fontSize: '0.85rem', color: 'var(--color-text-tertiary)' }}>
                        {grup.codi}
                        {grup.esDefault && (
                          <span style={{
                            marginLeft: '0.5rem',
                            fontSize: '0.7rem',
                            background: '#dbeafe',
                            color: '#1e40af',
                            padding: '0.15rem 0.4rem',
                            borderRadius: '3px',
                            fontWeight: 600
                          }}>
                            DEFAULT
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        {grup.esDefault ? (
                          grup.nom
                        ) : (
                          <input
                            type="text"
                            className="form-input"
                            value={grup.nom}
                            onChange={(e) => actualitzarGrupMaterial(index, e.target.value)}
                            placeholder="Nom del grup"
                          />
                        )}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                        {!grup.esDefault && (
                          <button
                            type="button"
                            onClick={() => eliminarGrupMaterial(index)}
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
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="modal-footer">
              <button className="btn-primary" onClick={() => setShowGrupsModal(false)}>
                Tancar
              </button>
            </div>
          </div>
        </div>
      )}
      {/* MODAL: GESTIÓ DE TIPUS PLANTILLES */}
      {showTipusPlantillesModal && (
        <div className="modal-overlay" onClick={() => setShowTipusPlantillesModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2>
                <Settings size={24} />
                Gestió de Tipus de Plantilles
              </h2>
              <button className="modal-close" onClick={() => setShowTipusPlantillesModal(false)}>
                <X size={24} />
              </button>
              </div>

<div className="modal-body">
  <div style={{ marginBottom: '1rem' }}>
    <button className="btn-primary" onClick={afegirTipusPlantilla}>
      + Afegir Tipus
    </button>
  </div>

  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
    <thead>
      <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
        <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600 }}>Codi</th>
        <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600 }}>Nom</th>
        <th style={{ width: '50px' }}></th>
      </tr>
    </thead>
    <tbody>
      {parametres.tipusPlantilles.map((tipus, index) => (
        <tr key={tipus.codi} style={{ borderBottom: '1px solid var(--color-border)' }}>
          <td style={{ padding: '0.75rem', fontSize: '0.85rem', color: 'var(--color-text-tertiary)' }}>
            {tipus.codi}
            {tipus.esDefault && (
              <span style={{
                marginLeft: '0.5rem',
                fontSize: '0.7rem',
                background: '#dbeafe',
                color: '#1e40af',
                padding: '0.15rem 0.4rem',
                borderRadius: '3px',
                fontWeight: 600
              }}>
                DEFAULT
              </span>
            )}
          </td>
          <td style={{ padding: '0.75rem' }}>
            {tipus.esDefault ? (
              tipus.nom
            ) : (
              <input
                type="text"
                className="form-input"
                value={tipus.nom}
                onChange={(e) => actualitzarTipusPlantilla(index, e.target.value)}
                placeholder="Nom del tipus"
              />
            )}
          </td>
          <td style={{ padding: '0.75rem', textAlign: 'center' }}>
            {!tipus.esDefault && (
              <button
                type="button"
                onClick={() => eliminarTipusPlantilla(index)}
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
            )}
          </td>
        </tr>
      ))}
    </tbody>
  </table>
</div>

<div className="modal-footer">
  <button className="btn-primary" onClick={() => setShowTipusPlantillesModal(false)}>
    Tancar
  </button>
</div>
</div>
</div>
)}
{/* MODAL: PLANTILLA */}
{showPlantillaModal && (
        <div className="modal-overlay" onClick={() => setShowPlantillaModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px' }}>
            <div className="modal-header">
              <h2>
                <FileText size={24} />
                {editingPlantilla ? 'Editar Plantilla' : 'Nova Plantilla'}
              </h2>
              <button className="modal-close" onClick={() => setShowPlantillaModal(false)}>
                <X size={24} />
              </button>
            </div>

            <div className="modal-body">
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const tipusPlantilla = formData.get('tipusPlantilla') as string;
                const titol = formData.get('titol') as string;
                const text = formData.get('text') as string;
                const perDefecte = formData.get('perDefecte') === 'on';

                if (!titol.trim()) {
                  alert('El títol és obligatori');
                  return;
                }

                if (editingPlantilla) {
                  // Editar plantilla existente
                  const index = parametres.plantilles.findIndex(p => p.codi === editingPlantilla.codi);
                  actualitzarPlantilla(index, 'tipusPlantilla', tipusPlantilla);
                  actualitzarPlantilla(index, 'titol', titol);
                  actualitzarPlantilla(index, 'text', text);
                  actualitzarPlantilla(index, 'perDefecte', perDefecte);
                } else {
                  // Crear nueva plantilla
                  const maxCodi = parametres.plantilles.length === 0 
                    ? 0 
                    : Math.max(...parametres.plantilles.map(p => parseInt(p.codi.split('-')[1])));
                  
                  const novaPlantilla: Plantilla = {
                    codi: `PLT-${String(maxCodi + 1).padStart(5, '0')}`,
                    tipusPlantilla,
                    titol,
                    text,
                    perDefecte
                  };
                  saveParametres({ ...parametres, plantilles: [...parametres.plantilles, novaPlantilla] });
                }

                setShowPlantillaModal(false);
                setEditingPlantilla(null);
              }}>
                <div className="form-group">
                  <label>Tipus de plantilla *</label>
                  <select
                    name="tipusPlantilla"
                    className="form-input"
                    defaultValue={editingPlantilla?.tipusPlantilla || ''}
                    required
                  >
                    <option value="">Selecciona un tipus...</option>
                    {parametres.tipusPlantilles.map(tipus => (
                      <option key={tipus.codi} value={tipus.codi}>{tipus.nom}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Títol *</label>
                  <input
                    type="text"
                    name="titol"
                    className="form-input"
                    defaultValue={editingPlantilla?.titol || ''}
                    placeholder="Títol de la plantilla"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Text</label>
                  <textarea
                    name="text"
                    className="form-input"
                    defaultValue={editingPlantilla?.text || ''}
                    rows={8}
                    style={{ resize: 'vertical' }}
                    placeholder="Escriu el text de la plantilla..."
                  />
                </div>
                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      name="perDefecte"
                      defaultChecked={editingPlantilla?.perDefecte || false}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <span>Utilitzar per defecte en aquets documents</span>
                  </label>
                </div>

                <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    {editingPlantilla && (
                      <button
                        type="button"
                        className="btn-secondary"
                        style={{ background: 'var(--color-error)', color: 'white' }}
                        onClick={() => {
                          if (confirm('Segur que vols eliminar aquesta plantilla?')) {
                            const index = parametres.plantilles.findIndex(p => p.codi === editingPlantilla.codi);
                            eliminarPlantilla(index);
                            setShowPlantillaModal(false);
                            setEditingPlantilla(null);
                          }
                        }}
                      >
                        Eliminar
                      </button>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => {
                        setShowPlantillaModal(false);
                        setEditingPlantilla(null);
                      }}
                    >
                      Cancel·lar
                    </button>
                    <button type="submit" className="btn-primary">
                      {editingPlantilla ? 'Actualitzar' : 'Crear'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default ParametresSection;
import * as XLSX from 'xlsx';
import type { EstatProjecte } from '../types/projecte';


// IMPORTAR CATEGORÍAS
export const importCategories = (data: any[]) => {
  const parametres = JSON.parse(localStorage.getItem('plateaParametres') || '{}');
  const categoriesExistents = parametres.categories || [];
  
  let maxCodi = categoriesExistents.length === 0 
    ? 0 
    : Math.max(...categoriesExistents.map((c: any) => parseInt(c.codi.split('-')[1])));
  
  const novesCategories = data.map((row, index) => {
    if (!row.Nom && !row.nom) {
      throw new Error(`Fila ${index + 2}: Falta el camp "Nom"`);
    }
    
    return {
      codi: `CAT-${String(maxCodi + index + 1).padStart(5, '0')}`,
      nom: row.Nom || row.nom
    };
  });
  
  parametres.categories = [...categoriesExistents, ...novesCategories];
  localStorage.setItem('plateaParametres', JSON.stringify(parametres));
  
  return novesCategories.length;
};

// IMPORTAR SERVEIS
export const importServeis = (data: any[]) => {
  const parametres = JSON.parse(localStorage.getItem('plateaParametres') || '{}');
  const serveisExistents = parametres.serveis || [];
  const categories = parametres.categories || [];
  
  let maxCodi = serveisExistents.length === 0 
    ? 0 
    : Math.max(...serveisExistents.map((s: any) => parseInt(s.codi.split('-')[1])));
  
  const nousServeis = data.map((row, index) => {
    if (!row.Nom && !row.nom) {
      throw new Error(`Fila ${index + 2}: Falta el camp "Nom"`);
    }
    
    const nomCategoria = row.Categoria || row.categoria || '';
    const categoria = categories.find((c: any) => 
      c.nom.toLowerCase() === nomCategoria.toLowerCase()
    );
    
    return {
      codi: `SRV-${String(maxCodi + index + 1).padStart(5, '0')}`,
      nom: row.Nom || row.nom,
      descripcio: row.Descripció || row['Descripcio'] || row.descripcio || '',
      categoria: categoria?.codi || ''
    };
  });
  
  parametres.serveis = [...serveisExistents, ...nousServeis];
  localStorage.setItem('plateaParametres', JSON.stringify(parametres));
  
  return nousServeis.length;
};

// IMPORTAR UNITATS
export const importUnitats = (data: any[]) => {
  const parametres = JSON.parse(localStorage.getItem('plateaParametres') || '{}');
  const unitatsExistents = parametres.unitats || [];
  
  let maxCodi = unitatsExistents.length === 0 
    ? 0 
    : Math.max(...unitatsExistents.map((u: any) => parseInt(u.codi.split('-')[1])));
  
  const novesUnitats = data.map((row, index) => {
    if (!row.Nom && !row.nom) {
      throw new Error(`Fila ${index + 2}: Falta el camp "Nom"`);
    }
    
    return {
      codi: `UNT-${String(maxCodi + index + 1).padStart(5, '0')}`,
      nom: row.Nom || row.nom
    };
  });
  
  parametres.unitats = [...unitatsExistents, ...novesUnitats];
  localStorage.setItem('plateaParametres', JSON.stringify(parametres));
  
  return novesUnitats.length;
};

// IMPORTAR TARIFES
export const importTarifes = (data: any[]) => {
  const parametres = JSON.parse(localStorage.getItem('plateaParametres') || '{}');
  const tarifesExistents = parametres.tarifes || [];
  const serveis = parametres.serveis || [];
  const unitats = parametres.unitats || [];
  
  const clients = JSON.parse(localStorage.getItem('plateaClients') || '[]');
  const proveidors = JSON.parse(localStorage.getItem('plateaProveidors') || '[]');
  const tarifesClients = clients.flatMap((c: any) => c.tarifesEspecials || []);
  const tarifesProveidors = proveidors.flatMap((p: any) => p.tarifesEspecials || []);
  
  const totesLesTarifes = [...tarifesExistents, ...tarifesClients, ...tarifesProveidors];
  
  let maxCodi = totesLesTarifes.length === 0 
    ? 0 
    : Math.max(...totesLesTarifes.map((t: any) => parseInt(t.codi.split('-')[1])));
  
  const novesTarifes = data.map((row, index) => {
    const nomServei = row.Servei || row.servei;
    const nomUnitat = row.Unitat || row.unitat;
    
    if (!nomServei) {
      throw new Error(`Fila ${index + 2}: Falta el camp "Servei"`);
    }
    if (!nomUnitat) {
      throw new Error(`Fila ${index + 2}: Falta el camp "Unitat"`);
    }
    
    const servei = serveis.find((s: any) => 
      s.nom.toLowerCase() === nomServei.toLowerCase()
    );
    const unitat = unitats.find((u: any) => 
      u.nom.toLowerCase() === nomUnitat.toLowerCase()
    );
    
    if (!servei) {
      throw new Error(`Fila ${index + 2}: No s'ha trobat el servei "${nomServei}"`);
    }
    if (!unitat) {
      throw new Error(`Fila ${index + 2}: No s'ha trobat la unitat "${nomUnitat}"`);
    }
    
    return {
      codi: `TRF-${String(maxCodi + index + 1).padStart(5, '0')}`,
      servei: servei.codi,
      unitat: unitat.codi,
      preu: parseFloat(row.Preu || row.preu || 0)
    };
  });
  
  parametres.tarifes = [...tarifesExistents, ...novesTarifes];
  localStorage.setItem('plateaParametres', JSON.stringify(parametres));
  
  return novesTarifes.length;
};

// IMPORTAR MATERIALS
export const importMaterials = (data: any[]) => {
  const parametres = JSON.parse(localStorage.getItem('plateaParametres') || '{}');
  const materialsExistents = parametres.materials || [];
  const grups = parametres.grupsMaterials || [];
  const proveidors = JSON.parse(localStorage.getItem('plateaProveidors') || '[]');
  
  let maxCodi = materialsExistents.length === 0 
    ? 0 
    : Math.max(...materialsExistents.map((m: any) => parseInt(m.codi.split('-')[1])));
  
  const nousMaterials = data.map((row, index) => {
    const nomMaterial = row.Material || row.material;
    const nomGrup = row.Grup || row.grup;
    
    if (!nomMaterial) {
      throw new Error(`Fila ${index + 2}: Falta el camp "Material"`);
    }
    if (!nomGrup) {
      throw new Error(`Fila ${index + 2}: Falta el camp "Grup"`);
    }
    
    const grup = grups.find((g: any) => 
      g.nom.toLowerCase() === nomGrup.toLowerCase()
    );
    
    if (!grup) {
      throw new Error(`Fila ${index + 2}: No s'ha trobat el grup "${nomGrup}"`);
    }
    
    const nomProveidor = row.Proveïdor || row['Proveidor'] || row.proveidor || '';
    let codiProveidor = '';
    
    if (nomProveidor) {
      const proveidor = proveidors.find((p: any) => 
        (p.nomComercial?.toLowerCase() === nomProveidor.toLowerCase()) ||
        (p.nomFiscal?.toLowerCase() === nomProveidor.toLowerCase())
      );
      codiProveidor = proveidor?.codi || '';
    }
    
    return {
      codi: `MAT-${String(maxCodi + index + 1).padStart(5, '0')}`,
      material: nomMaterial,
      grup: grup.codi,
      proveidor: codiProveidor,
      enllacAlquiler: row.Enllaç || row['Enllac'] || row.enllac || '',
      preuProveidor: parseFloat(row['Preu Proveïdor'] || row['Preu Proveidor'] || row.preuProveidor || 0),
      preuPlatea: parseFloat(row['Preu Platea'] || row.preuPlatea || 0),
      estat: 'actiu'
    };
  });
  
  parametres.materials = [...materialsExistents, ...nousMaterials];
  localStorage.setItem('plateaParametres', JSON.stringify(parametres));
  
  return nousMaterials.length;
};

// IMPORTAR CLIENTS
export const importClients = (data: any[]) => {
  const clientsExistents = JSON.parse(localStorage.getItem('plateaClients') || '[]');
  
  let maxCodi = clientsExistents.length === 0 
    ? 0 
    : Math.max(...clientsExistents.map((c: any) => parseInt(c.codi.split('-')[1])));
  
  const nousClients = data.map((row, index) => {
    const nomFiscal = row['Nom Fiscal'] || row.nomFiscal;
    
    if (!nomFiscal) {
      throw new Error(`Fila ${index + 2}: Falta el camp "Nom Fiscal"`);
    }
    
    return {
      codi: `CLI-${String(maxCodi + index + 1).padStart(5, '0')}`,
      dataAlta: row['Data Alta'] || row.dataAlta || new Date().toISOString().split('T')[0],
      nomFiscal,
      nomComercial: row['Nom Comercial'] || row.nomComercial || '',
      nif: row.NIF || row.nif || '',
      pais: row.País || row['Pais'] || row.pais || 'Espanya',
      telefon: row.Telèfon || row['Telefon'] || row.telefon || '',
      correuElectronic: row.Email || row.email || '',
      domicili: row.Domicili || row.domicili || '',
      web: row.Web || row.web || '',
      notesInternes: row.Notes || row.notes || '',
      tipusIVA: (row['Tipus IVA'] || row.tipusIVA || 'Normal') as 'Normal' | 'Exempt' | 'Reduit' | 'Superreduit',
      retencio: parseFloat(row['Retenció IRPF'] || row['Retencio IRPF'] || row.retencio || 0),
      personaContacte: '',
      contactes: [],
      tarifesEspecials: []
    };
  });
  
  const totalsClients = [...clientsExistents, ...nousClients];
  localStorage.setItem('plateaClients', JSON.stringify(totalsClients));
  
  return nousClients.length;
};

// IMPORTAR PROVEÏDORS (con tipo y códigos diferentes)
export const importProveidors = (data: any[]) => {
  const proveidorsExistents = JSON.parse(localStorage.getItem('plateaProveidors') || '[]');
  
  // Obtener máximo código para cada tipo
  const proveidors = proveidorsExistents.filter((p: any) => p.tipus === 'Proveïdor' || !p.tipus);  // ← CORREGIDO
  const acreedors = proveidorsExistents.filter((p: any) => p.tipus === 'Acreedor');
  
  let maxCodiPRO = proveidors.length === 0 
    ? 0 
    : Math.max(...proveidors.map((p: any) => parseInt(p.codi.split('-')[1])));
    
  let maxCodiACR = acreedors.length === 0 
    ? 0 
    : Math.max(...acreedors.map((p: any) => parseInt(p.codi.split('-')[1])));
  
  const nousProveidors = data.map((row, index) => {
    const nomFiscal = row['Nom Fiscal'] || row.nomFiscal;
    
    if (!nomFiscal) {
      throw new Error(`Fila ${index + 2}: Falta el camp "Nom Fiscal"`);
    }
    
    // Validar tipo
    const tipus = row.Tipus || row.tipus || 'Proveïdor';
    if (tipus !== 'Proveïdor' && tipus !== 'Acreedor') {
      throw new Error(`Fila ${index + 2}: Tipus "${tipus}" no és vàlid. Ha de ser "Proveïdor" o "Acreedor"`);
    }
    
    // Validar tipo IVA
    const tipusIVA = row['Tipus IVA'] || row.tipusIVA || 'Normal';
    const tipusIVAValid = ['Normal', 'Exempt', 'Reduit', 'Superreduit'];
    
    if (!tipusIVAValid.includes(tipusIVA)) {
      throw new Error(`Fila ${index + 2}: Tipus IVA "${tipusIVA}" no és vàlid per proveïdors. Ha de ser: Normal, Exempt, Reduit o Superreduit`);
    }
    
    // Generar código según el tipo
    let codi;
    if (tipus === 'Proveïdor') {
      maxCodiPRO++;
      codi = `PRO-${String(maxCodiPRO).padStart(5, '0')}`;
    } else {
      maxCodiACR++;
      codi = `ACR-${String(maxCodiACR).padStart(5, '0')}`;
    }
    
    return {
      codi,
      tipus,
      dataAlta: row['Data Alta'] || row.dataAlta || new Date().toISOString().split('T')[0],
      nomFiscal,
      nomComercial: row['Nom Comercial'] || row.nomComercial || '',
      nif: row.NIF || row.nif || '',
      pais: row.País || row['Pais'] || row.pais || 'Espanya',
      telefon: row.Telèfon || row['Telefon'] || row.telefon || '',
      correuElectronic: row.Email || row.email || '',
      domicili: row.Domicili || row.domicili || '',
      web: row.Web || row.web || '',
      notesInternes: row.Notes || row.notes || '',
      tipusIVA: tipusIVA as 'Normal' | 'Exempt' | 'Reduit' | 'Superreduit',
      retencio: parseFloat(row['Retenció IRPF'] || row['Retencio IRPF'] || row.retencio || 0),
      personaContacte: '',
      contactes: [],
      tarifesEspecials: []
    };
  });
  
  const totalsProveidors = [...proveidorsExistents, ...nousProveidors];
  localStorage.setItem('plateaProveidors', JSON.stringify(totalsProveidors));
  
  return nousProveidors.length;
};

// IMPORTAR PROJECTES DE REFERÈNCIA
export const importProjectesReferencia = (data: any[]) => {
  const projectesExistents = JSON.parse(localStorage.getItem('plateaProjectes') || '[]');
  const clientsExistents = JSON.parse(localStorage.getItem('plateaClients') || '[]');
  const parametres = JSON.parse(localStorage.getItem('plateaParametres') || '{}');
  
  let maxCodi = projectesExistents.length === 0 
    ? 0 
    : Math.max(...projectesExistents.map((p: any) => parseInt(p.codi.split('-')[1])));
  
  const nousProjectes = data.map((row, index) => {
    // Validar campos obligatorios
    const nomProjecte = row['Nom Projecte'] || row.nomProjecte;
    if (!nomProjecte) {
      throw new Error(`Fila ${index + 2}: Falta el camp "Nom Projecte"`);
    }
    
    // Buscar cliente
    const nomClient = row.Client || row.client;
    let codiClient = '';
    if (nomClient) {
      const client = clientsExistents.find((c: any) => 
        (c.nomComercial && c.nomComercial.toLowerCase() === nomClient.toLowerCase()) ||
        (c.nomFiscal && c.nomFiscal.toLowerCase() === nomClient.toLowerCase())
      );
      if (client) {
        codiClient = client.codi;
      }
    }
    
    // Generar código
    maxCodi++;
    const codi = `PRJ-${String(maxCodi).padStart(5, '0')}`;
    
// Parsear fecha - soporta dd/mm/aaaa o Any + Mes
let dataProjecte = '';

// Intentar primero leer fecha completa en formato dd/mm/aaaa
const dataCompleta = row.Data || row.data || row.Fecha || row.fecha;
if (dataCompleta) {
  // Parsear dd/mm/aaaa
  const parts = String(dataCompleta).split('/');
  if (parts.length === 3) {
    const dia = parts[0].padStart(2, '0');
    const mes = parts[1].padStart(2, '0');
    const any = parts[2];
    dataProjecte = `${any}-${mes}-${dia}`;
  } else {
    // Si no es dd/mm/aaaa, asumir formato ISO o similar
    dataProjecte = dataCompleta;
  }
} else {
  // Método antiguo: Any + Mes (primer día del mes)
  const any = parseInt(row.Any || row.any || new Date().getFullYear());
  const mes = parseInt(row.Mes || row.mes || 1);
  dataProjecte = `${any}-${String(mes).padStart(2, '0')}-01`;
}
    
    // Parsear valores económicos
    const ingresSenseIVA = parseFloat(String(row['Ingrés sense IVA'] || 0).replace(',', '.')) || 0;
    const ingresAmbIVA = parseFloat(String(row['Ingrés amb IVA'] || 0).replace(',', '.')) || 0;
    const gastosMaterials = parseFloat(String(row['Gastos Materials'] || 0).replace(',', '.')) || 0;
    const gastosHumans = parseFloat(String(row['Gastos Recursos Humans'] || 0).replace(',', '.')) || 0;
    
    // Calcular IVA
    const iva = ingresAmbIVA > 0 && ingresSenseIVA > 0 
      ? ((ingresAmbIVA - ingresSenseIVA) / ingresSenseIVA) * 100 
      : 21;
    
    // Parsear estado
    const estatRaw = (row.Estat || row.estat || 'entregat').toLowerCase();
    let estat: EstatProjecte = 'entregat';
    
    if (estatRaw === 'esborrany') estat = 'esborrany';
    else if (estatRaw === 'planificat') estat = 'planificat';
    else if (estatRaw === 'en curs' || estatRaw === 'en_curs' || estatRaw === 'enproces') estat = 'en_curs';
    else if (estatRaw === 'post producció' || estatRaw === 'post_produccio') estat = 'post_produccio';
    else if (estatRaw === 'entregat') estat = 'entregat';
    else if (estatRaw === 'facturat') estat = 'facturat';
    else if (estatRaw === 'cancel·lat' || estatRaw === 'cancelat') estat = 'cancelat';
    
    // Parsear directe
    const directeRaw = (row.Directe || row.directe || '').toString().toLowerCase();
    const esDirect = directeRaw === 'sí' || directeRaw === 'si' || directeRaw === 'yes' || directeRaw === '1';
    
    // Buscar MODALITAT por nombre
    const nomModalitat = row.Modalitat || row.modalitat || '';
    let codiModalitat = '';
    if (nomModalitat && parametres.modalitats) {
      const modalitat = parametres.modalitats.find((m: any) => 
        m.nom.toLowerCase() === nomModalitat.toLowerCase()
      );
      codiModalitat = modalitat?.codi || '';
    }
    
    // Buscar TIPUS PRODUCCIÓ por nombre
    const nomTipusProduccio = row['Tipus Producció'] || row.tipusProducció || '';
    let codiServei = '';
    if (nomTipusProduccio && parametres.tipusProduccio) {
      const tipus = parametres.tipusProduccio.find((t: any) => 
        t.nom.toLowerCase() === nomTipusProduccio.toLowerCase()
      );
      codiServei = tipus?.codi || '';
    }
    
    // CREAR RECURSOS HUMANS FICTICIS para que los totales se calculen automáticamente
    const recursosHumans = [];
    
    // Si hay gastos de recursos humanos, crear una tarea ficticia
    if (gastosHumans > 0) {
      recursosHumans.push({
        id: `RH-IMPORT-${Date.now()}`,
        categoria: '',
        servei: 'Recursos Humans (Importat)',
        unitat: 'Global',
        quantitat: 1,
        preu: gastosHumans,
        cost: gastosHumans,
        ordre: 1
      });
    }
    
    // CREAR MATERIALS FICTICIS
    const materials = [];
    
    // Si hay gastos de materiales, crear un material ficticio
    if (gastosMaterials > 0) {
      materials.push({
        id: `MAT-IMPORT-${Date.now()}`,
        grup: '',
        material: 'Materials (Importat)',
        proveidor: '',
        preuProveidor: gastosMaterials,
        preuPlatea: gastosMaterials
      });
    }
    
    // CREAR TASQUES FICTICIES para el ingreso
    const tasques = [];
    
    if (ingresSenseIVA > 0) {
      tasques.push({
        id: `TSK-IMPORT-${Date.now()}`,
        categoria: '',
        servei: 'Ingrés projecte (Importat)',
        descripcio: 'Ingrés total del projecte importat',
        quantitat: 1,
        unitat: 'Global',
        tarifa: ingresSenseIVA,
        importe: ingresSenseIVA,
        ordre: 1
      });
    }
    
// Factura histórica
const numeroFactura = row['Número Factura'] || row.numeroFactura || '';
let dataFactura = row['Data Factura'] || row.dataFactura || '';

if (dataFactura) {
  const dataStr = String(dataFactura);
  
  // Si contiene /, es formato dd/mm/aaaa o dd/mm/aa
  if (dataStr.includes('/')) {
    const parts = dataStr.split('/');
    if (parts.length === 3) {
      const dia = parts[0].padStart(2, '0');
      const mes = parts[1].padStart(2, '0');
      let any = parts[2];
      
      // Si el año es de 2 dígitos, convertir a 4
      if (any.length === 2) {
        any = parseInt(any) > 50 ? `19${any}` : `20${any}`;
      }
      
      dataFactura = `${any}-${mes}-${dia}`;
    }
  }
  // Si es un número (serial de Excel)
  else if (!isNaN(Number(dataStr)) && dataStr.length > 4) {
    // Convertir serial de Excel a fecha
    const excelEpoch = new Date(1899, 11, 30);
    const excelSerial = Number(dataStr);
    const jsDate = new Date(excelEpoch.getTime() + excelSerial * 86400000);
    
    const year = jsDate.getFullYear();
    const month = String(jsDate.getMonth() + 1).padStart(2, '0');
    const day = String(jsDate.getDate()).padStart(2, '0');
    dataFactura = `${year}-${month}-${day}`;
  }
  // Si ya es formato ISO (yyyy-mm-dd), dejarlo como está
}

let facturaHistorica = undefined;
if (numeroFactura && dataFactura) {
  facturaHistorica = {
    numero: numeroFactura,
    data: dataFactura
  };
  estat = 'facturat';
}
    
    return {
      codi,
      client: codiClient,
      pressupost: undefined,
      factura: undefined,
      titol: nomProjecte,
      descripcio: row.Descripció || row.descripcio || '',
      modalitat: codiModalitat,
      servei: codiServei,
      esDirect,
      dataInici: dataProjecte,
      dataEntrega: dataProjecte,
      dataFinalitzacio: estat === 'entregat' || estat === 'facturat' ? dataProjecte : undefined,
      estat,
      recursosHumans,  // ← Con tarea ficticia
      materials,       // ← Con material ficticio
      ingresSenseIVA,
      iva,
      ingresAmbIVA,
      gastosMaterials,
      gastosHumans,
      gastosTotals: gastosMaterials + gastosHumans,
      benefici: ingresSenseIVA - gastosMaterials - gastosHumans,
      percentBenefici: ingresSenseIVA > 0 ? ((ingresSenseIVA - gastosMaterials - gastosHumans) / ingresSenseIVA) * 100 : 0,
      instruccionsClient: '',
      instruccionsProveidors: '',
      tasques,  // ← Con tarea ficticia del ingreso
      facturat: estat === 'facturat',
      arxivat: false,
      historial: [
        {
          id: `HIST-${Date.now()}`,
          data: new Date().toISOString(),
          tipus: 'creacio',
          descripcio: 'Projecte importat des d\'Excel'
        }
      ],
      esImportat: true,
      facturaHistorica
    };
  });
  
  const totalsProjectes = [...projectesExistents, ...nousProjectes];
  localStorage.setItem('plateaProjectes', JSON.stringify(totalsProjectes));
  
  return nousProjectes.length;
};

// GENERAR PLANTILLAS
export const generateTemplates = () => {
  const plantilles = {
    'Categories': [
      { Nom: 'Producció' }, 
      { Nom: 'Postproducció' }
    ],
    'Serveis': [
      { Nom: 'Càmera principal', Descripció: 'Gravació video', Categoria: 'Producció' },
      { Nom: 'Edició', Descripció: 'Muntatge video', Categoria: 'Postproducció' }
    ],
    'Unitats': [
      { Nom: 'Jornada completa' }, 
      { Nom: 'Hora' }
    ],
    'Tarifes': [
      { Servei: 'Càmera principal', Unitat: 'Jornada completa', Preu: 500 },
      { Servei: 'Edició', Unitat: 'Hora', Preu: 50 }
    ],
    'Materials': [
      { 
        Material: 'Canon EOS R5', 
        Grup: 'Càmeres', 
        'Proveïdor': 'Nom Proveïdor (opcional)',
        'Preu Proveïdor': 3000, 
        'Preu Platea': 3500,
        'Enllaç': 'https://example.com (opcional)'
      }
    ],
    'Clients': [
      {
        'Data Alta': '2024-01-15',
        'Nom Fiscal': 'Empresa Exemple SA',
        'Nom Comercial': 'Empresa Exemple',
        NIF: 'B12345678',
        'País': 'Espanya',
        'Telèfon': '600123456',
        Email: 'info@exemple.com',
        Domicili: 'Carrer Major, 1',
        Web: 'www.exemple.com',
        Notes: 'Notes internes opcionals',
        'Tipus IVA': 'Normal',
        'Retenció IRPF': 15
      }
    ],
    'Proveïdors': [
      {
        'Tipus': 'Proveïdor',
        'Data Alta': '2024-01-15',
        'Nom Fiscal': 'Proveïdor Exemple SL',
        'Nom Comercial': 'Proveïdor Exemple',
        NIF: 'B87654321',
        'País': 'Espanya',
        'Telèfon': '600654321',
        Email: 'pro@exemple.com',
        Domicili: 'Carrer Menor, 2',
        Web: 'www.proveidor.com',
        Notes: 'Notes internes opcionals',
        'Tipus IVA': 'Normal',
        'Retenció IRPF': 21
      },
      {
        'Tipus': 'Acreedor',
        'Data Alta': '2024-02-01',
        'Nom Fiscal': 'Acreedor Exemple SA',
        'Nom Comercial': 'Acreedor Test',
        NIF: 'B12312312',
        'País': 'Espanya',
        'Telèfon': '600111222',
        Email: 'acr@exemple.com',
        Domicili: 'Carrer Petit, 5',
        Web: '',
        Notes: '',
        'Tipus IVA': 'Normal',
        'Retenció IRPF': 0
      }
    ],
    'Projectes Referència': [
      {
        'Any': 2024,
        'Mes': 1,
        'Client': 'Client Exemple SL',
        'Nom Projecte': 'Producció Vídeo Corporatiu',
        'Modalitat': 'Producció',
        'Tipus Producció': 'Vídeo Corporatiu',
        'Directe': 'Sí',
        'Ingrés sense IVA': 5000,
        'Ingrés amb IVA': 6050,
        'Gastos Materials': 1200,
        'Gastos Recursos Humans': 2500,
        'Benefici': 1300,
        'Estat': 'facturat',
        'Número Factura': 'FAV-00123',
        'Data Factura': '31/01/2024'
      },
      {
        'Any': 2024,
        'Mes': 2,
        'Client': 'Altre Client SA',
        'Nom Projecte': 'Streaming Event',
        'Modalitat': 'Streaming',
        'Servei': 'Event en directe',
        'Directe': 'No',
        'Ingrés sense IVA': 3000,
        'Ingrés amb IVA': 3630,
        'Gastos Materials': 800,
        'Gastos Recursos Humans': 1500,
        'Benefici': '',
        'Estat': 'completat',
        'Número Factura': '',
        'Data Factura': ''
      }
    ]
  };

  const wb = XLSX.utils.book_new();
  
  Object.entries(plantilles).forEach(([nom, dades]) => {
    const ws = XLSX.utils.json_to_sheet(dades);
    XLSX.utils.book_append_sheet(wb, ws, nom);
  });

  XLSX.writeFile(wb, 'Plantilles_Importacio_Aurora.xlsx');
};
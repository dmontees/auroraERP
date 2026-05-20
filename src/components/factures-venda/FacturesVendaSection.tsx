import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import type { FacturaVenta } from '../../types/facturaVenta';
import type { Client } from '../../types/client';
import type { Projecte } from '../../types/projecte';
import FacturaVendaStats from './FacturaVendaStats';
import FacturaVendaTable from './FacturaVendaTable';
import FacturaVendaModal from './FacturaVendaModal';
import type { Parametres } from '../../types/parametres';
import SearchableSelect from '../common/SearchableSelect';
import { registrarFacturaDesvinculada } from '../../utils/projecteHistorial';

export default function FacturesVendaSection() {
  const [factures, setFactures] = useState<FacturaVenta[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [projectes, setProjectes] = useState<Projecte[]>([]);
  const [parametres, setParametres] = useState<Parametres>({
    serveis: [],
    unitats: [],
    tarifes: [],
    categories: [],
    grupsMaterials: [],
    materials: [],
    tipusPlantilles: [],
    plantilles: [],
    modalitats: [],
    tipusProduccio: [],
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
  const [showModal, setShowModal] = useState(false);
  const [editingFactura, setEditingFactura] = useState<FacturaVenta | null>(null);
  const [filtreEstat, setFiltreEstat] = useState<'totes' | 'pendent' | 'cobrades'>('pendent');
  const [filterClient, setFilterClient] = useState('');
  const [filterMes, setFilterMes] = useState('');

  const [mesExport, setMesExport] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Cargar datos
  useEffect(() => {
    const savedFactures = localStorage.getItem('plateaFacturesVenda');
    if (savedFactures) {
      setFactures(JSON.parse(savedFactures));
    }
  
    const savedClients = localStorage.getItem('plateaClients');
    if (savedClients) {
      setClients(JSON.parse(savedClients));
    }
  
    const savedProjectes = localStorage.getItem('plateaProjectes');
    if (savedProjectes) {
      setProjectes(JSON.parse(savedProjectes));
    }
  
    const savedParametres = localStorage.getItem('plateaParametres');
    if (savedParametres) {
      setParametres(JSON.parse(savedParametres));
    }
  }, []);

// Escuchar navegación desde otras secciones
useEffect(() => {
  // Solo ejecutar si las facturas ya están cargadas
  if (factures.length === 0) return;
  
  const navigateTo = localStorage.getItem('plateaNavigateTo');
  if (navigateTo) {
    try {
      const data = JSON.parse(navigateTo);
      if (data.type === 'factura' && data.codi) {
        // Buscar la factura
        const factura = factures.find(f => f.codi === data.codi);
        if (factura) {
          // Pequeño delay para asegurar que la sección está montada
          setTimeout(() => {
            setEditingFactura(factura);
            setShowModal(true);
          }, 100);
        }
        // Limpiar
        localStorage.removeItem('plateaNavigateTo');
      }
    } catch (e) {
    }
  }
}, [factures]);

  // Guardar factures
  const saveFactures = (newFactures: FacturaVenta[]) => {
    setFactures(newFactures);
    localStorage.setItem('plateaFacturesVenda', JSON.stringify(newFactures));
  };

  // Eliminar factura
  const deleteFactura = (codi: string) => {
    const factura = factures.find(f => f.codi === codi);
    if (!factura) return;

    // Solo se puede eliminar si no está enviada y no tiene pagos
    if (factura.estat !== 'borrador') {
      alert('No es pot eliminar una factura que ja s\'ha enviat.');
      return;
    }

    if (factura.pagaments.length > 0) {
      alert('No es pot eliminar una factura amb pagaments registrats.');
      return;
    }

    if (!confirm('Estàs segur que vols eliminar aquesta factura?')) {
      return;
    }

// Si tiene proyecto asociado, desbloquear el proyecto
if (factura.projecte) {
  const projecte = projectes.find(p => p.codi === factura.projecte);
  if (projecte) {
    // Registrar desvinculación en el historial
    const projecteAmbHistorial = registrarFacturaDesvinculada(
      projecte,
      factura.codi
    );
    
    const updatedProjecte = {
      ...projecteAmbHistorial,
      estat: 'en_curs' as const,
      facturaAssociada: undefined
    };
    
    const updatedProjectes = projectes.map(p => 
      p.codi === projecte.codi ? updatedProjecte : p
    );
    setProjectes(updatedProjectes);
    localStorage.setItem('plateaProjectes', JSON.stringify(updatedProjectes));
  }
}

    saveFactures(factures.filter(f => f.codi !== codi));
  };

  // Filtrar factures
  const facturesFiltrades = factures
  .filter(factura => {
    // Filtro por estado
    if (filtreEstat === 'pendent') {
      if (!['borrador', 'enviada', 'pagada-parcial', 'vencuda'].includes(factura.estat)) {
        return false;
      }
    }
    if (filtreEstat === 'cobrades') {
      if (factura.estat !== 'pagada') {
        return false;
      }
    }
    
    // Filtro por cliente
    if (filterClient && factura.client !== filterClient) {
      return false;
    }
    
    // Filtro por mes
    if (filterMes && !factura.dataFactura.startsWith(filterMes)) {
      return false;
    }
    
    return true;
  })
  .sort((a, b) => {
    // Ordenar por código (más recientes primero: FAV-00236 > FAV-00235)
    const numA = parseInt(a.codi.split('-')[1]);
    const numB = parseInt(b.codi.split('-')[1]);
    return numB - numA;
  });

  // Generar próximo código
  const getNextCode = () => {
    if (factures.length === 0) return 'FAV-00235';
    const lastCode = Math.max(...factures.map(f => parseInt(f.codi.split('-')[1])));
    return `FAV-${String(lastCode + 1).padStart(5, '0')}`;
  };

// Exportar ZIP de facturas
const exportarFacturesMes = async () => {
  const facturesDelMes = factures.filter(f => {
    const mesFactura = f.dataFactura.substring(0, 7);
    return mesFactura === mesExport && f.documentPDF;
  });

  if (facturesDelMes.length === 0) {
    alert('No hi ha factures amb PDF per aquest mes');
    return;
  }

  const JSZip = (await import('jszip')).default;
  const { saveAs } = await import('file-saver');
  const zip = new JSZip();

  facturesDelMes.forEach(factura => {
    const client = clients.find(c => c.codi === factura.client);
    const filename = `${factura.codi}_${client?.nomComercial || client?.nomFiscal || 'client'}.pdf`;
    const base64Data = factura.documentPDF!.split(',')[1];
    zip.file(filename, base64Data, { base64: true });
  });

  const content = await zip.generateAsync({ type: 'blob' });
  const [any, mes] = mesExport.split('-');
  const mesNom = new Date(parseInt(any), parseInt(mes) - 1).toLocaleString('ca', { month: 'long', year: 'numeric' });
  saveAs(content, `Factures vendes_${mesNom}.zip`);
};

  return (
    <div>
      {/* Stats Cards */}
      <FacturaVendaStats 
  factures={factures} 
  clients={clients}
  mesExport={mesExport}
  setMesExport={setMesExport}
  onExportarZip={exportarFacturesMes}
/>

{/* FILTROS Y ACCIONES */}
<div style={{
  display: 'flex',
  gap: '0.5rem',
  marginBottom: '1.5rem',
  marginTop: '2rem',
  flexWrap: 'wrap',
  alignItems: 'center'
}}>
  <select
    value={filtreEstat}
    onChange={(e) => setFiltreEstat(e.target.value as any)}
    className="form-input"
    style={{ width: '140px', fontSize: '0.85rem' }}
  >
    <option value="totes">Tots els estats</option>
    <option value="pendent">Pendent cobro</option>
    <option value="cobrades">Cobrades</option>
  </select>

  <div style={{ width: '160px' }}>
    <SearchableSelect
      value={filterClient}
      onChange={(value) => setFilterClient(value || '')}
      options={[
        { value: '', label: 'Tots els clients' },
        ...clients.map(c => ({
          value: c.codi,
          label: c.nomComercial || c.nomFiscal
        }))
      ]}
      placeholder="Client..."
    />
  </div>

  <input
    type="month"
    value={filterMes}
    onChange={(e) => setFilterMes(e.target.value)}
    className="form-input"
    placeholder="Mes..."
    style={{ width: '140px', fontSize: '0.85rem' }}
  />

  <div style={{ flex: 1 }} />

  <button 
    className="btn-primary"
    onClick={() => {
      setEditingFactura(null);
      setShowModal(true);
    }}
  >
    Nova Factura
  </button>
</div>

      {/* Tabla */}
      <FacturaVendaTable 
        factures={facturesFiltrades}
        clients={clients}
        projectes={projectes}
        onEdit={(factura) => {
          setEditingFactura(factura);
          setShowModal(true);
        }}
      />

      {/* Modal */}
      {showModal && (
  <FacturaVendaModal
    onClose={() => {
      setShowModal(false);
      setEditingFactura(null);
    }}
    onSave={(factura) => {
      const existeix = factures.some(f => f.codi === factura.codi);
      if (existeix) {
        saveFactures(factures.map(f => f.codi === factura.codi ? factura : f));
      } else {
        saveFactures([...factures, factura]);
      }
    }}
    onDelete={deleteFactura}
    nextCode={getNextCode()}
    clients={clients}
    projectes={projectes}
    plantilles={parametres.plantilles || []}
    editingFactura={editingFactura}
  />
)}
    </div>
  );
}
import { useState, useEffect } from 'react';
import { Search, Filter, Download, Plus, LayoutGrid, List } from 'lucide-react';
import type { Projecte } from '../../types/projecte';
import type { Client } from '../../types/client';
import type { Parametres } from '../../types/parametres';
import ProjecteModal from './ProjecteModal';

function ProjectesSection() {
  // Estados principales
  const [projectes, setProjectes] = useState<Projecte[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [parametres, setParametres] = useState<Parametres | null>(null);
  
  // Estados UI
  const [vistaActual, setVistaActual] = useState<'taula' | 'kanban'>('taula');
  const [showModal, setShowModal] = useState(false);
  const [editingProjecte, setEditingProjecte] = useState<Projecte | null>(null);
  
  // Estados filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstat, setFilterEstat] = useState<string>('');
  const [filterModalitat, setFilterModalitat] = useState<string>('');
  const [filterServei, setFilterServei] = useState<string>('');
  const [nomesDirectes, setNomesDirectes] = useState(false);
  const [amagarArxivats, setAmagarArxivats] = useState(true);

// Cargar datos desde localStorage
useEffect(() => {
  const loadData = () => {
    const savedProjectes = localStorage.getItem('plateaProjectes');
    if (savedProjectes) {
      setProjectes(JSON.parse(savedProjectes));
    }

    const savedClients = localStorage.getItem('plateaClients');
    if (savedClients) {
      setClients(JSON.parse(savedClients));
    }

    const savedParametres = localStorage.getItem('plateaParametres');
    if (savedParametres) {
      setParametres(JSON.parse(savedParametres));
    }
  };

  // Cargar al inicio
  loadData();

  // Escuchar cambios en storage (cuando otras pestañas/componentes actualicen)
  window.addEventListener('storage', loadData);
  
  // También recargar cuando la ventana recupera el foco
  window.addEventListener('focus', loadData);

  return () => {
    window.removeEventListener('storage', loadData);
    window.removeEventListener('focus', loadData);
  };
}, []);

// Escuchar navegación desde otras secciones
useEffect(() => {
  
  // Solo ejecutar si los proyectos ya están cargados
  if (projectes.length === 0) {
    return;
  }
  
  const navigateTo = localStorage.getItem('plateaNavigateTo');
  
  if (navigateTo) {
    try {
      const data = JSON.parse(navigateTo);
      
      if (data.type === 'projecte' && data.codi) {
        
        // Buscar el proyecto
        const projecte = projectes.find(p => p.codi === data.codi);
        
        if (projecte) {
          // Pequeño delay para asegurar que la sección está montada
          setTimeout(() => {
            setEditingProjecte(projecte);
            setShowModal(true);
          }, 100);
        } else {
        }
        // Limpiar
        localStorage.removeItem('plateaNavigateTo');
      } else {
      }
    } catch (e) {
    }
  } else {
  }
}, [projectes]);

// Guardar projectes en localStorage
const saveProjectes = (newProjectes: Projecte[]) => {
  setProjectes(newProjectes);
  localStorage.setItem('plateaProjectes', JSON.stringify(newProjectes));
  
  // Verificar INMEDIATAMENTE después
  const verificar = localStorage.getItem('plateaProjectes');
};

// Crear factura desde proyecto
const crearFacturaDesdeProjecte = (projecte: Projecte) => {
  // Generar código de factura
  const facturesVenda = JSON.parse(localStorage.getItem('plateaFacturesVenda') || '[]');
  const maxNum = facturesVenda.length === 0 ? 234 : Math.max(...facturesVenda.map((f: any) => parseInt(f.codi.split('-')[1])));
  const codiFactura = `FAV-${String(maxNum + 1).padStart(5, '0')}`;

  // Convertir tasques de proyecto a categorías de factura
  const tascasCategoritzades: any[] = [];
  
  projecte.tasques.forEach(tasca => {
    let categoria = tascasCategoritzades.find(c => c.categoria === tasca.categoria);
    
    if (!categoria) {
      categoria = {
        categoria: tasca.categoria,
        tasques: []
      };
      tascasCategoritzades.push(categoria);
    }
    
    categoria.tasques.push({
      id: tasca.id,
      servei: tasca.servei,
      descripcio: tasca.descripcio,
      quantitat: tasca.quantitat,
      unitat: tasca.unitat,
      preu: tasca.tarifa
    });
  });

  // Calcular totales
  let baseImposable = 0;
  tascasCategoritzades.forEach(cat => {
    cat.tasques.forEach((t: any) => {
      baseImposable += t.quantitat * t.preu;
    });
  });

  const ivaImport = baseImposable * 0.21;
  const totalFactura = baseImposable + ivaImport;

  // Crear factura
  const novaFactura = {
    codi: codiFactura,
    estat: 'borrador',
    client: projecte.client,
    projecte: projecte.codi,
    dataFactura: new Date().toISOString().split('T')[0],
    dataVenciment: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    ivaPercent: 21,
    irpfPercent: 0,
    tasques: tascasCategoritzades,
    baseImposable,
    ivaImport,
    irpfImport: 0,
    totalFactura,
    pagaments: [],
    totalPagat: 0,
    pendentCobrar: totalFactura,
    observacions: `Factura generada automàticament des del projecte ${projecte.codi}`,
    plantillesSeleccionades: parametres?.plantilles
      ?.filter(p => p.tipusPlantilla === 'TPL-00002' && p.perDefecte)
      ?.map(p => p.codi) || [],
    plantillesText: parametres?.plantilles
      ?.filter(p => p.tipusPlantilla === 'TPL-00002' && p.perDefecte)
      ?.map(p => p.text)
      ?.join('\n\n') || '',
    accions: [
      {
        data: new Date().toISOString(),
        descripcio: `Factura creada des del projecte ${projecte.codi}`,
        automatic: true
      }
    ]
  };

  // Guardar factura
  localStorage.setItem('plateaFacturesVenda', JSON.stringify([...facturesVenda, novaFactura]));

  // Actualizar proyecto: añadir factura asociada y cambiar estado
  const projectesActualitzats = projectes.map(p => 
    p.codi === projecte.codi 
      ? { 
          ...p, 
          facturaAssociada: codiFactura, 
          estat: 'facturat'
        }
      : p
  );

  saveProjectes(projectesActualitzats);

  // Cerrar modal
  setShowModal(false);
  setEditingProjecte(null);

  alert(`✅ Factura ${codiFactura} creada correctament!\n\nEl projecte ha estat marcat com facturat i vinculat a la factura.`);
};

  // Generar próximo código
  const getNextCode = () => {
    if (projectes.length === 0) return 'PRJ-00001';
    const maxNum = Math.max(...projectes.map(p => parseInt(p.codi.split('-')[1])));
    return `PRJ-${String(maxNum + 1).padStart(5, '0')}`;
  };

  // Calcular métricas para cards
  const calcularMetriques = () => {
    const avui = new Date();
    avui.setHours(0, 0, 0, 0);

    const enCurs = projectes.filter(p => 
      (p.estat === 'en_curs' || p.estat === 'post_produccio') && !p.arxivat
    ).length;

    const planificats = projectes.filter(p => 
      p.estat === 'planificat' && !p.arxivat
    ).length;

    const endarrerits = projectes.filter(p => {
      if (p.arxivat || p.estat === 'entregat' || p.estat === 'facturat') return false;
      const dataEntrega = new Date(p.dataEntrega);
      return dataEntrega < avui;
    }).length;

    // Próximas 3 entregas
    const properes = projectes
      .filter(p => !p.arxivat && p.estat !== 'entregat' && p.estat !== 'facturat')
      .sort((a, b) => new Date(a.dataEntrega).getTime() - new Date(b.dataEntrega).getTime())
      .slice(0, 3);

    return { enCurs, planificats, endarrerits, properes };
  };

  const metriques = calcularMetriques();

// Aplicar filtros y ordenar (más recientes primero)
const projectesFiltrats = projectes
  .filter(p => {
    // Amagar arxivats
    if (amagarArxivats && p.arxivat) return false;
    
    // Només directes
    if (nomesDirectes && !p.esDirect) return false;
    
    // Filtro estat
    if (filterEstat && p.estat !== filterEstat) return false;
    
    // Filtro modalitat
    if (filterModalitat && p.modalitat !== filterModalitat) return false;
    
    // Filtro servei
    if (filterServei && p.servei !== filterServei) return false;
    
    // Búsqueda
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const client = clients.find(c => c.codi === p.client);
      const clientNom = (client?.nomComercial || client?.nomFiscal || '').toLowerCase();
      
      return (
        p.codi.toLowerCase().includes(term) ||
        clientNom.includes(term) ||
        p.titol.toLowerCase().includes(term)
      );
    }
    
    return true;
  })
  .sort((a, b) => {
    // Ordenar por fecha de inicio descendente (más recientes primero)
    const dateA = new Date(a.dataInici).getTime();
    const dateB = new Date(b.dataInici).getTime();
    return dateB - dateA;
  });

// Colores de estado
const estatColors: Record<string, { bg: string; text: string }> = {
  esborrany: { bg: '#f3f4f6', text: '#6b7280' },
  planificat: { bg: '#dbeafe', text: '#1e40af' },
  en_curs: { bg: '#fef3c7', text: '#92400e' },
  post_produccio: { bg: '#e0e7ff', text: '#4338ca' },
  entregat: { bg: '#d1fae5', text: '#065f46' },
  facturat: { bg: '#10b981', text: '#ffffff' },
  cancelat: { bg: '#fee2e2', text: '#991b1b' }
};

const estatLabels: Record<string, string> = {
  esborrany: 'Esborrany',
  planificat: 'Planificat',
  en_curs: 'En curs',
  post_produccio: 'Post producció',
  entregat: 'Entregat',
  facturat: 'Facturat',
  cancelat: 'Cancel·lat'
};

  return (
<div style={{ marginBottom: '1.5rem' }}>
 
{/* CARDS COMPACTES */}
<div style={{ 
  display: 'grid', 
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
  gap: '1rem',
  marginBottom: '1.5rem'
}}>
  {/* Card 1: En curs */}
  <div className="placeholder-card" style={{ padding: '1rem' }}>
    <div style={{ 
      fontSize: '0.75rem', 
      color: 'var(--color-text-tertiary)', 
      marginBottom: '0.5rem',
      textTransform: 'uppercase',
      fontWeight: 600,
      letterSpacing: '0.5px'
    }}>
      En curs
    </div>
    <div style={{ 
      fontSize: '2rem', 
      fontWeight: 700, 
      color: 'var(--color-accent-primary)',
      lineHeight: 1
    }}>
      {metriques.enCurs}
    </div>
  </div>

  {/* Card 2: Planificats */}
  <div className="placeholder-card" style={{ padding: '1rem' }}>
    <div style={{ 
      fontSize: '0.75rem', 
      color: 'var(--color-text-tertiary)', 
      marginBottom: '0.5rem',
      textTransform: 'uppercase',
      fontWeight: 600,
      letterSpacing: '0.5px'
    }}>
      Planificats
    </div>
    <div style={{ 
      fontSize: '2rem', 
      fontWeight: 700, 
      color: '#3b82f6',
      lineHeight: 1
    }}>
      {metriques.planificats}
    </div>
  </div>

  {/* Card 3: Endarrerits */}
  <div className="placeholder-card" style={{ padding: '1rem' }}>
    <div style={{ 
      fontSize: '0.75rem', 
      color: 'var(--color-text-tertiary)', 
      marginBottom: '0.5rem',
      textTransform: 'uppercase',
      fontWeight: 600,
      letterSpacing: '0.5px'
    }}>
      Endarrerits
    </div>
    <div style={{ 
      fontSize: '2rem', 
      fontWeight: 700, 
      color: metriques.endarrerits > 0 ? '#ef4444' : '#10b981',
      lineHeight: 1
    }}>
      {metriques.endarrerits}
    </div>
  </div>

  {/* Card 4: Properes entregas */}
  <div className="placeholder-card" style={{ padding: '1rem' }}>
    <div style={{ 
      fontSize: '0.75rem', 
      color: 'var(--color-text-tertiary)', 
      marginBottom: '0.5rem',
      textTransform: 'uppercase',
      fontWeight: 600,
      letterSpacing: '0.5px'
    }}>
      Properes entregas
    </div>
    {metriques.properes.length === 0 ? (
      <div style={{ 
        fontSize: '0.85rem', 
        color: 'var(--color-text-tertiary)',
        fontStyle: 'italic',
        paddingTop: '0.5rem'
      }}>
        Cap entrega propera
      </div>
    ) : (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
        {metriques.properes.map(p => {
          const client = clients.find(c => c.codi === p.client);
          const dataEntrega = new Date(p.dataEntrega);
          const diesRestants = Math.ceil((dataEntrega.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
          
          return (
            <div 
              key={p.codi}
              style={{ 
                fontSize: '0.85rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <span style={{ 
                fontWeight: 600,
                color: diesRestants < 0 ? '#ef4444' : diesRestants < 3 ? '#f59e0b' : 'var(--color-text-primary)',
                flexShrink: 0
              }}>
                {dataEntrega.toLocaleDateString('ca-ES', { day: '2-digit', month: '2-digit' })}
              </span>
              <span style={{ 
                color: 'var(--color-text-secondary)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                flex: 1,
                textAlign: 'right'
              }}>
                {client?.nomComercial || client?.nomFiscal}
              </span>
              {diesRestants < 0 && <span>⚠️</span>}
            </div>
          );
        })}
      </div>
    )}
  </div>
</div>

{/* BARRA DE FILTROS Y ACCIONES */}
<div className="placeholder-card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
  {/* Primera fila: Búsqueda y botones principales */}
  <div style={{ 
    display: 'flex', 
    gap: '1rem', 
    marginBottom: '1rem',
    flexWrap: 'wrap',
    alignItems: 'center'
  }}>
    {/* Búsqueda */}
    <div style={{ flex: '1', minWidth: '250px', position: 'relative' }}>
      <Search 
        size={18} 
        style={{ 
          position: 'absolute', 
          left: '0.75rem', 
          top: '50%', 
          transform: 'translateY(-50%)',
          color: 'var(--color-text-tertiary)'
        }} 
      />
      <input
        type="text"
        className="form-input"
        placeholder="Cercar per codi, client o títol..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        style={{ paddingLeft: '2.5rem' }}
      />
    </div>

    {/* Toggle Vista */}
    <div style={{ display: 'flex', gap: '0.5rem' }}>
      <button
        className={vistaActual === 'taula' ? 'btn-primary' : 'btn-secondary'}
        onClick={() => setVistaActual('taula')}
        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
      >
        <List size={18} />
        Taula
      </button>
      <button
        className={vistaActual === 'kanban' ? 'btn-primary' : 'btn-secondary'}
        onClick={() => setVistaActual('kanban')}
        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
      >
        <LayoutGrid size={18} />
        Kanban
      </button>
    </div>

    {/* Botón Nuevo Proyecto */}
    <button 
      className="btn-primary"
      onClick={() => {
        setEditingProjecte(null);
        setShowModal(true);
      }}
      style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
    >
      <Plus size={18} />
      Nou Projecte
    </button>
  </div>

  {/* Segunda fila: Filtros avanzados */}
  <div style={{ 
    display: 'grid', 
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '1rem'
  }}>
    {/* Filter Estat */}
    <select
      className="form-input"
      value={filterEstat}
      onChange={(e) => setFilterEstat(e.target.value)}
    >
      <option value="">Tots els estats</option>
      <option value="esborrany">Esborrany</option>
      <option value="planificat">Planificat</option>
      <option value="en_curs">En curs</option>
      <option value="post_produccio">Post producció</option>
      <option value="entregat">Entregat</option>
      <option value="facturat">Facturat</option>
      <option value="cancelat">Cancel·lat</option>
    </select>

    {/* Filter Modalitat */}
    <select
      className="form-input"
      value={filterModalitat}
      onChange={(e) => setFilterModalitat(e.target.value)}
    >
      <option value="">Totes les modalitats</option>
      {parametres?.modalitats?.map(m => (
        <option key={m.codi} value={m.codi}>{m.nom}</option>
      ))}
    </select>

{/* Filter Tipus Producció */}
<select
  className="form-input"
  value={filterServei}
  onChange={(e) => setFilterServei(e.target.value)}
>
  <option value="">Tots els tipus</option>
  {parametres?.tipusProduccio?.map(t => (
    <option key={t.codi} value={t.codi}>{t.nom}</option>
  ))}
</select>

    {/* Checkboxes */}
    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={nomesDirectes}
          onChange={(e) => setNomesDirectes(e.target.checked)}
        />
        <span style={{ fontSize: '0.9rem' }}>Només directes</span>
      </label>
      
      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={amagarArxivats}
          onChange={(e) => setAmagarArxivats(e.target.checked)}
        />
        <span style={{ fontSize: '0.9rem' }}>Amagar arxivats</span>
      </label>
    </div>
  </div>
</div>

{/* CONTENIDO PRINCIPAL */}
{vistaActual === 'taula' ? (
  projectesFiltrats.length === 0 ? (
    <div className="placeholder-card" style={{ textAlign: 'center', padding: '4rem' }}>
      <p style={{ color: 'var(--color-text-tertiary)', marginBottom: '1rem' }}>
        {projectes.length === 0 ? 'No hi ha projectes encara' : 'No hi ha projectes que coincideixin amb els filtres'}
      </p>
      {projectes.length === 0 && (
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          + Crear primer projecte
        </button>
      )}
    </div>
  ) : (
    <div className="placeholder-card" style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
  <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
    <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600 }}>Codi</th>
    <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600 }}>Projecte</th>
    <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600 }}>Client</th>
    <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600 }}>Estat</th>
    <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600 }}>Modalitat</th>
    <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600 }}>Tipus Producció</th>
    <th style={{ textAlign: 'center', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, width: '70px' }}>Directe</th>
    <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600 }}>Entrega</th>
    <th style={{ textAlign: 'right', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600 }}>Despeses</th>
    <th style={{ textAlign: 'right', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600 }}>Ingressos</th>
    <th style={{ textAlign: 'right', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600 }}>Benefici</th>
  </tr>
</thead>
<tbody>
  {projectesFiltrats.map(projecte => {
    const client = clients.find(c => c.codi === projecte.client);
    const modalitat = parametres?.modalitats?.find(m => m.codi === projecte.modalitat);
    const tipusProducció = parametres?.tipusProduccio?.find(t => t.codi === projecte.servei);
    
    // Calcular financiero correcto
    const gastos = projecte.recursosHumans.reduce((sum, r) => sum + r.cost, 0) + 
                   projecte.materials.reduce((sum, m) => sum + m.preuProveidor, 0);
    const ingressos = projecte.tasques.reduce((sum, t) => sum + t.importe, 0);
    const benefici = ingressos - gastos;
    const percentBenefici = ingressos > 0 ? (benefici / ingressos) * 100 : 0;
    
    return (
      <tr 
        key={projecte.codi}
        onClick={() => {
          setEditingProjecte(projecte);
          setShowModal(true);
        }}
        style={{ 
          borderBottom: '1px solid var(--color-border)',
          cursor: 'pointer'
        }}
        className="table-row-hover"
      >
        {/* Codi */}
<td style={{ padding: '0.75rem', fontSize: '0.85rem', color: 'var(--color-text-tertiary)' }}>
  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
    <span>{projecte.codi}</span>
    {projecte.esImportat && (
      <span style={{
        padding: '0.15rem 0.4rem',
        borderRadius: '4px',
        fontSize: '0.7rem',
        fontWeight: 600,
        background: '#e0e7ff',
        color: '#4338ca'
      }}>
        📥
      </span>
    )}
  </div>
</td>
        
        {/* Projecte */}
        <td style={{ padding: '0.75rem' }}>
          {projecte.titol}
        </td>
        
        {/* Cliente */}
        <td style={{ padding: '0.75rem', fontWeight: 500 }}>
          {client?.nomComercial || client?.nomFiscal || '-'}
        </td>
        
        {/* Estat */}
        <td style={{ padding: '0.75rem' }}>
          <span style={{
            padding: '0.25rem 0.75rem',
            borderRadius: '12px',
            fontSize: '0.75rem',
            fontWeight: 600,
            background: estatColors[projecte.estat]?.bg || '#f3f4f6',
            color: estatColors[projecte.estat]?.text || '#6b7280'
          }}>
            {estatLabels[projecte.estat] || projecte.estat}
          </span>
        </td>
        
        {/* Modalitat */}
        <td style={{ padding: '0.75rem' }}>
          {modalitat && (
            <span style={{
              padding: '0.25rem 0.75rem',
              borderRadius: '12px',
              fontSize: '0.75rem',
              fontWeight: 600,
              background: modalitat.color,
              color: 'white'
            }}>
              {modalitat.nom}
            </span>
          )}
        </td>
        
        {/* Tipus Producció */}
        <td style={{ padding: '0.75rem', fontSize: '0.9rem' }}>
          {tipusProducció?.nom || '-'}
        </td>
        
        {/* Directe */}
        <td style={{ padding: '0.75rem', textAlign: 'center', width: '70px' }}>
          <span style={{
            padding: '0.25rem 0.5rem',
            borderRadius: '4px',
            fontSize: '0.75rem',
            fontWeight: 600,
            background: projecte.esDirect ? '#dbeafe' : '#f3f4f6',
            color: projecte.esDirect ? '#1e40af' : '#6b7280'
          }}>
            {projecte.esDirect ? 'Sí' : 'No'}
          </span>
        </td>
        
        {/* Entrega */}
        <td style={{ padding: '0.75rem', fontSize: '0.9rem' }}>
          {new Date(projecte.dataEntrega).toLocaleDateString('ca-ES')}
        </td>
        
        {/* Gastos */}
        <td style={{ padding: '0.75rem', textAlign: 'right', color: 'var(--color-text-secondary)' }}>
          {gastos.toFixed(2)}€
        </td>
        
        {/* Ingressos */}
        <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 500 }}>
          {ingressos.toFixed(2)}€
        </td>
        
        {/* Benefici */}
        <td style={{ padding: '0.75rem', textAlign: 'right' }}>
          <div style={{ fontWeight: 600, color: benefici >= 0 ? '#10b981' : '#ef4444' }}>
            {benefici.toFixed(2)}€
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>
            {percentBenefici.toFixed(1)}%
          </div>
        </td>
      </tr>
    );
  })}
</tbody>
      </table>
    </div>
  )
  ) : (
    <>
      {/* VISTA KANBAN */}
      <div style={{
  display: 'flex', 
  gap: '1rem', 
  overflowX: 'auto', 
  padding: '1rem 0',
  minHeight: '500px'
}}>
{(['esborrany', 'planificat', 'en_curs', 'post_produccio', 'entregat', 'facturat', 'cancelat'] as const).map(estat => {
      const projectesEstat = projectesFiltrats.filter(p => p.estat === estat);
    
      const estatInfo = {
      'esborrany': { label: 'Esborrany', color: '#fbbf24', bg: '#fef3c7' },
      'planificat': { label: 'Planificat', color: '#60a5fa', bg: '#dbeafe' },
      'en_curs': { label: 'En curs', color: '#a78bfa', bg: '#ede9fe' },
      'post_produccio': { label: 'Post Producció', color: '#f472b6', bg: '#fce7f3' },
      'entregat': { label: 'Entregat', color: '#34d399', bg: '#d1fae5' },
      'facturat': { label: 'Facturat', color: '#10b981', bg: '#d1fae5' },
      'cancelat': { label: 'Cancel·lat', color: '#ef4444', bg: '#fee2e2' }
    };

    return (
      <div
        key={estat}
        onDragOver={(e) => {
          e.preventDefault();
          e.currentTarget.style.background = 'var(--color-bg-tertiary)';
        }}
        onDragLeave={(e) => {
          e.currentTarget.style.background = 'var(--color-bg-secondary)';
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.currentTarget.style.background = 'var(--color-bg-secondary)';
          
          const projecteCodi = e.dataTransfer.getData('projecteCodi');
          const projecte = projectes.find(p => p.codi === projecteCodi);
          
          if (projecte && projecte.estat !== estat) {
            const projecteActualitzat = { ...projecte, estat };
            saveProjectes(projectes.map(p => p.codi === projecteCodi ? projecteActualitzat : p));
          }
        }}
        style={{
          minWidth: '280px',
          background: 'var(--color-bg-secondary)',
          borderRadius: '8px',
          padding: '1rem',
          border: '2px solid var(--color-border)',
          transition: 'background 0.2s'
        }}
      >
        {/* Header de la columna */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1rem',
          paddingBottom: '0.75rem',
          borderBottom: '2px solid var(--color-border)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: estatInfo[estat].color
            }} />
            <h3 style={{ 
              fontSize: '0.9rem', 
              fontWeight: 600,
              color: 'var(--color-text-primary)'
            }}>
              {estatInfo[estat].label}
            </h3>
          </div>
          <span style={{
            padding: '0.25rem 0.5rem',
            borderRadius: '12px',
            fontSize: '0.75rem',
            fontWeight: 600,
            background: estatInfo[estat].bg,
            color: estatInfo[estat].color
          }}>
            {projectesEstat.length}
          </span>
        </div>

        {/* Tarjetas de proyectos */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {projectesEstat.length === 0 ? (
            <p style={{ 
              textAlign: 'center', 
              color: 'var(--color-text-tertiary)', 
              fontSize: '0.85rem',
              padding: '2rem 0'
            }}>
              No hi ha projectes
            </p>
          ) : (
            projectesEstat.map(projecte => {
              const client = clients.find(c => c.codi === projecte.client);
              const gastos = projecte.recursosHumans.reduce((sum, r) => sum + r.cost, 0) + 
                            projecte.materials.reduce((sum, m) => sum + m.preuProveidor, 0);
              const ingressos = projecte.tasques.reduce((sum, t) => sum + t.importe, 0);
              const benefici = ingressos - gastos;
              const percentBenefici = ingressos > 0 ? (benefici / ingressos) * 100 : 0;

              return (
                <div
                  key={projecte.codi}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('projecteCodi', projecte.codi);
                    e.currentTarget.style.opacity = '0.5';
                  }}
                  onDragEnd={(e) => {
                    e.currentTarget.style.opacity = '1';
                  }}
                  onClick={() => {
                    setEditingProjecte(projecte);
                    setShowModal(true);
                  }}
                  style={{
                    background: 'var(--color-bg-primary)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '6px',
                    padding: '1rem',
                    cursor: 'grab',
                    transition: 'all 0.2s',
                    position: 'relative'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  {/* Beneficio en esquina superior derecha */}
                  <div style={{
                    position: 'absolute',
                    top: '0.5rem',
                    right: '0.5rem',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-end',
                    gap: '0.125rem'
                  }}>
                    <span style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      color: benefici >= 0 ? '#10b981' : '#ef4444'
                    }}>
                      {benefici.toFixed(0)}€
                    </span>
                    <span style={{
                      fontSize: '0.65rem',
                      color: 'var(--color-text-tertiary)'
                    }}>
                      {percentBenefici.toFixed(1)}%
                    </span>
                  </div>

                  {/* Código del proyecto */}
                  <div style={{
                    fontSize: '0.7rem',
                    color: 'var(--color-text-tertiary)',
                    marginBottom: '0.5rem',
                    fontWeight: 500
                  }}>
                    {projecte.codi}
                  </div>

                  {/* Título del proyecto */}
                  <h4 style={{
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    color: 'var(--color-text-primary)',
                    marginBottom: '0.75rem',
                    lineHeight: '1.3',
                    paddingRight: '3rem'
                  }}>
                    {projecte.titol}
                  </h4>

                  {/* Cliente */}
                  <div style={{
                    fontSize: '0.8rem',
                    color: 'var(--color-text-secondary)',
                    marginBottom: '0.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}>
                    <span style={{ opacity: 0.7 }}>👤</span>
                    {client?.nomComercial || client?.nomFiscal || '-'}
                  </div>

                  {/* Fecha de entrega */}
                  <div style={{
                    fontSize: '0.75rem',
                    color: 'var(--color-text-tertiary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}>
                    <span>📅</span>
                    {new Date(projecte.dataEntrega).toLocaleDateString('ca-ES')}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  })}
  </div>
    </>
  )}
  
  {/* MODAL PROJECTE */}
{showModal && (
  <ProjecteModal
    projecte={editingProjecte}
    onClose={() => {
      setShowModal(false);
      setEditingProjecte(null);
      // Recargar proyectos desde localStorage
      const saved = localStorage.getItem('plateaProjectes');
      setProjectes(saved ? JSON.parse(saved) : []);
    }}
    onSave={(projecte) => {
      // Verificar si el proyecto ya existe (upsert)
      const existeix = projectes.some(p => p.codi === projecte.codi);
      
      if (existeix) {
        // Actualizar proyecto existente
        saveProjectes(projectes.map(p => p.codi === projecte.codi ? projecte : p));
      } else {
        // Añadir nuevo proyecto solo si no existe
        saveProjectes([...projectes, projecte]);
      }
    }}
    onCrearFactura={crearFacturaDesdeProjecte}
    nextCode={getNextCode()}
    clients={clients}
    parametres={parametres}
    proveidors={(() => {
      const saved = localStorage.getItem('plateaProveidors');
      return saved ? JSON.parse(saved) : [];
    })()}
  />
)}
    </div>
  );
}

export default ProjectesSection;
import { useState, useEffect } from 'react';
import { Search, Download, Plus, LayoutGrid, List } from 'lucide-react';
import type { Projecte } from '../../types/projecte';
import type { Client } from '../../types/client';
import type { Parametres } from '../../types/parametres';
import ProjecteModal from './ProjecteModal';
import { storage } from '../../utils/storageManager';
import { exportarProjectesExcel } from './utils/exportProjectes';

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
  const [mostrarActius, setMostrarActius] = useState(true);
  const [collapsedColumns, setCollapsedColumns] = useState<Set<string>>(new Set());

  // Filtro de período
  const currentYear = new Date().getFullYear();
  const [filterPeriode, setFilterPeriode] = useState<string>('aquest_any');
  const [filterDesde, setFilterDesde] = useState<string>(`${currentYear}-01-01`);
  const [filterFins, setFilterFins] = useState<string>(`${currentYear}-12-31`);

  const aplicarPeriode = (periode: string) => {
    const avui = new Date();
    const any = avui.getFullYear();
    const mes = avui.getMonth();
    switch (periode) {
      case 'ultims_3_mesos':
        setFilterDesde(new Date(any, mes - 3, 1).toISOString().split('T')[0]);
        setFilterFins(avui.toISOString().split('T')[0]);
        break;
      case 'ultims_6_mesos':
        setFilterDesde(new Date(any, mes - 6, 1).toISOString().split('T')[0]);
        setFilterFins(avui.toISOString().split('T')[0]);
        break;
      case 'ultims_12_mesos':
        setFilterDesde(new Date(any, mes - 12, 1).toISOString().split('T')[0]);
        setFilterFins(avui.toISOString().split('T')[0]);
        break;
      case 'aquest_any':
        setFilterDesde(`${any}-01-01`);
        setFilterFins(`${any}-12-31`);
        break;
      case 'any_anterior':
        setFilterDesde(`${any - 1}-01-01`);
        setFilterFins(`${any - 1}-12-31`);
        break;
    }
  };

// Cargar datos
useEffect(() => {
  const loadData = () => {
    setProjectes(storage.getProjectes());
    setClients(storage.getClients());
    setParametres(storage.getParametres() as Parametres);
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
  
  const navigateTo = storage.getNavigateTo();

  if (navigateTo) {
    if (navigateTo.type === 'projecte' && navigateTo.codi) {
      const projecte = projectes.find(p => p.codi === navigateTo.codi);
      if (projecte) {
        setTimeout(() => {
          setEditingProjecte(projecte);
          setShowModal(true);
        }, 100);
      }
    }
    storage.deleteNavigateTo();
  }
}, [projectes]);

// Guardar projectes
const saveProjectes = (newProjectes: Projecte[]) => {
  setProjectes(newProjectes);
  storage.setProjectes(newProjectes);
};

// Crear factura desde proyecto
const crearFacturaDesdeProjecte = (projecte: Projecte) => {
  // Generar código de factura
  const facturesVenda = storage.getFacturesVenda();
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
    ],
    avisFacturacio: projecte.avisFacturacio
      ? { ...projecte.avisFacturacio }
      : undefined
  };

  // Guardar factura
  storage.setFacturesVenda([...facturesVenda, novaFactura]);

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

    const ESTATS_ACTIUS = ['rodatge', 'edicio', 'esperant_feedback', 'revisio'];

    const projectesActius = projectes.filter(p =>
      (ESTATS_ACTIUS.includes(p.estat) || p.estat === 'planificat') && !p.arxivat
    ).length;

    const endarrerits = projectes.filter(p => {
      if (p.arxivat || p.estat === 'acabat' || p.estat === 'facturat') return false;
      const primeraEntrega = p.datesEntrega?.[0]?.data || p.dataEntrega;
      if (!primeraEntrega) return false;
      return new Date(primeraEntrega) < avui;
    }).length;

    // Propers rodatges (totes les dates futures de rodatge)
    const propersRodatges = projectes
      .filter(p => p.estat !== 'acabat' && p.estat !== 'facturat' && !p.arxivat)
      .flatMap(p => {
        if (p.datesRodatge && p.datesRodatge.length > 0) {
          return p.datesRodatge
            .filter(d => d.data && new Date(d.data) >= avui)
            .map(d => ({ titol: p.titol, data: d.data!, codi: p.codi }));
        }
        if (p.dataInici && new Date(p.dataInici) >= avui) {
          return [{ titol: p.titol, data: p.dataInici, codi: p.codi }];
        }
        return [];
      })
      .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime())
      .slice(0, 3);

    // Properes entreges (totes les dates d'entrega)
    const properes = projectes
      .filter(p => !p.arxivat && p.estat !== 'esperant_feedback' && p.estat !== 'revisio' && p.estat !== 'acabat' && p.estat !== 'facturat')
      .flatMap(p => {
        if (p.datesEntrega && p.datesEntrega.length > 0) {
          return p.datesEntrega
            .filter(d => d.data)
            .map(d => ({ titol: p.titol, data: d.data!, codi: p.codi }));
        }
        if (p.dataEntrega) {
          return [{ titol: p.titol, data: p.dataEntrega, codi: p.codi }];
        }
        return [];
      })
      .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime())
      .slice(0, 3);

    return { projectesActius, endarrerits, propersRodatges, properes };
  };

  const metriques = calcularMetriques();

// Aplicar filtros y ordenar per codi (més recent primer)
const projectesFiltrats = projectes
  .filter(p => {
    // Mostrar actius (ocultar acabat i facturat)
    if (mostrarActius && (p.estat === 'acabat' || p.estat === 'facturat')) return false;

    // Només directes
    if (nomesDirectes && !p.esDirect) return false;

    // Filtro estat
    if (filterEstat && p.estat !== filterEstat) return false;

    // Filtro modalitat
    if (filterModalitat && p.modalitat !== filterModalitat) return false;

    // Filtro servei
    if (filterServei && p.servei !== filterServei) return false;

    // Filtro de període (usa la primera data de rodatge o entrega del projecte)
    if (filterPeriode !== 'tots') {
      const dataRef = p.datesRodatge?.[0]?.data || p.datesEntrega?.[0]?.data || p.dataInici || p.dataEntrega;
      if (dataRef) {
        if (filterDesde && dataRef < filterDesde) return false;
        if (filterFins && dataRef > filterFins) return false;
      }
    }

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
    // Ordenar per codi descendent (més recent primer)
    const numA = parseInt(a.codi.split('-')[1] || '0');
    const numB = parseInt(b.codi.split('-')[1] || '0');
    return numB - numA;
  });

// Colores de estado
const estatColors: Record<string, { bg: string; text: string }> = {
  esborrany:        { bg: '#fef3c7', text: '#92400e' },
  planificat:       { bg: '#fed7aa', text: '#9a3412' },
  rodatge:          { bg: '#fee2e2', text: '#991b1b' },
  edicio:           { bg: '#bfdbfe', text: '#1e3a8a' },
  esperant_feedback:{ bg: '#f3f4f6', text: '#374151' },
  revisio:          { bg: '#3b82f6', text: '#ffffff' },
  acabat:           { bg: '#d1fae5', text: '#065f46' },
  facturat:         { bg: '#059669', text: '#ffffff' },
};

const estatLabels: Record<string, string> = {
  esborrany: 'Esborrany',
  planificat: 'Planificat',
  rodatge: 'Rodatge',
  edicio: 'Edició',
  esperant_feedback: 'Esperant Feedback',
  revisio: 'Revisió',
  acabat: 'Acabat',
  facturat: 'Facturat',
};

  return (
<div style={{ marginBottom: '1.5rem' }}>
 
{/* CARDS COMPACTES */}
<div style={{
  display: 'grid',
  gridTemplateColumns: 'repeat(4, 1fr)',
  gap: '1rem',
  marginBottom: '1.5rem'
}}>
  {/* Card 1: Projectes Actius */}
  <div className="placeholder-card" style={{ padding: '1rem' }}>
    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginBottom: '0.5rem', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.5px' }}>
      Projectes Actius
    </div>
    <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-accent-primary)', lineHeight: 1 }}>
      {metriques.projectesActius}
    </div>
  </div>

  {/* Card 2: Endarrerits */}
  <div className="placeholder-card" style={{ padding: '1rem' }}>
    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginBottom: '0.5rem', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.5px' }}>
      Endarrerits
    </div>
    <div style={{ fontSize: '2rem', fontWeight: 700, color: metriques.endarrerits > 0 ? '#ef4444' : '#10b981', lineHeight: 1 }}>
      {metriques.endarrerits}
    </div>
  </div>

  {/* Card 3: Propers Rodatges */}
  <div className="placeholder-card" style={{ padding: '1rem' }}>
    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginBottom: '0.5rem', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.5px' }}>
      Propers Rodatges
    </div>
    {metriques.propersRodatges.length === 0 ? (
      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-tertiary)', fontStyle: 'italic', paddingTop: '0.25rem' }}>Cap rodatge proper</div>
    ) : (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.25rem' }}>
        {metriques.propersRodatges.map((r, i) => {
          const d = new Date(r.data);
          const diesRestants = Math.ceil((d.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
          return (
            <div key={i} style={{ fontSize: '0.8rem', display: 'flex', gap: '0.5rem', alignItems: 'baseline' }}>
              <span style={{ fontWeight: 700, flexShrink: 0, color: diesRestants <= 3 ? '#ef4444' : 'var(--color-text-primary)' }}>
                {d.toLocaleDateString('ca-ES', { day: '2-digit', month: '2-digit' })}
              </span>
              <span style={{ color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {r.titol}
              </span>
            </div>
          );
        })}
      </div>
    )}
  </div>

  {/* Card 4: Properes Entreges */}
  <div className="placeholder-card" style={{ padding: '1rem' }}>
    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginBottom: '0.5rem', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.5px' }}>
      Properes Entreges
    </div>
    {metriques.properes.length === 0 ? (
      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-tertiary)', fontStyle: 'italic', paddingTop: '0.25rem' }}>Cap entrega propera</div>
    ) : (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.25rem' }}>
        {metriques.properes.map((e, i) => {
          const d = new Date(e.data);
          const diesRestants = Math.ceil((d.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
          return (
            <div key={i} style={{ fontSize: '0.8rem', display: 'flex', gap: '0.5rem', alignItems: 'baseline' }}>
              <span style={{ fontWeight: 700, flexShrink: 0, color: diesRestants < 0 ? '#ef4444' : diesRestants <= 3 ? '#f59e0b' : 'var(--color-text-primary)' }}>
                {d.toLocaleDateString('ca-ES', { day: '2-digit', month: '2-digit' })}
              </span>
              <span style={{ color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {e.titol}
              </span>
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

    {/* Exportar Excel */}
    <button
      className="btn-secondary"
      onClick={() => exportarProjectesExcel(projectesFiltrats, clients, parametres)}
      title="Exportar a Excel"
      style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
    >
      <Download size={18} />
      Excel
    </button>

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

  {/* Fila 2: Tots els filtres */}
  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
    <select
      className="form-input"
      value={filterPeriode}
      onChange={(e) => {
        setFilterPeriode(e.target.value);
        if (e.target.value !== 'personalitzat' && e.target.value !== 'tots') {
          aplicarPeriode(e.target.value);
        }
      }}
      style={{ fontSize: '0.82rem', maxWidth: '150px' }}
    >
      <option value="tots">Tots els períodes</option>
      <option value="ultims_3_mesos">Últims 3 mesos</option>
      <option value="ultims_6_mesos">Últims 6 mesos</option>
      <option value="ultims_12_mesos">Últims 12 mesos</option>
      <option value="aquest_any">Aquest any</option>
      <option value="any_anterior">Any anterior</option>
      <option value="personalitzat">Personalitzat</option>
    </select>
    <input
      type="date"
      className="form-input"
      value={filterDesde}
      onChange={(e) => { setFilterDesde(e.target.value); setFilterPeriode('personalitzat'); }}
      style={{ fontSize: '0.82rem', maxWidth: '135px' }}
    />
    <span style={{ color: 'var(--color-text-tertiary)', fontSize: '0.85rem', flexShrink: 0 }}>–</span>
    <input
      type="date"
      className="form-input"
      value={filterFins}
      onChange={(e) => { setFilterFins(e.target.value); setFilterPeriode('personalitzat'); }}
      style={{ fontSize: '0.82rem', maxWidth: '135px' }}
    />

    <div style={{ width: '1px', height: '24px', background: 'var(--color-border)', flexShrink: 0 }} />

    <select
      className="form-input"
      value={filterEstat}
      onChange={(e) => setFilterEstat(e.target.value)}
      style={{ fontSize: '0.82rem', maxWidth: '155px' }}
    >
      <option value="">Tots els estats</option>
      <option value="esborrany">Esborrany</option>
      <option value="planificat">Planificat</option>
      <option value="rodatge">Rodatge</option>
      <option value="edicio">Edició</option>
      <option value="esperant_feedback">Esperant Feedback</option>
      <option value="revisio">Revisió</option>
      <option value="acabat">Acabat</option>
      <option value="facturat">Facturat</option>
    </select>

    <select
      className="form-input"
      value={filterModalitat}
      onChange={(e) => setFilterModalitat(e.target.value)}
      style={{ fontSize: '0.82rem', maxWidth: '150px' }}
    >
      <option value="">Totes les modalitats</option>
      {parametres?.modalitats?.map(m => (
        <option key={m.codi} value={m.codi}>{m.nom}</option>
      ))}
    </select>

    <select
      className="form-input"
      value={filterServei}
      onChange={(e) => setFilterServei(e.target.value)}
      style={{ fontSize: '0.82rem', maxWidth: '150px' }}
    >
      <option value="">Tots els tipus</option>
      {parametres?.tipusProduccio?.map(t => (
        <option key={t.codi} value={t.codi}>{t.nom}</option>
      ))}
    </select>

    <div style={{ width: '1px', height: '24px', background: 'var(--color-border)', flexShrink: 0 }} />

    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
      <input type="checkbox" checked={mostrarActius} onChange={(e) => setMostrarActius(e.target.checked)} />
      <span style={{ fontSize: '0.82rem' }}>Mostrar actius</span>
    </label>

    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
      <input type="checkbox" checked={nomesDirectes} onChange={(e) => setNomesDirectes(e.target.checked)} />
      <span style={{ fontSize: '0.82rem' }}>Només directes</span>
    </label>
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
          {(() => {
            const data = projecte.datesEntrega?.[0]?.data || projecte.dataEntrega;
            return data ? new Date(data).toLocaleDateString('ca-ES') : '-';
          })()}
        </td>
        
        {/* Gastos */}
        <td style={{ padding: '0.75rem', textAlign: 'right', color: 'var(--color-text-secondary)' }}>
          {gastos.toFixed(2)}€
        </td>
        
        {/* Ingressos */}
        <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 500, position: 'relative' }}>
          {(projecte.avisFacturacio?.actiu) && (
            <span
              title={projecte.avisFacturacio.descripcio || 'Avís de facturació actiu'}
              style={{ position: 'absolute', top: '6px', right: '4px', fontSize: '0.85rem', lineHeight: 1, cursor: 'help' }}
            >
              ⚠️
            </span>
          )}
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
        minHeight: '500px',
        alignItems: 'flex-start'
      }}>
        {(['planificat', 'rodatge', 'edicio', 'esperant_feedback', 'revisio', 'acabat', 'facturat'] as const).map(estat => {
          const isCollapsed = collapsedColumns.has(estat);
          const projectesEstat = projectesFiltrats.filter(p => p.estat === estat);

          const estatInfo: Record<string, { label: string; color: string; bg: string; headerBg: string }> = {
            'planificat':        { label: 'Planificat',        color: '#9a3412', bg: '#fed7aa', headerBg: '#ffedd5' },
            'rodatge':           { label: 'Rodatge',           color: '#991b1b', bg: '#fee2e2', headerBg: '#fee2e2' },
            'edicio':            { label: 'Edició',            color: '#1e3a8a', bg: '#bfdbfe', headerBg: '#dbeafe' },
            'esperant_feedback': { label: 'Esperant Feedback', color: '#374151', bg: '#e5e7eb', headerBg: '#f3f4f6' },
            'revisio':           { label: 'Revisió',           color: '#ffffff', bg: '#3b82f6', headerBg: '#3b82f6' },
            'acabat':            { label: 'Acabat',            color: '#065f46', bg: '#d1fae5', headerBg: '#d1fae5' },
            'facturat':          { label: 'Facturat',          color: '#ffffff', bg: '#059669', headerBg: '#059669' },
          };

          const info = estatInfo[estat];

          return (
            <div
              key={estat}
              onDragOver={(e) => {
                if (!isCollapsed) {
                  e.preventDefault();
                  e.currentTarget.style.background = 'var(--color-bg-tertiary)';
                }
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
                  saveProjectes(projectes.map(p => p.codi === projecteCodi ? { ...p, estat } : p));
                }
              }}
              style={{
                minWidth: isCollapsed ? '52px' : '280px',
                maxWidth: isCollapsed ? '52px' : undefined,
                background: 'var(--color-bg-secondary)',
                borderRadius: '8px',
                padding: isCollapsed ? '0.75rem 0.5rem' : '1rem',
                border: '2px solid var(--color-border)',
                transition: 'all 0.2s',
                overflow: 'hidden'
              }}
            >
              {/* Header de la columna */}
              {isCollapsed ? (
                /* Collapsed: vertical label + count + toggle */
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                  <button
                    onClick={() => setCollapsedColumns(prev => { const s = new Set(prev); s.delete(estat); return s; })}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem', color: 'var(--color-text-tertiary)', fontSize: '1rem', lineHeight: 1 }}
                    title="Expandir"
                  >
                    ›
                  </button>
                  <div style={{
                    writingMode: 'vertical-rl',
                    textOrientation: 'mixed',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: 'var(--color-text-secondary)',
                    userSelect: 'none',
                    whiteSpace: 'nowrap',
                    transform: 'rotate(180deg)',
                    cursor: 'pointer'
                  }}
                    onClick={() => setCollapsedColumns(prev => { const s = new Set(prev); s.delete(estat); return s; })}
                  >
                    {info.label}
                  </div>
                  <span style={{
                    padding: '0.2rem 0.35rem',
                    borderRadius: '8px',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    background: info.bg,
                    color: info.color,
                    minWidth: '20px',
                    textAlign: 'center'
                  }}>
                    {projectesEstat.length}
                  </span>
                </div>
              ) : (
                /* Expanded header */
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '1rem',
                  paddingBottom: '0.75rem',
                  borderBottom: '2px solid var(--color-border)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: info.bg === '#f3f4f6' ? '#9ca3af' : info.bg, border: '2px solid ' + info.color, flexShrink: 0 }} />
                    <h3 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-primary)', whiteSpace: 'nowrap' }}>
                      {info.label}
                    </h3>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{
                      padding: '0.2rem 0.45rem',
                      borderRadius: '10px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      background: info.bg,
                      color: info.color
                    }}>
                      {projectesEstat.length}
                    </span>
                    <button
                      onClick={() => setCollapsedColumns(prev => { const s = new Set(prev); s.add(estat); return s; })}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.2rem', color: 'var(--color-text-tertiary)', fontSize: '1rem', lineHeight: 1 }}
                      title="Retreure"
                    >
                      ‹
                    </button>
                  </div>
                </div>
              )}

              {/* Tarjetes de projectes (only when expanded) */}
              {!isCollapsed && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {projectesEstat.length === 0 ? (
                    <p style={{ textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: '0.85rem', padding: '2rem 0' }}>
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
                      const dataEntrega = projecte.datesEntrega?.[0]?.data || projecte.dataEntrega;

                      return (
                        <div
                          key={projecte.codi}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData('projecteCodi', projecte.codi);
                            e.currentTarget.style.opacity = '0.5';
                          }}
                          onDragEnd={(e) => { e.currentTarget.style.opacity = '1'; }}
                          onClick={() => { setEditingProjecte(projecte); setShowModal(true); }}
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
                          {/* Benefici cantonada superior dreta */}
                          <div style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.1rem' }}>
                            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: benefici >= 0 ? '#10b981' : '#ef4444' }}>
                              {benefici.toFixed(0)}€
                            </span>
                            <span style={{ fontSize: '0.65rem', color: 'var(--color-text-tertiary)' }}>
                              {percentBenefici.toFixed(1)}%
                            </span>
                          </div>

                          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-tertiary)', marginBottom: '0.4rem', fontWeight: 500 }}>
                            {projecte.codi}
                          </div>

                          <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '0.6rem', lineHeight: '1.3', paddingRight: '3rem' }}>
                            {projecte.titol}
                          </h4>

                          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <span style={{ opacity: 0.7 }}>👤</span>
                            {client?.nomComercial || client?.nomFiscal || '-'}
                          </div>

                          {dataEntrega && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              <span>📅</span>
                              {new Date(dataEntrega).toLocaleDateString('ca-ES')}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
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
      setProjectes(storage.getProjectes());
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
    proveidors={storage.getProveidors()}
  />
)}
    </div>
  );
}

export default ProjectesSection;
import React, { useState, useEffect, useRef } from 'react';
import { 
  Film, Users, Briefcase, FileText, Receipt, ShoppingCart, TrendingUp, Clock,
  Calendar as CalendarIcon, LayoutDashboard, Settings, X, Upload, Trash2
} from 'lucide-react';
import * as XLSX from 'xlsx';
import Dashboard from './components/dashboard/Dashboard';
import type { Client } from './types/client';
import ProjectesSection from './components/projectes/ProjectesSection';
import ParametresSection from './components/parametres/ParametresPage';
import PartsTreballSection from './components/parts-treball/PartsTreballSection';
import CronometreWidget from './components/parts-treball/CronometreWidget';
import CronometreModal from './components/parts-treball/CronometreModal';
import ClientsSection from './components/clients/ClientsSection';
import ProveidorsSection from './components/proveidors/ProveidorsSection';
import PressupostosSection from './components/pressupostos/PressupostosSection';
import FacturesCompraSection from './components/factures-compra/FacturesCompraSection';
import FacturesVendaSection from './components/factures-venda/FacturesVendaSection';
import CalendarSection from './components/calendar/CalendarSection';
import ResultatsSection from './components/resultats/ResultatsSection';
import {
  importCategories,
  importServeis,
  importUnitats,
  importTarifes,
  importMaterials,
  importClients,
  importProveidors,
  importProjectesReferencia,
  generateTemplates
} from './utils/importExcel';

import './App.css';

type Section = 'dashboard' | 'clients' | 'proveidors' | 'projectes' | 'pressupostos' | 
               'factures-venda' | 'factures-compra' | 'resultats' | 
               'parts-treball' | 'calendari' | 'parametres';

interface NavItem {
  id: Section;
  label: string;
  icon: React.ReactNode;
  description: string;
}

interface CompanySettings {
  nombre: string;
  cif: string;
  direccion: string;
  telefono: string;
  email: string;
  logo: string | null;
}

const DEFAULT_SETTINGS: CompanySettings = {
  nombre: '',
  cif: '',
  direccion: '',
  telefono: '',
  email: '',
  logo: null
};

function App() {
  const [activeSection, setActiveSection] = useState<Section>('dashboard');
  const [showSettings, setShowSettings] = useState(false);
  const [showCronometreModal, setShowCronometreModal] = useState(false);
  const [settings, setSettings] = useState<CompanySettings>(DEFAULT_SETTINGS);
  const [clients, setClients] = useState<Client[]>([]);

  useEffect(() => {
    const savedSettings = localStorage.getItem('plateaErpSettings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
    
    const savedClients = localStorage.getItem('plateaClients');
    if (savedClients) {
      setClients(JSON.parse(savedClients));
    }
  }, []);

  useEffect(() => {
    const handleNavigate = (e: CustomEvent) => {
      const { section, codi } = e.detail;
      setActiveSection(section);
      
      let type = 'factura';
      if (section === 'pressupostos') type = 'pressupost';
      else if (section === 'projectes') type = 'projecte';
      else if (section === 'factures-venda') type = 'factura';
      
      localStorage.setItem('plateaNavigateTo', JSON.stringify({ type, codi }));
    };

    window.addEventListener('navigate-to', handleNavigate as EventListener);
    return () => {
      window.removeEventListener('navigate-to', handleNavigate as EventListener);
    };
  }, []);

  const saveSettings = (newSettings: CompanySettings) => {
    setSettings(newSettings);
    localStorage.setItem('plateaErpSettings', JSON.stringify(newSettings));
  };

  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} />, description: 'Resum general de l\'activitat' },
    { id: 'projectes', label: 'Projectes', icon: <Film size={20} />, description: 'Gestió de produccions audiovisuals' },
    { id: 'clients', label: 'Clients', icon: <Users size={20} />, description: 'Base de dades de clients' },
    { id: 'proveidors', label: 'Proveïdors', icon: <Briefcase size={20} />, description: 'Gestió de col·laboradors i proveïdors' },
    { id: 'pressupostos', label: 'Pressupostos', icon: <FileText size={20} />, description: 'Crear i gestionar pressupostos' },
    { id: 'factures-venda', label: 'Factures Venda', icon: <Receipt size={20} />, description: 'Factures emeses a clients' },
    { id: 'factures-compra', label: 'Factures Compra', icon: <ShoppingCart size={20} />, description: 'Factures rebudes de proveïdors' },
    { id: 'resultats', label: 'Resultats', icon: <TrendingUp size={20} />, description: 'Anàlisi financera i rendibilitat' },
    { id: 'parts-treball', label: 'Parts Treball', icon: <Clock size={20} />, description: 'Registre d\'hores i tasques' },
    { id: 'calendari', label: 'Calendari', icon: <CalendarIcon size={20} />, description: 'Visualitza esdeveniments i dates importants' },
    { id: 'parametres', label: 'Paràmetres', icon: <Settings size={20} />, description: 'Configuració de serveis, unitats i tarifes' }
  ];
  
  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo-container">
            {settings.logo ? (
              <img src={settings.logo} alt={settings.nombre} className="custom-logo" />
            ) : (
              <>
                <Film size={32} className="logo-icon" />
                <div className="logo-text">
                  <h1>{settings.nombre}</h1>
                  <span className="logo-subtitle">Aurora ERP</span>
                </div>
              </>
            )}
          </div>
        </div>

        <nav className="nav-menu">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`nav-item ${activeSection === item.id ? 'active' : ''}`}
              title={item.description}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </button>
          ))}
        </nav>

        <CronometreWidget />

        <div className="sidebar-footer">
          <div style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img 
              src="/build/icon.png" 
              alt="Aurora ERP" 
              style={{ width: '50px', height: '50px', borderRadius: '8px', objectFit: 'cover' }} 
            />
          </div>

          <div className="footer-info" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <p className="footer-text">v1.0.0</p>
            <p className="footer-subtext">Aurora ERP</p>
          </div>
          
          <button className="settings-button" onClick={() => setShowSettings(true)} title="Configuració">
            <Settings size={20} />
          </button>
        </div>
      </aside>

      <main className="main-content">
        {activeSection !== 'dashboard' && (
          <header className="content-header">
            <div className="header-info">
              <h2 className="section-title">{navItems.find(item => item.id === activeSection)?.label}</h2>
              <p className="section-description">{navItems.find(item => item.id === activeSection)?.description}</p>
            </div>
          </header>
        )}

        <div className="content-body">
          {activeSection === 'dashboard' && <Dashboard />}
          {activeSection === 'projectes' && <ProjectesSection />}
          {activeSection === 'clients' && <ClientsSection />}
          {activeSection === 'proveidors' && <ProveidorsSection />}
          {activeSection === 'pressupostos' && <PressupostosSection />}
          {activeSection === 'factures-venda' && <FacturesVendaSection />}
          {activeSection === 'resultats' && <ResultatsSection />}
          {activeSection === 'calendari' && <CalendarSection />}
          {activeSection === 'parametres' && <ParametresSection />}
          {activeSection === 'parts-treball' && <PartsTreballSection clients={clients} />}
          {activeSection === 'factures-compra' && <FacturesCompraSection />}
        </div>
      </main>
 
      {showSettings && (
        <SettingsModal 
          settings={settings}
          onSave={saveSettings}
          onClose={() => setShowSettings(false)}
        />
      )}

      {showCronometreModal && (
        <CronometreModal
          onClose={() => setShowCronometreModal(false)}
          clients={clients}
          projectes={(() => {
            const saved = localStorage.getItem('plateaProjectes');
            return saved ? JSON.parse(saved) : [];
          })()}
          onCrearPart={(part) => {
            const savedParts = localStorage.getItem('plateaPartsTreball');
            const parts = savedParts ? JSON.parse(savedParts) : [];
            const maxNum = parts.length === 0 ? 0 : Math.max(...parts.map((p: any) => parseInt(p.codi.split('-')[1])));
            const nouCodi = `PT-${String(maxNum + 1).padStart(5, '0')}`;
            localStorage.setItem('plateaPartsTreball', JSON.stringify([...parts, { ...part, codi: nouCodi }]));
            setShowCronometreModal(false);
          }}
        />
      )}
    </div>
  );
}

function SettingsModal({ settings, onSave, onClose }: { 
  settings: CompanySettings;
  onSave: (settings: CompanySettings) => void;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState<CompanySettings>(settings);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentImportType, setCurrentImportType] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setFormData({ ...formData, logo: event.target?.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = () => {
    setFormData({ ...formData, logo: null });
  };

  const handleImportExcel = (tipo: string) => {
    setCurrentImportType(tipo);
    fileInputRef.current?.click();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        if (currentImportType === 'all') {
          processAllSheets(workbook);
        } else {
          const sheetNames: { [key: string]: string } = {
            'categories': 'Categories',
            'serveis': 'Serveis',
            'unitats': 'Unitats',
            'tarifes': 'Tarifes',
            'materials': 'Materials',
            'clients': 'Clients',
            'proveidors': 'Proveïdors',
            'projectes-referencia': 'Projectes Referència'
          };
          
          let sheetName = sheetNames[currentImportType];
          if (!workbook.SheetNames.includes(sheetName)) {
            sheetName = workbook.SheetNames[0];
          }
          
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          processImportData(currentImportType, jsonData);
        }
      } catch (error) {
        alert('Error llegint el fitxer Excel. Assegura\'t que el format sigui correcte.');
        console.error(error);
      }
    };
    reader.readAsArrayBuffer(file);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const processImportData = (tipo: string, data: any[]) => {
    if (data.length === 0) {
      alert('El fitxer està buit');
      return;
    }
  
    try {
      let count = 0;
      
      switch (tipo) {
        case 'categories':
          count = importCategories(data);
          alert(`✅ ${count} categories importades correctament`);
          break;
        case 'serveis':
          count = importServeis(data);
          alert(`✅ ${count} serveis importats correctament`);
          break;
        case 'unitats':
          count = importUnitats(data);
          alert(`✅ ${count} unitats importades correctament`);
          break;
        case 'tarifes':
          count = importTarifes(data);
          alert(`✅ ${count} tarifes importades correctament`);
          break;
        case 'materials':
          count = importMaterials(data);
          alert(`✅ ${count} materials importats correctament`);
          break;
        case 'clients':
          count = importClients(data);
          alert(`✅ ${count} clients importats correctament`);
          break;
        case 'proveidors':
          count = importProveidors(data);
          alert(`✅ ${count} proveïdors importats correctament`);
          break;
        case 'projectes-referencia':
          count = importProjectesReferencia(data);
          alert(`✅ ${count} projectes de referència importats correctament`);
          break;
      }
      
      window.location.reload();
      
    } catch (error) {
      alert(`Error processant les dades: ${error}`);
      console.error(error);
    }
  };

  const processAllSheets = (workbook: XLSX.WorkBook) => {
    const sheetMapping: { [key: string]: string } = {
      'Categories': 'categories',
      'Serveis': 'serveis',
      'Unitats': 'unitats',
      'Tarifes': 'tarifes',
      'Materials': 'materials',
      'Clients': 'clients',
      'Proveïdors': 'proveidors',
      'Projectes Referència': 'projectes-referencia'
    };

    let results: string[] = [];
    let errors: string[] = [];
  
    workbook.SheetNames.forEach(sheetName => {
      const tipo = sheetMapping[sheetName];
      
      if (tipo) {
        try {
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          
          if (jsonData.length > 0) {
            let count = 0;
            
            switch (tipo) {
              case 'categories':
                count = importCategories(jsonData);
                results.push(`✅ ${count} categories`);
                break;
              case 'serveis':
                count = importServeis(jsonData);
                results.push(`✅ ${count} serveis`);
                break;
              case 'unitats':
                count = importUnitats(jsonData);
                results.push(`✅ ${count} unitats`);
                break;
              case 'tarifes':
                count = importTarifes(jsonData);
                results.push(`✅ ${count} tarifes`);
                break;
              case 'materials':
                count = importMaterials(jsonData);
                results.push(`✅ ${count} materials`);
                break;
              case 'clients':
                count = importClients(jsonData);
                results.push(`✅ ${count} clients`);
                break;
              case 'proveidors':
                count = importProveidors(jsonData);
                results.push(`✅ ${count} proveïdors`);
                break;
              case 'projectes-referencia':
                count = importProjectesReferencia(jsonData);
                results.push(`✅ ${count} projectes de referència`);
                break;
            }
          }
        } catch (error) {
          errors.push(`❌ Error en ${sheetName}: ${error}`);
        }
      }
    });
  
    // Mostrar resultados
    if (results.length > 0 || errors.length > 0) {
      let message = '📊 Importació completada:\n\n';
      if (results.length > 0) {
        message += results.join('\n') + '\n';
      }
      if (errors.length > 0) {
        message += '\n⚠️ Errors:\n' + errors.join('\n');
      }
      
      alert(message);
      
      // Recargar la página después de importar
      if (results.length > 0) {
        window.location.reload();
      }
    } else {
      alert('⚠️ No s\'han trobat pestanyes vàlides per importar.');
    }
  };

  const handleDownloadTemplates = () => {
    generateTemplates();
    alert('✅ Plantilles descarregades correctament.');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2><Settings size={24} />Configuració de l'Aplicació</h2>
          <button className="modal-close" onClick={onClose}><X size={24} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* Logo */}
            <div className="form-section">
              <h3>🎨 Logotip de l'ERP</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-tertiary)', marginBottom: '1rem' }}>
                Aquest logo apareixerà com a imatge de capçalera de l'ERP a la interfície
              </p>
              <div className="logo-upload">
                <div className="logo-preview">
                  {formData.logo ? (
                    <img src={formData.logo} alt="Logo" />
                  ) : (
                    <div className="logo-preview-placeholder">
                      <Film size={32} style={{ opacity: 0.3 }} />
                      <div>Sense logotip</div>
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <div className="file-input-wrapper">
                    <input type="file" id="logo-upload" className="file-input" accept="image/*" onChange={handleLogoUpload} />
                    <label htmlFor="logo-upload" className="file-input-button">
                      <Upload size={18} />Pujar Logotip
                    </label>
                  </div>
                  {formData.logo && (
                    <button type="button" className="logo-remove" onClick={removeLogo}>
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Nombre del ERP */}
            <div className="form-section">
              <h3>🏢 Nom de l'ERP</h3>
              <div className="form-group">
                <label htmlFor="nombre">Nom que es mostrarà a l'aplicació</label>
                <input
                  type="text"
                  id="nombre"
                  className="form-input"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  placeholder="Aurora ERP"
                />
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-tertiary)', marginTop: '0.5rem' }}>
                Per configurar les dades oficials de l'empresa (NIF, adreça, contacte, etc.), ves a <strong>Paràmetres → Dades Empresa</strong>
              </p>
            </div>

            {/* Importar Dades */}
            <div className="form-section">
              <details style={{ border: '1px solid var(--color-border)', borderRadius: '8px', padding: '1rem', background: 'var(--color-bg-secondary)' }}>
                <summary style={{ cursor: 'pointer', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '0' }}>
                  📥 Importar Dades des d'Excel
                </summary>

                <div style={{ marginTop: '1.5rem' }}>
                  <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>
                    Importa dades des d'un fitxer Excel. El sistema detectarà automàticament les pestanyes disponibles i importarà totes les dades.
                  </p>

                  {/* Orden recomendado */}
                  <div style={{ padding: '1rem', background: 'var(--color-bg-tertiary)', borderRadius: '6px', marginBottom: '1.5rem', border: '1px solid var(--color-border)' }}>
                    <p style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                      📋 Ordre recomanat d'importació:
                    </p>
                    <ol style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginLeft: '1.5rem', lineHeight: '1.6' }}>
                      <li>Crea primer els <strong>Grups de Materials</strong> des de Paràmetres</li>
                      <li>Importa <strong>Categories</strong></li>
                      <li>Importa <strong>Serveis, Unitats</strong></li>
                      <li>Importa <strong>Proveïdors</strong></li>
                      <li>Importa <strong>Materials</strong></li>
                      <li>Importa <strong>Tarifes</strong></li>
                      <li>Importa <strong>Clients</strong></li>
                    </ol>
                  </div>

                  {/* Botones principales */}
<div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
  <button type="button" className="btn-primary" onClick={() => handleImportExcel('all')} style={{ fontSize: '0.9rem', padding: '0.75rem' }}>
    📥 Importar plantilla completa
  </button>

  {/* Importaciones individuales */}
  <details style={{ border: '1px dashed var(--color-border)', borderRadius: '6px', padding: '0.75rem' }}>
    <summary style={{ cursor: 'pointer', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
      📂 Importacions individuals
    </summary>
    
    <div style={{ marginTop: '1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.5rem' }}>
      <button type="button" className="btn-secondary" onClick={() => handleImportExcel('categories')} style={{ fontSize: '0.8rem', padding: '0.5rem' }}>Categories</button>
      <button type="button" className="btn-secondary" onClick={() => handleImportExcel('serveis')} style={{ fontSize: '0.8rem', padding: '0.5rem' }}>Serveis</button>
      <button type="button" className="btn-secondary" onClick={() => handleImportExcel('unitats')} style={{ fontSize: '0.8rem', padding: '0.5rem' }}>Unitats</button>
      <button type="button" className="btn-secondary" onClick={() => handleImportExcel('tarifes')} style={{ fontSize: '0.8rem', padding: '0.5rem' }}>Tarifes</button>
      <button type="button" className="btn-secondary" onClick={() => handleImportExcel('materials')} style={{ fontSize: '0.8rem', padding: '0.5rem' }}>Materials</button>
      <button type="button" className="btn-secondary" onClick={() => handleImportExcel('clients')} style={{ fontSize: '0.8rem', padding: '0.5rem' }}>Clients</button>
      <button type="button" className="btn-secondary" onClick={() => handleImportExcel('proveidors')} style={{ fontSize: '0.8rem', padding: '0.5rem' }}>Proveïdors</button>
      <button type="button" className="btn-secondary" onClick={() => handleImportExcel('projectes-referencia')} style={{ fontSize: '0.8rem', padding: '0.5rem' }}>Projectes Ref.</button>
    </div>
  </details>
</div>

                    <button type="button" className="btn-secondary" onClick={handleDownloadTemplates} style={{ fontSize: '0.85rem', padding: '0.6rem' }}>
                      📥 Descarregar plantilla
                    </button>

                  <input type="file" ref={fileInputRef} accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleFileSelect} />
                </div>
              </details>
            </div>

            {/* Opciones avanzadas */}
            <div className="form-section">
              <details style={{ border: '1px solid var(--color-border)', borderRadius: '8px', padding: '1rem', background: 'var(--color-bg-tertiary)' }}>
                <summary style={{ cursor: 'pointer', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '1rem' }}>
                  ⚙️ Opcions avançades
                </summary>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
                  <button type="button" className="btn-secondary" onClick={() => {
                    const backup: any = { exportDate: new Date().toISOString() };
                    Object.keys(localStorage).forEach(key => {
                      if (key.startsWith('platea')) {
                        backup[key] = localStorage.getItem(key);
                      }
                    });
                    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `platea-backup-${new Date().toISOString().split('T')[0]}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}>
                    📦 Exportar còpia de seguretat
                  </button>

                  <div>
                    <input type="file" id="import-backup" accept=".json" style={{ display: 'none' }} onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          try {
                            const backup = JSON.parse(event.target?.result as string);
                            let importedCount = 0;
                            Object.keys(backup).forEach(key => {
                              if (key.startsWith('platea')) {
                                localStorage.setItem(key, backup[key]);
                                importedCount++;
                              }
                            });
                            alert(`✅ Còpia de seguretat importada correctament.\n\n${importedCount} mòduls restaurats.\n\nLa pàgina es recarregarà ara.`);
                            window.location.reload();
                          } catch (error) {
                            alert('❌ Error al importar la còpia de seguretat.\n\nAssegura\'t que el fitxer és vàlid.');
                          }
                        };
                        reader.readAsText(file);
                      }
                    }} />
                    <label htmlFor="import-backup" className="btn-secondary" style={{ width: '100%', textAlign: 'center', cursor: 'pointer' }}>
                      📥 Importar còpia de seguretat
                    </label>
                  </div>

                  <button type="button" className="btn-secondary" style={{ borderColor: 'var(--color-error)', color: 'var(--color-error)' }} onClick={() => {
                    const confirmFirst = confirm('⚠️ ATENCIÓ: Aquesta acció eliminarà TOTES les dades del programa.\n\nEls clients, projectes, factures, pressupostos i tota la configuració es perdran.\n\nEstàs segur que vols continuar?');
                    if (confirmFirst) {
                      const confirmSecond = confirm('🚨 ÚLTIMA CONFIRMACIÓ: Aquesta acció NO es pot desfer.\n\nTotes les dades del programa s\'eliminaran permanentment.\n\nFes clic a OK per confirmar.');
                      if (confirmSecond) {
                        Object.keys(localStorage).forEach(key => {
                          if (key.startsWith('platea')) {
                            localStorage.removeItem(key);
                          }
                        });
                        alert('✅ Programa restaurat. La pàgina es recarregarà ara.');
                        window.location.reload();
                      }
                    }
                  }}>
                    🗑️ Restaurar programa (eliminar totes les dades)
                  </button>

                  <p style={{ fontSize: '0.8rem', color: 'var(--color-text-tertiary)', fontStyle: 'italic', marginTop: '0.5rem' }}>
                    💡 Consell: Exporta una còpia de seguretat abans de restaurar el programa.
                  </p>
                </div>
              </details>
            </div>       
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel·lar</button>
            <button type="submit" className="btn-primary">Desar Canvis</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default App;
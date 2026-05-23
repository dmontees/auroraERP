import React, { useState, useRef } from 'react';
import { storage } from '../../utils/storageManager';
import { Settings, X, Film, Upload, Trash2 } from 'lucide-react';
import * as XLSX from 'xlsx';
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
} from '../../utils/importExcel';

interface CompanySettings {
  nombre: string;
  cif: string;
  direccion: string;
  telefono: string;
  email: string;
  logo: string | null;
}

interface SettingsModalProps {
  settings: CompanySettings;
  onSave: (settings: CompanySettings) => void;
  onClose: () => void;
}

export default function SettingsModal({ settings, onSave, onClose }: SettingsModalProps) {
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
          break;
        case 'serveis':
          count = importServeis(data);
          break;
        case 'unitats':
          count = importUnitats(data);
          break;
        case 'tarifes':
          count = importTarifes(data);
          break;
        case 'materials':
          count = importMaterials(data);
          break;
        case 'clients':
          count = importClients(data);
          break;
        case 'proveidors':
          count = importProveidors(data);
          break;
        case 'projectes-referencia':
          count = importProjectesReferencia(data);
          break;
      }
      
      alert(`✅ ${count} registres importats correctament`);
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
                results.push(`✅ ${count} projectes`);
                break;
            }
          }
        } catch (error) {
          errors.push(`❌ Error en ${sheetName}: ${error}`);
        }
      }
    });
  
    if (results.length > 0 || errors.length > 0) {
      let message = '📊 Importació completada:\n\n';
      if (results.length > 0) {
        message += results.join('\n') + '\n';
      }
      if (errors.length > 0) {
        message += '\n⚠️ Errors:\n' + errors.join('\n');
      }
      
      alert(message);
      
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

  const handleExportBackup = () => {
    const data = storage.exportAll();
    const backup = { exportDate: new Date().toISOString(), ...data };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aurora-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const backup = JSON.parse(event.target?.result as string);
          let importedCount = 0;

          // Format nou (objectes ja parsejats)
          if (backup.clients !== undefined) { storage.setClients(backup.clients); importedCount++; }
          if (backup.proveidors !== undefined) { storage.setProveidors(backup.proveidors); importedCount++; }
          if (backup.projectes !== undefined) { storage.setProjectes(backup.projectes); importedCount++; }
          if (backup.facturesVenda !== undefined) { storage.setFacturesVenda(backup.facturesVenda); importedCount++; }
          if (backup.facturesCompra !== undefined) { storage.setFacturesCompra(backup.facturesCompra); importedCount++; }
          if (backup.pressupostos !== undefined) { storage.setPressupostos(backup.pressupostos); importedCount++; }
          if (backup.parametres !== undefined) { storage.setParametres(backup.parametres); importedCount++; }
          if (backup.partsTreball !== undefined) { storage.setPartsTreball(backup.partsTreball); importedCount++; }
          if (backup.settings !== undefined) { storage.setSettings(backup.settings); importedCount++; }

          // Format antic (strings JSON amb prefix platea, per compatibilitat)
          if (!importedCount) {
            if (backup.plateaClients) { storage.setClients(JSON.parse(backup.plateaClients)); importedCount++; }
            if (backup.plateaProveidors) { storage.setProveidors(JSON.parse(backup.plateaProveidors)); importedCount++; }
            if (backup.plateaProjectes) { storage.setProjectes(JSON.parse(backup.plateaProjectes)); importedCount++; }
            if (backup.plateaFacturesVenda) { storage.setFacturesVenda(JSON.parse(backup.plateaFacturesVenda)); importedCount++; }
            if (backup.plateaFacturesCompra) { storage.setFacturesCompra(JSON.parse(backup.plateaFacturesCompra)); importedCount++; }
            if (backup.plateaPressupostos) { storage.setPressupostos(JSON.parse(backup.plateaPressupostos)); importedCount++; }
            if (backup.plateaParametres) { storage.setParametres(JSON.parse(backup.plateaParametres)); importedCount++; }
            if (backup.plateaPartsTreball) { storage.setPartsTreball(JSON.parse(backup.plateaPartsTreball)); importedCount++; }
            if (backup.plateaErpSettings) { storage.setSettings(JSON.parse(backup.plateaErpSettings)); importedCount++; }
          }

          alert(`✅ Còpia de seguretat importada correctament.\n\n${importedCount} mòduls restaurats.\n\nLa pàgina es recarregarà ara.`);
          window.location.reload();
        } catch (error) {
          alert('❌ Error al importar la còpia de seguretat.\n\nAssegura\'t que el fitxer és vàlid.');
        }
      };
      reader.readAsText(file);
    }
  };

  const handleResetApp = () => {
    const confirmFirst = confirm('⚠️ ATENCIÓ: Aquesta acció eliminarà TOTES les dades del programa.\n\nEls clients, projectes, factures, pressupostos i tota la configuració es perdran.\n\nEstàs segur que vols continuar?');
    if (confirmFirst) {
      const confirmSecond = confirm('🚨 ÚLTIMA CONFIRMACIÓ: Aquesta acció NO es pot desfer.\n\nTotes les dades del programa s\'eliminaran permanentment.\n\nFes clic a OK per confirmar.');
      if (confirmSecond) {
        storage.resetAll();
        alert('✅ Programa restaurat. La pàgina es recarregarà ara.');
        window.location.reload();
      }
    }
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

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <button type="button" className="btn-primary" onClick={() => handleImportExcel('all')}>
                      📥 Importar plantilla completa
                    </button>

                    <details style={{ border: '1px dashed var(--color-border)', borderRadius: '6px', padding: '0.75rem' }}>
                      <summary style={{ cursor: 'pointer', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                        📂 Importacions individuals
                      </summary>
                      
                      <div style={{ marginTop: '1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.5rem' }}>
                        <button type="button" className="btn-secondary" onClick={() => handleImportExcel('categories')}>Categories</button>
                        <button type="button" className="btn-secondary" onClick={() => handleImportExcel('serveis')}>Serveis</button>
                        <button type="button" className="btn-secondary" onClick={() => handleImportExcel('unitats')}>Unitats</button>
                        <button type="button" className="btn-secondary" onClick={() => handleImportExcel('tarifes')}>Tarifes</button>
                        <button type="button" className="btn-secondary" onClick={() => handleImportExcel('materials')}>Materials</button>
                        <button type="button" className="btn-secondary" onClick={() => handleImportExcel('clients')}>Clients</button>
                        <button type="button" className="btn-secondary" onClick={() => handleImportExcel('proveidors')}>Proveïdors</button>
                        <button type="button" className="btn-secondary" onClick={() => handleImportExcel('projectes-referencia')}>Projectes Ref.</button>
                      </div>
                    </details>

                    <button type="button" className="btn-secondary" onClick={handleDownloadTemplates}>
                      📥 Descarregar plantilla
                    </button>
                  </div>

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
                  <button type="button" className="btn-secondary" onClick={handleExportBackup}>
                    📦 Exportar còpia de seguretat
                  </button>

                  <div>
                    <input type="file" id="import-backup" accept=".json" style={{ display: 'none' }} onChange={handleImportBackup} />
                    <label htmlFor="import-backup" className="btn-secondary" style={{ width: '100%', textAlign: 'center', cursor: 'pointer', display: 'block' }}>
                      📥 Importar còpia de seguretat
                    </label>
                  </div>

                  <button type="button" className="btn-secondary" style={{ borderColor: 'var(--color-error)', color: 'var(--color-error)' }} onClick={handleResetApp}>
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

export { type CompanySettings };
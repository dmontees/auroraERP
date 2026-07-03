import React, { useState, useRef, useEffect, useMemo } from 'react';
import { storage } from '../../utils/storageManager';
import { Settings, X, Film, Upload, Trash2, RefreshCw, CheckCircle, ShieldCheck, ShieldOff, KeyRound } from 'lucide-react';
import { carregarCertificatP12, oblidarCertificat, obtenirInfoCertificat } from '../../utils/verifactuFirma';
import { isQuotaExceededError, normalizeBackupForImport, stripBackupBinariesForBrowserStorage } from '../../utils/backupImport';
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
  opcionsDesenvolupador?: {
    actiu: boolean;
    permetEliminarFacturesEmeses: boolean;
  };
}

interface SettingsModalProps {
  settings: CompanySettings;
  onSave: (settings: CompanySettings) => void;
  onClose: () => void;
}

type UpdateCheckState = 'idle' | 'checking' | 'up-to-date' | 'available' | 'error';

export default function SettingsModal({ settings, onSave, onClose }: SettingsModalProps) {
  const [formData, setFormData] = useState<CompanySettings>({
    ...settings,
    opcionsDesenvolupador: {
      actiu: false,
      permetEliminarFacturesEmeses: false,
      ...settings.opcionsDesenvolupador,
    },
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentImportType, setCurrentImportType] = useState<string>('');
  const [updateCheck, setUpdateCheck] = useState<UpdateCheckState>('idle');
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [storePath, setStorePath] = useState<string | null>(null);
  const [isImportingBackup, setIsImportingBackup] = useState(false);
  const [verifactuEnabled, setVerifactuEnabled] = useState<boolean>(
    () => storage.getVerifactuConfig()?.enabled ?? false
  );
  const [verifactuMode, setVerifactuMode] = useState<'verifactu' | 'no-verifactu'>(
    () => storage.getVerifactuConfig()?.mode ?? 'no-verifactu'
  );
  const [verifactuEntornTest, setVerifactuEntornTest] = useState<boolean>(
    () => storage.getVerifactuConfig()?.entornTest ?? true
  );
  const [verifactuIdSistema, setVerifactuIdSistema] = useState<string>(
    () => storage.getVerifactuConfig()?.idSistema ?? ''
  );
  const [teCertificat, setTeCertificat] = useState<boolean>(
    () => storage.getVerifactuConfig()?.teCertificat ?? false
  );
  const [arxiuP12Pendent, setArxiuP12Pendent] = useState<string | null>(null);
  const [nomFitxerP12, setNomFitxerP12] = useState<string>('');
  const [pinCert, setPinCert] = useState('');
  const [certError, setCertError] = useState<string | null>(null);
  const [certSuccess, setCertSuccess] = useState<string | null>(null);
  const p12InputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onNotAvailable = () => {
      setUpdateCheck('up-to-date');
      setTimeout(() => setUpdateCheck('idle'), 4000);
    };
    const onAvailable = () => setUpdateCheck('available');
    const onError = (event: Event) => {
      const customEvent = event as CustomEvent<string>;
      setUpdateError(customEvent.detail || "No s'ha pogut comprovar actualitzacions.");
      setUpdateCheck('error');
    };

    window.addEventListener('aurora:update-not-available', onNotAvailable);
    window.addEventListener('aurora:update-available', onAvailable);
    window.addEventListener('aurora:update-error', onError);
    return () => {
      window.removeEventListener('aurora:update-not-available', onNotAvailable);
      window.removeEventListener('aurora:update-available', onAvailable);
      window.removeEventListener('aurora:update-error', onError);
    };
  }, []);

  useEffect(() => {
    const api = (window as any).electron;
    if (!api?.getStorePath) return;
    api.getStorePath()
      .then((path: string) => setStorePath(path))
      .catch(() => setStorePath(null));
  }, []);

  const dataHealth = useMemo(() => {
    const lastCloudBackup = storage.getLastCloudBackup();
    const facturesCompra = storage.get('facturesCompra').filter(f => f.tipus !== 'obligacio-fiscal');
    return {
      schemaVersion: storage.get('dataSchemaVersion'),
      lastCloudBackup,
      counts: [
        { label: 'Clients', value: storage.getClients().length },
        { label: 'Proveidors', value: storage.getProveidors().length },
        { label: 'Projectes', value: storage.getProjectes().length },
        { label: 'Factures venda', value: storage.getFacturesVenda().length },
        { label: 'Factures compra', value: facturesCompra.length },
        { label: 'Pressupostos', value: storage.getPressupostos().length },
        { label: 'Obligacions fiscals', value: storage.getObligacionsFiscals().length },
        { label: 'Parts treball', value: storage.getPartsTreball().length },
        { label: 'Albarans compra', value: storage.get('albaransCompra').length },
      ],
    };
  }, []);

  const handleCheckUpdates = () => {
    const api = (window as any).electron;
    if (!api) return;
    setUpdateError(null);
    setUpdateCheck('checking');
    api.checkForUpdates();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  const updateDeveloperOptions = (next: Partial<NonNullable<CompanySettings['opcionsDesenvolupador']>>) => {
    const current = formData.opcionsDesenvolupador ?? {
      actiu: false,
      permetEliminarFacturesEmeses: false,
    };
    const merged = { ...current, ...next };
    setFormData({
      ...formData,
      opcionsDesenvolupador: {
        ...merged,
        permetEliminarFacturesEmeses: merged.actiu ? merged.permetEliminarFacturesEmeses : false,
      },
    });
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
    const input = e.currentTarget;
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          if (!confirm('Aquesta importacio substituirà les dades actuals pels continguts del fitxer. Es creara una copia local abans de restaurar si estas en Electron. Vols continuar?')) {
            return;
          }

          setIsImportingBackup(true);
          const backup = JSON.parse(event.target?.result as string);
          const normalized = normalizeBackupForImport(backup);
          const api = (window as any).electron;
          let preImportBackup: string | null | undefined;
          let ignoredKeys = normalized.ignoredKeys;
          let importedKeys = normalized.importedKeys;
          let strippedBinaryFields = 0;

          if (api?.importData) {
            const result = await api.importData(normalized.data);
            if (!result?.success) {
              throw new Error(result?.error || 'No sha pogut importar la copia de seguretat');
            }
            importedKeys = result.importedKeys ?? importedKeys;
            ignoredKeys = [...ignoredKeys, ...(result.ignoredKeys ?? [])];
            preImportBackup = result.preImportBackup;
          } else {
            const browserImport = stripBackupBinariesForBrowserStorage(normalized.data);
            strippedBinaryFields = browserImport.strippedBinaryFields;
            try {
              Object.entries(browserImport.data).forEach(([key, value]) => {
                storage.set(key as any, value as any);
              });
            } catch (storageError) {
              if (isQuotaExceededError(storageError)) {
                throw new Error(
                  'La copia es massa gran per al localStorage del navegador. ' +
                  'S\'han omes els documents adjunts grans, pero les dades encara no caben. ' +
                  'Importa-la des de l\'app Electron o neteja dades del localhost i torna-ho a provar.'
                );
              }
              throw storageError;
            }
          }

          const ignoredText = ignoredKeys.length ? `\n\nClaus ignorades: ${ignoredKeys.join(', ')}` : '';
          const snapshotText = preImportBackup ? `\n\nSnapshot previ: ${preImportBackup}` : '';
          const strippedText = strippedBinaryFields > 0
            ? `\n\nMode navegador: s'han omes ${strippedBinaryFields} adjunts grans per evitar el limit de localStorage. Les dades de les factures s'han restaurat igualment.`
            : '';
          alert(`Copia de seguretat importada correctament.\n\n${importedKeys.length} moduls restaurats.${snapshotText}${ignoredText}${strippedText}\n\nLa pagina es recarregara ara.`);
          window.location.reload();
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          alert(`Error al importar la copia de seguretat.\n\n${message}`);
        } finally {
          setIsImportingBackup(false);
          input.value = '';
        }
      };
      reader.readAsText(file);
    }
  };

  const handleSeleccionarP12 = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setNomFitxerP12(file.name);
    setCertError(null);
    setCertSuccess(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const buf = ev.target?.result as ArrayBuffer;
      const bytes = new Uint8Array(buf);
      let bin = '';
      bytes.forEach(b => { bin += String.fromCharCode(b); });
      setArxiuP12Pendent(btoa(bin));
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const handleCarregarCertificat = () => {
    if (!arxiuP12Pendent) return;
    setCertError(null);
    setCertSuccess(null);
    try {
      const info = carregarCertificatP12(arxiuP12Pendent, pinCert);
      storage.setVerifactuCertificatP12(arxiuP12Pendent);
      const current = storage.getVerifactuConfig();
      storage.setVerifactuConfig({ ...current, teCertificat: true });
      setTeCertificat(true);
      setArxiuP12Pendent(null);
      setNomFitxerP12('');
      setPinCert('');
      setCertSuccess(`Certificat carregat: ${info.subject} · Vàlid fins: ${info.validTo}`);
    } catch (e) {
      setCertError(e instanceof Error ? e.message : String(e));
    }
  };

  const handleEliminarCertificat = () => {
    if (!confirm('Eliminar el certificat digital? Hauràs de tornar-lo a carregar per emetre factures amb Verifactu.')) return;
    storage.deleteVerifactuCertificatP12();
    const current = storage.getVerifactuConfig();
    storage.setVerifactuConfig({ ...current, teCertificat: false });
    setTeCertificat(false);
    oblidarCertificat();
    setCertSuccess(null);
    setCertError(null);
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

            {/* Actualitzacions */}
            {navigator.userAgent.includes('Electron') && (
              <div className="form-section">
                <h3>🔄 Actualitzacions</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={handleCheckUpdates}
                    disabled={updateCheck === 'checking'}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                  >
                    <RefreshCw size={16} style={updateCheck === 'checking' ? { animation: 'spin 1s linear infinite' } : {}} />
                    Buscar actualitzacions disponibles
                  </button>

                  {updateCheck === 'checking' && (
                    <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                      Comprovant...
                    </span>
                  )}
                  {updateCheck === 'up-to-date' && (
                    <span style={{ fontSize: '0.85rem', color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <CheckCircle size={15} /> Aurora està actualitzat
                    </span>
                  )}
                  {updateCheck === 'available' && (
                    <span style={{ fontSize: '0.85rem', color: 'var(--color-accent-primary)' }}>
                      Nova versió disponible
                    </span>
                  )}
                  {updateCheck === 'error' && (
                    <span style={{ fontSize: '0.85rem', color: 'var(--color-error)' }}>
                      {updateError}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Salut de dades */}
            <div className="form-section">
              <h3>Salut de dades</h3>
              <div style={{
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                padding: '1rem',
                background: 'var(--color-bg-secondary)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.85rem',
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.65rem' }}>
                  {dataHealth.counts.map(item => (
                    <div key={item.label} style={{
                      border: '1px solid var(--color-border)',
                      borderRadius: '6px',
                      padding: '0.65rem 0.75rem',
                      background: 'var(--color-bg-primary)',
                    }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginBottom: '0.2rem' }}>
                        {item.label}
                      </div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                        {item.value}
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.6rem', fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>
                  <div>
                    <strong style={{ color: 'var(--color-text-primary)' }}>Schema dades:</strong> {dataHealth.schemaVersion}
                  </div>
                  <div>
                    <strong style={{ color: 'var(--color-text-primary)' }}>Ultima copia nuvol:</strong> {dataHealth.lastCloudBackup || 'Mai'}
                  </div>
                </div>

                {storePath && (
                  <div style={{ fontSize: '0.78rem', color: 'var(--color-text-tertiary)' }}>
                    <strong style={{ color: 'var(--color-text-secondary)' }}>Fitxer local:</strong>{' '}
                    <code style={{ wordBreak: 'break-all' }}>{storePath}</code>
                  </div>
                )}
              </div>
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
                    <input type="file" id="import-backup" accept=".json" style={{ display: 'none' }} onChange={handleImportBackup} disabled={isImportingBackup} />
                    <label htmlFor="import-backup" className="btn-secondary" style={{ width: '100%', textAlign: 'center', cursor: isImportingBackup ? 'not-allowed' : 'pointer', display: 'block', opacity: isImportingBackup ? 0.65 : 1 }}>
                      {isImportingBackup ? 'Important copia...' : '📥 Importar còpia de seguretat'}
                    </label>
                  </div>

                  <button type="button" className="btn-secondary" style={{ borderColor: 'var(--color-error)', color: 'var(--color-error)' }} onClick={handleResetApp}>
                    🗑️ Restaurar programa (eliminar totes les dades)
                  </button>

                  <p style={{ fontSize: '0.8rem', color: 'var(--color-text-tertiary)', fontStyle: 'italic', marginTop: '0.5rem' }}>
                    💡 Consell: Exporta una còpia de seguretat abans de restaurar el programa.
                  </p>

                  {/* Verifactu — visible en dev o quan ja està activat */}
                  <div style={{
                    marginTop: '0.5rem',
                    padding: '0.75rem 1rem',
                    background: 'var(--color-bg-secondary)',
                    borderRadius: '6px',
                    border: '1px solid var(--color-border)',
                  }}>
                    <div style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      color: 'var(--color-text-tertiary)',
                      marginBottom: '0.6rem'
                    }}>
                      Mode desenvolupador
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', fontSize: '0.88rem' }}>
                      <input
                        type="checkbox"
                        checked={formData.opcionsDesenvolupador?.actiu ?? false}
                        onChange={e => updateDeveloperOptions({ actiu: e.target.checked })}
                      />
                      Activar mode desenvolupador
                    </label>

                    {formData.opcionsDesenvolupador?.actiu && (
                      <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                          <input
                            type="checkbox"
                            checked={formData.opcionsDesenvolupador?.permetEliminarFacturesEmeses ?? false}
                            onChange={e => updateDeveloperOptions({ permetEliminarFacturesEmeses: e.target.checked })}
                            style={{ marginTop: '0.2rem' }}
                          />
                          <span>
                            <strong>Permetre eliminar factures de venda emeses</strong>
                            <span style={{ display: 'block', color: 'var(--color-text-secondary)', fontSize: '0.78rem', marginTop: '0.2rem', lineHeight: 1.45 }}>
                              Nomes s'aplica a factures sense cobraments i amb Verifactu desactivat. Aurora demanara escriure el codi de la factura abans d'eliminar-la.
                            </span>
                          </span>
                        </label>
                      </div>
                    )}
                  </div>

                  {(process.env.NODE_ENV === 'development' || verifactuEnabled) && (
                    <div style={{
                      marginTop: '0.5rem',
                      padding: '0.75rem 1rem',
                      background: 'var(--color-bg-secondary)',
                      borderRadius: '6px',
                      border: '1px solid var(--color-border)',
                    }}>
                      {/* Toggle principal */}
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase',
                        letterSpacing: '0.5px', color: 'var(--color-text-tertiary)', marginBottom: '0.6rem' }}>
                        Facturació Electrònica (Verifactu)
                      </div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', fontSize: '0.88rem' }}>
                        <input
                          type="checkbox"
                          checked={verifactuEnabled}
                          onChange={e => {
                            const newVal = e.target.checked;
                            setVerifactuEnabled(newVal);
                            const current = storage.getVerifactuConfig();
                            storage.setVerifactuConfig({ ...current, enabled: newVal });
                          }}
                        />
                        Activar mòdul Verifactu
                      </label>

                      {verifactuEnabled && (<>
                        {/* Mode d'enviament */}
                        <div style={{ marginTop: '0.9rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                          <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase',
                            letterSpacing: '0.5px', color: 'var(--color-text-tertiary)' }}>Mode d'enviament</div>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                            <input type="radio" name="vf-mode" value="no-verifactu"
                              checked={verifactuMode === 'no-verifactu'}
                              onChange={() => {
                                setVerifactuMode('no-verifactu');
                                const c = storage.getVerifactuConfig();
                                storage.setVerifactuConfig({ ...c, mode: 'no-verifactu' });
                              }}
                            />
                            <span><strong>No-Verifactu</strong> — desa el hash localment, no envia a l'AEAT</span>
                          </label>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                            <input type="radio" name="vf-mode" value="verifactu"
                              checked={verifactuMode === 'verifactu'}
                              onChange={() => {
                                setVerifactuMode('verifactu');
                                const c = storage.getVerifactuConfig();
                                storage.setVerifactuConfig({ ...c, mode: 'verifactu' });
                              }}
                            />
                            <span><strong>Verifactu</strong> — envia a l'AEAT en temps real (requereix certificat)</span>
                          </label>
                        </div>

                        {/* Entorn */}
                        <div style={{ marginTop: '0.75rem' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                            <input
                              type="checkbox"
                              checked={verifactuEntornTest}
                              onChange={e => {
                                const newVal = e.target.checked;
                                setVerifactuEntornTest(newVal);
                                const c = storage.getVerifactuConfig();
                                storage.setVerifactuConfig({ ...c, entornTest: newVal });
                              }}
                            />
                            <span>Entorn de <strong>proves</strong> (prewww1.aeat.es) — sense efecte legal</span>
                          </label>
                          {!verifactuEntornTest && (
                            <p style={{ fontSize: '0.76rem', color: 'var(--color-error)', marginTop: '0.3rem', marginBottom: 0 }}>
                              ⚠️ Desactivat = PRODUCCIÓ REAL. Només quan estàs llest per a l'obligatorietat.
                            </p>
                          )}
                        </div>

                        {/* IDSistema */}
                        <div style={{ marginTop: '0.75rem' }}>
                          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600,
                            color: 'var(--color-text-primary)', marginBottom: '0.3rem' }}>
                            ID Sistema (assignat per l'AEAT en registrar Aurora ERP)
                          </label>
                          <input
                            type="text"
                            className="form-input"
                            placeholder="Deixa buit fins a obtenir-lo de l'AEAT"
                            value={verifactuIdSistema}
                            onChange={e => {
                              const v = e.target.value;
                              setVerifactuIdSistema(v);
                              const c = storage.getVerifactuConfig();
                              storage.setVerifactuConfig({ ...c, idSistema: v });
                            }}
                            style={{ fontSize: '0.85rem', fontFamily: 'monospace' }}
                          />
                          <p style={{ fontSize: '0.74rem', color: 'var(--color-text-tertiary)',
                            marginTop: '0.25rem', marginBottom: 0 }}>
                            Obté'l a: Sede AEAT → Verifactu → Registre de sistemes de facturació
                          </p>
                        </div>
                      </>)}

                      {/* Certificat Digital — visible quan el mòdul és actiu */}
                      {verifactuEnabled && (
                        <div style={{ marginTop: '1rem', borderTop: '1px solid var(--color-border)', paddingTop: '0.85rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem',
                            fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase',
                            letterSpacing: '0.5px', color: 'var(--color-text-tertiary)', marginBottom: '0.65rem' }}>
                            <KeyRound size={12} />
                            Certificat Digital (P12 / PFX)
                          </div>

                          {/* Estat actual */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem',
                            fontSize: '0.85rem', marginBottom: '0.75rem' }}>
                            {teCertificat ? (
                              <>
                                <ShieldCheck size={15} style={{ color: 'var(--color-success, #16a34a)', flexShrink: 0 }} />
                                <span style={{ color: 'var(--color-success, #16a34a)', fontWeight: 500 }}>
                                  Certificat desat
                                  {obtenirInfoCertificat() && ` · ${obtenirInfoCertificat()!.subject}`}
                                </span>
                              </>
                            ) : (
                              <>
                                <ShieldOff size={15} style={{ color: 'var(--color-text-tertiary)', flexShrink: 0 }} />
                                <span style={{ color: 'var(--color-text-tertiary)' }}>Cap certificat carregat</span>
                              </>
                            )}
                          </div>

                          {/* Carregar nou certificat */}
                          <input
                            ref={p12InputRef}
                            type="file"
                            accept=".p12,.pfx"
                            style={{ display: 'none' }}
                            onChange={handleSeleccionarP12}
                          />
                          {!arxiuP12Pendent ? (
                            <button
                              type="button"
                              className="btn-secondary"
                              style={{ fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                              onClick={() => p12InputRef.current?.click()}
                            >
                              <Upload size={13} />
                              {teCertificat ? 'Substituir certificat (.p12 / .pfx)' : 'Carregar certificat (.p12 / .pfx)'}
                            </button>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                              <p style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', margin: 0 }}>
                                📎 {nomFitxerP12} — Introdueix el PIN per verificar-lo:
                              </p>
                              <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <input
                                  type="password"
                                  className="form-input"
                                  placeholder="PIN del certificat"
                                  value={pinCert}
                                  onChange={e => { setPinCert(e.target.value); setCertError(null); }}
                                  onKeyDown={e => { if (e.key === 'Enter') handleCarregarCertificat(); }}
                                  style={{ flex: 1, fontSize: '0.85rem' }}
                                  autoComplete="off"
                                />
                                <button type="button" className="btn-primary"
                                  style={{ fontSize: '0.82rem', whiteSpace: 'nowrap' }}
                                  onClick={handleCarregarCertificat}
                                  disabled={!pinCert}
                                >
                                  Verificar i desar
                                </button>
                                <button type="button" className="btn-secondary"
                                  style={{ fontSize: '0.82rem' }}
                                  onClick={() => { setArxiuP12Pendent(null); setNomFitxerP12(''); setPinCert(''); setCertError(null); }}
                                >
                                  ✕
                                </button>
                              </div>
                            </div>
                          )}

                          {certError && (
                            <p style={{ fontSize: '0.8rem', color: 'var(--color-error)',
                              background: 'var(--color-error-bg, #fef2f2)', padding: '0.35rem 0.55rem',
                              borderRadius: '4px', marginTop: '0.4rem', marginBottom: 0 }}>
                              {certError}
                            </p>
                          )}
                          {certSuccess && (
                            <p style={{ fontSize: '0.8rem', color: 'var(--color-success, #16a34a)',
                              background: 'var(--color-success-bg, #f0fdf4)', padding: '0.35rem 0.55rem',
                              borderRadius: '4px', marginTop: '0.4rem', marginBottom: 0 }}>
                              ✓ {certSuccess}
                            </p>
                          )}

                          {teCertificat && (
                            <button
                              type="button"
                              className="btn-secondary"
                              style={{ marginTop: '0.6rem', fontSize: '0.8rem', color: 'var(--color-error)',
                                borderColor: 'var(--color-error)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                              onClick={handleEliminarCertificat}
                            >
                              <Trash2 size={12} />
                              Eliminar certificat
                            </button>
                          )}

                          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)',
                            fontStyle: 'italic', marginTop: '0.6rem', marginBottom: 0 }}>
                            El PIN no es desa — es sol·licitarà en emetre cada factura si el certificat no és en memòria.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
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

import { useState } from 'react';
import { AlertCircle, CheckCircle, FolderOpen, RefreshCw } from 'lucide-react';
import { DOCUMENT_SCHEMA_VERSION } from '../../../utils/documentManager';
import { checkDocumentHealth, type DocumentHealthResult } from '../../../utils/documentHealth';
import { materializeExistingDocumentFolders, type DocumentStructureMaterializationResult } from '../../../utils/documentStructure';
import { migrateLegacyDocuments, scanLegacyDocuments, type LegacyDocumentMigrationResult, type LegacyDocumentMigrationStats } from '../../../utils/documentMigration';
import { buildDocumentManifest } from '../../../utils/documentManifest';
import { organizeDocumentMirrors, type DocumentMirrorResult } from '../../../utils/documentMirrors';
import { updateStoredDocumentRef } from '../../../utils/documentRegistry';
import { regenerateHistoricalGeneratedDocuments, type DocumentRegenerationResult } from '../../../utils/documentRegeneration';
import type { Parametres } from '../../../types/parametres';

interface GestorDocumentalTabProps {
  hook: {
    parametres: Parametres;
    saveParametres: (parametres: Parametres) => void;
  };
}

export default function GestorDocumentalTab({ hook }: GestorDocumentalTabProps) {
  const { parametres, saveParametres } = hook;
  const config = parametres.gestorDocumental;
  const electronDocuments = typeof window !== 'undefined' ? window.electronDocuments : undefined;
  const isElectronReady = !!electronDocuments;
  const [scanStats, setScanStats] = useState<LegacyDocumentMigrationStats | null>(null);
  const [migrationResult, setMigrationResult] = useState<LegacyDocumentMigrationResult | null>(null);
  const [healthResult, setHealthResult] = useState<DocumentHealthResult | null>(null);
  const [structureResult, setStructureResult] = useState<DocumentStructureMaterializationResult | null>(null);
  const [regenerationResult, setRegenerationResult] = useState<DocumentRegenerationResult | null>(null);
  const [mirrorResult, setMirrorResult] = useState<DocumentMirrorResult | null>(null);
  const [isMigrating, setIsMigrating] = useState(false);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);
  const [isMaterializing, setIsMaterializing] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isExportingBackup, setIsExportingBackup] = useState(false);
  const [isOrganizing, setIsOrganizing] = useState(false);

  const saveRoot = (rootPath: string) => {
    saveParametres({
      ...parametres,
      gestorDocumental: {
        rootPath,
        configuredAt: config?.configuredAt || new Date().toISOString(),
        schemaVersion: DOCUMENT_SCHEMA_VERSION,
        lastHealthCheckAt: new Date().toISOString(),
      },
    });
  };

  const handleSelectRoot = async () => {
    if (!electronDocuments) {
      alert('El gestor documental local nomes esta disponible a Aurora Desktop.');
      return;
    }

    const result = await electronDocuments.selectRoot();
    if (!result.success) {
      alert(result.error || 'No sha pogut seleccionar la carpeta documental.');
      return;
    }
    if (result.cancelled || !result.data?.rootPath) return;

    saveRoot(result.data.rootPath);
    await materializeFolders(result.data.rootPath);
  };

  const materializeFolders = async (rootPath: string) => {
    setIsMaterializing(true);
    setStructureResult(null);
    try {
      const result = await materializeExistingDocumentFolders(rootPath);
      setStructureResult(result);
      return result;
    } catch (error) {
      alert(error instanceof Error ? error.message : 'No sha pogut preparar les carpetes.');
      return null;
    } finally {
      setIsMaterializing(false);
    }
  };

  const handleEnsureStructure = async () => {
    if (!electronDocuments || !config?.rootPath) return;

    const result = await electronDocuments.ensureStructure(config.rootPath);
    if (!result.success) {
      alert(result.error || 'No sha pogut verificar lestructura documental.');
      return;
    }

    const rootPath = result.data?.rootPath || config.rootPath;
    saveRoot(rootPath);
    const materialized = await materializeFolders(rootPath);
    alert(materialized
      ? `Estructura documental verificada. Carpetes revisades: ${materialized.requested}. Creades: ${materialized.created}.`
      : 'Estructura documental base verificada.');
  };

  const handleMaterializeFolders = async () => {
    if (!config?.rootPath) {
      alert('Configura primer la carpeta documental.');
      return;
    }
    const result = await materializeFolders(config.rootPath);
    if (result) {
      saveRoot(config.rootPath);
      alert(`Carpetes preparades. Revisades: ${result.requested}. Creades: ${result.created}. Errors: ${result.errors.length}.`);
    }
  };

  const handleOpenRoot = async () => {
    if (!electronDocuments || !config?.rootPath) return;

    const result = await electronDocuments.openRoot(config.rootPath);
    if (!result.success) {
      alert(result.error || 'No sha pogut obrir la carpeta documental.');
    }
  };

  const handleScanLegacy = () => {
    setMigrationResult(null);
    setScanStats(scanLegacyDocuments());
  };

  const handleMigrateLegacy = async () => {
    if (!config?.rootPath) {
      alert('Configura primer la carpeta documental.');
      return;
    }
    if (!electronDocuments) {
      alert('El gestor documental local nomes esta disponible a Aurora Desktop.');
      return;
    }
    if (!confirm('Aquesta migracio copiara documents antics en base64 a la carpeta documental. No eliminara cap base64. Vols continuar?')) {
      return;
    }

    setIsMigrating(true);
    setMigrationResult(null);
    try {
      const result = await migrateLegacyDocuments(config.rootPath);
      setMigrationResult(result);
      setScanStats(scanLegacyDocuments());
      const mirrors = await organizeDocumentMirrors(config.rootPath);
      setMirrorResult(mirrors);
      alert(`Migracio finalitzada. Documents migrats: ${result.migrated}. Errors: ${result.errors.length}.`);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'No sha pogut executar la migracio.');
    } finally {
      setIsMigrating(false);
    }
  };

  const handleCheckHealth = async () => {
    if (!config?.rootPath) {
      alert('Configura primer la carpeta documental.');
      return;
    }
    setIsCheckingHealth(true);
    setHealthResult(null);
    try {
      const result = await checkDocumentHealth(config.rootPath);
      setHealthResult(result);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'No sha pogut revisar els documents.');
    } finally {
      setIsCheckingHealth(false);
    }
  };

  const handleRepairMissing = async (index: number) => {
    if (!config?.rootPath || !electronDocuments || !healthResult) return;
    const entry = healthResult.missingEntries[index];
    if (!entry) return;

    const result = await electronDocuments.restoreMissingFile({
      rootPath: config.rootPath,
      relativePath: entry.ref.relativePath,
    });
    if (!result.success) {
      alert(result.error || 'No sha pogut reparar el document.');
      return;
    }
    if (result.cancelled || !result.data) return;

    updateStoredDocumentRef(entry.owner, entry.ref.id, {
      ...entry.ref,
      size: result.data.size,
      sha256: result.data.sha256,
    });
    await handleCheckHealth();
  };

  const handleExportCompleteBackup = async () => {
    if (!config?.rootPath || !electronDocuments) {
      alert('Configura primer la carpeta documental.');
      return;
    }
    setIsExportingBackup(true);
    try {
      const result = await electronDocuments.exportCompleteBackup({
        rootPath: config.rootPath,
        manifest: buildDocumentManifest(),
      });
      if (!result.success) {
        alert(result.error || 'No sha pogut exportar la copia completa.');
        return;
      }
      if (!result.cancelled && result.data) {
        alert(`Copia completa exportada: ${result.data.filePath}`);
      }
    } finally {
      setIsExportingBackup(false);
    }
  };

  const handleRegenerateHistorical = async () => {
    if (!config?.rootPath) {
      alert('Configura primer la carpeta documental.');
      return;
    }
    if (!confirm('Aquesta accio generara PDFs historics per pressupostos i factures sense document generat. No elimina ni substitueix documents existents. Vols continuar?')) {
      return;
    }

    setIsRegenerating(true);
    setRegenerationResult(null);
    try {
      const result = await regenerateHistoricalGeneratedDocuments(config.rootPath);
      setRegenerationResult(result);
      const mirrors = await organizeDocumentMirrors(config.rootPath);
      setMirrorResult(mirrors);
      alert(`Regeneracio finalitzada. Pressupostos: ${result.pressupostos}. Factures: ${result.facturesVenda}. Errors: ${result.errors.length}.`);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'No sha pogut regenerar els PDFs historics.');
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleOrganizeMirrors = async () => {
    if (!config?.rootPath) {
      alert('Configura primer la carpeta documental.');
      return;
    }
    setIsOrganizing(true);
    setMirrorResult(null);
    try {
      const result = await organizeDocumentMirrors(config.rootPath);
      setMirrorResult(result);
      alert(`Organitzacio finalitzada. Copies creades: ${result.copied}. Referencies actualitzades: ${result.updatedRefs}. Errors: ${result.errors.length}.`);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'No sha pogut organitzar les copies documentals.');
    } finally {
      setIsOrganizing(false);
    }
  };

  return (
    <div style={{ display: 'grid', gap: '1rem', maxWidth: '860px' }}>
      <div style={{
        border: '1px solid var(--color-border)',
        borderRadius: '8px',
        padding: '1rem',
        background: 'var(--color-surface)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <FolderOpen size={22} color="var(--color-accent-primary)" />
          <div>
            <h3 style={{ margin: 0 }}>Gestor documental local</h3>
            <p style={{ margin: '0.25rem 0 0', color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
              Configura la carpeta Aurora on es guardaran els documents fisics.
            </p>
          </div>
        </div>

        {!isElectronReady && (
          <div style={{
            display: 'flex',
            gap: '0.5rem',
            alignItems: 'center',
            padding: '0.75rem',
            borderRadius: '6px',
            background: 'rgba(245, 158, 11, 0.12)',
            color: 'var(--color-warning)'
          }}>
            <AlertCircle size={18} />
            <span>Disponible nomes a Aurora Desktop. En navegador no es pot escriure al sistema de fitxers local.</span>
          </div>
        )}

        <div style={{ display: 'grid', gap: '0.5rem', marginTop: '1rem' }}>
          <label style={{ fontWeight: 600 }}>Carpeta documental</label>
          <div style={{
            padding: '0.75rem',
            border: '1px solid var(--color-border)',
            borderRadius: '6px',
            background: 'var(--color-background)',
            color: config?.rootPath ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
            wordBreak: 'break-all'
          }}>
            {config?.rootPath || 'Cap carpeta configurada'}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '1rem' }}>
          <button type="button" className="btn btn-primary" onClick={handleSelectRoot} disabled={!isElectronReady}>
            <FolderOpen size={16} />
            Seleccionar carpeta
          </button>
          <button type="button" className="btn btn-secondary" onClick={handleEnsureStructure} disabled={!isElectronReady || !config?.rootPath}>
            <RefreshCw size={16} />
            Verificar estructura
          </button>
          <button type="button" className="btn btn-secondary" onClick={handleMaterializeFolders} disabled={!isElectronReady || !config?.rootPath || isMaterializing}>
            <RefreshCw size={16} />
            {isMaterializing ? 'Preparant...' : 'Crear carpetes existents'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={handleOpenRoot} disabled={!isElectronReady || !config?.rootPath}>
            <FolderOpen size={16} />
            Obrir al Finder
          </button>
        </div>

        {structureResult && (
          <div style={{ marginTop: '1rem', display: 'grid', gap: '0.5rem' }}>
            <StatusRow ok={structureResult.errors.length === 0} label={`Carpetes revisades: ${structureResult.requested}. Creades: ${structureResult.created}.`} />
            {structureResult.errors.length > 0 && (
              <details>
                <summary style={{ cursor: 'pointer', color: 'var(--color-error-dark)', fontWeight: 600 }}>
                  Errors ({structureResult.errors.length})
                </summary>
                <ul style={{ marginTop: '0.5rem', paddingLeft: '1.25rem', color: 'var(--color-text-secondary)' }}>
                  {structureResult.errors.slice(0, 20).map((error, index) => (
                    <li key={`${error}-${index}`}>{error}</li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}
      </div>

      <div style={{
        border: '1px solid var(--color-border)',
        borderRadius: '8px',
        padding: '1rem',
        background: 'var(--color-surface)'
      }}>
        <h4 style={{ marginTop: 0 }}>Estat</h4>
        <div style={{ display: 'grid', gap: '0.65rem' }}>
          <StatusRow ok={!!config?.rootPath} label={config?.rootPath ? 'Arrel documental configurada' : 'Arrel documental pendent'} />
          <StatusRow ok={config?.schemaVersion === DOCUMENT_SCHEMA_VERSION} label={`Esquema documental v${config?.schemaVersion || '-'} / v${DOCUMENT_SCHEMA_VERSION}`} />
          <StatusRow
            ok={!!config?.lastHealthCheckAt}
            label={config?.lastHealthCheckAt ? `Ultima verificacio: ${new Date(config.lastHealthCheckAt).toLocaleString()}` : 'Estructura pendent de verificacio'}
          />
        </div>
      </div>

      <div style={{
        border: '1px solid var(--color-border)',
        borderRadius: '8px',
        padding: '1rem',
        background: 'var(--color-surface)'
      }}>
        <h4 style={{ marginTop: 0 }}>Copia i regeneracio</h4>
        <p style={{ marginTop: 0, color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
          Exporta dades i documents en un ZIP o crea PDFs historics per registres antics sense document generat.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleExportCompleteBackup}
            disabled={!isElectronReady || !config?.rootPath || isExportingBackup}
          >
            <FolderOpen size={16} />
            {isExportingBackup ? 'Exportant...' : 'Exportar copia completa'}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleRegenerateHistorical}
            disabled={!isElectronReady || !config?.rootPath || isRegenerating}
          >
            <RefreshCw size={16} />
            {isRegenerating ? 'Regenerant...' : 'Generar PDFs historics'}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleOrganizeMirrors}
            disabled={!isElectronReady || !config?.rootPath || isOrganizing}
          >
            <RefreshCw size={16} />
            {isOrganizing ? 'Organitzant...' : 'Organitzar copies visibles'}
          </button>
        </div>
        {mirrorResult && (
          <div style={{ marginTop: '1rem', display: 'grid', gap: '0.5rem' }}>
            <StatusRow
              ok={mirrorResult.errors.length === 0}
              label={`Copies creades: ${mirrorResult.copied}. Referencies actualitzades: ${mirrorResult.updatedRefs}. Omesos: ${mirrorResult.skipped}.`}
            />
            {mirrorResult.errors.length > 0 && (
              <details>
                <summary style={{ cursor: 'pointer', color: 'var(--color-error-dark)', fontWeight: 600 }}>
                  Errors organitzant copies ({mirrorResult.errors.length})
                </summary>
                <ul style={{ marginTop: '0.5rem', paddingLeft: '1.25rem', color: 'var(--color-text-secondary)' }}>
                  {mirrorResult.errors.slice(0, 30).map((error, index) => (
                    <li key={`${error}-${index}`}>{error}</li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}
        {regenerationResult && (
          <div style={{ marginTop: '1rem', display: 'grid', gap: '0.5rem' }}>
            <StatusRow
              ok={regenerationResult.errors.length === 0}
              label={`Pressupostos: ${regenerationResult.pressupostos}. Factures venda: ${regenerationResult.facturesVenda}. Omesos: ${regenerationResult.skipped}.`}
            />
            {regenerationResult.errors.length > 0 && (
              <details>
                <summary style={{ cursor: 'pointer', color: 'var(--color-error-dark)', fontWeight: 600 }}>
                  Errors ({regenerationResult.errors.length})
                </summary>
                <ul style={{ marginTop: '0.5rem', paddingLeft: '1.25rem', color: 'var(--color-text-secondary)' }}>
                  {regenerationResult.errors.slice(0, 30).map((error, index) => (
                    <li key={`${error}-${index}`}>{error}</li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}
      </div>

      <div style={{
        border: '1px solid var(--color-border)',
        borderRadius: '8px',
        padding: '1rem',
        background: 'var(--color-surface)'
      }}>
        <h4 style={{ marginTop: 0 }}>Migracio de documents existents</h4>
        <p style={{ marginTop: 0, color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
          Copia documents antics guardats dins dAurora a la carpeta documental. No elimina els documents legacy.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <button type="button" className="btn btn-secondary" onClick={handleScanLegacy}>
            <RefreshCw size={16} />
            Analitzar documents legacy
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleMigrateLegacy}
            disabled={!isElectronReady || !config?.rootPath || isMigrating}
          >
            <FolderOpen size={16} />
            {isMigrating ? 'Migrant...' : 'Migrar a carpeta documental'}
          </button>
        </div>

        {scanStats && (
          <MigrationStats stats={scanStats} />
        )}

        {migrationResult && (
          <div style={{ marginTop: '1rem', display: 'grid', gap: '0.5rem' }}>
            <StatusRow ok={migrationResult.errors.length === 0} label={`Migrats: ${migrationResult.migrated}. Pendents detectats despres: ${scanStats?.total ?? '-'}.`} />
            {migrationResult.errors.length > 0 && (
              <details>
                <summary style={{ cursor: 'pointer', color: 'var(--color-error-dark)', fontWeight: 600 }}>
                  Errors ({migrationResult.errors.length})
                </summary>
                <ul style={{ marginTop: '0.5rem', paddingLeft: '1.25rem', color: 'var(--color-text-secondary)' }}>
                  {migrationResult.errors.slice(0, 20).map((error, index) => (
                    <li key={`${error}-${index}`}>{error}</li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}
      </div>

      <div style={{
        border: '1px solid var(--color-border)',
        borderRadius: '8px',
        padding: '1rem',
        background: 'var(--color-surface)'
      }}>
        <h4 style={{ marginTop: 0 }}>Salut documental</h4>
        <p style={{ marginTop: 0, color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
          Revisa que les referencies guardades a Aurora apuntin a fitxers existents dins la carpeta documental.
        </p>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={handleCheckHealth}
          disabled={!isElectronReady || !config?.rootPath || isCheckingHealth}
        >
          <RefreshCw size={16} />
          {isCheckingHealth ? 'Revisant...' : 'Revisar documents enllaçats'}
        </button>

        {healthResult && (
          <div style={{ marginTop: '1rem', display: 'grid', gap: '0.5rem' }}>
            <StatusRow ok={healthResult.missing === 0} label={`Revisats: ${healthResult.checked}. Correctes: ${healthResult.ok}. Faltants: ${healthResult.missing}.`} />
            {healthResult.errors.length > 0 && (
              <details>
                <summary style={{ cursor: 'pointer', color: 'var(--color-error-dark)', fontWeight: 600 }}>
                  Fitxers faltants o errors ({healthResult.errors.length})
                </summary>
                <ul style={{ marginTop: '0.5rem', paddingLeft: '1.25rem', color: 'var(--color-text-secondary)' }}>
                  {healthResult.missingEntries.slice(0, 30).map((entry, index) => (
                    <li key={`${entry.ref.id}-${index}`} style={{ marginBottom: '0.5rem' }}>
                      <div>{entry.owner.label}: fitxer no trobat ({entry.ref.relativePath})</div>
                      <button type="button" className="btn btn-secondary" onClick={() => handleRepairMissing(index)} style={{ marginTop: '0.25rem' }}>
                        <FolderOpen size={14} />
                        Localitzar i reparar
                      </button>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function MigrationStats({ stats }: { stats: LegacyDocumentMigrationStats }) {
  const rows = [
    ['Documents projecte', stats.projectDocuments],
    ['Documents proveidor', stats.providerDocuments],
    ['Factures venda', stats.salesInvoices],
    ['Compres i despeses', stats.purchaseDocuments],
    ['Obligacions fiscals', stats.fiscalObligations],
  ] as const;

  return (
    <div style={{ display: 'grid', gap: '0.45rem', maxWidth: '520px' }}>
      {rows.map(([label, value]) => (
        <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.35rem' }}>
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
      ))}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', paddingTop: '0.35rem' }}>
        <span>Total pendent</span>
        <strong>{stats.total}</strong>
      </div>
    </div>
  );
}

function StatusRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: ok ? 'var(--color-success)' : 'var(--color-text-secondary)' }}>
      {ok ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
      <span>{label}</span>
    </div>
  );
}

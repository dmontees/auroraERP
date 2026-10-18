import { useState } from 'react';
import { FolderOpen } from 'lucide-react';
import { storage } from '../../utils/storageManager';
import { buildProjectDirectoryPaths } from '../../utils/documentManager';

export default function ProjectFolderButton({ projecteCodi }: { projecteCodi: string }) {
  const [opening, setOpening] = useState(false);
  const rootPath = storage.getParametres().gestorDocumental?.rootPath;
  const documents = typeof window !== 'undefined' ? window.electronDocuments : undefined;
  const projecte = storage.getProjectes().find(p => p.codi === projecteCodi);
  const tooltip = !documents ? 'Obrir carpeta — disponible a Aurora Desktop'
    : !rootPath ? 'Configura la carpeta a Paràmetres → Gestor documental'
      : !projecte ? 'Desa primer el projecte' : 'Obrir la carpeta del projecte';
  const disabled = opening || !documents || !rootPath || !projecte;

  const openFolder = async () => {
    if (disabled || !documents || !rootPath || !projecte) return;
    setOpening(true);
    try {
      const client = storage.getClients().find(c => c.codi === projecte.client);
      const directories = buildProjectDirectoryPaths(
        client?.codi || projecte.client || 'CLIENT-SENSE-FITXA',
        client?.nomComercial || client?.nomFiscal || 'Client sense fitxa',
        projecte.codi, projecte.titol || 'Projecte'
      );
      const ensured = await documents.ensureDirectories({ rootPath, relativePaths: directories });
      if (!ensured.success || ensured.data?.errors.length) {
        throw new Error(ensured.error || ensured.data?.errors.join('\n') || 'No s’ha pogut crear la carpeta.');
      }
      // The last three entries are the project's subfolders; their parent is the project directory.
      const relativePath = directories[directories.length - 4];
      const result = await documents.openFile({ rootPath, relativePath });
      if (!result.success) throw new Error(result.error || 'No s’ha pogut obrir la carpeta.');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'No s’ha pogut obrir la carpeta del projecte.');
    } finally {
      setOpening(false);
    }
  };

  return (
    <span title={tooltip} style={{ display: 'inline-flex' }}>
      <button type="button" onClick={openFolder} disabled={disabled} title={tooltip}
        aria-label="Obrir la carpeta del projecte" aria-busy={opening}
        style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 30, height: 30, padding: 0, background: 'transparent', border: 'none', borderRadius: 6,
          color: 'var(--color-text-secondary)', cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.4 : 1 }}>
        <FolderOpen size={17} />
      </button>
    </span>
  );
}

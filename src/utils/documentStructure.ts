import { storage } from './storageManager';
import { buildClientDirectoryPaths, buildProjectDirectoryPaths } from './documentManager';

export interface DocumentStructureMaterializationResult {
  requested: number;
  created: number;
  errors: string[];
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

export async function materializeExistingDocumentFolders(rootPath: string): Promise<DocumentStructureMaterializationResult> {
  const electronDocuments = typeof window !== 'undefined' ? window.electronDocuments : undefined;
  if (!electronDocuments) {
    throw new Error('El gestor documental local nomes esta disponible a Aurora Desktop.');
  }

  const clients = storage.getClients();
  const projectes = storage.getProjectes();
  const directories: string[] = [];

  for (const client of clients) {
    directories.push(...buildClientDirectoryPaths(
      client.codi,
      client.nomComercial || client.nomFiscal || 'Client'
    ));
  }

  for (const projecte of projectes) {
    const client = clients.find(c => c.codi === projecte.client);
    directories.push(...buildProjectDirectoryPaths(
      client?.codi || projecte.client || 'CLIENT-SENSE-FITXA',
      client?.nomComercial || client?.nomFiscal || 'Client sense fitxa',
      projecte.codi,
      projecte.titol || 'Projecte'
    ));
  }

  const result = await electronDocuments.ensureDirectories({
    rootPath,
    relativePaths: unique(directories),
  });

  if (!result.success || !result.data) {
    throw new Error(result.error || 'No sha pogut crear les carpetes documentals.');
  }

  return {
    requested: result.data.requested,
    created: result.data.created,
    errors: result.data.errors || [],
  };
}

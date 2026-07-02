import type { DocumentFileRef, DocumentKind, DocumentOwnerType } from '../types/documental';

export const DOCUMENT_SCHEMA_VERSION = 1;

export const DOCUMENT_FOLDERS = {
  system: '00_Sistema',
  trash: 'paperera',
  pending: 'pendents-de-revisar',
  clients: 'Clients',
  clientDocuments: 'Documentacio client',
  clientContracts: 'Contractes',
  clientFiscal: 'Fiscal',
  clientOther: 'Altres',
  projects: 'Projectes',
  projectBudgets: '01_Pressupostos',
  projectDocuments: '02_Documents projecte',
  projectFiscalLinks: '03_Enllacos factures i despeses',
  providers: 'Proveidors',
  providerContract: '01_Contracte',
  providerInsurance: '02_Asseguranca',
  providerCertificate: '03_Certificat',
  providerPayroll: '04_Nomines',
  providerOther: '99_Altres',
  fiscal: 'Fiscal',
  fiscalExpenses: 'Despeses i obligacions fiscals',
  fiscalSalesInvoices: 'Factures venda',
} as const;

export type ClientDocumentFolder = 'contractes' | 'fiscal' | 'altres';
export type ProjectDocumentFolder = 'pressupostos' | 'documents' | 'enllacos';
export type ProviderDocumentFolder = 'contracte' | 'asseguranca' | 'certificat' | 'nomines' | 'altres';
export type FiscalDocumentFolder = 'despeses' | 'factures-venda';

const CLIENT_FOLDER_MAP: Record<ClientDocumentFolder, string> = {
  contractes: DOCUMENT_FOLDERS.clientContracts,
  fiscal: DOCUMENT_FOLDERS.clientFiscal,
  altres: DOCUMENT_FOLDERS.clientOther,
};

const PROJECT_FOLDER_MAP: Record<ProjectDocumentFolder, string> = {
  pressupostos: DOCUMENT_FOLDERS.projectBudgets,
  documents: DOCUMENT_FOLDERS.projectDocuments,
  enllacos: DOCUMENT_FOLDERS.projectFiscalLinks,
};

const PROVIDER_FOLDER_MAP: Record<ProviderDocumentFolder, string> = {
  contracte: DOCUMENT_FOLDERS.providerContract,
  asseguranca: DOCUMENT_FOLDERS.providerInsurance,
  certificat: DOCUMENT_FOLDERS.providerCertificate,
  nomines: DOCUMENT_FOLDERS.providerPayroll,
  altres: DOCUMENT_FOLDERS.providerOther,
};

const FISCAL_FOLDER_MAP: Record<FiscalDocumentFolder, string> = {
  despeses: DOCUMENT_FOLDERS.fiscalExpenses,
  'factures-venda': DOCUMENT_FOLDERS.fiscalSalesInvoices,
};

export function safeFileName(value: string, fallback = 'document'): string {
  const normalized = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const withoutTrailingDots = normalized.replace(/[. ]+$/g, '');
  return withoutTrailingDots || fallback;
}

export function entityFolderName(codi: string, name: string): string {
  return safeFileName(`${codi} - ${name}`, codi);
}

export function joinRelativePath(...parts: string[]): string {
  return parts
    .filter(Boolean)
    .map(part => part.replace(/^[/\\]+|[/\\]+$/g, ''))
    .join('/');
}

export function getFiscalQuarter(date: string | Date): 'T1' | 'T2' | 'T3' | 'T4' {
  const parsed = date instanceof Date ? date : new Date(`${date}T00:00:00`);
  const month = parsed.getMonth();
  if (month < 3) return 'T1';
  if (month < 6) return 'T2';
  if (month < 9) return 'T3';
  return 'T4';
}

export function getFiscalYear(date: string | Date): string {
  const parsed = date instanceof Date ? date : new Date(`${date}T00:00:00`);
  return String(parsed.getFullYear());
}

export function buildClientDocumentPath(
  clientCodi: string,
  clientName: string,
  folder: ClientDocumentFolder,
  filename: string
): string {
  return joinRelativePath(
    DOCUMENT_FOLDERS.clients,
    entityFolderName(clientCodi, clientName),
    DOCUMENT_FOLDERS.clientDocuments,
    CLIENT_FOLDER_MAP[folder],
    safeFileName(filename)
  );
}

export function buildProjectDocumentPath(
  clientCodi: string,
  clientName: string,
  projecteCodi: string,
  projecteName: string,
  folder: ProjectDocumentFolder,
  filename: string
): string {
  return joinRelativePath(
    DOCUMENT_FOLDERS.clients,
    entityFolderName(clientCodi, clientName),
    DOCUMENT_FOLDERS.projects,
    entityFolderName(projecteCodi, projecteName),
    PROJECT_FOLDER_MAP[folder],
    safeFileName(filename)
  );
}

export function buildProviderDocumentPath(
  proveidorCodi: string,
  proveidorName: string,
  folder: ProviderDocumentFolder,
  filename: string
): string {
  return joinRelativePath(
    DOCUMENT_FOLDERS.providers,
    entityFolderName(proveidorCodi, proveidorName),
    PROVIDER_FOLDER_MAP[folder],
    safeFileName(filename)
  );
}

export function buildFiscalDocumentPath(
  date: string | Date,
  folder: FiscalDocumentFolder,
  filename: string
): string {
  return joinRelativePath(
    DOCUMENT_FOLDERS.fiscal,
    getFiscalYear(date),
    getFiscalQuarter(date),
    FISCAL_FOLDER_MAP[folder],
    safeFileName(filename)
  );
}

export function formatVersion(version: number): string {
  return `v${String(Math.max(1, version)).padStart(3, '0')}`;
}

export function versionedPdfName(code: string, version: number, suffix?: string): string {
  const safeCode = safeFileName(code, 'DOC');
  const safeSuffix = suffix ? `_${safeFileName(suffix)}` : '';
  return `${safeCode}_${formatVersion(version)}${safeSuffix}.pdf`;
}

export function getNextDocumentVersion(existingRefs: Pick<DocumentFileRef, 'version' | 'displayName'>[], documentCode?: string): number {
  const relevant = documentCode
    ? existingRefs.filter(ref => ref.displayName.startsWith(documentCode))
    : existingRefs;
  const maxVersion = relevant.reduce((max, ref) => Math.max(max, ref.version || 0), 0);
  return maxVersion + 1;
}

export function markCurrentVersion(refs: DocumentFileRef[], newRef: DocumentFileRef): DocumentFileRef[] {
  return [
    ...refs.map(ref => {
      if (ref.kind !== newRef.kind || ref.ownerType !== newRef.ownerType || ref.ownerCodi !== newRef.ownerCodi) {
        return ref;
      }
      return { ...ref, current: false, replacedBy: newRef.id };
    }),
    { ...newRef, current: true },
  ];
}

export function createDocumentRef(input: {
  kind: DocumentKind;
  ownerType: DocumentOwnerType;
  ownerCodi: string;
  displayName: string;
  relativePath: string;
  version: number;
  generated: boolean;
  originalName?: string;
  mimeType?: string;
  size?: number;
  sha256?: string;
  migratedFromBase64?: boolean;
}): DocumentFileRef {
  const now = new Date().toISOString();
  const id = `doc-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return {
    id,
    kind: input.kind,
    ownerType: input.ownerType,
    ownerCodi: input.ownerCodi,
    displayName: input.displayName,
    originalName: input.originalName,
    relativePath: input.relativePath,
    mimeType: input.mimeType,
    size: input.size,
    sha256: input.sha256,
    version: input.version,
    current: true,
    generated: input.generated,
    createdAt: now,
    migratedFromBase64: input.migratedFromBase64,
  };
}


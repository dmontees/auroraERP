import { collectDocumentRefs } from './documentRegistry';

export function buildDocumentManifest() {
  return {
    generatedAt: new Date().toISOString(),
    schemaVersion: 1,
    documents: collectDocumentRefs().map(item => ({
      owner: item.owner,
      ref: item.ref,
    })),
  };
}

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const load = async (file, replacements = []) => {
  let source = readFileSync(new URL(file, import.meta.url), 'utf8');
  for (const [pattern, replacement] of replacements) source = source.replace(pattern, replacement);
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ES2022 } });
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
};
globalThis.budgetPathHelpers = await load('../src/utils/documentManager.ts');
globalThis.budgetTestStorage = {
  getClients: () => [{ codi: 'CLI-001', nomComercial: 'Client' }],
  getProjectes: () => [{ codi: 'PRJ-001', client: 'CLI-001', titol: 'Projecte' }],
};
const files = new Map();
globalThis.window = { electronDocuments: {
  fileInfo: async ({ relativePath }) => ({ success: true, data: { exists: files.has(relativePath) } }),
  readFile: async ({ relativePath }) => files.has(relativePath)
    ? { success: true, data: { dataBase64: files.get(relativePath) } }
    : { success: false, error: 'Missing source' },
  writeFile: async ({ relativePath, dataBase64 }) => {
    files.set(relativePath, dataBase64);
    return { success: true };
  },
} };
const { normalizeBudget } = await load('../src/utils/documentMirrors.ts', [
  [/import \{[\s\S]*?\} from '\.\/documentManager';/, 'const { buildClientDocumentPath, buildProjectDocumentPath, buildProviderDocumentPath, safeFileName } = globalThis.budgetPathHelpers;'],
  [/import \{ storage \} from '\.\/storageManager';/, 'const storage = globalThis.budgetTestStorage;'],
]);
const sourcePath = 'Clients/CLI-001 - Client/Documentacio client/Pressupostos/PRE-001_ca_v001.pdf';
const targetPath = 'Clients/CLI-001 - Client/Projectes/PRJ-001 - Projecte/01_Pressupostos/PRE-001_ca_v001.pdf';
const ref = { id: 'original', relativePath: sourcePath, originalName: 'PRE-001_ca_v001.pdf', version: 1, ownerType: 'client', ownerCodi: 'CLI-001' };
const budget = { codi: 'PRE-001', client: 'CLI-001', documentsGenerats: [ref] };
files.set(sourcePath, 'unchanged-pdf');
assert.equal((await normalizeBudget('Aurora', budget)).copied, 0, 'Unlinked budgets stay with the client');
const linked = { ...budget, projecteCreat: 'PRJ-001' };
const result = await normalizeBudget('Aurora', linked);
assert.equal(result.copied, 1);
assert.equal(files.get(sourcePath), 'unchanged-pdf', 'The client original is preserved');
assert.equal(files.get(targetPath), 'unchanged-pdf', 'Copy the exact existing PDF');
assert.deepEqual(result.pressupost.documentsGenerats[0], { ...ref, relativePath: targetPath, ownerType: 'projecte', ownerCodi: 'PRJ-001' });
assert.equal((await normalizeBudget('Aurora', linked)).copied, 0, 'Retry does not overwrite existing copies');
assert.equal((await normalizeBudget('Aurora', result.pressupost)).updatedRefs, 0, 'Already organized references stay unchanged');
assert.equal(ref.relativePath, sourcePath, 'Do not mutate the input');
const alternatives = await normalizeBudget('Aurora', { ...linked, alternativaId: 'B', alternatives: [
  { ...budget, alternativaId: 'A' }, { ...linked, alternativaId: 'B' },
] });
assert.equal(alternatives.pressupost.alternatives[0].documentsGenerats[0].relativePath, sourcePath);
assert.equal(alternatives.pressupost.documentsGenerats[0].relativePath, targetPath);
files.delete(sourcePath);
files.delete(targetPath);
await assert.rejects(normalizeBudget('Aurora', linked), /Missing source/);
console.log('Budget document copy tests passed');

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';

const source = readFileSync(new URL('../src/utils/pressupostAlternatives.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ES2022 } });
const alternativesModule = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
const { crearAlternativa, eliminarAlternativa, seleccionarAlternativa, pressupostPerGuardar, canviarEstatAlternativa, estatProposta, referenciaAlternativa } = alternativesModule;

const original = {
  codi: 'PRE-00001', client: 'CLI-00001', estat: 'enviat',
  tasques: [{ id: 't1', importe: 1000, quantitat: 2 }],
  materials: [{ id: 'm1', preuProveidor: 100 }], recursosHumans: [],
  documentsGenerats: [{ id: 'pdf-original' }],
};
assert.deepEqual(pressupostPerGuardar(original), original, 'Legacy budgets are unchanged');
let editing = crearAlternativa(original);
assert.equal(editing.alternatives.length, 2);
assert.equal(editing.alternativaId, 'B');
assert.equal(editing.estat, 'esborrany');
assert.deepEqual(editing.documentsGenerats, []);
editing.tasques[0].importe = 1600;
editing.materials[0].preuProveidor = 200;
assert.equal(original.tasques[0].importe, 1000, 'Duplicated lines are independent');
editing.alternativaNom = 'Tres càmeres amb so';
editing = seleccionarAlternativa(editing, 'A');
assert.equal(editing.tasques[0].importe, 1000);
assert.equal(editing.alternatives[1].tasques[0].importe, 1600, 'Switching flushes pending edits');
assert.deepEqual(editing.documentsGenerats, original.documentsGenerats);
editing = seleccionarAlternativa(editing, 'B');
editing = canviarEstatAlternativa(editing, 'enviat');
assert.equal(estatProposta(pressupostPerGuardar(editing)), 'enviat');
editing = canviarEstatAlternativa(editing, 'acceptat');
assert.equal(editing.alternativaAcceptadaId, 'B');
assert.ok(editing.dataAcceptacio);
let saved = pressupostPerGuardar(editing);
assert.equal(saved.tasques[0].importe, 1600, 'Consumers see only the accepted amount');
assert.equal(saved.estat, 'acceptat');
assert.equal(saved.alternatives[0].estat, 'enviat', 'Other options are preserved, not rejected');
editing = seleccionarAlternativa(saved, 'A');
saved = pressupostPerGuardar(editing);
assert.equal(saved.alternativaId, 'B', 'Inspecting another option does not change the accepted choice');
assert.equal(saved.tasques[0].importe, 1600);
assert.equal(canviarEstatAlternativa(editing, 'acceptat').alternativaAcceptadaId, 'B');
assert.deepEqual(crearAlternativa(editing), editing, 'Accepted proposals cannot gain new alternatives');
assert.equal(referenciaAlternativa(saved), 'PRE-00001_B');
saved.projecteCreat = 'PRJ-00001';
saved = pressupostPerGuardar(saved);
assert.equal(saved.alternatives[1].projecteCreat, 'PRJ-00001', 'Project links survive reopening and switching');
assert.equal(pressupostPerGuardar(seleccionarAlternativa(saved, 'A')).projecteCreat, 'PRJ-00001');
assert.equal(JSON.parse(JSON.stringify(saved)).alternatives.length, 2, 'Options round-trip through JSON backups');
let many = crearAlternativa(original);
many = crearAlternativa(many);
assert.equal(many.alternativaId, 'C');
assert.equal(new Set(many.alternatives.map(a => a.alternativaId)).size, 3);
assert.equal(eliminarAlternativa(many).alternatives.length, 2);
assert.deepEqual(eliminarAlternativa(saved), saved, 'An accepted proposal cannot lose options');

// Run the real PDF and project creation code with an isolated storage adapter.
const require = createRequire(import.meta.url);
const compile = (path, mocks) => {
  const source = readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } });
  const module = { exports: {} };
  new Function('require', 'module', 'exports', 'confirm', 'alert', outputText)(name => mocks[name] || require(name), module, module.exports, () => true, () => {});
  return module.exports;
};
const budget = {
  ...original, data: '2026-10-06', dataVenciment: '2026-11-05', dataCreacio: '2026-10-06',
  iva: 21, retencioIRPF: 0, nomProjecte: 'Concert', detallsProjecte: '', notesAPeu: '',
  dataProjecte: '2026-11-01', numJornades: 1, modalitat: '', contacte: '', observacionsClient: '',
  materials: [{ id: 'm1', grup: 'g1', material: 'm1', proveidor: '', preuProveidor: 100, preuPlatea: 200, jornades: 1 }],
  recursosHumans: [], tasques: [{ id: 't1', categoria: '', servei: 's1', descripcio: 'Gravació', quantitat: 2, unitat: 'u1', tarifa: 500, importe: 1000, ordre: 0 }],
};
let chosen = crearAlternativa(budget);
chosen.tasques[0] = { ...chosen.tasques[0], quantitat: 3, importe: 1500 };
chosen = pressupostPerGuardar(canviarEstatAlternativa(chosen, 'acceptat'));
const parametres = { dadesEmpresa: {}, categories: [], unitats: [], serveis: [] };
const clients = [{ codi: budget.client, nomFiscal: 'Client de prova', domicili: '', nif: '', telefon: '', correuElectronic: '' }];
const pdfModule = compile('src/utils/generarPressupostPDF.ts', {
  './storageManager': { storage: { getParametres: () => parametres } },
  './pressupostAlternatives': alternativesModule,
});
const decodePdf = uri => Buffer.from(uri.split(',')[1], 'base64').toString('latin1');
const singlePdf = decodePdf(pdfModule.generarPressupostPDF(chosen, clients, 'ca', { save: false }));
assert.ok(singlePdf.includes('PRE-00001_B'));
assert.ok(singlePdf.includes('1500.00'));
const combinedPdf = decodePdf(pdfModule.generarAlternativesPressupostPDF(chosen, clients, 'ca', { save: false }));
assert.ok(combinedPdf.includes('PRE-00001_A'));
assert.ok(combinedPdf.includes('PRE-00001_B'));
assert.ok(combinedPdf.includes('/Count 2'), 'Combined PDF contains both options without a blank page');
const data = { pressupostos: [chosen], projectes: [] };
const fakeStorage = {
  getPressupostos: () => data.pressupostos, setPressupostos: value => { data.pressupostos = value; },
  getProjectes: () => data.projectes, setProjectes: value => { data.projectes = value; },
};
const hookModule = compile('src/components/pressupostos/hooks/usePressupost.ts', {
  react: { useState: value => [value, () => {}], useEffect: () => {}, useCallback: fn => fn },
  '../../../utils/storageManager': { storage: fakeStorage },
  '../../../utils/pressupostAlternatives': alternativesModule,
  '../../../utils/projecteHistorial': { registrarCreacioProjecte: p => p },
  '../../../utils/albaraSync': { getNextTdCodi: () => 'TD-00001', syncAlbaransForProject: () => {} },
});
hookModule.usePressupost({ initialPressupost: chosen, nextCode: 'PRE-00002' }).crearProjecteDesdePressupost();
assert.equal(data.projectes.length, 1);
assert.equal(data.projectes[0].tasques[0].quantitat, 3);
assert.equal(data.projectes[0].ingresSenseIVA, 1500);
assert.equal(data.projectes[0].ingresAmbIVA, 1815);
assert.equal(data.projectes[0].benefici, 1400);
assert.equal(data.pressupostos[0].projecteCreat, data.projectes[0].codi);
const archivedOption = seleccionarAlternativa(data.pressupostos[0], 'A');
hookModule.usePressupost({ initialPressupost: archivedOption, nextCode: 'PRE-00002' }).crearProjecteDesdePressupost();
assert.equal(data.projectes.length, 1, 'An unchosen option cannot create a second project');
console.log('test-pressupost-alternatives: ok');

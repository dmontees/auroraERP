import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
let slots = [], cursor = 0, effects = [], dirty = false, timers = new Map(), timerId = 0;
const same = (a, b) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
const React = {
  createElement: (type, props, ...children) => ({ type, props: props || {}, children: children.flat() }),
  useState(initial) {
    const i = cursor++;
    if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial;
    return [slots[i], next => { const value = typeof next === 'function' ? next(slots[i]) : next; if (!Object.is(value, slots[i])) { slots[i] = value; dirty = true; } }];
  },
  useRef(initial) { const i = cursor++; return slots[i] ??= { current: initial }; },
  useMemo(fn, deps) { const i = cursor++; if (!same(slots[i]?.deps, deps)) slots[i] = { deps, value: fn() }; return slots[i].value; },
  useCallback(fn, deps) { return React.useMemo(() => fn, deps); },
  useEffect(fn, deps) {
    const i = cursor++;
    if (!same(slots[i]?.deps, deps)) effects.push(() => { slots[i]?.cleanup?.(); slots[i] = { deps, cleanup: fn() }; });
  },
};
const compile = (path, mocks, globals = {}) => {
  const source = readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true } });
  const module = { exports: {} };
  new Function('require', 'module', 'exports', ...Object.keys(globals), outputText)(name => {
    assert.ok(name in mocks, name); return mocks[name];
  }, module, module.exports, ...Object.values(globals));
  return module.exports;
};
const hook = compile('src/hooks/useAutoSave.ts', { react: React }, {
  setTimeout: fn => { timers.set(++timerId, fn); return timerId; },
  clearTimeout: id => timers.delete(id),
});
const payments = compile('src/components/factures-compra/hooks/usePagaments.ts', { react: React });
const calculations = compile('src/components/factures-compra/utils/facturesCalculations.ts', {});
const PDF = () => {}, Payments = () => {};
let reader, archiveResolve, archiveReject, writes = [], closed = false;
const component = compile('src/components/factures-compra/FacturaCompraModal.tsx', {
  '../../utils/storageErrors': { storageErrorMessage: error => error.message },
  react: React, 'lucide-react': {}, jspdf: {},
  '../common/SearchableSelect': {},
  '../../hooks/useAutoSave': hook,
  './shared/PDFUploader': { __esModule: true, default: PDF },
  './shared/PagamentsManager': { __esModule: true, default: Payments },
  './hooks/usePagaments': payments,
  './utils/facturesCalculations': calculations,
  '../../utils/storageManager': { storage: { getAlbaransCompra: () => [], setAlbaransCompra() {}, getParametres: () => ({}) } },
  '../../utils/fiscalDocumentStorage': {
    saveFiscalDocumentVersion: () => new Promise((resolve, reject) => { archiveResolve = resolve; archiveReject = reject; }),
    appendCurrentDocumentRef: (refs, ref) => [...(refs || []), ref],
  },
  '../../utils/documentMirrors': { mirrorPurchaseInvoice() {} },
}, { FileReader: class { constructor() { reader = this; } readAsDataURL() {} }, confirm: () => true, alert: () => { throw new Error('Unexpected native alert'); } }).default;
const invoice = { codi: 'FAC-1', tipus: 'factura-compra', tipusDocument: 'factura', proveidor: 'PRO-1', numFacturaProveidor: 'AGOST', dataGasto: '2026-08-01', dataVenciment: '2026-08-31', projectes: [], esDepesaGeneral: true, concepte: 'Assegurança', baseImposable: 100, ivaPercent: 0, irpfPercent: 0, pagaments: [], notes: '' };
const props = { nextCode: 'FAC-2', editingFactura: invoice, proveidors: [], projectes: [], onClose: () => { closed = true; }, onSave: data => { writes.push(structuredClone(data)); dirty = true; } };
let tree;
const render = () => {
  for (let n = 0; n < 20; n++) {
    cursor = 0; dirty = false; effects = []; tree = component(props); effects.forEach(fn => fn());
    if (!dirty) return;
  }
  throw new Error('Render loop');
};
const find = (node, predicate) => {
  if (!node || typeof node !== 'object') return;
  if (predicate(node)) return node;
  for (const child of node.children || []) { const found = find(child, predicate); if (found) return found; }
};
const tick = () => { const jobs = [...timers.values()]; timers.clear(); jobs.forEach(fn => fn()); if (dirty) render(); };
render();
const upload = find(tree, n => n.type === PDF).props.onUpload({ name: 'agost.pdf', type: 'application/pdf' });
reader.onload({ target: { result: 'data:application/pdf;base64,cGRm' } });
await Promise.resolve(); render(); tick();
assert.equal(writes.length, 1, 'PDF is saved while optional archive is pending');
assert.equal(writes[0].documentPDF, 'data:application/pdf;base64,cGRm');
for (let n = 0; n < 8; n++) tick();
assert.equal(writes.length, 1, 'Parent rerenders must not restart autosave');
const notes = find(tree, n => n.type === 'textarea');
notes.props.onChange({ target: { value: 'Written during archive' } }); render();
archiveResolve({ id: 'pdf-1' }); await upload; render(); tick();
assert.equal(writes.at(-1).notes, 'Written during archive', 'Archive completion preserves edits');
find(tree, n => n.type === Payments).props.onAfegirPagament({ data: '2026-08-01', import: 100, metode: 'domiciliacio' }); render();
find(tree, n => n.type === 'button' && n.children.includes('Acceptar')).props.onClick();
assert.equal(writes.at(-1).totalPagat, 100, 'Accept saves latest payment');
assert.ok(closed);
// An archive rejection must leave the receipt usable without opening a native alert.
closed = false;
const failedUpload = find(tree, n => n.type === PDF).props.onUpload({ name: 'other.pdf', type: 'application/pdf' });
reader.onload({ target: { result: 'data:application/pdf;base64,b3RoZXI=' } });
await Promise.resolve(); render();
archiveReject(new Error('Folder unavailable'));
const originalError = console.error; console.error = () => {};
await failedUpload; console.error = originalError; render();
assert.ok(find(tree, n => n.props.role === 'alert'));
assert.equal(find(tree, n => n.type === PDF).props.documentPDF, 'data:application/pdf;base64,b3RoZXI=');
closed = false;
props.onSave = () => { throw new Error('Disk full'); };
render();
console.error = () => {};
find(tree, n => n.type === 'button' && n.children.includes('Acceptar')).props.onClick();
console.error = originalError;
render();
assert.equal(closed, false, 'Storage failure must keep the invoice open');
assert.ok(find(tree, n => n.props.role === 'alert'));
console.log('Purchase invoice: stable autosave, pending/failed archive, concurrent edits and payment checks passed.');

// Screenshot case: an existing, fully paid invoice can close without another write.
for (const missingInvoiceNumber of [false, true]) {
  slots = []; timers.clear(); closed = false; writes = [];
  props.editingFactura = {
    ...invoice, numFacturaProveidor: missingInvoiceNumber ? '' : 'SLACK-JUL-2026',
    concepte: 'Pro monthly plan start Jul 19–Aug 18, 2026', baseImposable: 8.25,
    ivaPercent: 21, documentPDF: 'data:application/pdf;base64,cGRm',
    documentPDFName: 'APLICACIÓ_SLACK_JULIOL26.pdf',
    pagaments: [{ codi: 'PAG-1', data: '2026-10-18', import: 9.98, metode: 'transferencia' }],
  };
  props.onSave = () => { throw new Error('Unchanged invoice must not write'); };
  render();
  find(tree, n => n.type === 'button' && n.children.includes('Acceptar')).props.onClick();
  assert.ok(closed, 'Accept closes unchanged paid invoice, including legacy incomplete records');
  closed = false;
  find(tree, n => n.props.className === 'modal-close').props.onClick();
  assert.ok(closed, 'X closes unchanged paid invoice');
}
console.log('Screenshot regression: paid 9.98 EUR invoice closes without validation or storage writes.');

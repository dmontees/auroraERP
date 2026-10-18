import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
let states = [], cursor = 0, pendingReader, resolveArchive, saved, closed = false;
const React = {
  createElement: (type, props, ...children) => ({ type, props: props || {}, children: children.flat() }),
  useState(initial) {
    const index = cursor++;
    if (!(index in states)) states[index] = typeof initial === 'function' ? initial() : initial;
    return [states[index], value => { states[index] = typeof value === 'function' ? value(states[index]) : value; }];
  },
  useEffect() {},
  useMemo: fn => fn(),
};
const PDFUploader = () => {}, PagamentsManager = () => {};
const mocks = {
  react: React, 'lucide-react': {},
  '../../types/facturaCompra': { CATEGORIES_GASTO_GENERAL: [] },
  '../../hooks/useAutoSave': { useAutoSave() {} },
  './shared/PDFUploader': { default: PDFUploader, __esModule: true },
  './shared/PagamentsManager': { default: PagamentsManager, __esModule: true },
  './hooks/usePagaments': { usePagaments: () => {
    const [pagaments, setPagaments] = React.useState([]);
    return { pagaments, setPagaments, totalPagat: pagaments.reduce((sum, p) => sum + p.import, 0),
      afegirPagament: p => setPagaments([...pagaments, p]), eliminarPagament() {} };
  } },
  './utils/facturesCalculations': {
    calcularImpostos: (base, iva, irpf) => ({ ivaImport: base * iva / 100, irpfImport: base * irpf / 100, total: base * (1 + (iva-irpf)/100) }),
    determinarEstat: () => 'pagada',
  },
  '../../utils/fiscalDocumentStorage': {
    saveFiscalDocumentVersion: () => new Promise(resolve => { resolveArchive = resolve; }),
    appendCurrentDocumentRef: (refs, ref) => [...(refs || []), ref],
  },
};
const source = readFileSync(new URL('../src/components/factures-compra/GastoGeneralModal.tsx', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true } });
const module = { exports: {} };
new Function('require', 'module', 'exports', 'FileReader', 'confirm', outputText)(name => {
  assert.ok(name in mocks, name); return mocks[name];
}, module, module.exports, class { constructor() { pendingReader = this; } readAsDataURL() {} }, () => true);
const render = () => { cursor = 0; return module.exports.default({ nextCode: 'DGE-00001', onSave: g => { saved = structuredClone(g); }, onClose: () => { closed = true; } }); };
const find = (node, predicate) => {
  if (!node || typeof node !== 'object') return;
  if (predicate(node)) return node;
  for (const child of node.children || []) { const found = find(child, predicate); if (found) return found; }
};
let tree = render();
find(tree, n => n.type === PagamentsManager).props.onAfegirPagament({ import: 100 });
assert.equal(states[2].length, 0, 'Incomplete expense cannot become locked by payment');
find(tree, n => n.type === PDFUploader).props.onUpload({ name: 'asseguranca-agost.pdf' });
const upload = pendingReader.onload({ target: { result: 'data:application/pdf;base64,cGRm' } });
tree = render();
find(tree, n => n.type === 'input' && n.props.placeholder).props.onChange({ target: { value: 'Assegurança agost' } });
// User edits while the archive operation remains pending.
states[1] = { ...states[1], baseImposable: 100, ivaPercent: 0, mesImputacion: '2026-08' };
resolveArchive({ id: 'receipt' });
await upload;
tree = render();
assert.equal(states[1].concepte, 'Assegurança agost', 'Archive completion preserves newer input');
assert.equal(states[1].documentPDFName, 'asseguranca-agost.pdf');
find(tree, n => n.type === PagamentsManager).props.onAfegirPagament({ import: 100 });
states[5] = true;
tree = render();
find(tree, n => n.type === 'button' && n.children.includes('Acceptar')).props.onClick();
assert.equal(saved.totalPagat, 100);
assert.equal(saved.mesImputacion, '2026-08');
assert.ok(saved.documentPDF);
assert.ok(closed, 'Valid paid expense saves and closes');
states = []; closed = false;
tree = render();
states[1] = { ...states[1], concepte: 'Incomplete' };
states[5] = true;
tree = render();
find(tree, n => n.props.className === 'modal-close').props.onClick();
assert.ok(closed, 'Incomplete expense can be discarded using the close button');
console.log('General expense regression checks passed.');


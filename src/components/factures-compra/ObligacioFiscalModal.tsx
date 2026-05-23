import React, { useState, useEffect } from 'react';
import { X, Trash2, Lock } from 'lucide-react';
import type { ObligacioFiscal, SubtipusObligacioFiscal } from '../../types/facturaCompra';
import { SUBTIPUS_OBLIGACIO_FISCAL } from '../../types/facturaCompra';
import type { Proveidor } from '../../types/proveidor';
import PagamentsManager from './shared/PagamentsManager';
import PDFUploader from './shared/PDFUploader';
import { usePagaments } from './hooks/usePagaments';
import { determinarEstat } from './utils/facturesCalculations';
import { useAutoSave } from '../../hooks/useAutoSave';

interface Props {
  onClose: () => void;
  onSave: (gasto: ObligacioFiscal) => void;
  onDelete?: (codi: string) => void;
  editingGasto?: ObligacioFiscal | null;
  nextCode: string;
  treballadors: Proveidor[];
}

function fmt(n: number) {
  return n.toLocaleString('ca-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: currentYear - 2020 + 2 }, (_, i) => String(2020 + i));

function defaultQ(): string {
  const m = new Date().getMonth() + 1;
  if (m <= 3) return 'Q1';
  if (m <= 6) return 'Q2';
  if (m <= 9) return 'Q3';
  return 'Q4';
}

function defaultMes(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function parseExistingPeriode(p: string | undefined, sub: SubtipusObligacioFiscal) {
  if (!p) {
    return {
      periodeAny: String(currentYear),
      periodeQ: defaultQ(),
      periodeMes: defaultMes(),
    };
  }
  if (p.match(/^\d{4}$/)) {
    return { periodeAny: p, periodeQ: defaultQ(), periodeMes: defaultMes() };
  }
  if (p.includes('-Q')) {
    const [any, q] = p.split('-Q');
    return { periodeAny: any, periodeQ: `Q${q}`, periodeMes: defaultMes() };
  }
  if (p.match(/^\d{4}-\d{2}$/)) {
    return { periodeAny: p.substring(0, 4), periodeQ: defaultQ(), periodeMes: p };
  }
  return { periodeAny: String(currentYear), periodeQ: defaultQ(), periodeMes: defaultMes() };
}

export default function ObligacioFiscalModal({
  onClose,
  onSave,
  onDelete,
  editingGasto,
  nextCode,
  treballadors
}: Props) {
  // Freeze the code at open time so re-renders from parent don't change it
  const [codi] = useState(() => editingGasto?.codi || nextCode);

  const [subtipus, setSubtipus] = useState<SubtipusObligacioFiscal>(
    editingGasto?.subtipus || 'cuota-autonomo'
  );

  // Period sub-state — derived into a single `periode` string
  const init = parseExistingPeriode(editingGasto?.periode, editingGasto?.subtipus || 'cuota-autonomo');
  const [periodeAny, setPeriodeAny] = useState(init.periodeAny);
  const [periodeQ, setPeriodeQ] = useState(init.periodeQ);
  const [periodeMes, setPeriodeMes] = useState(init.periodeMes);

  const [data, setData] = useState(
    editingGasto?.dataGasto || new Date().toISOString().split('T')[0]
  );
  const [concepte, setConcepte] = useState(editingGasto?.concepte || '');
  const [notes, setNotes] = useState(editingGasto?.notes || '');
  const [baseImposable, setBaseImposable] = useState(editingGasto?.baseImposable || 0);

  // Nòmina treballador
  const [treballadorCodi, setTreballadorCodi] = useState(editingGasto?.treballadorCodi || '');
  const [diesTreballats, setDiesTreballats] = useState(editingGasto?.diesTreballats || 0);
  const [salariDiariBrut, setSalariDiariBrut] = useState(editingGasto?.salariDiariBrut || 0);

  // IVA trimestral
  const [ivaRegistratGestor, setIvaRegistratGestor] = useState(
    editingGasto?.ivaRegistratGestor || 0
  );

  // PDF (cuota-autonomo obligatori, regularitzacio-ss obligatori, altres opcional)
  const [documentPDF, setDocumentPDF] = useState<string | undefined>(editingGasto?.documentPDF);
  const [documentPDFName, setDocumentPDFName] = useState<string>(
    editingGasto?.documentPDFName || ''
  );

  const { pagaments, afegirPagament, eliminarPagament, totalPagat } = usePagaments(
    editingGasto?.pagaments || []
  );

  // Derived periode string based on subtipus
  const periode = (() => {
    switch (subtipus) {
      case 'cuota-autonomo':
      case 'nomina-treballador':
        return periodeMes;
      case 'irpf-trimestral':
      case 'iva-trimestral':
        return `${periodeAny}-${periodeQ}`;
      default: // irpf-anual, regularitzacio-ss
        return periodeAny;
    }
  })();

  // Change detection
  const esNou = !editingGasto;
  const [initialSnapshot] = useState(() => {
    if (editingGasto) {
      return JSON.stringify({
        subtipus: editingGasto.subtipus,
        periode: editingGasto.periode,
        concepte: editingGasto.concepte || '',
        baseImposable: editingGasto.baseImposable || 0,
      });
    }
    // New record: capture default derived periode so opening+closing without editing = no save
    const defaultSub: SubtipusObligacioFiscal = 'cuota-autonomo';
    return JSON.stringify({ subtipus: defaultSub, periode: defaultMes(), concepte: '', baseImposable: 0 });
  });
  const [haCambiat, setHaCambiat] = useState(false);

  useEffect(() => {
    const current = JSON.stringify({ subtipus, periode, concepte, baseImposable });
    setHaCambiat(current !== initialSnapshot);
  }, [subtipus, periode, concepte, baseImposable, initialSnapshot]);

  const selectedTreballador = treballadors.find(t => t.codi === treballadorCodi);

  useEffect(() => {
    if (selectedTreballador?.salariDiari) {
      setSalariDiariBrut(selectedTreballador.salariDiari);
    }
  }, [treballadorCodi]);

  // Càlculs nòmina
  const pctSSEmpresa = selectedTreballador?.percentatgeSSEmpresa ?? 30.2;
  const pctSSTreballador = selectedTreballador?.percentatgeSSTreballador ?? 6.35;
  const pctIRPF = selectedTreballador?.percentatgeIRPF ?? 15;

  const salariTotalBrut = diesTreballats * salariDiariBrut;
  const ssEmpresa = salariTotalBrut * pctSSEmpresa / 100;
  const ssTreballador = salariTotalBrut * pctSSTreballador / 100;
  const irpfRetingut = salariTotalBrut * pctIRPF / 100;
  const salariNet = salariTotalBrut - ssTreballador - irpfRetingut;
  const costTotalEmpresa = salariTotalBrut + ssEmpresa;

  const effectiveBase = (() => {
    if (subtipus === 'nomina-treballador') return costTotalEmpresa;
    if (subtipus === 'iva-trimestral') return ivaRegistratGestor;
    return baseImposable;
  })();

  const totalGasto = effectiveBase;
  const pendentPagament = totalGasto - totalPagat;
  const completamentPagada = totalGasto > 0.01 && pendentPagament <= 0.01;
  const camposBloquejats = totalPagat > 0;

  const subtipusInfo = SUBTIPUS_OBLIGACIO_FISCAL.find(s => s.codi === subtipus);

  const needsPDF = subtipus === 'cuota-autonomo' || subtipus === 'regularitzacio-ss';

  const prepararGasto = (): ObligacioFiscal | null => {
    if (!data || !periode) return null;
    if (!concepte && subtipus !== 'nomina-treballador') return null;
    if (needsPDF && !documentPDF) return null;

    const estat = determinarEstat(totalGasto, totalPagat);

    return {
      codi,
      tipus: 'obligacio-fiscal',
      subtipus,
      periode,
      dataGasto: data,
      concepte: concepte || (subtipusInfo ? `${subtipusInfo.nom} ${periode}` : ''),
      notes,
      baseImposable: effectiveBase,
      ivaPercent: 0,
      ivaImport: 0,
      irpfPercent: 0,
      irpfImport: 0,
      totalGasto,
      pagaments,
      totalPagat,
      pendentPagament: Math.max(0, pendentPagament),
      estat,
      ...(subtipus === 'nomina-treballador' && {
        treballadorCodi,
        treballadorNom: selectedTreballador
          ? (selectedTreballador.nomComercial || selectedTreballador.nomFiscal)
          : '',
        diesTreballats,
        salariDiariBrut,
        salariTotalBrut,
        ssEmpresa,
        ssTreballador,
        irpfRetingut,
        salariNet,
        costTotalEmpresa,
      }),
      ...(subtipus === 'iva-trimestral' && {
        ivaRegistratGestor,
        ivaRepercutitCalculat: editingGasto?.ivaRepercutitCalculat,
        ivaSuportatCalculat: editingGasto?.ivaSuportatCalculat,
        ivaNetCalculat: editingGasto?.ivaNetCalculat,
      }),
      ...(documentPDF && { documentPDF, documentPDFName }),
    };
  };

  const { saveNow } = useAutoSave(
    {
      subtipus, periode, data, concepte, notes, baseImposable,
      treballadorCodi, diesTreballats, salariDiariBrut,
      ivaRegistratGestor, documentPDF, documentPDFName, pagaments,
    },
    () => {
      const gasto = prepararGasto();
      if (gasto) onSave(gasto);
    }
  );

  const handleClose = () => {
    if (esNou && !haCambiat) {
      onClose();
      return;
    }
    const gasto = prepararGasto();
    if (!gasto) {
      const pdfMsg = needsPDF ? ' i puja el document PDF' : '';
      alert(`Omple tots els camps obligatoris${pdfMsg}`);
      return;
    }
    saveNow();
    onClose();
  };

  const handleDelete = () => {
    if (!editingGasto) return;
    if (totalPagat > 0) {
      alert('No es pot eliminar una obligació amb pagaments registrats.');
      return;
    }
    if (!confirm('Estàs segur que vols eliminar aquesta obligació fiscal?')) return;
    onDelete?.(editingGasto.codi);
    onClose();
  };

  const handlePDFUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setDocumentPDF(e.target?.result as string);
      setDocumentPDFName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const handlePDFDelete = () => {
    if (confirm('Estàs segur que vols eliminar el document PDF?')) {
      setDocumentPDF(undefined);
      setDocumentPDFName('');
    }
  };

  const rowStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.4rem 0',
    borderBottom: '1px solid var(--color-border)',
    fontSize: '0.875rem',
  };

  const isMonthly = subtipus === 'cuota-autonomo' || subtipus === 'nomina-treballador';
  const isQuarterly = subtipus === 'irpf-trimestral' || subtipus === 'iva-trimestral';
  const isAnnual = subtipus === 'irpf-anual' || subtipus === 'regularitzacio-ss';

  return (
    <div className="modal-overlay">
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '700px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div className="modal-header">
          <h2>
            🏛️ {editingGasto ? 'Editar' : 'Nova'} Obligació Fiscal
            {completamentPagada && (
              <span style={{
                marginLeft: '1rem',
                fontSize: '0.9rem',
                background: '#10b981',
                color: 'white',
                padding: '0.25rem 0.75rem',
                borderRadius: '4px',
                fontWeight: 600,
              }}>
                <Lock size={14} style={{ display: 'inline', marginRight: '0.25rem' }} />
                PAGADA
              </span>
            )}
          </h2>
          <button className="modal-close" onClick={handleClose}>
            <X size={24} />
          </button>
        </div>

        <div className="modal-body" style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
          {/* Codi */}
          <div className="form-group">
            <label className="form-label">Codi</label>
            <input
              type="text"
              className="form-input"
              value={codi}
              readOnly
              style={{ background: 'var(--color-bg-tertiary)', cursor: 'not-allowed' }}
            />
          </div>

          {/* Subtipus */}
          <div className="form-group">
            <label className="form-label">Tipus d'obligació *</label>
            <select
              className="form-input"
              value={subtipus}
              onChange={(e) => setSubtipus(e.target.value as SubtipusObligacioFiscal)}
              disabled={camposBloquejats}
            >
              {SUBTIPUS_OBLIGACIO_FISCAL.map(s => (
                <option key={s.codi} value={s.codi}>
                  {s.icon} {s.nom}
                </option>
              ))}
            </select>
          </div>

          {/* Periode — dynamic per subtipus */}
          <div className="form-group">
            <label className="form-label">
              {isMonthly ? 'Mes de referència *' : isQuarterly ? 'Trimestre de referència *' : 'Any de referència *'}
            </label>

            {isMonthly && (
              <input
                type="month"
                className="form-input"
                value={periodeMes}
                onChange={(e) => setPeriodeMes(e.target.value)}
                disabled={camposBloquejats}
              />
            )}

            {isQuarterly && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <select
                  className="form-input"
                  value={periodeAny}
                  onChange={(e) => setPeriodeAny(e.target.value)}
                  disabled={camposBloquejats}
                >
                  {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <select
                  className="form-input"
                  value={periodeQ}
                  onChange={(e) => setPeriodeQ(e.target.value)}
                  disabled={camposBloquejats}
                >
                  <option value="Q1">1r Trimestre (Gen–Mar)</option>
                  <option value="Q2">2n Trimestre (Abr–Jun)</option>
                  <option value="Q3">3r Trimestre (Jul–Set)</option>
                  <option value="Q4">4t Trimestre (Oct–Des)</option>
                </select>
              </div>
            )}

            {isAnnual && (
              <select
                className="form-input"
                value={periodeAny}
                onChange={(e) => setPeriodeAny(e.target.value)}
                disabled={camposBloquejats}
              >
                {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            )}
          </div>

          {/* Data */}
          <div className="form-group">
            <label className="form-label">
              {subtipus === 'regularitzacio-ss'
                ? 'Data recepció document *'
                : subtipus === 'irpf-anual'
                  ? 'Data presentació *'
                  : 'Data *'}
            </label>
            <input
              type="date"
              className="form-input"
              value={data}
              onChange={(e) => setData(e.target.value)}
              disabled={camposBloquejats}
            />
            {subtipus === 'regularitzacio-ss' && (
              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-tertiary)', marginTop: '0.25rem' }}>
                L'any de referència indica quin exercici es regularitza. La data és quan has rebut el document.
              </p>
            )}
          </div>

          {/* Concepte */}
          <div className="form-group">
            <label className="form-label">Concepte</label>
            <input
              type="text"
              className="form-input"
              value={concepte}
              onChange={(e) => setConcepte(e.target.value)}
              placeholder={subtipusInfo ? `Ex: ${subtipusInfo.nom} ${periode}` : ''}
              disabled={camposBloquejats}
            />
          </div>

          {/* FORMULARI NÒMINA TREBALLADOR */}
          {subtipus === 'nomina-treballador' && (
            <div style={{
              background: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border)',
              borderRadius: '10px',
              padding: '1.25rem',
              marginBottom: '1rem',
            }}>
              <h4 style={{ fontWeight: 600, marginBottom: '1rem' }}>👷 Detall Nòmina</h4>

              <div className="form-group">
                <label className="form-label">Treballador *</label>
                <select
                  className="form-input"
                  value={treballadorCodi}
                  onChange={(e) => setTreballadorCodi(e.target.value)}
                  disabled={camposBloquejats}
                >
                  <option value="">— Selecciona treballador —</option>
                  {treballadors.map(t => (
                    <option key={t.codi} value={t.codi}>
                      {t.nomComercial || t.nomFiscal} ({t.codi})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">Dies treballats</label>
                  <input
                    type="number"
                    className="form-input"
                    value={diesTreballats}
                    onChange={(e) => setDiesTreballats(parseFloat(e.target.value) || 0)}
                    min="0"
                    step="0.5"
                    disabled={camposBloquejats}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Salari diari brut (€)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={salariDiariBrut}
                    onChange={(e) => setSalariDiariBrut(parseFloat(e.target.value) || 0)}
                    min="0"
                    step="0.01"
                    disabled={camposBloquejats}
                  />
                </div>
              </div>

              <div style={{ background: 'var(--color-bg-tertiary)', borderRadius: '8px', padding: '1rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                  Càlculs automàtics
                </div>
                <div style={rowStyle}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>Salari total brut</span>
                  <span>{fmt(salariTotalBrut)}</span>
                </div>
                <div style={rowStyle}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>SS empresa ({pctSSEmpresa.toFixed(1)}%)</span>
                  <span style={{ color: '#dc2626' }}>+{fmt(ssEmpresa)}</span>
                </div>
                <div style={{ ...rowStyle, fontWeight: 700, borderBottom: 'none', borderTop: '2px solid var(--color-border)', marginTop: '0.25rem', paddingTop: '0.5rem' }}>
                  <span>Cost total empresa</span>
                  <span style={{ color: '#dc2626' }}>{fmt(costTotalEmpresa)}</span>
                </div>
                <div style={{ borderTop: '1px dashed var(--color-border)', marginTop: '0.5rem', paddingTop: '0.5rem' }}>
                  <div style={rowStyle}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>SS treballador ({pctSSTreballador.toFixed(2)}%)</span>
                    <span style={{ color: '#f59e0b' }}>-{fmt(ssTreballador)}</span>
                  </div>
                  <div style={rowStyle}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>IRPF retingut ({pctIRPF.toFixed(1)}%)</span>
                    <span style={{ color: '#f59e0b' }}>-{fmt(irpfRetingut)}</span>
                  </div>
                  <div style={{ ...rowStyle, borderBottom: 'none', fontWeight: 600 }}>
                    <span>Salari net al treballador</span>
                    <span style={{ color: '#10b981' }}>{fmt(salariNet)}</span>
                  </div>
                </div>
              </div>

              <p style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--color-text-tertiary)', fontStyle: 'italic' }}>
                El cost total empresa ja consta a RRHH del projecte. Aquesta entrada registra els pagaments a efectuar.
              </p>
            </div>
          )}

          {/* FORMULARI IVA TRIMESTRAL */}
          {subtipus === 'iva-trimestral' && (
            <div style={{
              background: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border)',
              borderRadius: '10px',
              padding: '1.25rem',
              marginBottom: '1rem',
            }}>
              <h4 style={{ fontWeight: 600, marginBottom: '1rem' }}>💶 Detall IVA Trimestral (Mod. 303)</h4>
              <div style={rowStyle}>
                <span style={{ color: 'var(--color-text-secondary)' }}>IVA repercutit calculat de factures venda</span>
                <span style={{ color: 'var(--color-text-tertiary)', fontStyle: 'italic' }}>
                  {editingGasto?.ivaRepercutitCalculat != null ? fmt(editingGasto.ivaRepercutitCalculat) : '— consulta Resultats'}
                </span>
              </div>
              <div style={rowStyle}>
                <span style={{ color: 'var(--color-text-secondary)' }}>IVA suportat calculat de factures compra</span>
                <span style={{ color: 'var(--color-text-tertiary)', fontStyle: 'italic' }}>
                  {editingGasto?.ivaSuportatCalculat != null ? fmt(editingGasto.ivaSuportatCalculat) : '— consulta Resultats'}
                </span>
              </div>
              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label className="form-label">Import registrat gestor (€) *</label>
                <input
                  type="number"
                  className="form-input"
                  value={ivaRegistratGestor}
                  onChange={(e) => setIvaRegistratGestor(parseFloat(e.target.value) || 0)}
                  min="0"
                  step="0.01"
                  disabled={camposBloquejats}
                  placeholder="Import que indica el gestor a pagar"
                />
              </div>
              {editingGasto?.ivaNetCalculat != null && (
                <div style={{ ...rowStyle, borderBottom: 'none', fontWeight: 600, marginTop: '0.5rem' }}>
                  <span>Diferència (calculat vs registrat)</span>
                  <span style={{ color: Math.abs(editingGasto.ivaNetCalculat - ivaRegistratGestor) < 0.01 ? '#10b981' : '#f59e0b' }}>
                    {fmt(editingGasto.ivaNetCalculat - ivaRegistratGestor)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* IMPORT per als altres subtipus */}
          {subtipus !== 'nomina-treballador' && subtipus !== 'iva-trimestral' && (
            <div className="form-group">
              <label className="form-label">Import (€) *</label>
              <input
                type="number"
                className="form-input"
                value={baseImposable}
                onChange={(e) => setBaseImposable(parseFloat(e.target.value) || 0)}
                min="0"
                step="0.01"
                disabled={camposBloquejats}
              />
            </div>
          )}

          {/* PDF — obligatori per cuota-autonomo i regularitzacio-ss */}
          {(subtipus === 'cuota-autonomo' || subtipus === 'regularitzacio-ss') && (
            <PDFUploader
              documentPDF={documentPDF}
              fileName={documentPDFName}
              onUpload={handlePDFUpload}
              onDelete={handlePDFDelete}
              disabled={camposBloquejats}
              required
            />
          )}

          {/* Resum total */}
          <div style={{
            background: 'var(--color-accent-primary)',
            color: 'white',
            borderRadius: '8px',
            padding: '1rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            margin: '1rem 0',
          }}>
            <span style={{ fontWeight: 600 }}>TOTAL A PAGAR</span>
            <span style={{ fontWeight: 700, fontSize: '1.4rem' }}>{fmt(totalGasto)}</span>
          </div>

          {/* Gestió de pagaments */}
          <PagamentsManager
            pagaments={pagaments}
            pendentPagament={pendentPagament}
            onAfegirPagament={afegirPagament}
            onEliminarPagament={eliminarPagament}
            disabled={completamentPagada}
          />

          {/* Notes */}
          <div className="form-group" style={{ marginTop: '1rem' }}>
            <label className="form-label">Notes</label>
            <textarea
              className="form-input"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Notes addicionals..."
              disabled={camposBloquejats}
            />
          </div>
        </div>

        <div className="modal-footer" style={{ flexShrink: 0 }}>
          {editingGasto && onDelete && !camposBloquejats && (
            <button
              type="button"
              className="btn-secondary"
              onClick={handleDelete}
              style={{ marginRight: 'auto', borderColor: '#dc2626', color: '#dc2626' }}
            >
              <Trash2 size={18} />
              Eliminar
            </button>
          )}
          <button type="button" className="btn-primary" onClick={handleClose}>
            Acceptar
          </button>
        </div>
      </div>
    </div>
  );
}

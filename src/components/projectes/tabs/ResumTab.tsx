import { useState, useEffect, useRef } from 'react';
import { Upload, X, ExternalLink, CheckCircle, AlertCircle, Clock, Download, FileText, File, Timer } from 'lucide-react';
import type { Projecte, DocumentProjecte } from '../../../types/projecte';
import type { Client } from '../../../types/client';
import type { Parametres } from '../../../types/parametres';
import type { Proveidor } from '../../../types/proveidor';
import type { Pressupost } from '../../../types/pressupost';
import type { AlbaraCompra } from '../../../types/albara';
import type { FacturaVenta, EstatFacturaVenta } from '../../../types/facturaVenta';
import { ESTAT_FACTURA_COLORS } from '../../../types/facturaVenta';
import { storage } from '../../../utils/storageManager';

interface ResumTabProps {
  formData: Projecte;
  setFormData: (data: Projecte) => void;
  clients: Client[];
  parametres: Parametres | null;
  proveidors: Proveidor[];
  pressupostos: Pressupost[];
  esBloquejat: boolean;
  onNavigateToPressupost: (codi: string) => void;
  onNavigateToFactura: (codi: string) => void;
}

const ESTAT_COLORS: Record<string, { bg: string; text: string }> = {
  esborrany:         { bg: 'var(--color-warning-bg)', text: 'var(--color-warning-dark)' },
  planificat:        { bg: '#fed7aa', text: '#9a3412' },
  rodatge:           { bg: 'var(--color-error-bg)', text: 'var(--color-error-darker)' },
  edicio:            { bg: 'var(--color-info-border)', text: 'var(--color-info-darker)' },
  esperant_feedback: { bg: '#f3f4f6', text: '#374151' },
  revisio:           { bg: 'var(--color-info)', text: '#ffffff' },
  acabat:            { bg: 'var(--color-success-bg)', text: 'var(--color-success-dark)' },
  facturat:          { bg: 'var(--color-success-medium)', text: '#ffffff' },
};

const ESTAT_LABELS: Record<string, string> = {
  esborrany: 'Esborrany', planificat: 'Planificat', rodatge: 'Rodatge',
  edicio: 'Edició', esperant_feedback: 'Esperant Feedback', revisio: 'Revisió',
  acabat: 'Acabat', facturat: 'Facturat',
};

const AVATAR_COLORS = ['var(--color-info)', 'var(--color-purple)', 'var(--color-pink)', 'var(--color-warning)', 'var(--color-success)', '#0891b2', 'var(--color-error-dark)', '#65a30d'];

function getInitials(nom: string): string {
  return nom.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('');
}

function getAvatarColor(seed: string): string {
  const hash = seed.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function getFacturaEstatIcon(estat: EstatFacturaVenta) {
  const color =
    estat === 'pagada'         ? 'var(--color-success)' :
    estat === 'vencuda'        ? 'var(--color-error)' :
    estat === 'pagada-parcial' ? 'var(--color-warning)' :
    estat === 'enviada'        ? 'var(--color-info)' :
    'var(--color-text-tertiary)';
  const Icon =
    estat === 'pagada'   ? CheckCircle :
    estat === 'vencuda'  ? AlertCircle :
    Clock;
  return { Icon, color, label: ESTAT_FACTURA_COLORS[estat]?.label || estat };
}

async function descarregarDocument(doc: DocumentProjecte) {
  if (doc.fileRef) {
    const rootPath = storage.getParametres().gestorDocumental?.rootPath;
    const electronDocuments = typeof window !== 'undefined' ? window.electronDocuments : undefined;
    if (!rootPath || !electronDocuments) {
      alert('No sha trobat la configuracio del gestor documental.');
      return;
    }
    const result = await electronDocuments.openFile({ rootPath, relativePath: doc.fileRef.relativePath });
    if (!result.success) alert(result.error || 'No sha pogut obrir el document.');
    return;
  }

  if (!doc.fitxer) {
    alert('No sha trobat el fitxer del document.');
    return;
  }
  const link = window.document.createElement('a');
  link.href = doc.fitxer;
  link.download = doc.nomFitxer;
  link.click();
}

function getDocIcon(nomFitxer: string) {
  const ext = nomFitxer.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return <FileText size={16} color="var(--color-error)" />;
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) return <File size={16} color="var(--color-info)" />;
  return <File size={16} color="var(--color-text-secondary)" />;
}

function formatHores(minuts: number): string {
  const h = Math.floor(minuts / 60);
  const m = minuts % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

function gradientTextChars(text: string, colors: string[]) {
  let visibleIndex = 0;

  return [...text].map((char, index) => {
    if (char === ' ') return <span key={index}> </span>;

    const colorIndex = Math.min(visibleIndex, colors.length - 1);
    visibleIndex += 1;

    return (
      <span key={index} style={{ color: colors[colorIndex], WebkitTextFillColor: colors[colorIndex] }}>
        {char}
      </span>
    );
  });
}

// Card height (avatar fills this via alignSelf stretch)
const CARD_HEIGHT = '96px';
// Avatar square width = card height minus 2× border = visual full-height square
const AVATAR_SIZE = '94px';
// Grid min column width for provider/material cards
const CARD_MIN_WIDTH = '260px';

const sectionLabel: React.CSSProperties = {
  fontSize: '0.73rem',
  color: 'var(--color-text-tertiary)',
  textTransform: 'uppercase',
  fontWeight: 600,
  letterSpacing: '0.5px',
};

function ResumTab({
  formData, setFormData, clients, parametres, proveidors, pressupostos,
  esBloquejat, onNavigateToPressupost, onNavigateToFactura
}: ResumTabProps) {
  const [albarans, setAlbarans] = useState<AlbaraCompra[]>([]);
  const [facturaVinculada, setFacturaVinculada] = useState<FacturaVenta | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const all = storage.getAlbaransCompra() as AlbaraCompra[];
    setAlbarans(all.filter(a => a.projecteCodi === formData.codi));
  }, [formData.codi]);

  useEffect(() => {
    if (formData.facturaAssociada) {
      const fav = (storage.getFacturesVenda() as FacturaVenta[]).find(f => f.codi === formData.facturaAssociada);
      setFacturaVinculada(fav || null);
    } else {
      setFacturaVinculada(null);
    }
  }, [formData.facturaAssociada]);

  const [totalMinutsRegistrats, setTotalMinutsRegistrats] = useState(0);
  useEffect(() => {
    const parts = storage.getPartsTreball();
    const total = parts
      .filter(p => p.projecte === formData.codi)
      .reduce((s, p) => s + (p.temps || 0), 0);
    setTotalMinutsRegistrats(total);
  }, [formData.codi]);

  const client = clients.find(c => c.codi === formData.client);
  const modalitat = parametres?.modalitats?.find(m => m.codi === formData.modalitat);
  const tipusProducció = parametres?.tipusProduccio?.find(t => t.codi === formData.servei);
  const pressupostVinculat = pressupostos.find(p => p.codi === formData.pressupost);
  const estatInfo = ESTAT_COLORS[formData.estat] || { bg: '#f3f4f6', text: '#374151' };

  // KPIs
  const ingressos = formData.tasques.reduce((s, t) => s + t.importe, 0);
  const costHumans = formData.recursosHumans.reduce((s, r) => s + r.cost, 0);
  const costMaterials = formData.materials.reduce((s, m) => s + m.preuProveidor * (m.jornades ?? 1), 0);
  const costTotal = costHumans + costMaterials;
  const benefici = ingressos - costTotal;
  const marge = ingressos > 0 ? (benefici / ingressos) * 100 : 0;

  const pressupostTotal = pressupostVinculat
    ? pressupostVinculat.tasques.reduce((s, t) => s + t.importe, 0)
      * (1 + pressupostVinculat.iva / 100)
      * (1 - (pressupostVinculat.retencioIRPF || 0) / 100)
    : 0;

  // Providers — only from recursosHumans (Equip Humà section)
  const proveidorIds = new Set<string>();
  formData.recursosHumans.forEach(r => { if (r.proveidor) proveidorIds.add(r.proveidor); });

  const proveidorCards = Array.from(proveidorIds).map(provCodi => {
    const prov = proveidors.find(p => p.codi === provCodi);
    const nom = prov?.nomComercial || prov?.nomFiscal || provCodi;
    const costRH = formData.recursosHumans.filter(r => r.proveidor === provCodi).reduce((s, r) => s + r.cost, 0);
    const costMat = formData.materials.filter(m => m.proveidor === provCodi).reduce((s, m) => s + m.preuProveidor, 0);
    const total = costRH + costMat;
    const rhCodis = formData.recursosHumans.filter(r => r.proveidor === provCodi && r.tdCodi).map(r => r.tdCodi!);
    const matCodis = formData.materials.filter(m => m.proveidor === provCodi && m.tdCodi).map(m => m.tdCodi!);
    const provAlbarans = albarans.filter(a => rhCodis.includes(a.tdCodi) || matCodis.includes(a.tdCodi));
    const hasPendent = provAlbarans.some(a => a.estat === 'pendent-factura' || a.estat === 'factura-vinculada');
    const allPagat = provAlbarans.length > 0 && provAlbarans.every(a => a.estat === 'pagat');
    const paymentStatus: 'pagat' | 'pendent' | 'sense-albara' = allPagat ? 'pagat' : hasPendent ? 'pendent' : 'sense-albara';
    const avatarColor = getAvatarColor(provCodi);
    const initials = getInitials(nom);
    const imatgePerfil = prov?.imatgePerfil;
    return { provCodi, nom, total, paymentStatus, avatarColor, initials, imatgePerfil };
  });

  // Materials grouped by group
  const materialsByGroup: Record<string, typeof formData.materials> = {};
  formData.materials.forEach(mat => {
    const grupData = (parametres as any)?.grupsMaterials?.find((g: any) => g.codi === mat.grup);
    const nomGrup = grupData?.nom || mat.grup || 'Altres';
    if (!materialsByGroup[nomGrup]) materialsByGroup[nomGrup] = [];
    materialsByGroup[nomGrup].push(mat);
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setFormData({ ...formData, imatgeReferencia: ev.target?.result as string });
    reader.readAsDataURL(file);
  };

  const hasRodatge = !!(formData.datesRodatge && formData.datesRodatge.length > 0);
  const hasEntrega = !!(formData.datesEntrega && formData.datesEntrega.length > 0);
  const hasPressupost = !!pressupostVinculat;
  const hasFactura = !!(formData.facturaAssociada || formData.facturaHistorica);
  const hasProveidors = proveidorIds.size > 0;
  const hasMaterials = formData.materials.length > 0;
  const documents = formData.documents || [];

  const teamCols = [
    hasProveidors ? '1fr' : null,
    hasMaterials ? '1fr' : null,
  ].filter(Boolean).join(' ');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* ── HERO ── */}
      <div style={{
        position: 'relative', borderRadius: '12px', overflow: 'hidden',
        background: 'linear-gradient(135deg, var(--color-bg-secondary) 0%, var(--color-bg-tertiary) 100%)',
        border: '1px solid var(--color-border)', padding: '1.5rem',
      }}>
        {formData.imatgeReferencia && (
          <img src={formData.imatgeReferencia} alt=""
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.18, pointerEvents: 'none' }}
          />
        )}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.6rem' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.84rem', color: 'var(--color-text-tertiary)', fontWeight: 500, marginBottom: '0.3rem', letterSpacing: '0.5px' }}>
                {formData.codi}
                {formData.esImportat && (
                  <span style={{ marginLeft: '0.5rem', padding: '0.1rem 0.4rem', background: '#e0e7ff', color: '#4338ca', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>Importat</span>
                )}
              </div>

              {/* Title + Directe badge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.55rem' }}>
                <h2 style={{ fontSize: '1.65rem', fontWeight: 700, color: 'var(--color-text-primary)', lineHeight: 1.2, margin: 0 }}>
                  {formData.titol || <span style={{ opacity: 0.35, fontStyle: 'italic', fontWeight: 400 }}>Sense títol</span>}
                </h2>
                {formData.esDirect && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', flexShrink: 0 }}>
                    <span className="direct-dot" />
                    <span className="direct-label">Directe</span>
                  </span>
                )}
              </div>

              {/* Client + modality row (no directe badge here anymore) */}
              <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', alignItems: 'center' }}>
                {client && <span style={{ fontSize: '0.95rem', color: 'var(--color-text-secondary)', fontWeight: 500 }}>👤 {client.nomComercial || client.nomFiscal}</span>}
                {modalitat && <span style={{ padding: '0.23rem 0.72rem', borderRadius: '20px', fontSize: '0.83rem', fontWeight: 600, background: modalitat.color, color: 'white' }}>{modalitat.nom}</span>}
                {tipusProducció && <span style={{ fontSize: '0.87rem', color: 'var(--color-text-tertiary)' }}>{tipusProducció.nom}</span>}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem', flexShrink: 0 }}>
              <span style={{ padding: '0.42rem 1.15rem', borderRadius: '20px', fontSize: '0.9rem', fontWeight: 700, background: estatInfo.bg, color: estatInfo.text }}>
                {ESTAT_LABELS[formData.estat] || formData.estat}
              </span>
              {!esBloquejat && (
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
                  <button type="button" onClick={() => fileInputRef.current?.click()}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.32rem 0.78rem', background: 'rgba(255,255,255,0.85)', border: '1px solid var(--color-border)', borderRadius: '6px', cursor: 'pointer', fontSize: '0.83rem', color: 'var(--color-text-secondary)' }}
                  >
                    <Upload size={13} />
                    {formData.imatgeReferencia ? 'Canviar' : 'Afegir imatge'}
                  </button>
                  {formData.imatgeReferencia && (
                    <button type="button" onClick={() => setFormData({ ...formData, imatgeReferencia: undefined })}
                      style={{ display: 'flex', alignItems: 'center', padding: '0.32rem 0.52rem', background: 'rgba(255,255,255,0.85)', border: '1px solid var(--color-border)', borderRadius: '6px', cursor: 'pointer', color: 'var(--color-error-dark)' }}
                      title="Eliminar imatge"
                    ><X size={13} /></button>
                  )}
                </div>
              )}
            </div>
          </div>

          {(hasRodatge || hasEntrega) && (
            <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', marginTop: '0.85rem', paddingTop: '0.85rem', borderTop: '1px solid rgba(0,0,0,0.08)' }}>
              {hasRodatge && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.83rem', fontWeight: 600, color: 'var(--color-text-tertiary)', flexShrink: 0 }}>🎬 Rodatge</span>
                  {formData.datesRodatge!.map(d => (
                    <span key={d.id} style={{ padding: '0.25rem 0.78rem', background: 'var(--color-error-bg)', color: 'var(--color-error-darker)', borderRadius: '20px', fontSize: '0.84rem', fontWeight: 600 }}>
                      {new Date(d.data).toLocaleDateString('ca-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                      {d.hora && ` · ${d.hora}`}
                      {d.nota && <span style={{ fontWeight: 400, opacity: 0.75 }}> — {d.nota}</span>}
                    </span>
                  ))}
                </div>
              )}
              {hasEntrega && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.83rem', fontWeight: 600, color: 'var(--color-text-tertiary)', flexShrink: 0 }}>📦 Entrega</span>
                  {formData.datesEntrega!.map(d => (
                    <span key={d.id} style={{ padding: '0.25rem 0.78rem', background: d.entregada ? 'var(--color-success-bg)' : 'var(--color-warning-bg)', color: d.entregada ? 'var(--color-success-dark)' : 'var(--color-warning-dark)', borderRadius: '20px', fontSize: '0.84rem', fontWeight: 600 }}>
                      {new Date(d.data).toLocaleDateString('ca-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                      {d.entregada ? ' ✓' : ''}
                      {d.nota && !d.entregada && <span style={{ fontWeight: 400, opacity: 0.75 }}> — {d.nota}</span>}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── KPI ROW: Pressupost/Factura card + 3 KPI cards + Hores ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.75rem', alignItems: 'stretch' }}>

        {/* Pressupost + Factura — inside KPI row */}
        <div style={{
          display: 'flex', flexDirection: 'row', overflow: 'hidden',
          borderRadius: '10px', border: '1px solid var(--color-warning-border)',
          background: 'var(--color-warning-bg)',
        }}>
          {/* Pressupost half */}
          <div style={{ flex: 1, padding: '0.85rem', borderRight: '1px solid var(--color-warning-border)', display: 'flex', flexDirection: 'column', gap: '0.28rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <span style={{ ...sectionLabel, color: 'var(--color-warning-dark)' }}>Pressupost</span>
              {hasPressupost && (
                <button type="button" onClick={() => onNavigateToPressupost(formData.pressupost!)}
                  title="Veure pressupost"
                  style={{ display: 'flex', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: '0', color: 'var(--color-warning-dark)', opacity: 0.7, lineHeight: 1 }}
                >
                  <ExternalLink size={11} />
                </button>
              )}
            </div>
            {hasPressupost ? (
              <>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>{pressupostVinculat!.codi}</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>{pressupostTotal.toFixed(2)}€</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  {pressupostVinculat!.estat === 'acceptat'
                    ? <CheckCircle size={13} color="var(--color-success)" />
                    : pressupostVinculat!.estat === 'rebutjat'
                    ? <AlertCircle size={13} color="var(--color-error)" />
                    : <Clock size={13} color="var(--color-warning)" />
                  }
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'capitalize', color: pressupostVinculat!.estat === 'acceptat' ? 'var(--color-success)' : pressupostVinculat!.estat === 'rebutjat' ? 'var(--color-error)' : 'var(--color-warning)' }}>
                    {pressupostVinculat!.estat}
                  </span>
                </div>
              </>
            ) : (
              <div style={{ fontSize: '0.85rem', color: 'var(--color-warning-dark)', fontStyle: 'italic', marginTop: '0.2rem' }}>Sense pressupost</div>
            )}
          </div>

          {/* Factura half */}
          <div style={{ flex: 1, padding: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.28rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <span style={{ ...sectionLabel, color: 'var(--color-info-dark)' }}>Factura</span>
              {hasFactura && !formData.facturaHistorica && formData.facturaAssociada && (
                <button type="button" onClick={() => onNavigateToFactura(formData.facturaAssociada!)}
                  title="Veure factura"
                  style={{ display: 'flex', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: '0', color: 'var(--color-info-dark)', opacity: 0.7, lineHeight: 1 }}
                >
                  <ExternalLink size={11} />
                </button>
              )}
            </div>
            {hasFactura ? (
              formData.facturaHistorica ? (
                <>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{formData.facturaHistorica.numero}</div>
                  <div style={{ fontSize: '0.81rem', color: 'var(--color-text-secondary)' }}>{new Date(formData.facturaHistorica.data).toLocaleDateString('ca-ES')}</div>
                  <div style={{ fontSize: '0.77rem', color: 'var(--color-warning-dark)', fontStyle: 'italic' }}>⚠️ Factura històrica</div>
                </>
              ) : (
                <>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{formData.facturaAssociada}</div>
                  {facturaVinculada && (() => {
                    const { Icon, color, label } = getFacturaEstatIcon(facturaVinculada.estat);
                    return (
                      <>
                        <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>{facturaVinculada.totalFactura.toFixed(2)}€</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Icon size={13} color={color} />
                          <span style={{ fontSize: '0.8rem', fontWeight: 600, color }}>{label}</span>
                        </div>
                      </>
                    );
                  })()}
                </>
              )
            ) : (
              <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', fontStyle: 'italic', marginTop: '0.2rem' }}>Sense factura</div>
            )}
          </div>
        </div>

        {/* Ingressos Previstos */}
        {(() => {
          const G_GREEN  = 'linear-gradient(135deg, #059669, #10b981, #34d399)';
          const G_RED    = 'linear-gradient(135deg, #dc2626, #ef4444, #f97316)';
          const G_INDIGO = 'linear-gradient(135deg, #4338ca, #6366f1, #818cf8)';
          const G_PURPLE = 'linear-gradient(135deg, #7c3aed, #8b5cf6, #a78bfa)';
          const G_SLATE  = 'linear-gradient(135deg, #475569, #64748b, #94a3b8)';
          const horesGradientColors = totalMinutsRegistrats > 0
            ? ['#7c3aed', '#7f45ef', '#8350f2', '#8b5cf6', '#9670f8', '#a184f9', '#a78bfa']
            : ['#475569', '#526174', '#5c6d7f', '#64748b', '#748399', '#8493a8', '#94a3b8'];
          const gB = benefici >= 0 ? G_GREEN : G_RED;
          const gC = costTotal > 0 ? G_RED : G_INDIGO;
          const gH = totalMinutsRegistrats > 0 ? G_PURPLE : G_SLATE;
          const gSpan = (v: React.ReactNode, g: string) => (
            <span style={{
              display: 'inline-block',
              width: 'fit-content',
              background: g,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              color: 'transparent',
              whiteSpace: 'nowrap',
            }}>{v}</span>
          );
          return (<>
            <div className="stat-card">
              <div className="stat-card-stripe" style={{ background: G_INDIGO }} />
              <div className="stat-card-body">
                <div className="stat-card-label">Ingressos Previstos</div>
                <div className="stat-card-value">{gSpan(`${ingressos.toFixed(2)}€`, G_INDIGO)}</div>
                <div className="stat-card-sub">{formData.tasques.length} {formData.tasques.length === 1 ? 'tasca' : 'tasques'}</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-card-stripe" style={{ background: gC }} />
              <div className="stat-card-body">
                <div className="stat-card-label">Cost Total</div>
                <div className="stat-card-value">{gSpan(`${costTotal.toFixed(2)}€`, gC)}</div>
                <div className="stat-card-sub">RH: {costHumans.toFixed(0)}€ · Mat: {costMaterials.toFixed(0)}€</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-card-stripe" style={{ background: gB }} />
              <div className="stat-card-body">
                <div className="stat-card-label">Benefici</div>
                <div className="stat-card-value">{gSpan(`${benefici.toFixed(2)}€`, gB)}</div>
                <div className="stat-card-sub">Marge: {marge.toFixed(1)}%</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-card-stripe" style={{ background: gH }} />
              <div className="stat-card-body">
                <div className="stat-card-label"><Timer size={11} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.3rem' }} />Hores Registrades</div>
                <div className="stat-card-value" style={{ whiteSpace: 'nowrap' }}>
                  {gradientTextChars(formatHores(totalMinutsRegistrats), horesGradientColors)}
                </div>
                <div className="stat-card-sub">Parts de treball</div>
              </div>
            </div>
          </>);
        })()}
      </div>

      {/* ── EQUIP HUMÀ + MATERIALS ── */}
      {(hasProveidors || hasMaterials) && (
        <div style={{ display: 'grid', gridTemplateColumns: teamCols, gap: '0.75rem', alignItems: 'stretch' }}>

          {/* Equip Humà */}
          {hasProveidors && (
            <div className="placeholder-card" style={{ padding: '1.1rem', display: 'flex', flexDirection: 'column' }}>
              <div style={{ ...sectionLabel, marginBottom: '0.75rem' }}>Equip Humà</div>
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${CARD_MIN_WIDTH}, 1fr))`, gap: '0.6rem' }}>
                {proveidorCards.map(({ provCodi, nom, total, paymentStatus, avatarColor, initials, imatgePerfil }) => (
                  <div key={provCodi} style={{
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                    background: 'var(--color-bg-primary)',
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'stretch',
                    height: CARD_HEIGHT,
                    overflow: 'hidden',
                  }}>
                    {/* Avatar panel — full height, photo or colored initials */}
                    {imatgePerfil ? (
                      <img src={imatgePerfil} alt={nom} style={{ width: AVATAR_SIZE, height: '100%', objectFit: 'cover', flexShrink: 0, borderRadius: '7px 0 0 7px' }} />
                    ) : (
                      <div style={{
                        width: AVATAR_SIZE, flexShrink: 0,
                        background: avatarColor,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'white', fontSize: '1.15rem', fontWeight: 700,
                        borderRadius: '7px 0 0 7px',
                      }}>
                        {initials || '?'}
                      </div>
                    )}
                    {/* Info panel */}
                    <div style={{ flex: 1, padding: '0.65rem 0.8rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minWidth: 0 }}>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-text-primary)', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={nom}>
                        {nom}
                      </div>
                      <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-error)' }}>
                        {total.toFixed(2)}€
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        {paymentStatus === 'pagat'
                          ? <><CheckCircle size={12} color="var(--color-success)" /><span style={{ fontSize: '0.77rem', color: 'var(--color-success)', fontWeight: 600 }}>Pagat</span></>
                          : paymentStatus === 'pendent'
                          ? <><AlertCircle size={12} color="var(--color-warning)" /><span style={{ fontSize: '0.77rem', color: 'var(--color-warning)', fontWeight: 600 }}>Pendent</span></>
                          : <><Clock size={12} color="var(--color-text-tertiary)" /><span style={{ fontSize: '0.77rem', color: 'var(--color-text-tertiary)' }}>Sense albarà</span></>
                        }
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Materials — grouped by group */}
          {hasMaterials && (
            <div className="placeholder-card" style={{ padding: '1.1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ ...sectionLabel }}>Materials</div>
              {Object.entries(materialsByGroup).map(([nomGrup, mats]) => (
                <div key={nomGrup}>
                  <div style={{ fontSize: '0.73rem', color: 'var(--color-text-secondary)', fontWeight: 600, letterSpacing: '0.3px', marginBottom: '0.5rem', paddingBottom: '0.3rem', borderBottom: '1px solid var(--color-border)' }}>
                    {nomGrup}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${CARD_MIN_WIDTH}, 1fr))`, gap: '0.6rem' }}>
                    {mats.map(mat => {
                      const matData = parametres?.materials.find(m => m.codi === mat.material);
                      const nomMaterial = matData?.material || mat.material;
                      const provMat = mat.proveidor ? proveidors.find(p => p.codi === mat.proveidor) : null;
                      const nomProv = provMat ? (provMat.nomComercial || provMat.nomFiscal) : null;
                      const avatarSeed = nomProv || nomMaterial;
                      const avatarColor = getAvatarColor(mat.id);
                      const initials = getInitials(avatarSeed);
                      const imatgePerfil = provMat?.imatgePerfil;
                      return (
                        <div key={mat.id} style={{
                          border: '1px solid var(--color-border)',
                          borderRadius: '8px',
                          background: 'var(--color-bg-primary)',
                          display: 'flex',
                          flexDirection: 'row',
                          alignItems: 'stretch',
                          height: CARD_HEIGHT,
                          overflow: 'hidden',
                        }}>
                          {/* Avatar panel — photo del proveïdor si existeix, sinó inicials */}
                          {imatgePerfil ? (
                            <img src={imatgePerfil} alt={nomProv || nomMaterial} style={{ width: AVATAR_SIZE, height: '100%', objectFit: 'cover', flexShrink: 0, borderRadius: '7px 0 0 7px' }} />
                          ) : (
                            <div style={{
                              width: AVATAR_SIZE, flexShrink: 0,
                              background: avatarColor,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              color: 'white', fontSize: '1.15rem', fontWeight: 700,
                              borderRadius: '7px 0 0 7px',
                            }}>
                              {initials || '?'}
                            </div>
                          )}
                          {/* Info panel */}
                          <div style={{ flex: 1, padding: '0.65rem 0.8rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minWidth: 0 }}>
                            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-text-primary)', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={nomMaterial}>
                              {nomMaterial}
                            </div>
                            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-error)' }}>
                              {mat.preuProveidor.toFixed(2)}€
                            </div>
                            <div style={{ fontSize: '0.77rem', color: 'var(--color-text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {nomProv || '—'}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── INSTRUCCIONS CLIENT + DOCUMENTS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', alignItems: 'start' }}>

        <div className="placeholder-card" style={{ padding: '1.1rem' }}>
          <div style={{ ...sectionLabel, marginBottom: '0.85rem' }}>Instruccions del Client</div>
          {formData.instruccionsClient ? (
            <p style={{ fontSize: '0.93rem', color: 'var(--color-text-secondary)', lineHeight: 1.65, margin: 0, whiteSpace: 'pre-wrap' }}>
              {formData.instruccionsClient}
            </p>
          ) : (
            <div style={{ color: 'var(--color-text-tertiary)', fontSize: '0.9rem', fontStyle: 'italic', textAlign: 'center', padding: '1rem 0' }}>
              Sense instruccions — afegeix-les a la pestanya Instruccions
            </div>
          )}
        </div>

        <div className="placeholder-card" style={{ padding: '1.1rem' }}>
          <div style={{ ...sectionLabel, marginBottom: '0.85rem' }}>Documents Adjunts</div>
          {documents.length === 0 ? (
            <div style={{ color: 'var(--color-text-tertiary)', fontSize: '0.9rem', fontStyle: 'italic', textAlign: 'center', padding: '1rem 0' }}>
              Cap document — afegeix-ne des de la pestanya Historial
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {documents.map(doc => (
                <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.6rem 0.8rem', border: '1px solid var(--color-border)', borderRadius: '7px', background: 'var(--color-bg-primary)' }}>
                  <div style={{ flexShrink: 0 }}>{getDocIcon(doc.nomFitxer)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.nom}</div>
                    <div style={{ fontSize: '0.77rem', color: 'var(--color-text-tertiary)', marginTop: '0.08rem' }}>
                      {new Date(doc.dataAfegit).toLocaleDateString('ca-ES')}{doc.tipus && ` · ${doc.tipus}`}
                    </div>
                  </div>
                  <button type="button" onClick={() => descarregarDocument(doc)}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.28rem', padding: '0.35rem 0.7rem', background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: '5px', cursor: 'pointer', fontSize: '0.82rem', color: 'var(--color-text-secondary)', flexShrink: 0 }}
                    title="Descarregar"
                  >
                    <Download size={13} /> Descarregar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}

export default ResumTab;

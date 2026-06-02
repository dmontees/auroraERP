import React, { useState, useEffect } from 'react';
import { ArrowLeft, FileText, FileDown, Trash2 } from 'lucide-react';
import flagCa from '../../assets/flag-ca.png';
import flagEs from '../../assets/flag-es.png';
import flagEn from '../../assets/flag-en.png';
import type { FacturaVenta } from '../../types/facturaVenta';
import { ESTAT_FACTURA_COLORS } from '../../types/facturaVenta';
import type { Client } from '../../types/client';
import type { Projecte } from '../../types/projecte';
import type { Plantilla } from '../../types/parametres';
import type { Tasca } from '../../types/pressupost';
import TascaModal from '../pressupostos/TascaModal';
import MaterialModal from './MaterialModal';
import { useAutoSave } from '../../hooks/useAutoSave';
import { generarFacturaVentaPDF } from '../../utils/generarFacturaVentaPDF';
import { useFacturaValidation } from './hooks/useFacturaValidation';
import { calcularImpostos, determinarEstat, calcularVenciment } from './utils/facturaCalculations';
import { generarRegistreVerifactu } from '../../utils/verifactuHash';
import { teCertificatEnMemoria } from '../../utils/verifactuFirma';
import { enviarRegistreAEAT } from '../../utils/verifactuAPI';
import VerifactuPINModal from '../common/VerifactuPINModal';
import ResumFacturaTab from './tabs/ResumFacturaTab';
import DadesTab from './tabs/DadesTab';
import TasquesTab from './tabs/TasquesTab';
import NotesTab from './tabs/NotesTab';
import PagamentTab from './tabs/PagamentTab';
import HistorialTab from './tabs/HistorialTab';
import { storage } from '../../utils/storageManager';

type TabId = 'resum' | 'dades' | 'tasques' | 'notes' | 'pagament' | 'historial';

interface Props {
  factura: FacturaVenta | null;   // null = nova factura
  nextCode: string;
  clients: Client[];
  projectes: Projecte[];
  plantilles: Plantilla[];
  allFactures: FacturaVenta[];
  onBack: () => void;
  onSave: (factura: FacturaVenta) => void;
  onDelete?: (codi: string) => void;
  onCrearRectificativa?: (factura: FacturaVenta) => void;
}

export default function FacturaVendaDetailView({
  factura,
  nextCode,
  clients,
  projectes,
  plantilles,
  allFactures,
  onBack,
  onSave,
  onDelete,
  onCrearRectificativa,
}: Props) {
  const [parametres, setParametres] = useState<any>({ serveis: [], unitats: [] });
  const [verifactuConfig] = useState(() => storage.getVerifactuConfig());
  useEffect(() => { setParametres(storage.getParametres()); }, []);

  const [activeTab, setActiveTab] = useState<TabId>('resum');
  const [showTascaModal, setShowTascaModal] = useState(false);
  const [editingTasca, setEditingTasca] = useState<{ categoriaIndex: number; tascaIndex: number } | null>(null);
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<{ categoriaIndex: number; materialIndex: number } | null>(null);
  const [languageModalMode, setLanguageModalMode] = useState<'definitiu' | 'borrador' | null>(null);
  const [showEmissioModal, setShowEmissioModal] = useState(false);
  const [showPINModal, setShowPINModal] = useState(false);
  const [copyDialogProjecte, setCopyDialogProjecte] = useState<Projecte | null>(null);

  const [formData, setFormData] = useState<FacturaVenta>(
    factura
      ? JSON.parse(JSON.stringify(factura))
      : {
          codi: nextCode,
          tipus: 'normal' as const,
          estat: 'borrador' as const,
          client: '',
          projecte: undefined,
          dataFactura: new Date().toISOString().split('T')[0],
          dataVenciment: calcularVenciment(new Date().toISOString().split('T')[0]),
          dataEnviada: undefined,
          ivaPercent: 21,
          irpfPercent: 0,
          tasques: [],
          baseImposable: 0,
          ivaImport: 0,
          irpfImport: 0,
          totalFactura: 0,
          pagaments: [],
          totalPagat: 0,
          pendentCobrar: 0,
          observacions: '',
          plantillesSeleccionades: plantilles
            .filter(p => p.tipusPlantilla === 'TPL-00002' && p.perDefecte)
            .map(p => p.codi),
          plantillesText: plantilles
            .filter(p => p.tipusPlantilla === 'TPL-00002' && p.perDefecte)
            .map(p => p.text).join('\n\n'),
          plantillesTextEs: plantilles
            .filter(p => p.tipusPlantilla === 'TPL-00002' && p.perDefecte)
            .map(p => (p as any).textEs || p.text).join('\n\n'),
          plantillesTextEn: plantilles
            .filter(p => p.tipusPlantilla === 'TPL-00002' && p.perDefecte)
            .map(p => (p as any).textEn || p.text).join('\n\n'),
          accions: [{ data: new Date().toISOString(), descripcio: 'Factura creada', automatic: true }]
        }
  );

  const clientBlocked = !formData.client;
  const client = clients.find(c => c.codi === formData.client);
  const { validate } = useFacturaValidation(formData, client, allFactures);
  const validationResult = validate();

  // Fase 3+6 Verifactu: generar hash SHA-256 i enviar a AEAT (si mode='verifactu') quan la factura s'emet
  useEffect(() => {
    if (
      !verifactuConfig.enabled ||
      formData.estat === 'borrador' ||
      formData.verifactu   // ja té hash → no regenerar
    ) return;

    const nif = storage.getParametres()?.dadesEmpresa?.nif;
    if (!nif) return;

    const run = async () => {
      const todesFactures = storage.getFacturesVenda() as FacturaVenta[];
      let registre = await generarRegistreVerifactu(formData, nif, todesFactures);

      // Fase 6: enviar a AEAT si el mode és 'verifactu' (temps real)
      if (verifactuConfig.mode === 'verifactu') {
        registre = await enviarRegistreAEAT(registre, formData, verifactuConfig);
      }

      setFormData(prev => ({ ...prev, verifactu: registre }));
    };
    run().catch(console.error);
  }, [formData.estat, formData.codi, verifactuConfig.enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reintent d'enviament manual (quan estatEnviament === 'error')
  const handleRetryEnviament = async () => {
    if (!formData.verifactu || verifactuConfig.mode !== 'verifactu') return;
    const registreActualitzat = await enviarRegistreAEAT(formData.verifactu, formData, verifactuConfig);
    setFormData(prev => ({ ...prev, verifactu: registreActualitzat }));
  };

  // Auto-fill IVA/IRPF on client change (only for new invoices)
  useEffect(() => {
    if (formData.client && !factura) {
      const c = clients.find(cl => cl.codi === formData.client);
      if (c) {
        let ivaPercent = 21;
        if (c.tipusIVA === 'Exempt') ivaPercent = 0;
        else if (c.tipusIVA === 'Reduit') ivaPercent = 10;
        else if (c.tipusIVA === 'Superreduit') ivaPercent = 4;
        setFormData(prev => ({
          ...prev,
          ivaPercent,
          irpfPercent: c.retencio || 0,
          projecte: prev.projecte && projectes.find(p => p.codi === prev.projecte)?.client === formData.client
            ? prev.projecte : undefined
        }));
      }
    }
  }, [formData.client, clients, factura]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-update venciment on dataFactura change (only for new invoices)
  useEffect(() => {
    if (!factura) {
      setFormData(prev => ({ ...prev, dataVenciment: calcularVenciment(prev.dataFactura) }));
    }
  }, [formData.dataFactura, factura]);

  // Totals
  const calcularTotals = () => {
    let base = 0;
    formData.tasques.forEach(cat => { cat.tasques.forEach(t => { base += t.quantitat * t.preu; }); });
    const { ivaImport, irpfImport, total } = calcularImpostos(base, formData.ivaPercent, formData.irpfPercent);
    return { baseImposable: base, ivaImport, irpfImport, totalFactura: total, pendentCobrar: Math.max(0, total - formData.totalPagat) };
  };
  const totals = calcularTotals();
  const tePagaments = formData.pagaments.length > 0;
  // Una factura deixa de ser borrador quan s'emet → contingut immutable
  const esEmesa = formData.estat !== 'borrador';
  // Només es pot eliminar un borrador sense pagaments; un cop emesa, es corregeix amb rectificativa
  const esEliminable = formData.estat === 'borrador' && !tePagaments;

  const prepararFactura = (): FacturaVenta | null => {
    if (!validationResult.isValid) return null;
    const estat = determinarEstat(totals.totalFactura, formData.totalPagat, formData.dataVenciment, formData.estat);
    return { ...formData, ...totals, estat };
  };

  const { saveNow } = useAutoSave(formData, () => {
    const f = prepararFactura();
    if (f) onSave(f);
  });

  // Handlers
  const togglePlantilla = (codi: string) => {
    const p = plantilles.find(pl => pl.codi === codi);
    if (p?.perDefecte && formData.plantillesSeleccionades.includes(codi)) return;
    const noves = formData.plantillesSeleccionades.includes(codi)
      ? formData.plantillesSeleccionades.filter(c => c !== codi)
      : [...formData.plantillesSeleccionades, codi];
    const textos = noves.map(c => plantilles.find(pl => pl.codi === c)?.text || '').filter(Boolean);
    setFormData(prev => ({ ...prev, plantillesSeleccionades: noves, plantillesText: textos.join('\n\n') }));
  };

  const afegirTasca = (tasca: any) => {
    const serveiData = parametres?.serveis?.find((s: any) => s.codi === tasca.servei);
    const unitatData = parametres?.unitats?.find((u: any) => u.codi === tasca.unitat);
    const tascaConv = { servei: serveiData?.nom || tasca.servei, descripcio: tasca.descripcio, quantitat: tasca.quantitat, unitat: unitatData?.nom || tasca.unitat, preu: tasca.tarifa, importe: tasca.importe };
    const nou = [...formData.tasques];
    const ci = nou.findIndex(c => c.categoria === tasca.categoria);
    if (ci >= 0) {
      if (editingTasca && editingTasca.categoriaIndex === ci) nou[ci].tasques[editingTasca.tascaIndex] = tascaConv;
      else nou[ci].tasques.push(tascaConv);
    } else { nou.push({ categoria: tasca.categoria, tasques: [tascaConv] }); }
    setFormData(prev => ({ ...prev, tasques: nou }));
    setShowTascaModal(false); setEditingTasca(null);
  };

  const afegirMaterial = (material: Tasca) => {
    const nou = [...formData.tasques];
    const ci = nou.findIndex(c => c.categoria === 'MATERIALS');
    if (ci >= 0) {
      if (editingMaterial && editingMaterial.categoriaIndex === ci) nou[ci].tasques[editingMaterial.materialIndex] = material;
      else nou[ci].tasques.push(material);
    } else { nou.push({ categoria: 'MATERIALS', tasques: [material] }); }
    setFormData(prev => ({ ...prev, tasques: nou }));
    setShowMaterialModal(false); setEditingMaterial(null);
  };

  const eliminarTasca = (ci: number, ti: number) => {
    const nou = [...formData.tasques];
    nou[ci].tasques.splice(ti, 1);
    if (nou[ci].tasques.length === 0) nou.splice(ci, 1);
    setFormData(prev => ({ ...prev, tasques: nou }));
  };

  const eliminarCategoria = (ci: number) => {
    if (!confirm('Eliminar aquesta categoria i totes les seves tasques?')) return;
    const nou = [...formData.tasques]; nou.splice(ci, 1);
    setFormData(prev => ({ ...prev, tasques: nou }));
  };

  const moureCategoria = (ci: number, dir: -1 | 1) => {
    const nou = [...formData.tasques];
    [nou[ci], nou[ci + dir]] = [nou[ci + dir], nou[ci]];
    setFormData(prev => ({ ...prev, tasques: nou }));
  };

  const moureTasca = (ci: number, ti: number, dir: -1 | 1) => {
    const nou = [...formData.tasques];
    const t = nou[ci].tasques;
    [t[ti], t[ti + dir]] = [t[ti + dir], t[ti]];
    setFormData(prev => ({ ...prev, tasques: nou }));
  };

  const updateTasca = (ci: number, ti: number, field: string, value: any) => {
    const nou = [...formData.tasques];
    (nou[ci].tasques[ti] as any)[field] = value;
    setFormData(prev => ({ ...prev, tasques: nou }));
  };

  const buscarTarifaTasca = (codiServei: string, codiUnitat: string): number => {
    const tc = client?.tarifes?.find(t => t.servei === codiServei && t.unitat === codiUnitat);
    if (tc) return tc.preu;
    return parametres?.tarifes?.find((t: any) => t.servei === codiServei && t.unitat === codiUnitat)?.preu ?? 0;
  };

  const handleProjecteSeleccionat = (codi: string | undefined) => {
    if (!codi) { setFormData(prev => ({ ...prev, projecte: undefined })); return; }
    const p = projectes.find(pr => pr.codi === codi);
    if (p) setCopyDialogProjecte(p);
  };

  const vincularProjecteEnStorage = (codi: string) => {
    storage.setProjectes(storage.getProjectes().map((p: any) =>
      p.codi === codi ? { ...p, facturaAssociada: formData.codi } : p
    ));
  };

  const handleVincularSenseCopiar = (p: Projecte) => {
    setFormData(prev => ({ ...prev, projecte: p.codi }));
    vincularProjecteEnStorage(p.codi);
    setCopyDialogProjecte(null);
  };

  const handleCopiarDadesProjecte = (p: Projecte) => {
    const cats: any[] = [];
    p.tasques.forEach(t => {
      let cat = cats.find(c => c.categoria === t.categoria);
      if (!cat) { cat = { categoria: t.categoria, tasques: [] }; cats.push(cat); }
      cat.tasques.push({ id: t.id, servei: t.servei, descripcio: t.descripcio, quantitat: t.quantitat, unitat: t.unitat, preu: t.tarifa });
    });
    const cd = clients.find(c => c.codi === p.client);
    let iva = 21;
    if (cd?.tipusIVA === 'Exempt') iva = 0;
    else if (cd?.tipusIVA === 'Reduit') iva = 10;
    else if (cd?.tipusIVA === 'Superreduit') iva = 4;
    setFormData(prev => ({
      ...prev, client: p.client, projecte: p.codi, tasques: cats, ivaPercent: iva,
      irpfPercent: cd?.retencio || 0, observacions: `Factura generada des del projecte ${p.codi}`,
      avisFacturacio: p.avisFacturacio ? { ...p.avisFacturacio } : prev.avisFacturacio,
      accions: [...prev.accions, { data: new Date().toISOString(), descripcio: `Dades copiades del projecte ${p.codi}`, automatic: true }]
    }));
    vincularProjecteEnStorage(p.codi);
    setCopyDialogProjecte(null);
  };

  const toggleAvisFacturacio = () => {
    const nouActiu = !(formData.avisFacturacio?.actiu ?? false);
    const nouAvis = { actiu: nouActiu, descripcio: formData.avisFacturacio?.descripcio || '' };
    setFormData(prev => ({ ...prev, avisFacturacio: nouAvis }));
    if (formData.projecte) storage.setProjectes(storage.getProjectes().map((p: any) => p.codi === formData.projecte ? { ...p, avisFacturacio: nouAvis } : p));
  };

  const updateAvisDescripcio = (descripcio: string) => {
    const nouAvis = { actiu: formData.avisFacturacio?.actiu ?? false, descripcio };
    setFormData(prev => ({ ...prev, avisFacturacio: nouAvis }));
    if (formData.projecte) storage.setProjectes(storage.getProjectes().map((p: any) => p.codi === formData.projecte ? { ...p, avisFacturacio: nouAvis } : p));
  };

  // PDF provisional amb marca d'aigua ESBORRANY — no canvia l'estat
  const generarBorradorPDF = async (idioma: 'ca' | 'es' | 'en') => {
    if (formData.avisFacturacio?.actiu) {
      alert('⚠️ Hi ha un avís de facturació actiu. Desactiva\'l a la pestanya 1. Dades abans de generar cap PDF.');
      return;
    }
    await generarFacturaVentaPDF(formData, clients, storage.getProjectes(), idioma, true, verifactuConfig);
    setLanguageModalMode(null);
  };

  // PDF definitiu — si la factura encara és borrador, l'emet (passa a Enviada i bloqueja el contingut)
  const generarPDFDefinitiu = async (idioma: 'ca' | 'es' | 'en') => {
    const f = prepararFactura();
    if (!f) { alert('Cal completar els camps obligatoris (client i almenys una tasca) abans d\'emetre la factura.'); return; }
    const pdfBase64 = await generarFacturaVentaPDF(f, clients, storage.getProjectes(), idioma, false, verifactuConfig);
    setFormData(prev => {
      const passaAEnviada = prev.estat === 'borrador';
      return {
        ...prev,
        documentPDF: pdfBase64,
        documentPDFName: `${f.codi}_factura.pdf`,
        estat: passaAEnviada ? 'enviada' : prev.estat,
        dataEnviada: passaAEnviada ? (prev.dataEnviada || new Date().toISOString()) : prev.dataEnviada,
        fechaExpedicion: passaAEnviada ? (prev.fechaExpedicion || new Date().toISOString()) : prev.fechaExpedicion,
        accions: passaAEnviada
          ? [...prev.accions, { data: new Date().toISOString(), descripcio: 'Factura emesa i marcada com a Enviada', automatic: true }]
          : prev.accions,
      };
    });
    setLanguageModalMode(null);
  };

  // Clic al botó principal: si és borrador mostra l'avís d'emissió; si ja és emesa, només regenera el PDF
  const handleClickEmetre = () => {
    if (esEmesa) { setLanguageModalMode('definitiu'); return; }
    if (formData.avisFacturacio?.actiu) {
      alert('⚠️ Hi ha un avís de facturació actiu. Desactiva\'l a la pestanya 1. Dades abans d\'emetre la factura.');
      return;
    }
    const f = prepararFactura();
    if (!f) { alert('Cal completar els camps obligatoris (client i almenys una tasca) abans d\'emetre la factura.'); return; }

    // Si Verifactu actiu amb certificat i no carregat en memòria → PIN primer
    if (verifactuConfig.enabled && verifactuConfig.teCertificat && !teCertificatEnMemoria()) {
      setShowPINModal(true);
      return;
    }

    setShowEmissioModal(true);
  };

  const confirmarEmissio = () => {
    setShowEmissioModal(false);
    setLanguageModalMode('definitiu');
  };

  const handleBack = () => {
    // If new invoice without client, discard it
    if (!factura && !formData.client) {
      const factures = storage.getFacturesVenda();
      if (factures.some((f: any) => f.codi === formData.codi)) {
        storage.setFacturesVenda(factures.filter((f: any) => f.codi !== formData.codi));
      }
      onBack(); return;
    }
    saveNow();
    onBack();
  };

  const handleDelete = () => {
    if (!factura) return;
    if (!esEliminable) {
      const msg = verifactuConfig.enabled && formData.estat !== 'borrador'
        ? 'Verifactu actiu: no es pot eliminar una factura emesa. Crea una factura rectificativa.'
        : 'No es pot eliminar una factura amb pagaments o en un estat avançat.';
      alert(msg); return;
    }
    onDelete?.(factura.codi);
    onBack();
  };

  const estatInfo = ESTAT_FACTURA_COLORS[formData.estat] || ESTAT_FACTURA_COLORS.borrador;
  const podesCopiarRectificativa = factura && formData.tipus !== 'rectificativa';

  const TabBtn = ({ id, label, locked }: { id: TabId; label: string; locked?: boolean }) => (
    <button
      type="button"
      onClick={() => setActiveTab(id)}
      style={{
        padding: '0.65rem 1.2rem',
        background: 'transparent',
        border: 'none',
        borderBottom: activeTab === id ? '2px solid var(--color-accent-primary)' : '2px solid transparent',
        color: activeTab === id ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
        fontWeight: activeTab === id ? 700 : 400,
        cursor: 'pointer',
        marginBottom: '-2px',
        whiteSpace: 'nowrap',
        fontSize: '0.88rem',
        transition: 'color 0.15s',
      }}
    >
      {locked && <span style={{ marginRight: '0.3rem', fontSize: '0.78rem' }}>🔒</span>}{label}
    </button>
  );

  return (
    <div className="section-placeholder" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>

      {/* ── STICKY HEADER ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap',
        marginBottom: '1.25rem', paddingBottom: '1rem',
        borderBottom: '1px solid var(--color-border)', flexShrink: 0,
      }}>
        {/* Back */}
        <button type="button" onClick={handleBack}
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', fontWeight: 500, fontSize: '0.9rem', padding: '0.3rem 0.5rem', borderRadius: '6px' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg-tertiary)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <ArrowLeft size={18} /> Tornar
        </button>

        {/* Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <FileText size={20} style={{ color: 'var(--color-text-secondary)' }} />
          <span style={{ fontWeight: 700, fontSize: '1.05rem' }}>{formData.codi}</span>
          {formData.tipus === 'rectificativa' && (
            <span style={{ padding: '0.15rem 0.55rem', background: 'var(--color-error-dark)', color: 'white', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>NOTA DE CRÈDIT</span>
          )}
          {formData.avisFacturacio?.actiu && (
            <span title={formData.avisFacturacio.descripcio} style={{ fontSize: '1rem', cursor: 'help' }}>⚠️</span>
          )}
        </div>

        {/* Estat (read-only — canvia automàticament o en emetre) */}
        <span
          title={esEmesa ? 'Factura emesa — l\'estat es gestiona automàticament' : 'Esborrany editable — s\'emet generant el PDF definitiu'}
          style={{ padding: '0.4rem 0.9rem', fontWeight: 700, fontSize: '0.85rem', background: estatInfo.bg, color: estatInfo.text, borderRadius: '8px', whiteSpace: 'nowrap' }}
        >
          {estatInfo.icon} {estatInfo.label}
        </span>

        {/* Badge Verifactu — visible quan el mòdul és actiu i la factura és emesa */}
        {verifactuConfig.enabled && formData.verifactu && (() => {
          const ev = formData.verifactu.estatEnviament;
          const isVerifactuMode = verifactuConfig.mode === 'verifactu';
          const badgeMap: Record<string, { bg: string; color: string; label: string; title: string }> = {
            acceptada: { bg: '#d1fae5', color: '#065f46', label: '✓ AEAT', title: `CSV: ${formData.verifactu.csvAeat ?? '—'}\nEnviat: ${formData.verifactu.fechaEnviament ?? ''}` },
            rebutjada: { bg: '#fee2e2', color: '#991b1b', label: '✗ Rebutjada', title: formData.verifactu.errorDetall ?? '' },
            error:     { bg: '#ffedd5', color: '#9a3412', label: '⚠ Error enviant', title: formData.verifactu.errorDetall ?? '' },
            pendent:   isVerifactuMode
              ? { bg: '#e0e7ff', color: '#3730a3', label: '⏳ Pendent AEAT', title: 'Pendent d\'enviament a l\'AEAT' }
              : { bg: '#f3f4f6', color: '#374151', label: '☁ Hash OK', title: `Verifactu (no-verifactu)\nHuella: ${formData.verifactu.huella.substring(0, 12)}…` },
          };
          const b = badgeMap[ev] ?? badgeMap.pendent;
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span
                title={b.title}
                style={{ padding: '0.35rem 0.7rem', fontWeight: 700, fontSize: '0.78rem', background: b.bg, color: b.color, borderRadius: '8px', whiteSpace: 'nowrap', cursor: 'help' }}
              >
                {b.label}
              </span>
              {(ev === 'error' || ev === 'rebutjada') && isVerifactuMode && (
                <button
                  type="button"
                  onClick={handleRetryEnviament}
                  title="Reintentar l'enviament a l'AEAT"
                  style={{ fontSize: '0.78rem', padding: '0.3rem 0.6rem', background: 'transparent', border: '1px solid #9a3412', color: '#9a3412', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
                >
                  Reintentar
                </button>
              )}
            </div>
          );
        })()}

        <div style={{ flex: 1 }} />

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <button type="button" className="btn-secondary" onClick={() => setLanguageModalMode('borrador')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
            title="PDF provisional amb marca d'aigua ESBORRANY (per revisar abans d'emetre)"
          >
            <FileDown size={15} /> Borrador
          </button>

          <button type="button"
            onClick={handleClickEmetre}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 0.9rem', background: 'var(--color-error-dark)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
            title={esEmesa ? 'Tornar a descarregar el PDF definitiu' : 'Emetre la factura definitiva'}
          >
            <FileText size={15} /> {esEmesa ? 'PDF' : 'Emetre factura'}
          </button>

          {podesCopiarRectificativa && onCrearRectificativa && (
            <button type="button" className="btn-secondary"
              onClick={() => onCrearRectificativa(formData)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
            >
              Nota Crèdit
            </button>
          )}

          {esEliminable && (
            <button type="button" onClick={handleDelete}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 0.9rem', background: 'transparent', color: 'var(--color-error-dark)', border: '1px solid var(--color-error-dark)', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
            >
              <Trash2 size={15} /> Eliminar
            </button>
          )}
        </div>
      </div>

      {/* ── TABS BAR ── */}
      <div style={{ display: 'flex', alignItems: 'flex-end', borderBottom: '2px solid var(--color-border)', marginBottom: '1.5rem', flexShrink: 0, gap: 0 }}>

        {/* Resum (standalone) */}
        <TabBtn id="resum" label="Resum" />

        {/* Grup de configuració: safata amb accent superior i bordes laterals */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-end',
          borderTop: '2px solid var(--color-accent-primary)',
          borderLeft: '1px solid var(--color-border)',
          borderRight: '1px solid var(--color-border)',
          borderRadius: '6px 6px 0 0',
          background: 'var(--color-bg-tertiary)',
          margin: '0 0.5rem',
        }}>
          <TabBtn id="dades" label="1. Dades" locked={esEmesa} />
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', paddingBottom: '0.7rem', userSelect: 'none' }}>›</span>
          <TabBtn id="tasques" label="2. Tasques" locked={esEmesa} />
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', paddingBottom: '0.7rem', userSelect: 'none' }}>›</span>
          <TabBtn id="notes" label="3. Notes" locked={esEmesa} />
        </div>

        {/* Funcionals */}
        <TabBtn id="pagament" label="Pagament" />
        <TabBtn id="historial" label="Historial" />
      </div>

      {/* ── TAB CONTENT ── */}
      <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>

        {activeTab === 'resum' && (
          <ResumFacturaTab formData={formData} clients={clients} projectes={projectes} parametres={parametres} totals={totals} />
        )}

        {activeTab === 'dades' && (
          <DadesTab
            formData={formData} setFormData={setFormData}
            clients={clients} projectes={projectes} totals={totals}
            clientBlocked={clientBlocked} tePagaments={tePagaments}
            warnings={validationResult.warnings}
            esBloquejatContenido={esEmesa}
            onToggleAvis={toggleAvisFacturacio}
            onUpdateAvisDescripcio={updateAvisDescripcio}
            onProjecteSeleccionat={handleProjecteSeleccionat}
          />
        )}

        {activeTab === 'tasques' && (
          <TasquesTab
            formData={formData} setFormData={setFormData}
            parametres={parametres} totals={totals}
            clientBlocked={clientBlocked} tePagaments={tePagaments}
            esBloquejat={esEmesa}
            onShowTascaModal={() => setShowTascaModal(true)}
            onShowMaterialModal={() => setShowMaterialModal(true)}
            onEliminarTasca={eliminarTasca}
            onEliminarCategoria={eliminarCategoria}
            onMoureCategoriaAmunt={i => moureCategoria(i, -1)}
            onMoureCategoriaAvall={i => moureCategoria(i, 1)}
            onMoureTascaAmunt={(ci, ti) => moureTasca(ci, ti, -1)}
            onMoureTascaAvall={(ci, ti) => moureTasca(ci, ti, 1)}
            onUpdateTasca={updateTasca}
            onBuscarTarifa={buscarTarifaTasca}
          />
        )}

        {activeTab === 'notes' && (
          <NotesTab
            formData={formData} setFormData={setFormData}
            plantilles={plantilles} onTogglePlantilla={togglePlantilla}
            clientBlocked={clientBlocked} tePagaments={tePagaments}
            esBloquejat={esEmesa}
          />
        )}

        {activeTab === 'pagament' && (
          <PagamentTab formData={formData} setFormData={setFormData} totals={totals} />
        )}

        {activeTab === 'historial' && (
          <HistorialTab formData={formData} setFormData={setFormData} />
        )}
      </div>

      {/* ── MODALS ANIDATS ── */}

      {showTascaModal && (
        <TascaModal
          onClose={() => { setShowTascaModal(false); setEditingTasca(null); }}
          onSave={afegirTasca}
          existingCategories={formData.tasques.map(c => c.categoria).filter(Boolean)}
          editingTasca={editingTasca ? formData.tasques[editingTasca.categoriaIndex].tasques[editingTasca.tascaIndex] : undefined}
          editingCategory={editingTasca ? formData.tasques[editingTasca.categoriaIndex].categoria : undefined}
          serveis={parametres?.serveis || []}
          unitats={parametres?.unitats || []}
          clientTarifes={client?.tarifes || []}
          parametres={parametres}
        />
      )}

      {showMaterialModal && (
        <MaterialModal
          onClose={() => { setShowMaterialModal(false); setEditingMaterial(null); }}
          onSave={afegirMaterial}
          editingMaterial={editingMaterial ? formData.tasques[editingMaterial.categoriaIndex].tasques[editingMaterial.materialIndex] : undefined}
          materials={parametres?.materials || []}
          grups={parametres?.grupsMaterials || []}
        />
      )}

      {copyDialogProjecte && (
        <div className="modal-overlay" onClick={() => setCopyDialogProjecte(null)} style={{ zIndex: 2000 }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2 style={{ fontSize: '1.1rem' }}>Vincular projecte {copyDialogProjecte.codi}</h2>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: '0.75rem' }}>Vols copiar les dades del projecte <strong>{copyDialogProjecte.codi} – {copyDialogProjecte.titol}</strong> a aquesta factura?</p>
              <p style={{ fontSize: '0.88rem', color: 'var(--color-text-secondary)', lineHeight: '1.5' }}>Si copies les dades, s'importaran totes les tasques, el client, la configuració fiscal i l'avís de facturació.</p>
              {copyDialogProjecte.facturaAssociada && (
                <div style={{ marginTop: '0.75rem', padding: '0.6rem 0.9rem', background: 'var(--color-warning-bg)', border: '1px solid var(--color-warning-light)', borderRadius: '6px', fontSize: '0.85rem', color: 'var(--color-warning-dark)' }}>
                  ⚠️ Aquest projecte ja té la factura <strong>{copyDialogProjecte.facturaAssociada}</strong> vinculada.
                </div>
              )}
            </div>
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button type="button" className="btn-secondary" onClick={() => setCopyDialogProjecte(null)}>Cancel·lar</button>
              <button type="button" className="btn-secondary" onClick={() => handleVincularSenseCopiar(copyDialogProjecte)}>Vincular sense copiar</button>
              <button type="button" className="btn-primary" onClick={() => handleCopiarDadesProjecte(copyDialogProjecte)}>Sí, copiar dades</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de PIN Verifactu — es mostra si cal verificar el certificat abans d'emetre */}
      {showPINModal && (
        <VerifactuPINModal
          onSuccess={() => { setShowPINModal(false); setShowEmissioModal(true); }}
          onCancel={() => setShowPINModal(false)}
        />
      )}

      {/* Modal d'avís previ a l'emissió definitiva */}
      {showEmissioModal && (
        <div className="modal-overlay" onClick={() => setShowEmissioModal(false)} style={{ zIndex: 2000 }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <h2 style={{ fontSize: '1.1rem' }}>Emetre la factura {formData.codi}</h2>
              <button className="modal-close" onClick={() => setShowEmissioModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: '0.75rem' }}>
                Estàs a punt de generar la <strong>factura definitiva</strong>. Un cop emesa:
              </p>
              <ul style={{ margin: '0 0 0.85rem 1.1rem', padding: 0, fontSize: '0.9rem', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                <li>El contingut (dades, tasques i notes) quedarà <strong>bloquejat</strong>.</li>
                <li>L'estat passarà a <strong>Enviada</strong>.</li>
                {verifactuConfig.enabled ? (
                  <li>El registre s'enviarà a l'<strong>AEAT (Verifactu)</strong> i <strong>l'acció no es podrà desfer</strong>.</li>
                ) : (
                  <li>Per fer correccions hauràs de crear una <strong>factura rectificativa</strong>.</li>
                )}
              </ul>
              <div style={{ padding: '0.6rem 0.9rem', background: 'var(--color-info-bg)', border: '1px solid var(--color-info-border)', borderRadius: '6px', fontSize: '0.85rem', color: 'var(--color-info-dark)' }}>
                💡 Pots descarregar un <strong>PDF de borrador</strong> per revisar-la abans d'emetre-la.
              </div>
            </div>
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem' }}>
              <button type="button" className="btn-secondary"
                onClick={() => { setShowEmissioModal(false); setLanguageModalMode('borrador'); }}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <FileDown size={15} /> Descarregar borrador
              </button>
              <div style={{ display: 'flex', gap: '0.6rem' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowEmissioModal(false)}>Cancel·lar</button>
                <button type="button" className="btn-primary" onClick={confirmarEmissio}>Continuar i emetre</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de selecció d'idioma del PDF (borrador o definitiu) */}
      {languageModalMode && (
        <div className="modal-overlay" onClick={() => setLanguageModalMode(null)} style={{ zIndex: 2000 }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '380px' }}>
            <div className="modal-header">
              <h2><FileText size={22} /> Idioma del {languageModalMode === 'borrador' ? 'borrador' : 'PDF'}</h2>
              <button className="modal-close" onClick={() => setLanguageModalMode(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {([['ca', flagCa, 'Català'], ['es', flagEs, 'Castellano'], ['en', flagEn, 'English']] as const).map(([lang, flag, label]) => (
                  <button key={lang} type="button" className="btn-primary"
                    onClick={() => languageModalMode === 'borrador' ? generarBorradorPDF(lang as any) : generarPDFDefinitiu(lang as any)}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', padding: '0.9rem', gap: '1rem' }}
                  >
                    <img src={flag} alt={label} style={{ width: 16, height: 16, borderRadius: '50%', objectFit: 'cover' }} />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

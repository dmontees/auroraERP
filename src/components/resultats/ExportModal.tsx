import React, { useState } from 'react';
import { X, Download, FileText, Table, FileSpreadsheet } from 'lucide-react';
import type { ExportConfig } from './types';

interface ExportModalProps {
  onClose: () => void;
  onExport: (config: ExportConfig) => void;
}

const SECTIONS = [
  { id: 'activitat',   label: 'Activitat · Resultat Net' },
  { id: 'projectes',  label: 'Projectes i Rendibilitat' },
  { id: 'clients',    label: 'Anàlisi de Clients' },
  { id: 'despeses',   label: 'Despeses i Proveïdors' },
  { id: 'tresoreria', label: 'Tresoreria' },
  { id: 'fiscal',     label: 'Fiscal i Obligacions' },
];

export function ExportModal({ onClose, onExport }: ExportModalProps) {
  const [format, setFormat] = useState<'pdf-executiu' | 'pdf-complet' | 'excel' | 'csv'>('pdf-executiu');
  const [sections, setSections] = useState<string[]>(SECTIONS.map(s => s.id));
  const [includeLogo, setIncludeLogo] = useState(true);

  const toggleSection = (id: string) => {
    setSections(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id],
    );
  };

  const handleExport = () => {
    onExport({ format, sections, includeLogo, includeComparison: false });
    onClose();
  };

  const isPDF = format === 'pdf-executiu' || format === 'pdf-complet';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '560px' }}
      >
        <div className="modal-header">
          <h2>
            <Download size={22} />
            Descarregar Informe
          </h2>
          <button onClick={onClose} className="modal-close">
            <X size={22} />
          </button>
        </div>

        <div className="modal-body" style={{ padding: '1.5rem' }}>
          {/* Format selection */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-tertiary)', marginBottom: '0.75rem' }}>
              Format
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {[
                { value: 'pdf-executiu', icon: FileText, label: 'PDF Executiu', desc: 'Resum d\'1-2 pàgines amb el compte de resultats i projectes destacats' },
                { value: 'pdf-complet',  icon: FileText, label: 'PDF Complet',  desc: 'Totes les seccions seleccionades amb taules detallades' },
                { value: 'excel',        icon: Table,    label: 'Excel',        desc: 'Dades exportables per a anàlisi propi (un full per secció)' },
                { value: 'csv',          icon: FileSpreadsheet, label: 'CSV per Secció', desc: 'Dades raw de cada secció (un fitxer per secció)' },
              ].map(({ value, icon: Icon, label, desc }) => (
                <label
                  key={value}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.75rem',
                    padding: '0.875rem 1rem',
                    border: `2px solid ${format === value ? 'var(--color-accent-primary)' : 'var(--color-border)'}`,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    background: format === value ? 'var(--color-bg-tertiary)' : 'transparent',
                    transition: 'border-color 0.15s',
                  }}
                >
                  <input
                    type="radio"
                    name="format"
                    checked={format === value}
                    onChange={() => setFormat(value as typeof format)}
                    style={{ marginTop: '3px', flexShrink: 0 }}
                  />
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
                      <Icon size={15} />
                      <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{label}</span>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', margin: 0 }}>{desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Section selector (not for pdf-executiu) */}
          {format !== 'pdf-executiu' && (
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-tertiary)', marginBottom: '0.75rem' }}>
                Seccions a incloure
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.25rem' }}>
                {SECTIONS.map(section => (
                  <label
                    key={section.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.4rem 0.5rem',
                      cursor: 'pointer',
                      borderRadius: '6px',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={sections.includes(section.id)}
                      onChange={() => toggleSection(section.id)}
                    />
                    <span style={{ fontSize: '0.875rem' }}>{section.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Logo option (PDF only) */}
          {isPDF && (
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-tertiary)', marginBottom: '0.75rem' }}>
                Opcions
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.4rem 0.5rem' }}>
                <input
                  type="checkbox"
                  checked={includeLogo}
                  onChange={e => setIncludeLogo(e.target.checked)}
                />
                <span style={{ fontSize: '0.875rem' }}>Incloure logo de l'empresa</span>
              </label>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="btn-secondary">
            Cancel·lar
          </button>
          <button
            onClick={handleExport}
            className="btn-primary"
            disabled={format !== 'pdf-executiu' && sections.length === 0}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Download size={16} />
            Descarregar
          </button>
        </div>
      </div>
    </div>
  );
}

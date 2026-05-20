import React, { useState } from 'react';
import { X, Download, FileText, Table, FileSpreadsheet } from 'lucide-react';
import type { ExportConfig } from './types';

interface ExportModalProps {
  onClose: () => void;
  onExport: (config: ExportConfig) => void;
}

export function ExportModal({ onClose, onExport }: ExportModalProps) {
  const [format, setFormat] = useState<'pdf-executiu' | 'pdf-complet' | 'excel' | 'csv'>('pdf-executiu');
  const [sections, setSections] = useState<string[]>(['visio', 'financera', 'projectes', 'clients', 'despeses', 'temporal']);
  const [includeLogo, setIncludeLogo] = useState(true);
  const [includeComparison, setIncludeComparison] = useState(true);

  const availableSections = [
    { id: 'visio', label: 'Visió General' },
    { id: 'financera', label: 'Anàlisi Financera' },
    { id: 'projectes', label: 'Projectes i Rendibilitat' },
    { id: 'clients', label: 'Anàlisi de Clients' },
    { id: 'despeses', label: 'Despeses i Proveïdors' },
    { id: 'temporal', label: 'Temporal i Tendències' }
  ];

  const toggleSection = (sectionId: string) => {
    if (sections.includes(sectionId)) {
      setSections(sections.filter(s => s !== sectionId));
    } else {
      setSections([...sections, sectionId]);
    }
  };

  const handleExport = () => {
    onExport({
      format,
      sections,
      includeLogo,
      includeComparison
    });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '600px' }}
      >
        {/* Header */}
        <div className="modal-header">
          <h2>
            <Download size={24} />
            Descarregar Informe
          </h2>
          <button onClick={onClose} className="modal-close">
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body" style={{ padding: '1.5rem' }}>
          {/* Formato */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ 
              display: 'block', 
              fontSize: '0.9rem', 
              fontWeight: 600, 
              marginBottom: '0.75rem' 
            }}>
              Format
            </label>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {/* PDF Executiu */}
              <label style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem',
                padding: '1rem',
                border: `2px solid ${format === 'pdf-executiu' ? 'var(--color-accent-primary)' : 'var(--color-border)'}`,
                borderRadius: '8px',
                cursor: 'pointer',
                background: format === 'pdf-executiu' ? 'var(--color-bg-tertiary)' : 'transparent'
              }}>
                <input
                  type="radio"
                  name="format"
                  checked={format === 'pdf-executiu'}
                  onChange={() => setFormat('pdf-executiu')}
                  style={{ marginTop: '0.25rem' }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <FileText size={18} />
                    <span style={{ fontWeight: 600 }}>PDF Executiu</span>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', margin: 0 }}>
                    Resum d'1-2 pàgines amb KPIs principals
                  </p>
                </div>
              </label>

              {/* PDF Complet */}
              <label style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem',
                padding: '1rem',
                border: `2px solid ${format === 'pdf-complet' ? 'var(--color-accent-primary)' : 'var(--color-border)'}`,
                borderRadius: '8px',
                cursor: 'pointer',
                background: format === 'pdf-complet' ? 'var(--color-bg-tertiary)' : 'transparent'
              }}>
                <input
                  type="radio"
                  name="format"
                  checked={format === 'pdf-complet'}
                  onChange={() => setFormat('pdf-complet')}
                  style={{ marginTop: '0.25rem' }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <FileText size={18} />
                    <span style={{ fontWeight: 600 }}>PDF Complet</span>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', margin: 0 }}>
                    Totes les seccions amb gràfics i taules
                  </p>
                </div>
              </label>

              {/* Excel */}
              <label style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem',
                padding: '1rem',
                border: `2px solid ${format === 'excel' ? 'var(--color-accent-primary)' : 'var(--color-border)'}`,
                borderRadius: '8px',
                cursor: 'pointer',
                background: format === 'excel' ? 'var(--color-bg-tertiary)' : 'transparent'
              }}>
                <input
                  type="radio"
                  name="format"
                  checked={format === 'excel'}
                  onChange={() => setFormat('excel')}
                  style={{ marginTop: '0.25rem' }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <Table size={18} />
                    <span style={{ fontWeight: 600 }}>Excel amb Dades</span>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', margin: 0 }}>
                    Taules exportables per a anàlisi propi
                  </p>
                </div>
              </label>

              {/* CSV */}
              <label style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem',
                padding: '1rem',
                border: `2px solid ${format === 'csv' ? 'var(--color-accent-primary)' : 'var(--color-border)'}`,
                borderRadius: '8px',
                cursor: 'pointer',
                background: format === 'csv' ? 'var(--color-bg-tertiary)' : 'transparent'
              }}>
                <input
                  type="radio"
                  name="format"
                  checked={format === 'csv'}
                  onChange={() => setFormat('csv')}
                  style={{ marginTop: '0.25rem' }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <FileSpreadsheet size={18} />
                    <span style={{ fontWeight: 600 }}>CSV per Secció</span>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', margin: 0 }}>
                    Dades raw de cada pestanya (múltiples fitxers)
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Secciones (solo para PDF Complet, Excel y CSV) */}
          {format !== 'pdf-executiu' && (
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ 
                display: 'block', 
                fontSize: '0.9rem', 
                fontWeight: 600, 
                marginBottom: '0.75rem' 
              }}>
                Seccions a incloure
              </label>
              
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(2, 1fr)', 
                gap: '0.5rem' 
              }}>
                {availableSections.map(section => (
                  <label 
                    key={section.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.5rem',
                      cursor: 'pointer'
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

          {/* Opciones adicionales (solo para PDF) */}
          {(format === 'pdf-executiu' || format === 'pdf-complet') && (
            <div>
              <label style={{ 
                display: 'block', 
                fontSize: '0.9rem', 
                fontWeight: 600, 
                marginBottom: '0.75rem' 
              }}>
                Opcions addicionals
              </label>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem',
                  cursor: 'pointer'
                }}>
                  <input
                    type="checkbox"
                    checked={includeLogo}
                    onChange={(e) => setIncludeLogo(e.target.checked)}
                  />
                  <span style={{ fontSize: '0.875rem' }}>Incloure logo empresa</span>
                </label>
                
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem',
                  cursor: 'pointer'
                }}>
                  <input
                    type="checkbox"
                    checked={includeComparison}
                    onChange={(e) => setIncludeComparison(e.target.checked)}
                  />
                  <span style={{ fontSize: '0.875rem' }}>Incloure comparatives de períodes</span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button 
            onClick={onClose}
            className="btn-secondary"
          >
            Cancel·lar
          </button>
          <button 
            onClick={handleExport}
            className="btn-primary"
            disabled={format !== 'pdf-executiu' && sections.length === 0}
          >
            <Download size={18} />
            Descarregar
          </button>
        </div>
      </div>
    </div>
  );
}
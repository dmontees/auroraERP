import React, { useState } from 'react';
import { X, FileText, FolderKanban } from 'lucide-react';
import { storage } from '../../utils/storageManager';
import type { Pressupost } from '../../types/pressupost';
import { usePressupost } from './hooks/usePressupost';
import { useAutoSave } from '../../hooks/useAutoSave';
import { generarPressupostPDF } from '../../utils/generarPressupostPDF';
import DadesTab from './tabs/DadesTab';
import ProjecteTab from './tabs/ProjecteTab';
import GastosTab from './tabs/GastosTab';
import TasquesTab from './tabs/TasquesTab';
import NotesTab from './tabs/NotesTab';
import { Trash2 } from 'lucide-react';

interface PressupostModalProps {
  onClose: () => void;
  onSave: (pressupost: Pressupost) => void;
  onDelete?: (codi: string) => void;
  nextCode: string;
  editingPressupost?: Pressupost | null;
}

export default function PressupostModal({
  onClose,
  onSave,
  onDelete,
  nextCode,
  editingPressupost
}: PressupostModalProps) {
  
  const [activeTab, setActiveTab] = useState<'dades' | 'projecte' | 'gastos' | 'tasques' | 'notes'>('dades');
  const [showLanguageModal, setShowLanguageModal] = useState(false);

  const hook = usePressupost({
    initialPressupost: editingPressupost || null,
    nextCode
  });

  const { formData, setFormData, clients, pressupostBloquejat, esEliminable, crearProjecteDesdePressupost } = hook;

  const { saveNow } = useAutoSave(formData, onSave);

  const generarPDF = (idioma: 'ca' | 'es' | 'en') => {
    generarPressupostPDF(formData, clients, idioma);
  };

  const handleDelete = () => {
    if (!editingPressupost) return;
    
    let motiu = '';
    
    if (formData.estat !== 'esborrany') {
      motiu = 'Només es poden eliminar pressupostos en estat "Esborrany".';
    } else if (formData.projecteCreat && hook.projectes.some(p => p.codi === formData.projecteCreat)) {
      motiu = `Aquest pressupost té un projecte creat (${formData.projecteCreat}) i no es pot eliminar.`;
    } else if (formData.projecteVinculat && hook.projectes.some(p => p.codi === formData.projecteVinculat)) {
      motiu = `Aquest pressupost està vinculat a un projecte (${formData.projecteVinculat}) i no es pot eliminar.`;
    }
    
    if (motiu) {
      alert(motiu);
      return;
    }
    
    if (confirm(`Estàs segur que vols eliminar el pressupost ${formData.codi}?\n\nAquesta acció no es pot desfer.`)) {
      onDelete?.(formData.codi);
      onClose();
    }
  };

  const handleCrearProjecte = () => {
    const pressupostActualitzat = crearProjecteDesdePressupost();
    if (pressupostActualitzat) {
      onSave(pressupostActualitzat);
    }
  };

  return (
    <div className="modal-overlay">
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()} 
        style={{ 
          maxWidth: '1400px',
          maxHeight: '90vh', 
          overflow: 'hidden', 
          display: 'flex', 
          flexDirection: 'column' 
        }}
      >
        {/* HEADER DEL MODAL */}
        <div className="modal-header">
          <h2>
            <FileText size={24} />
            {editingPressupost ? 'Editar' : 'Nou'} Pressupost - {formData.codi}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button
              type="button"
              onClick={() => setShowLanguageModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                background: '#dc2626',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.9rem'
              }}
              title="Descarregar PDF"
            >
              <FileText size={18} />
              PDF
            </button>
            
            {formData.estat === 'acceptat' && !formData.projecteCreat && !formData.projecteVinculat && (
              <button
                type="button"
                onClick={handleCrearProjecte}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 1rem',
                  background: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.9rem'
                }}
                title="Crear projecte des d'aquest pressupost"
              >
                <FolderKanban size={18} />
                Crear Projecte
              </button>
            )}

            {(formData.projecteVinculat || formData.projecteCreat) && (
              <div 
                onClick={() => {
                  const codiProjecte = formData.projecteVinculat || formData.projecteCreat;
                  storage.setNavigateTo({
                    type: 'projecte',
                    codi: codiProjecte as string
                  });
                  onClose();
                  setTimeout(() => {
                    window.dispatchEvent(new CustomEvent('navigate-to', { 
                      detail: { section: 'projectes', codi: codiProjecte } 
                    }));
                  }, 100);
                }}
                style={{
                  padding: '0.5rem 1rem',
                  background: '#dbeafe',
                  color: '#1e40af',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'opacity 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                title="Clic per obrir el projecte"
              >
                Projecte {formData.projecteCreat ? 'Creat' : 'Vinculat'}:<br /> 
                {formData.projecteVinculat || formData.projecteCreat}
              </div>
            )}

            <label style={{ fontSize: '0.9rem', fontWeight: 600 }}>Estat:</label>
            <select
              className="form-input"
              value={formData.estat}
              onChange={(e) => setFormData({ ...formData, estat: e.target.value as any })}
              style={{
                padding: '0.5rem',
                borderRadius: '6px',
                fontWeight: 600,
                background: formData.estat === 'esborrany' ? '#fef3c7' :
                           formData.estat === 'enviat' ? '#dbeafe' :
                           formData.estat === 'acceptat' ? '#d1fae5' : '#fee2e2',
                color: formData.estat === 'esborrany' ? '#92400e' :
                       formData.estat === 'enviat' ? '#1e40af' :
                       formData.estat === 'acceptat' ? '#065f46' : '#991b1b',
                border: 'none'
              }}
            >
              <option value="esborrany">Esborrany</option>
              <option value="enviat">Enviat</option>
              <option value="acceptat">Acceptat</option>
              <option value="rebutjat">Rebutjat</option>
            </select>
            
            <button
              type="button"
              onClick={() => { saveNow(); onClose(); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px',
                background: 'transparent',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                color: 'var(--color-text-secondary)',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--color-bg-tertiary)';
                e.currentTarget.style.color = 'var(--color-text-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--color-text-secondary)';
              }}
              title="Tancar"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          {/* PESTAÑAS DE NAVEGACIÓN */}
          <div style={{
            display: 'flex',
            borderBottom: '2px solid var(--color-border)',
            padding: '0 var(--spacing-xl)',
            flexShrink: 0
          }}>
            {[
              { id: 'dades', label: '1. Dades' },
              { id: 'projecte', label: '2. Detalls Projecte' },
              { id: 'gastos', label: '3. Despeses i materials' },
              { id: 'tasques', label: '4. Tasques' },
              { id: 'notes', label: '5. Notes a peu de pàgina' }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  padding: '1rem 1.5rem',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: activeTab === tab.id ? '2px solid var(--color-accent-primary)' : '2px solid transparent',
                  color: activeTab === tab.id ? 'var(--color-accent-primary)' : 'var(--color-text-secondary)',
                  fontWeight: activeTab === tab.id ? 600 : 400,
                  cursor: 'pointer',
                  marginBottom: '-2px'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="modal-body" style={{ flex: 1, overflow: 'auto' }}>
            {activeTab === 'dades' && <DadesTab hook={hook} />}
            {activeTab === 'projecte' && <ProjecteTab hook={hook} />}
            {activeTab === 'gastos' && <GastosTab hook={hook} />}
            {activeTab === 'tasques' && <TasquesTab hook={hook} />}
            {activeTab === 'notes' && <NotesTab hook={hook} />}
          </div>
        </div>

        {/* FOOTER DEL MODAL */}
        <div className="modal-footer" style={{
          display: 'flex',
          justifyContent: editingPressupost && esEliminable ? 'space-between' : 'flex-end',
          gap: '1rem',
          flexShrink: 0
        }}>
          {editingPressupost && esEliminable && (
            <button
              type="button"
              onClick={handleDelete}
              className="btn-secondary"
              style={{
                borderColor: '#dc2626',
                color: '#dc2626'
              }}
            >
              <Trash2 size={18} />
              Eliminar
            </button>
          )}
          
          <button type="button" className="btn-primary" onClick={() => {
            saveNow();
            onClose();
          }}>
            Acceptar
          </button>
        </div>
      </div>

      {/* MODAL DE SELECCIÓN DE IDIOMA PARA PDF */}
      {showLanguageModal && (
        <div 
          className="modal-overlay" 
          onClick={() => setShowLanguageModal(false)}
          style={{ zIndex: 2000 }}
        >
          <div 
            className="modal-content" 
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '400px' }}
          >
            <div className="modal-header">
              <h2>
                <FileText size={24} />
                Selecciona l'idioma del PDF
              </h2>
              <button className="modal-close" onClick={() => setShowLanguageModal(false)}>
                <X size={24} />
              </button>
            </div>

            <div className="modal-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => {
                    generarPDF('ca');
                    setShowLanguageModal(false);
                  }}
                  style={{ justifyContent: 'center', fontSize: '1rem', padding: '1rem' }}
                >
                  🏴󠁥󠁳󠁣󠁴󠁿 Català
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => {
                    generarPDF('es');
                    setShowLanguageModal(false);
                  }}
                  style={{ justifyContent: 'center', fontSize: '1rem', padding: '1rem' }}
                >
                  🇪🇸 Castellano
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => {
                    generarPDF('en');
                    setShowLanguageModal(false);
                  }}
                  style={{ justifyContent: 'center', fontSize: '1rem', padding: '1rem' }}
                >
                  🇬🇧 English
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
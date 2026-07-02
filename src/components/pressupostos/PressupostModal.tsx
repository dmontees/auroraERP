import React, { useState } from 'react';
import { X, FileText, FolderKanban } from 'lucide-react';
import { storage } from '../../utils/storageManager';
import flagCa from '../../assets/flag-ca.png';
import flagEs from '../../assets/flag-es.png';
import flagEn from '../../assets/flag-en.png';
import type { Pressupost } from '../../types/pressupost';
import { usePressupost } from './hooks/usePressupost';
import { useAutoSave } from '../../hooks/useAutoSave';
import { generarPressupostPDF } from '../../utils/generarPressupostPDF';
import { buildClientDocumentPath, buildProjectDocumentPath, createDocumentRef, versionedPdfName } from '../../utils/documentManager';
import DadesTab from './tabs/DadesTab';
import ProjecteTab from './tabs/ProjecteTab';
import GastosTab from './tabs/GastosTab';
import TasquesTab from './tabs/TasquesTab';
import NotesTab from './tabs/NotesTab';
import { Trash2 } from 'lucide-react';
import DocumentVersionsPanel from '../common/DocumentVersionsPanel';

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

  const generarPDF = async (idioma: 'ca' | 'es' | 'en') => {
    const rootPath = storage.getParametres().gestorDocumental?.rootPath;
    const electronDocuments = typeof window !== 'undefined' ? window.electronDocuments : undefined;
    const projecteCodi = formData.projecteCreat || formData.projecteVinculat;
    const projecte = projecteCodi ? hook.projectes.find(p => p.codi === projecteCodi) : null;
    const client = clients.find(c => c.codi === formData.client);

    if (!rootPath || !electronDocuments || !client) {
      generarPressupostPDF(formData, clients, idioma);
      return;
    }

    const existingRefs = formData.documentsGenerats || [];
    const matchingRefs = existingRefs.filter(ref => ref.displayName.startsWith(`${formData.codi}_${idioma}`));
    const version = Math.max(0, ...matchingRefs.map(ref => ref.version || 0)) + 1;
    const filename = versionedPdfName(`${formData.codi}_${idioma}`, version);
    const relativePath = projecte
      ? buildProjectDocumentPath(
          client.codi,
          client.nomComercial || client.nomFiscal || 'Client',
          projecte.codi,
          projecte.titol || formData.nomProjecte || 'Projecte',
          'pressupostos',
          filename
        )
      : buildClientDocumentPath(
          client.codi,
          client.nomComercial || client.nomFiscal || 'Client',
          'pressupostos',
          filename
        );
    const dataBase64 = generarPressupostPDF(formData, clients, idioma, { save: false });
    const result = await electronDocuments.writeFile({ rootPath, relativePath, dataBase64 });

    if (!result.success || !result.data) {
      alert(result.error || 'No sha pogut guardar el PDF del pressupost.');
      generarPressupostPDF(formData, clients, idioma);
      return;
    }

    const fileRef = createDocumentRef({
      kind: 'pressupost',
      ownerType: projecte ? 'projecte' : 'client',
      ownerCodi: projecte?.codi || client.codi,
      displayName: `${formData.codi}_${idioma}`,
      originalName: filename,
      relativePath,
      mimeType: 'application/pdf',
      size: result.data.size,
      sha256: result.data.sha256,
      version,
      generated: true,
    });

    const updated: Pressupost = {
      ...formData,
      documentsGenerats: [
        ...existingRefs.map(ref => ref.displayName.startsWith(`${formData.codi}_${idioma}`) ? { ...ref, current: false, replacedBy: fileRef.id } : ref),
        fileRef,
      ],
    };
    setFormData(updated);
    onSave(updated);
    const openResult = await electronDocuments.openFile({ rootPath, relativePath });
    if (!openResult.success) {
      alert(`PDF guardat al gestor documental: ${filename}`);
    }
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
                background: 'var(--color-error-dark)',
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
                  background: 'var(--color-success)',
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
                  background: 'var(--color-info-bg)',
                  color: 'var(--color-info-dark)',
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
                background: formData.estat === 'esborrany' ? 'var(--color-warning-bg)' :
                           formData.estat === 'enviat' ? 'var(--color-info-bg)' :
                           formData.estat === 'acceptat' ? 'var(--color-success-bg)' : 'var(--color-error-bg)',
                color: formData.estat === 'esborrany' ? 'var(--color-warning-dark)' :
                       formData.estat === 'enviat' ? 'var(--color-info-dark)' :
                       formData.estat === 'acceptat' ? 'var(--color-success-dark)' : 'var(--color-error-darker)',
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

        <DocumentVersionsPanel title="PDFs generats del pressupost" documents={formData.documentsGenerats} />

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
                borderColor: 'var(--color-error-dark)',
                color: 'var(--color-error-dark)'
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
                  onClick={() => { generarPDF('ca'); setShowLanguageModal(false); }}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', padding: '1rem', gap: '1.25rem' }}
                >
                  <img src={flagCa} alt="Català" style={{ width: 16, height: 16, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                  Català
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => { generarPDF('es'); setShowLanguageModal(false); }}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', padding: '1rem', gap: '1.25rem' }}
                >
                  <img src={flagEs} alt="Castellano" style={{ width: 16, height: 16, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                  Castellano
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => { generarPDF('en'); setShowLanguageModal(false); }}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', padding: '1rem', gap: '1.25rem' }}
                >
                  <img src={flagEn} alt="English" style={{ width: 16, height: 16, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                  English
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

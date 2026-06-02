import React, { useState } from 'react';
import { X, Users, Trash2 } from 'lucide-react';
import type { Client } from '../../types/client';
import { useAutoSave } from '../../hooks/useAutoSave';
import { useClientData } from './useClientData';
import { useClientValidation } from './useClientValidation';
import DadesTab from './tabs/DadesTab';
import ContactesTab from './tabs/ContactesTab';
import FacturacioTab from './tabs/FacturacioTab';
import ClientTarifesModal from './ClientTarifesModal';
import ClientTarifesCopyModal from './ClientTarifesCopyModal';
import { storage } from '../../utils/storageManager';

interface ClientModalProps {
  onClose: () => void;
  onSave: (client: Client) => void;
  onDelete?: (codi: string) => void;
  nextCode: string;
  nextContactCode: string;
  editingClient?: Client | null;
}

export default function ClientModal({ 
  onClose, 
  onSave, 
  onDelete, 
  nextCode, 
  nextContactCode, 
  editingClient 
}: ClientModalProps) {
  
  const [activeTab, setActiveTab] = useState<'dades' | 'contactes' | 'facturacio'>('dades');
  const [showTarifesModal, setShowTarifesModal] = useState(false);
  const [askCopyTarifes, setAskCopyTarifes] = useState(false);

  const { formData, setFormData, parametres, isClientInUse } = useClientData(editingClient, nextCode);
  const { validateAndClose } = useClientValidation();
  const { saveNow } = useAutoSave(formData, onSave);

  const handleClose = () => {
    validateAndClose(formData, saveNow, onClose);
  };

  const handleDelete = () => {
    if (!confirm(`Estàs segur que vols eliminar el client ${formData.nomComercial || formData.nomFiscal}?\n\nAquesta acció no es pot desfer.`)) {
      return;
    }
    onDelete?.(editingClient!.codi);
    onClose();
  };

  const handleOpenTarifes = () => {
    if (!formData.tarifesEspecials || formData.tarifesEspecials.length === 0) {
      setAskCopyTarifes(true);
    } else {
      setShowTarifesModal(true);
    }
  };

  const handleCopyTarifes = () => {
    if (!parametres) return;
    
    const allClients = storage.getClients();
    
    const tarifesGenerals = parametres.tarifes || [];
    const tarifesEspecials = allClients.flatMap((c: Client) => c.tarifesEspecials || []);
    const totesTarifes = [...tarifesGenerals, ...tarifesEspecials];
    
    let nextCodeNum = totesTarifes.length === 0 
      ? 1 
      : Math.max(...totesTarifes.map(t => parseInt(t.codi.split('-')[1]))) + 1;
    
    const tarifesCopiades = parametres.tarifes.map(t => ({
      codi: `TRF-${String(nextCodeNum++).padStart(5, '0')}`,
      servei: t.servei,
      unitat: t.unitat,
      preu: t.preu
    }));
    
    setFormData({ ...formData, tarifesEspecials: tarifesCopiades });
    setAskCopyTarifes(false);
    setShowTarifesModal(true);
  };

  const handleStartEmpty = () => {
    setFormData({ ...formData, tarifesEspecials: [] });
    setAskCopyTarifes(false);
    setShowTarifesModal(true);
  };

  const tabs = [
    { id: 'dades' as const, label: 'Dades' },
    { id: 'contactes' as const, label: 'Contactes' },
    { id: 'facturacio' as const, label: 'Facturació' }
  ];

  return (
    <div className="modal-overlay">
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ 
        maxWidth: '800px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* HEADER */}
        <div className="modal-header">
          <h2>
            <Users size={24} />
            {editingClient ? 'Editar Client' : 'Nou Client'}
          </h2>
          <button className="modal-close" onClick={handleClose}>
            <X size={24} />
          </button>
        </div>

        {/* TABS */}
        <div style={{
          display: 'flex',
          borderBottom: '2px solid var(--color-border)',
          padding: '0 var(--spacing-xl)',
        }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
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

        {/* BODY */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div className="modal-body" style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
            {activeTab === 'dades' && (
              <DadesTab formData={formData} setFormData={setFormData} />
            )}
            {activeTab === 'contactes' && (
              <ContactesTab 
                formData={formData} 
                setFormData={setFormData}
                nextContactCode={nextContactCode}
              />
            )}
            {activeTab === 'facturacio' && (
              <FacturacioTab 
                formData={formData} 
                setFormData={setFormData}
                onOpenTarifes={handleOpenTarifes}
              />
            )}
          </div>
        </div>

        {/* FOOTER */}
        <div className="modal-footer" style={{
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center'
        }}>
          {editingClient && !isClientInUse && (
            <button
              type="button"
              onClick={handleDelete}
              className="btn-secondary"
              style={{
                borderColor: 'var(--color-error-dark)',
                color: 'var(--color-error-dark)',
                marginRight: 'auto'
              }}
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

      {/* MODALES ANIDADOS */}
      {askCopyTarifes && (
        <ClientTarifesCopyModal
          onClose={() => setAskCopyTarifes(false)}
          onCopyTarifes={handleCopyTarifes}
          onStartEmpty={handleStartEmpty}
        />
      )}

      {showTarifesModal && parametres && (
        <ClientTarifesModal
          formData={formData}
          setFormData={setFormData}
          parametres={parametres}
          onClose={() => setShowTarifesModal(false)}
        />
      )}
    </div>
  );
}
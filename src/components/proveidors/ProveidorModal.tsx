import React, { useState } from 'react';
import { X, Trash2, Users } from 'lucide-react';
import type { Proveidor } from '../../types/proveidor';
import { useProveidor } from './hooks/useProveidor';
import DadesTab from './tabs/DadesTab';
import FacturacioTab from './tabs/FacturacioTab';
import HistorialTab from './tabs/HistorialTab';
import DocumentsTab from './tabs/DocumentsTab';

interface ProveidorModalProps {
  onClose: () => void;
  onSave: (proveidor: Proveidor) => void;
  onDelete?: (codi: string) => void;
  nextCode: string;
  editingProveidor?: Proveidor | null;
  tipus: 'Proveïdor' | 'Acreedor';
}

export default function ProveidorModal({
  onClose,
  onSave,
  onDelete,
  nextCode,
  editingProveidor,
  tipus
}: ProveidorModalProps) {
  
  const [activeTab, setActiveTab] = useState<'dades' | 'facturacio' | 'historial' | 'documents'>('dades');

  const hook = useProveidor({
    initialProveidor: editingProveidor || null,
    nextCode,
    tipus
  });

  const { formData, hasRealData, hasValidData, shouldWarn, esEliminable } = hook;

  const handleClose = () => {
    // Si hay cambios pero falta el campo obligatorio
    if (shouldWarn) {
      const confirmar = confirm(
        'Has fet canvis però falta el camp obligatori "Nom fiscal".\n\n' +
        'Si continues sense emplenar-lo, els canvis no es guardaran.\n\n' +
        'Vols continuar sense guardar?'
      );
      
      if (!confirmar) {
        // El usuario quiere quedarse para rellenar el campo
        setActiveTab('dades'); // Cambiar a la tab de datos
        return;
      }
      // El usuario confirma que quiere salir sin guardar
      onClose();
      return;
    }

    // Auto-guardar si hay datos válidos
    if (hasRealData && hasValidData) {
      onSave(formData);
    }
    
    onClose();
  };

  const handleDelete = () => {
    if (!confirm(`Estàs segur que vols eliminar ${formData.nomComercial || formData.nomFiscal}?\n\nAquesta acció no es pot desfer.`)) {
      return;
    }
    onDelete?.(editingProveidor!.codi);
    onClose();
  };

  const tabs = [
    { id: 'dades' as const, label: 'Dades' },
    { id: 'facturacio' as const, label: 'Facturació' },
    { id: 'historial' as const, label: 'Historial', disabled: !editingProveidor },
    { id: 'documents' as const, label: 'Documents' }
  ];

  return (
    <div className="modal-overlay">
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()} 
        style={{ 
          maxWidth: '800px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {/* HEADER */}
        <div className="modal-header">
          <h2>
            <Users size={24} />
            {editingProveidor ? `Editar ${editingProveidor.tipus || tipus}` : `Nou ${tipus}`}
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
              onClick={() => !tab.disabled && setActiveTab(tab.id)}
              disabled={tab.disabled}
              style={{
                padding: '1rem 1.5rem',
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === tab.id ? '2px solid var(--color-accent-primary)' : '2px solid transparent',
                color: tab.disabled 
                  ? 'var(--color-text-tertiary)' 
                  : activeTab === tab.id 
                    ? 'var(--color-accent-primary)' 
                    : 'var(--color-text-secondary)',
                fontWeight: activeTab === tab.id ? 600 : 400,
                cursor: tab.disabled ? 'not-allowed' : 'pointer',
                marginBottom: '-2px',
                opacity: tab.disabled ? 0.5 : 1
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* BODY */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div className="modal-body" style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
            {activeTab === 'dades' && <DadesTab hook={hook} />}
            {activeTab === 'facturacio' && <FacturacioTab hook={hook} />}
            {activeTab === 'historial' && <HistorialTab hook={hook} />}
            {activeTab === 'documents' && <DocumentsTab hook={hook} />}
          </div>
        </div>

        {/* FOOTER */}
        <div className="modal-footer" style={{
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center'
        }}>
          {editingProveidor && esEliminable && (
            <button
              type="button"
              onClick={handleDelete}
              className="btn-secondary"
              style={{
                borderColor: '#dc2626',
                color: '#dc2626',
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
    </div>
  );
}
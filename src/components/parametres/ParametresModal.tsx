import React, { useState } from 'react';
import { X, Settings } from 'lucide-react';
import { useParametres } from './hooks/useParametres';
import ServeisTab from './tabs/ServeisTab';
import UnitatsTab from './tabs/UnitatsTab';
import TarifesTab from './tabs/TarifesTab';
import MaterialsTab from './tabs/MaterialsTab';
import PlantillesTab from './tabs/PlantillesTab';
import ModalitatsTab from './tabs/ModalitatsTab';
import EmpresaTab from './tabs/EmpresaTab';
import CategoriesProveidorsTab from './tabs/CategoriesProveidorsTab';

interface ParametresModalProps {
  onClose: () => void;
}

type TabType = 'empresa' | 'serveis' | 'unitats' | 'tarifes' | 'materials' | 'plantilles' | 'modalitats' | 'categoriesProveidors';

export default function ParametresModal({ onClose }: ParametresModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('empresa');

  // Hook centralizado con toda la lógica
  const hook = useParametres();

  // ============================================================================
  // TABS CONFIGURATION
  // ============================================================================

  const tabs: { id: TabType; label: string }[] = [
    { id: 'empresa', label: 'Empresa' },
    { id: 'serveis', label: 'Serveis' },
    { id: 'unitats', label: 'Unitats' },
    { id: 'tarifes', label: 'Tarifes' },
    { id: 'materials', label: 'Materials' },
    { id: 'plantilles', label: 'Plantilles' },
    { id: 'modalitats', label: 'Modalitats' },
    { id: 'categoriesProveidors', label: 'Cat. Proveïdors' }
  ];

  // ============================================================================
  // RENDER TAB CONTENT
  // ============================================================================

  const renderTabContent = () => {
    switch (activeTab) {
      case 'empresa':
        return <EmpresaTab hook={hook} />;
      
      case 'serveis':
        return <ServeisTab hook={hook} />;
      
      case 'unitats':
        return <UnitatsTab hook={hook} />;
      
      case 'tarifes':
        return <TarifesTab hook={hook} />;
      
      case 'materials':
        return <MaterialsTab hook={hook} />;
      
      case 'plantilles':
        return <PlantillesTab hook={hook} />;
      
      case 'modalitats':
        return <ModalitatsTab hook={hook} />;
      
      case 'categoriesProveidors':
        return <CategoriesProveidorsTab hook={hook} />;
      
      default:
        return null;
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div 
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ 
          maxWidth: '1200px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {/* HEADER */}
        <div className="modal-header">
          <h2 style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            margin: 0,
            fontSize: '1.5rem',
            fontWeight: 600
          }}>
            <Settings size={24} />
            Paràmetres del Sistema
          </h2>
          <button 
            className="modal-close" 
            onClick={onClose}
          >
            <X size={24} />
          </button>
        </div>

        {/* TABS NAVIGATION */}
        <div style={{
          display: 'flex',
          borderBottom: '2px solid var(--color-border)',
          padding: '0 1.5rem',
          overflowX: 'auto',
          gap: '0.5rem'
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
                borderBottom: activeTab === tab.id 
                  ? '2px solid var(--color-accent-primary)' 
                  : '2px solid transparent',
                color: activeTab === tab.id 
                  ? 'var(--color-accent-primary)' 
                  : 'var(--color-text-secondary)',
                fontWeight: activeTab === tab.id ? 600 : 400,
                cursor: 'pointer',
                marginBottom: '-2px',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* TAB CONTENT */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '1.5rem'
        }}>
          {renderTabContent()}
        </div>

        {/* FOOTER */}
        <div 
          className="modal-footer"
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            background: '#f9fafb'
          }}
        >
          <button
            onClick={onClose}
            className="btn-primary"
          >
            Tancar
          </button>
        </div>
      </div>
    </div>
  );
}
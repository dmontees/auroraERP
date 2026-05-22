import React, { useState } from 'react';
import { useParametres } from './hooks/useParametres';
import EmpresaTab from './tabs/EmpresaTab';
import ServeisTab from './tabs/ServeisTab';
import UnitatsTab from './tabs/UnitatsTab';
import TarifesTab from './tabs/TarifesTab';
import MaterialsTab from './tabs/MaterialsTab';
import PlantillesTab from './tabs/PlantillesTab';
import ModalitatsTab from './tabs/ModalitatsTab';
import CategoriesProveidorsTab from './tabs/CategoriesProveidorsTab';

type TabType = 'empresa' | 'serveis' | 'unitats' | 'tarifes' | 'materials' | 'plantilles' | 'modalitats' | 'categoriesProveidors';

export default function ParametresPage() {
  const [activeTab, setActiveTab] = useState<TabType>('serveis');

  // Hook centralizado con toda la lógica
  const hook = useParametres();

  // Tabs configuration
  const tabs: { id: TabType; label: string }[] = [
    { id: 'serveis', label: 'Serveis' },
    { id: 'unitats', label: 'Unitats' },
    { id: 'tarifes', label: 'Tarifes' },
    { id: 'materials', label: 'Materials' },
    { id: 'plantilles', label: 'Plantilles' },
    { id: 'modalitats', label: 'Modalitats' },
    { id: 'categoriesProveidors', label: 'Cat. Proveïdors' },
    { id: 'empresa', label: 'Dades Empresa' }
  ];

  // Render tab content
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

  return (
    <div>
      {/* PESTAÑAS DE NAVEGACIÓ */}
      <div style={{
        display: 'flex',
        borderBottom: '2px solid var(--color-border)',
        marginBottom: '1.5rem',
        gap: '0.5rem',
        overflowX: 'auto'
      }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid var(--color-accent-primary)' : '2px solid transparent',
              color: activeTab === tab.id ? 'var(--color-accent-primary)' : 'var(--color-text-secondary)',
              fontWeight: activeTab === tab.id ? 600 : 400,
              cursor: 'pointer',
              marginBottom: '-2px',
              whiteSpace: 'nowrap'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB CONTENT */}
      {renderTabContent()}
    </div>
  );
}
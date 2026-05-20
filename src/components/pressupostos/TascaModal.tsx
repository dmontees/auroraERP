import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import SearchableSelect from '../common/SearchableSelect';
import type { Tasca } from '../../types/pressupost';

interface Props {
  onClose: () => void;
  onSave: (tasca: Tasca, categoria: string) => void;
  existingCategories: string[];
  editingTasca?: Tasca;
  editingCategory?: string;
  serveis?: Array<{ codi: string; nom: string; categoria: string }>;
  unitats?: Array<{ codi: string; nom: string }>;
  clientTarifes?: Array<{ servei: string; unitat: string; preu: number }>;
  parametres?: any;
}

export default function TascaModal({
  onClose,
  onSave,
  existingCategories,
  editingTasca,
  editingCategory,
  serveis = [],
  unitats = [],
  clientTarifes = [],
  parametres
}: Props) {
  const [formData, setFormData] = useState({
    servei: editingTasca?.servei || '',
    descripcio: editingTasca?.descripcio || '',
    quantitat: editingTasca?.quantitat || 1,
    unitat: editingTasca?.unitat || '',
    preu: editingTasca?.preu || 0
  });

  // Buscar tarifa del cliente o de parámetros
  const buscarTarifa = (servei: string, unitat: string): number => {
    // 1. Buscar primero en tarifas del cliente
    const tarifaClient = clientTarifes.find(t => t.servei === servei && t.unitat === unitat);
    if (tarifaClient) {
      return tarifaClient.preu;
    }
    
    // 2. Si no hay tarifa del cliente, buscar en tarifas generales de parámetros
    const tarifaGeneral = parametres?.tarifes?.find((t: any) => t.servei === servei && t.unitat === unitat);
    if (tarifaGeneral) {
      return tarifaGeneral.preu;
    }
        return 0;
  };

  // Cambio de servei
  const handleServeiChange = (codiServei: string) => {
    const serveiData = serveis.find(s => s.codi === codiServei);
    
    setFormData(prev => ({
      ...prev,
      servei: codiServei,
      descripcio: serveiData?.descripcio || '',
      preu: prev.unitat ? buscarTarifa(codiServei, prev.unitat) : 0
    }));
  };

  // Cambio de unitat
  const handleUnitatChange = (codiUnitat: string) => {

    
    const preu = formData.servei ? buscarTarifa(formData.servei, codiUnitat) : 0;
    
    setFormData(prev => ({
      ...prev,
      unitat: codiUnitat,
      preu
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
  
    if (!formData.servei || !formData.unitat) {
      alert('Has de seleccionar un servei i una unitat');
      return;
    }
  
    // Obtener nombre del servei
    const serveiData = serveis.find(s => s.codi === formData.servei);
    const serveiNom = serveiData?.nom || formData.servei;
  
    // Obtener nombre de unitat
    const unitatData = unitats.find(u => u.codi === formData.unitat);
    const unitatNom = unitatData?.nom || formData.unitat;
  
    // Determinar categoría
    let categoria = editingCategory || '';
    if (!categoria) {
      categoria = serveiData?.categoria || 'ALTRES';
    }
  
    const tasca: Tasca = {
      id: editingTasca?.id || `task-${Date.now()}-${Math.random()}`,
      servei: serveiNom,  // Guardar NOMBRE, no código
      descripcio: formData.descripcio,
      quantitat: formData.quantitat,
      unitat: unitatNom,  // Guardar NOMBRE, no código
      preu: formData.preu
    };
  
    onSave(tasca, categoria);
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 2000 }}>
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()} 
        style={{ maxWidth: '600px' }}
      >
        <div className="modal-header">
          <h2>{editingTasca ? 'Editar Tasca' : 'Afegir Tasca'}</h2>
          <button className="modal-close" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label>Servei *</label>
              <SearchableSelect
                value={formData.servei}
                onChange={handleServeiChange}
                options={serveis.map(s => ({ value: s.codi, label: s.nom }))}
                placeholder="Selecciona servei..."
              />
            </div>

            <div className="form-group">
              <label>Descripció</label>
              <textarea
                className="form-input"
                value={formData.descripcio}
                onChange={(e) => setFormData({ ...formData, descripcio: e.target.value })}
                rows={3}
                placeholder="Detalls addicionals de la tasca..."
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label>Quantitat *</label>
                <input
                  type="number"
                  className="form-input"
                  value={formData.quantitat}
                  onChange={(e) => setFormData({ ...formData, quantitat: parseFloat(e.target.value) || 0 })}
                  min="0"
                  step="0.01"
                  required
                />
              </div>

              <div className="form-group">
  <label>Unitat *</label>
  <SearchableSelect
    value={formData.unitat}
    onChange={handleUnitatChange}
    options={unitats.map(u => ({ value: u.codi, label: u.nom }))}
    placeholder="Selecciona unitat..."
  />
</div>
            </div>

            <div className="form-group">
              <label>Tarifa (€)</label>
              <input
                type="number"
                className="form-input"
                value={formData.preu}
                onChange={(e) => setFormData({ ...formData, preu: parseFloat(e.target.value) || 0 })}
                min="0"
                step="0.01"
              />
            </div>

            <div style={{
              padding: '1rem',
              background: 'var(--color-bg-tertiary)',
              borderRadius: '6px',
              marginTop: '1rem'
            }}>
              <strong>Import total:</strong> {(formData.quantitat * formData.preu).toFixed(2)}€
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel·lar
            </button>
            <button type="submit" className="btn-primary">
              {editingTasca ? 'Desar Canvis' : 'Afegir Tasca'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
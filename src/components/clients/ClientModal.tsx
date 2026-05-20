import { useState, useEffect } from 'react';
import { X, Users, Trash2} from 'lucide-react';
import type { Client } from '../../types/client';
import SearchableSelect from '../common/SearchableSelect';
import { useAutoSave } from '../../hooks/useAutoSave';


interface ClientModalProps {
  onClose: () => void;
  onSave: (client: Client) => void;
  onDelete?: (codi: string) => void;
  nextCode: string;
  nextContactCode: string;  // ← AÑADE ESTA LÍNEA
  editingClient?: Client | null;
}
// ============================================================================
// COMPONENTE: MODAL DE CLIENT
// Formulario con pestañas para crear/editar clientes
// ============================================================================

// Helper para detectar si hay cambios en el cliente
function hasRealClientData(data: any): boolean {
  return (
    data.nomFiscal ||
    data.nomComercial ||
    data.nif ||
    data.pais !== 'Espanya' ||
    data.domicili ||
    data.telefon ||
    data.correuElectronic ||
    data.web ||
    data.notesInternes ||
    data.personaContacte ||
    data.contactes?.length > 0 ||
    data.tarifesEspecials?.length > 0 ||
    data.tipusIVA !== 'Normal' ||
    data.retencio !== 0
  );
}

function ClientModal({ onClose, onSave, onDelete, nextCode, nextContactCode, editingClient }: ClientModalProps) {
  const [activeTab, setActiveTab] = useState<'dades' | 'contactes' | 'facturacio'>('dades');
  const [showTarifesModal, setShowTarifesModal] = useState(false);
  const [askCopyTarifes, setAskCopyTarifes] = useState(false);
  const [formData, setFormData] = useState<Client>(
    editingClient || {
      codi: nextCode,
      dataAlta: new Date().toISOString().split('T')[0],
    nomFiscal: '',
    nomComercial: '',
    pais: 'Espanya',
    domicili: '',
    nif: '',
    personaContacte: '',
    telefon: '',
    correuElectronic: '',
    web: '',
    notesInternes: '',
    contactes: [],
    tipusIVA: 'Normal',
    retencio: 0,
    tarifesEspecials: []
  });

  const { saveNow } = useAutoSave(formData, onSave);

  // Contador para códigos de contacto
  const [contactCodeCounter, setContactCodeCounter] = useState(
    parseInt(nextContactCode.split('-')[1])
  );

// Cargar parámetros para acceder a tarifas generales
const [parametres, setParametres] = useState<Parametres | null>(null);

useEffect(() => {
  const saved = localStorage.getItem('plateaParametres');
  if (saved) {
    const data = JSON.parse(saved);
    setParametres(data);
  }
}, []);
  // Añadir nuevo contacto
  const afegirContacte = () => {
    const maxCodi = formData.contactes.length === 0
      ? contactCodeCounter - 1
      : Math.max(...formData.contactes.map(c => parseInt(c.codi.split('-')[1])));
    
    const nouContacte: Contacte = {
      codi: `CTE-${String(maxCodi + 1).padStart(5, '0')}`,
      nom: '',
      correuElectronic: '',
      carrec: '',
      telefon: '',
      notes: ''
    };
    setFormData({
      ...formData,
      contactes: [...formData.contactes, nouContacte]
    });
  };

  // Eliminar contacto
  const eliminarContacte = (index: number) => {
    setFormData({
      ...formData,
      contactes: formData.contactes.filter((_, i) => i !== index)
    });
  };

  // Actualizar campo de contacto
  const actualitzarContacte = (index: number, field: keyof Contacte, value: string) => {
    const nouContactes = [...formData.contactes];
    nouContactes[index] = { ...nouContactes[index], [field]: value };
    setFormData({ ...formData, contactes: nouContactes });
  };
  
  const eliminarClient = () => {
    if (!confirm(`Estàs segur que vols eliminar el client ${formData.nomComercial || formData.nomFiscal}?\n\nAquesta acció no es pot desfer.`)) {
      return;
    }
  
    onDelete?.(editingClient!.codi);
    onClose();
  };

// ============================================================================
// FUNCIONES: TARIFES ESPECIALS
// ============================================================================

// Calcular siguiente código de tarifa global (considerando todas las tarifas)
const getNextTarifaCode = (allClients: Client[]) => {
  const tarifesGenerals = parametres?.tarifes || [];
  const tarifesEspecials = allClients.flatMap(c => c.tarifesEspecials || []);
  const totesTarifes = [...tarifesGenerals, ...tarifesEspecials];
  
  if (totesTarifes.length === 0) return 'TRF-00001';
  
  const maxCodi = Math.max(...totesTarifes.map(t => parseInt(t.codi.split('-')[1])));
  return `TRF-${String(maxCodi + 1).padStart(5, '0')}`;
};

// Abrir gestión de tarifas especiales
const obrirTarifesEspecials = () => {
  if (!formData.tarifesEspecials || formData.tarifesEspecials.length === 0) {
    setAskCopyTarifes(true);
  } else {
    setShowTarifesModal(true);
  }
};

// Copiar tarifas generales
const copiarTarifesGenerals = () => {
  if (!parametres) return;
  
  const savedClients = localStorage.getItem('plateaClients');
  const allClients = savedClients ? JSON.parse(savedClients) : [];
  
  let nextCodeNum = parseInt(getNextTarifaCode(allClients).split('-')[1]);
  
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

// Començar amb tarifes buides
const comenzarTarifesBuildes = () => {
  setFormData({ ...formData, tarifesEspecials: [] });
  setAskCopyTarifes(false);
  setShowTarifesModal(true);
};

// TARIFES ESPECIALS - Afegir
const afegirTarifaEspecial = () => {
  const savedClients = localStorage.getItem('plateaClients');
  const allClients = savedClients ? JSON.parse(savedClients) : [];
  
  const savedProveidors = localStorage.getItem('plateaProveidors');
  const allProveidors = savedProveidors ? JSON.parse(savedProveidors) : [];
  
  // Incluir también las tarifas actuales de formData que aún no están guardadas
  const tarifesGenerals = parametres?.tarifes || [];
  const tarifesClientsGuardades = allClients.flatMap((c: Client) => c.tarifesEspecials || []);
  const tarifesProveidorsGuardades = allProveidors.flatMap((p: Proveidor) => p.tarifesEspecials || []);
  const tarifesActuals = formData.tarifesEspecials || [];
  const totesTarifes = [...tarifesGenerals, ...tarifesClientsGuardades, ...tarifesProveidorsGuardades, ...tarifesActuals];
  
  const maxCodi = totesTarifes.length === 0 
    ? 0 
    : Math.max(...totesTarifes.map(t => parseInt(t.codi.split('-')[1])));
  
  const novaTarifa: Tarifa = {
    codi: `TRF-${String(maxCodi + 1).padStart(5, '0')}`,
    servei: '',
    unitat: '',
    preu: 0
  };
  
  setFormData({
    ...formData,
    tarifesEspecials: [...(formData.tarifesEspecials || []), novaTarifa]
  });
};

// TARIFES ESPECIALS - Actualitzar
const actualitzarTarifaEspecial = (index: number, field: keyof Tarifa, value: string | number) => {
  const novesTarifes = [...(formData.tarifesEspecials || [])];
  novesTarifes[index] = { ...novesTarifes[index], [field]: value };
  setFormData({ ...formData, tarifesEspecials: novesTarifes });
};

// TARIFES ESPECIALS - Eliminar
const eliminarTarifaEspecial = (index: number) => {
  setFormData({
    ...formData,
    tarifesEspecials: (formData.tarifesEspecials || []).filter((_, i) => i !== index)
  });
};

// Verificar si el cliente está siendo usado
const clientEnUs = editingClient ? (() => {
  // Verificar proyectos
  const savedProjectes = localStorage.getItem('plateaProjectes');
  if (savedProjectes) {
    const projectes = JSON.parse(savedProjectes);
    if (projectes.some((p: any) => p.client === editingClient.codi)) {
      return true;
    }
  }

  // Verificar presupuestos
  const savedPressupostos = localStorage.getItem('plateaPressupostos');
  if (savedPressupostos) {
    const pressupostos = JSON.parse(savedPressupostos);
    if (pressupostos.some((p: any) => p.client === editingClient.codi)) {
      return true;
    }
  }

  // Verificar facturas de venta
  const savedFactures = localStorage.getItem('plateaFacturesVenda');
  if (savedFactures) {
    const factures = JSON.parse(savedFactures);
    if (factures.some((f: any) => f.client === editingClient.codi)) {
      return true;
    }
  }

  // Verificar partes de trabajo
  const savedParts = localStorage.getItem('plateaParts');
  if (savedParts) {
    const parts = JSON.parse(savedParts);
    if (parts.some((p: any) => p.client === editingClient.codi)) {
      return true;
    }
  }

  return false;
})() : false;

  return (
<div className="modal-overlay">
<div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ 
  maxWidth: '800px',
  maxHeight: '90vh',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden'
}}>
          {/* HEADER DEL MODAL */}
        <div className="modal-header">
        <h2>
  <Users size={24} />
  {editingClient ? 'Editar Client' : 'Nou Client'}
</h2>
<button 
  className="modal-close" 
  onClick={() => {
    // Detectar si hay cambios
    const tieneCanvis = hasRealClientData(formData);
    
    // Si no hay cambios
    if (!tieneCanvis) {
      // Si el cliente ya fue guardado, eliminarlo
      const saved = localStorage.getItem('plateaClients');
      if (saved) {
        const clients = JSON.parse(saved);
        const clientExisteix = clients.some((c: any) => c.codi === formData.codi);
        
        if (clientExisteix) {
          // Eliminar el cliente vacío
          const filteredClients = clients.filter((c: any) => c.codi !== formData.codi);
          localStorage.setItem('plateaClients', JSON.stringify(filteredClients));
        }
      }
      onClose();
      return;
    }
    
    // Si hay cambios, validar campo obligatorio
    if (!formData.nomFiscal) {
      alert('⚠️ Falta el camp obligatori:\n\n• Nom Fiscal\n\nOmple aquest camp abans de tancar.');
      return;
    }
    
    // Si todo OK, guardar y cerrar
    saveNow();
    onClose();
  }}
>
  <X size={24} />
</button>
        </div>

{/* PESTAÑAS DE NAVEGACIÓN */}
<div style={{
  display: 'flex',
  borderBottom: '2px solid var(--color-border)',
  padding: '0 var(--spacing-xl)',
}}>
            <button
              type="button"
              onClick={() => setActiveTab('dades')}
              style={{
                padding: '1rem 1.5rem',
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === 'dades' ? '2px solid var(--color-accent-primary)' : '2px solid transparent',
                color: activeTab === 'dades' ? 'var(--color-accent-primary)' : 'var(--color-text-secondary)',
                fontWeight: activeTab === 'dades' ? 600 : 400,
                cursor: 'pointer',
                marginBottom: '-2px'
              }}
            >
              Dades
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('contactes')}
              style={{
                padding: '1rem 1.5rem',
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === 'contactes' ? '2px solid var(--color-accent-primary)' : '2px solid transparent',
                color: activeTab === 'contactes' ? 'var(--color-accent-primary)' : 'var(--color-text-secondary)',
                fontWeight: activeTab === 'contactes' ? 600 : 400,
                cursor: 'pointer',
                marginBottom: '-2px'
              }}
            >
              Contactes
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('facturacio')}
              style={{
                padding: '1rem 1.5rem',
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === 'facturacio' ? '2px solid var(--color-accent-primary)' : '2px solid transparent',
                color: activeTab === 'facturacio' ? 'var(--color-accent-primary)' : 'var(--color-text-secondary)',
                fontWeight: activeTab === 'facturacio' ? 600 : 400,
                cursor: 'pointer',
                marginBottom: '-2px'
              }}
            >
              Facturació
            </button>
            </div>

<div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
  <div className="modal-body" style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
 {/* PESTAÑA: DADES */}
{activeTab === 'dades' && (
  <div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
      <div className="form-group">
        <label>Codi</label>
        <input
          type="text"
          className="form-input"
          value={formData.codi}
          disabled
          style={{ background: 'var(--color-bg-tertiary)', cursor: 'not-allowed' }}
        />
      </div>
      <div className="form-group">
        <label>Data d'alta</label>
        <input
          type="date"
          className="form-input"
          value={formData.dataAlta}
          onChange={(e) => setFormData({ ...formData, dataAlta: e.target.value })}
        />
      </div>
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
      <div className="form-group">
        <label>Nom fiscal *</label>
        <input
          type="text"
          className="form-input"
          value={formData.nomFiscal}
          onChange={(e) => setFormData({ ...formData, nomFiscal: e.target.value })}
          required
        />
      </div>
      <div className="form-group">
        <label>Nom comercial</label>
        <input
          type="text"
          className="form-input"
          value={formData.nomComercial}
          onChange={(e) => setFormData({ ...formData, nomComercial: e.target.value })}
        />
      </div>
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
      <div className="form-group">
        <label>NIF</label>
        <input
          type="text"
          className="form-input"
          value={formData.nif}
          onChange={(e) => setFormData({ ...formData, nif: e.target.value })}
        />
      </div>
      <div className="form-group">
        <label>País</label>
        <SearchableSelect
  value={formData.pais}
  onChange={(value) => setFormData({ ...formData, pais: value as Client['pais'] })}
  options={[
    { value: 'Espanya', label: 'Espanya' },
    { value: 'UE-VIES', label: 'UE-VIES' },
    { value: 'Estranger-exportació', label: 'Estranger-exportació' },
    { value: 'Altres', label: 'Altres' }
  ]}
  placeholder="Selecciona país..."
/>
      </div>
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
      <div className="form-group">
        <label>Telèfon</label>
        <input
          type="tel"
          className="form-input"
          value={formData.telefon}
          onChange={(e) => setFormData({ ...formData, telefon: e.target.value })}
        />
      </div>
      <div className="form-group">
        <label>Correu electrònic</label>
        <input
          type="email"
          className="form-input"
          value={formData.correuElectronic}
          onChange={(e) => setFormData({ ...formData, correuElectronic: e.target.value })}
        />
      </div>
    </div>

    <div className="form-group">
      <label>Domicili</label>
      <textarea
        className="form-input"
        value={formData.domicili}
        onChange={(e) => setFormData({ ...formData, domicili: e.target.value })}
        rows={3}
        style={{ resize: 'vertical' }}
        placeholder="Adreça completa del client"
      />
    </div>

    <div className="form-group">
      <label>Web</label>
      <input
        type="url"
        className="form-input"
        value={formData.web}
        onChange={(e) => setFormData({ ...formData, web: e.target.value })}
      />
    </div>

    <div className="form-group">
      <label>Notes internes</label>
      <textarea
        className="form-input"
        value={formData.notesInternes}
        onChange={(e) => setFormData({ ...formData, notesInternes: e.target.value })}
        rows={4}
        style={{ resize: 'vertical' }}
        placeholder="Notes internes sobre el client"
      />
    </div>
  </div>
)}

            {/* PESTAÑA: CONTACTES */}
            {activeTab === 'contactes' && (
              <div>
                <div style={{ marginBottom: '1rem' }}>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={afegirContacte}
                  >
                    + Afegir Contacte
                  </button>
                </div>

                {formData.contactes.length === 0 ? (
                  <p style={{ textAlign: 'center', color: 'var(--color-text-tertiary)', padding: '2rem' }}>
                    No hi ha contactes. Fes clic a "Afegir Contacte" per crear-ne un.
                  </p>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                          <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600 }}>Codi</th>
                          <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600 }}>Nom</th>
                          <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600 }}>Correu</th>
                          <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600 }}>Càrrec</th>
                          <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600 }}>Telèfon</th>
                          <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600 }}>Notes</th>
                          <th style={{ width: '50px' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {formData.contactes.map((contacte, index) => (
                          <tr key={contacte.codi} style={{ borderBottom: '1px solid var(--color-border)' }}>
                            <td style={{ padding: '0.5rem', fontSize: '0.85rem', color: 'var(--color-text-tertiary)' }}>
                              {contacte.codi}
                            </td>
                            <td style={{ padding: '0.5rem' }}>
                              <input
                                type="text"
                                className="form-input"
                                value={contacte.nom}
                                onChange={(e) => actualitzarContacte(index, 'nom', e.target.value)}
                                style={{ padding: '0.5rem' }}
                              />
                            </td>
                            <td style={{ padding: '0.5rem' }}>
                              <input
                                type="email"
                                className="form-input"
                                value={contacte.correuElectronic}
                                onChange={(e) => actualitzarContacte(index, 'correuElectronic', e.target.value)}
                                style={{ padding: '0.5rem' }}
                              />
                            </td>
                            <td style={{ padding: '0.5rem' }}>
                              <input
                                type="text"
                                className="form-input"
                                value={contacte.carrec}
                                onChange={(e) => actualitzarContacte(index, 'carrec', e.target.value)}
                                style={{ padding: '0.5rem' }}
                              />
                            </td>
                            <td style={{ padding: '0.5rem' }}>
                              <input
                                type="tel"
                                className="form-input"
                                value={contacte.telefon}
                                onChange={(e) => actualitzarContacte(index, 'telefon', e.target.value)}
                                style={{ padding: '0.5rem' }}
                              />
                            </td>
                            <td style={{ padding: '0.5rem' }}>
                              <input
                                type="text"
                                className="form-input"
                                value={contacte.notes}
                                onChange={(e) => actualitzarContacte(index, 'notes', e.target.value)}
                                style={{ padding: '0.5rem' }}
                              />
                            </td>
                            <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                              <button
                                type="button"
                                onClick={() => eliminarContacte(index)}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: 'var(--color-error)',
                                  cursor: 'pointer',
                                  padding: '0.25rem'
                                }}
                                title="Eliminar contacte"
                              >
                                <Trash2 size={18} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* PESTAÑA: FACTURACIÓ */}
            {activeTab === 'facturacio' && (
              <div>
                <div className="form-section">
                  <h3>Dades fiscals</h3>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label>Tipus d'IVA</label>
                      <SearchableSelect
  value={formData.tipusIVA}
  onChange={(value) => setFormData({ ...formData, tipusIVA: value as 'Normal' | 'Exempt' | 'Reduit' | 'Superreduit' })}
  options={[
    { value: 'Normal', label: 'Normal (21%)' },
    { value: 'Reduit', label: 'Reduit (10%)' },
    { value: 'Superreduit', label: 'Superreduit (4%)' },
    { value: 'Exempt', label: 'Exempt (0%)' }
  ]}
  placeholder="Selecciona tipus d'IVA..."
/>
                    </div>
                    <div className="form-group">
                      <label>% Retenció IRPF</label>
                      <input
                        type="number"
                        className="form-input"
                        value={formData.retencio}
                        onChange={(e) => setFormData({ ...formData, retencio: parseFloat(e.target.value) })}
                        min="0"
                        max="100"
                        step="0.01"
                      />
                    </div>
                  </div>
                </div>

                <div className="form-section">
                  <h3>Tarifes especials</h3>
                  <button
  type="button"
  className="btn-secondary"
  style={{ width: '100%' }}
  onClick={obrirTarifesEspecials}
>
  {formData.tarifesEspecials && formData.tarifesEspecials.length > 0
    ? `Preus especials (${formData.tarifesEspecials.length} tarifes)`
    : 'Configurar preus especials'}
</button>
                </div>
              </div>
            )}
            </div>
          </div>

{/* FOOTER DEL MODAL */}
<div className="modal-footer" style={{
  display: 'flex',
  justifyContent: 'flex-end',
  alignItems: 'center'
}}>
  {editingClient && !clientEnUs && (
    <button
      type="button"
      onClick={eliminarClient}
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
  
  <button 
  type="button" 
  className="btn-primary" 
  onClick={() => {
    // Detectar si hay cambios
    const tieneCanvis = hasRealClientData(formData);
    
    // Si no hay cambios
    if (!tieneCanvis) {
      // Si el cliente ya fue guardado, eliminarlo
      const saved = localStorage.getItem('plateaClients');
      if (saved) {
        const clients = JSON.parse(saved);
        const clientExisteix = clients.some((c: any) => c.codi === formData.codi);
        
        if (clientExisteix) {
          // Eliminar el cliente vacío
          const filteredClients = clients.filter((c: any) => c.codi !== formData.codi);
          localStorage.setItem('plateaClients', JSON.stringify(filteredClients));
        }
      }
      onClose();
      return;
    }
    
    // Si hay cambios, validar campo obligatorio
    if (!formData.nomFiscal) {
      alert('⚠️ Falta el camp obligatori:\n\n• Nom Fiscal\n\nOmple aquest camp abans de guardar.');
      return;
    }
    
    // Si todo OK, guardar y cerrar
    saveNow();
    onClose();
  }}
>
  Acceptar
</button>
</div>
        </div>

{/* MODAL: PREGUNTAR SI COPIAR TARIFES */}
{askCopyTarifes && (
        <div className="modal-overlay" onClick={() => setAskCopyTarifes(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2>Tarifes especials</h2>
              <button className="modal-close" onClick={() => {
  saveNow();
  onClose();
}}>
  <X size={24} />
</button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: '1.5rem' }}>
                Vols copiar les tarifes generals actuals com a punt de partida?
              </p>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button 
                  className="btn-primary" 
                  onClick={copiarTarifesGenerals}
                  style={{ flex: 1 }}
                >
                  Sí, copiar tarifes
                </button>
                <button 
                  className="btn-secondary" 
                  onClick={comenzarTarifesBuildes}
                  style={{ flex: 1 }}
                >
                  No, començar buit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: GESTIÓ TARIFES ESPECIALS */}
      {showTarifesModal && parametres && (
        <div className="modal-overlay" onClick={() => setShowTarifesModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px' }}>
            <div className="modal-header">
              <h2>Tarifes especials - {formData.nomComercial || 'Client'}</h2>
              <button className="modal-close" onClick={() => setShowTarifesModal(false)}>
                <X size={24} />
              </button>
            </div>

            <div className="modal-body">
              <div style={{ marginBottom: '1rem' }}>
                <button className="btn-primary" onClick={afegirTarifaEspecial}>
                  + Afegir Tarifa
                </button>
              </div>

              {(!formData.tarifesEspecials || formData.tarifesEspecials.length === 0) ? (
                <p style={{ textAlign: 'center', color: 'var(--color-text-tertiary)', padding: '2rem' }}>
                  No hi ha tarifes especials. Fes clic a "Afegir Tarifa".
                </p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                      <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600 }}>Codi</th>
                      <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600 }}>Servei</th>
                      <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600 }}>Unitat</th>
                      <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600 }}>Preu (€)</th>
                      <th style={{ width: '50px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.tarifesEspecials.map((tarifa, index) => (
                      <tr key={tarifa.codi} style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <td style={{ padding: '0.75rem', fontSize: '0.85rem', color: 'var(--color-text-tertiary)' }}>
                          {tarifa.codi}
                        </td>
                        <td style={{ padding: '0.75rem' }}>
<SearchableSelect
  value={tarifa.servei}
  onChange={(value) => actualitzarTarifaEspecial(index, 'servei', value)}
  options={parametres.serveis.map(s => ({ value: s.codi, label: s.nom }))}
  placeholder="Selecciona servei..."
/>
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                        <SearchableSelect
  value={tarifa.unitat}
  onChange={(value) => actualitzarTarifaEspecial(index, 'unitat', value)}
  options={parametres.unitats.map(u => ({ value: u.codi, label: u.nom }))}
  placeholder="Selecciona unitat..."
/>
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          <input
                            type="number"
                            className="form-input"
                            value={tarifa.preu}
                            onChange={(e) => actualitzarTarifaEspecial(index, 'preu', parseFloat(e.target.value))}
                            step="0.01"
                            min="0"
                          />
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => eliminarTarifaEspecial(index)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--color-error)',
                              cursor: 'pointer',
                              padding: '0.25rem'
                            }}
                          >
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn-primary" onClick={() => setShowTarifesModal(false)}>
                Acceptar
              </button>
            </div>
          </div>
        </div>
      )}

      </div>
  );
}
export default ClientModal;
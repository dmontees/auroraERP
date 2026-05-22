import React from 'react';
import { Trash2 } from 'lucide-react';
import type { Client, Contacte } from '../../../types/client';

interface ContactesTabProps {
  formData: Client;
  setFormData: (data: Client) => void;
  nextContactCode: string;
}

export default function ContactesTab({ formData, setFormData, nextContactCode }: ContactesTabProps) {
  
  const afegirContacte = () => {
    const contactCodeCounter = parseInt(nextContactCode.split('-')[1]);
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

  const eliminarContacte = (index: number) => {
    setFormData({
      ...formData,
      contactes: formData.contactes.filter((_, i) => i !== index)
    });
  };

  const actualitzarContacte = (index: number, field: keyof Contacte, value: string) => {
    const nouContactes = [...formData.contactes];
    nouContactes[index] = { ...nouContactes[index], [field]: value };
    setFormData({ ...formData, contactes: nouContactes });
  };

  return (
    <div>
      <div style={{ marginBottom: '1rem' }}>
        <button type="button" className="btn-primary" onClick={afegirContacte}>
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
  );
}
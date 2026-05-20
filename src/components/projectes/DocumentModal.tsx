import { useState } from 'react';
import { X, Upload } from 'lucide-react';
import type { DocumentProjecte } from '../../types/projecte';

interface Props {
  onClose: () => void;
  onSave: (document: DocumentProjecte) => void;
}

export default function DocumentModal({ onClose, onSave }: Props) {
  const [formData, setFormData] = useState({
    tipus: '',
    nom: '',
    fitxer: '',
    nomFitxer: ''
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Límite de 5MB
      if (file.size > 5 * 1024 * 1024) {
        alert('El fitxer és massa gran. Màxim 5MB.');
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        setFormData({
          ...formData,
          fitxer: event.target?.result as string,
          nomFitxer: file.name
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.tipus.trim() || !formData.nom.trim() || !formData.fitxer) {
      alert('Completa tots els camps');
      return;
    }

    const nouDocument: DocumentProjecte = {
      id: `doc-${Date.now()}-${Math.random()}`,
      tipus: formData.tipus,
      nom: formData.nom,
      fitxer: formData.fitxer,
      nomFitxer: formData.nomFitxer,
      dataAfegit: new Date().toISOString()
    };

    onSave(nouDocument);
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 2000 }}>
      <div className="modal-content" style={{ maxWidth: '500px' }}>
        <div className="modal-header">
          <h2>
            <Upload size={24} />
            Afegir Document
          </h2>
          <button className="modal-close" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label>Tipus de Document *</label>
              <input
                type="text"
                className="form-input"
                value={formData.tipus}
                onChange={(e) => setFormData({ ...formData, tipus: e.target.value })}
                placeholder="Ex: Contracte, Llicència, Autorització..."
                required
              />
            </div>

            <div className="form-group">
              <label>Nom del Document *</label>
              <input
                type="text"
                className="form-input"
                value={formData.nom}
                onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                placeholder="Ex: Contracte signatura client"
                required
              />
            </div>

            <div className="form-group">
              <label>Fitxer *</label>
              <div className="file-input-wrapper">
                <input
                  type="file"
                  id="document-upload"
                  className="file-input"
                  onChange={handleFileUpload}
                  required
                />
                <label htmlFor="document-upload" className="file-input-button">
                  <Upload size={18} />
                  {formData.nomFitxer || 'Seleccionar fitxer'}
                </label>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-tertiary)', marginTop: '0.5rem' }}>
                Màxim 5MB. Formats: PDF, DOC, DOCX, JPG, PNG, etc.
              </p>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel·lar
            </button>
            <button type="submit" className="btn-primary">
              Afegir Document
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
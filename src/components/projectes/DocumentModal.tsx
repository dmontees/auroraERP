import { useState } from 'react';
import { X, Upload } from 'lucide-react';
import type { Client } from '../../types/client';
import type { DocumentProjecte, Projecte } from '../../types/projecte';
import { buildProjectDocumentPath, createDocumentRef, safeFileName, versionedPdfName } from '../../utils/documentManager';
import { storage } from '../../utils/storageManager';

interface Props {
  onClose: () => void;
  onSave: (document: DocumentProjecte) => void;
  projecte: Projecte;
  client?: Client;
}

export default function DocumentModal({ onClose, onSave, projecte, client }: Props) {
  const [formData, setFormData] = useState({
    tipus: '',
    nom: '',
    fitxer: '',
    nomFitxer: ''
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      alert('El fitxer es massa gran. Maxim 25MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setFormData(prev => ({
        ...prev,
        fitxer: event.target?.result as string,
        nomFitxer: file.name
      }));
      setSelectedFile(file);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.tipus.trim() || !formData.nom.trim() || !selectedFile || !formData.fitxer) {
      alert('Completa tots els camps');
      return;
    }

    const rootPath = storage.getParametres().gestorDocumental?.rootPath;
    const electronDocuments = typeof window !== 'undefined' ? window.electronDocuments : undefined;

    if (!rootPath || !electronDocuments) {
      alert('Configura primer la carpeta documental a Parametres > Gestor documental.');
      return;
    }

    if (!client) {
      alert('Selecciona un client abans dafegir documents al projecte.');
      return;
    }

    const existingVersions = (projecte.documents || [])
      .filter(doc => doc.nom === formData.nom)
      .map(doc => doc.fileRef?.version || 0);
    const version = Math.max(0, ...existingVersions) + 1;
    const extension = selectedFile.name.includes('.') ? selectedFile.name.split('.').pop() || 'dat' : 'dat';
    const baseName = formData.nom || selectedFile.name.replace(/\.[^.]+$/, '');
    const filename = extension.toLowerCase() === 'pdf'
      ? versionedPdfName(baseName, version)
      : `${safeFileName(baseName)}_v${String(version).padStart(3, '0')}.${safeFileName(extension)}`;

    const relativePath = buildProjectDocumentPath(
      client.codi,
      client.nomComercial || client.nomFiscal || 'Client',
      projecte.codi,
      projecte.titol || 'Projecte',
      'documents',
      filename
    );

    const result = await electronDocuments.writeFile({
      rootPath,
      relativePath,
      dataBase64: formData.fitxer,
    });

    if (!result.success || !result.data) {
      alert(result.error || 'No sha pogut guardar el document.');
      return;
    }

    const fileRef = createDocumentRef({
      kind: 'projecte',
      ownerType: 'projecte',
      ownerCodi: projecte.codi,
      displayName: formData.nom,
      originalName: selectedFile.name,
      relativePath,
      mimeType: selectedFile.type || undefined,
      size: result.data.size,
      sha256: result.data.sha256,
      version,
      generated: false,
    });

    onSave({
      id: fileRef.id,
      tipus: formData.tipus,
      nom: formData.nom,
      nomFitxer: selectedFile.name,
      dataAfegit: fileRef.createdAt,
      fileRef,
    });
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
                placeholder="Ex: Contracte, Llicencia, Autoritzacio..."
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
                Maxim 25MB. Formats: PDF, DOC, DOCX, JPG, PNG, etc.
              </p>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancelar
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

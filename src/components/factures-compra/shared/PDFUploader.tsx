import React from 'react';
import { Upload, FileText, Trash2 } from 'lucide-react';

interface PDFUploaderProps {
  documentPDF?: string;
  fileName: string;
  onUpload: (file: File) => void;
  onDelete: () => void;
  disabled?: boolean;
  required?: boolean;
}

export default function PDFUploader({
  documentPDF,
  fileName,
  onUpload,
  onDelete,
  disabled = false,
  required = false
}: PDFUploaderProps) {

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      alert('Només es permeten arxius PDF');
      return;
    }

    onUpload(file);
  };

  return (
    <div className="form-group">
      <label>Document PDF {required && '*'}</label>
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <input
          type="file"
          accept="application/pdf"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
          id="pdf-upload-input"
          disabled={disabled}
        />
        <label 
          htmlFor="pdf-upload-input" 
          className="btn-secondary"
          style={{ 
            cursor: disabled ? 'not-allowed' : 'pointer', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem',
            opacity: disabled ? 0.5 : 1
          }}
        >
          <Upload size={18} />
          Pujar PDF
        </label>

        {documentPDF && (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem'
          }}>
            <span style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem',
              color: 'var(--color-accent-primary)',
              fontWeight: 500,
              fontSize: '0.85rem'
            }}>
              <FileText size={18} />
              {fileName}
            </span>
            <button
              type="button"
              onClick={onDelete}
              className="btn-secondary"
              style={{ 
                padding: '0.4rem',
                minWidth: 'auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderColor: '#dc2626',
                color: '#dc2626'
              }}
              disabled={disabled}
              title="Eliminar PDF"
            >
              <Trash2 size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
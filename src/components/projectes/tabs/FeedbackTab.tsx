import { CheckCircle } from 'lucide-react';
import type { Projecte, FeedbackProjecte } from '../../../types/projecte';

interface Props {
  formData: Projecte;
  setFormData: (data: Projecte) => void;
  esBloquejat: boolean;
  onMarcarAcabat: () => void;
}

const sectionStyle = {
  padding: '1.25rem',
  background: 'var(--color-bg-secondary)',
  borderRadius: '8px',
  border: '1px solid var(--color-border)',
  marginBottom: '1rem'
};

const sectionTitleStyle = {
  fontSize: '0.85rem',
  fontWeight: 700,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
  color: 'var(--color-text-tertiary)',
  marginBottom: '1rem'
};

export default function FeedbackTab({ formData, setFormData, esBloquejat, onMarcarAcabat }: Props) {
  const feedback: FeedbackProjecte = formData.feedback || { validat: false };

  const update = (updates: Partial<FeedbackProjecte>) => {
    setFormData({ ...formData, feedback: { ...feedback, ...updates } });
  };

  return (
    <div>
      {/* Entrega al client */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>Entrega al Client</div>
        <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: '1rem' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Data d'entrega</label>
            <input
              type="date"
              className="form-input"
              value={feedback.dataEntrega || ''}
              onChange={(e) => update({ dataEntrega: e.target.value })}
              disabled={esBloquejat}
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Nota / Enllaç</label>
            <input
              type="text"
              className="form-input"
              value={feedback.notaEntrega || ''}
              onChange={(e) => update({ notaEntrega: e.target.value })}
              disabled={esBloquejat}
              placeholder="Link de Drive, WeTransfer, Dropbox..."
            />
          </div>
        </div>
      </div>

      {/* Feedback del client */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>Feedback del Client</div>
        <div className="form-group">
          <label>Data de recepció del feedback</label>
          <input
            type="date"
            className="form-input"
            value={feedback.dataFeedback || ''}
            onChange={(e) => update({ dataFeedback: e.target.value })}
            disabled={esBloquejat}
            style={{ maxWidth: '200px' }}
          />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>Notes de feedback</label>
          <textarea
            className="form-input"
            value={feedback.notesFeedback || ''}
            onChange={(e) => update({ notesFeedback: e.target.value })}
            disabled={esBloquejat}
            rows={4}
            placeholder="Anota aquí els comentaris del client..."
          />
        </div>
      </div>

      {/* Revisió */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>Revisió</div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>Notes de revisió</label>
          <textarea
            className="form-input"
            value={feedback.notesRevisio || ''}
            onChange={(e) => update({ notesRevisio: e.target.value })}
            disabled={esBloquejat}
            rows={4}
            placeholder="Quins canvis s'han realitzat en aquesta revisió..."
          />
        </div>
      </div>

      {/* Validació final */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>Validació Final del Client</div>
        <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: '1rem', alignItems: 'end' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Data de validació</label>
            <input
              type="date"
              className="form-input"
              value={feedback.dataValidacio || ''}
              onChange={(e) => update({ dataValidacio: e.target.value })}
              disabled={esBloquejat}
            />
          </div>
          <div style={{ paddingBottom: '0.1rem' }}>
            {feedback.validat || formData.estat === 'acabat' || formData.estat === 'facturat' ? (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.75rem 1rem', background: 'var(--color-success-bg)', borderRadius: '8px',
                color: 'var(--color-success-dark)', fontWeight: 600, border: '1px solid #6ee7b7'
              }}>
                <CheckCircle size={20} />
                Projecte validat pel client
              </div>
            ) : (
              <button
                type="button"
                onClick={onMarcarAcabat}
                disabled={esBloquejat}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  padding: '0.75rem 1.25rem', background: 'var(--color-success)', color: 'white',
                  border: 'none', borderRadius: '8px', cursor: 'pointer',
                  fontWeight: 600, fontSize: '0.95rem'
                }}
              >
                <CheckCircle size={18} />
                Marcar com a Acabat (client ha validat)
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

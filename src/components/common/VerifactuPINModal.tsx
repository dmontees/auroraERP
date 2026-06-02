import React, { useState, useRef, useEffect } from 'react';
import { ShieldCheck, X, Eye, EyeOff } from 'lucide-react';
import { carregarCertificatP12 } from '../../utils/verifactuFirma';
import { storage } from '../../utils/storageManager';

interface Props {
  onSuccess: () => void;
  onCancel: () => void;
}

export default function VerifactuPINModal({ onSuccess, onCancel }: Props) {
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleVerificar = () => {
    if (!pin) { setError("Introdueix el PIN del certificat."); return; }
    setLoading(true);
    setError(null);
    try {
      const p12Base64 = storage.getVerifactuCertificatP12();
      if (!p12Base64) throw new Error("No s'ha trobat cap certificat desat.");
      carregarCertificatP12(p12Base64, pin);
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleVerificar();
    if (e.key === 'Escape') onCancel();
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1100 }}>
      <div className="modal-container" style={{ maxWidth: 420 }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldCheck size={18} style={{ color: 'var(--color-accent)' }} />
            <h2 className="modal-title">Certificat Digital — Verifactu</h2>
          </div>
          <button className="modal-close" onClick={onCancel}><X size={18} /></button>
        </div>

        <div className="modal-body" style={{ padding: '1.5rem' }}>
          <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', marginBottom: '1.25rem' }}>
            Per emetre aquesta factura amb Verifactu cal verificar el certificat digital.<br />
            Introdueix el PIN del certificat per continuar.
          </p>

          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600,
            color: 'var(--color-text-primary)', marginBottom: '0.4rem' }}>
            PIN del certificat
          </label>
          <div style={{ position: 'relative' }}>
            <input
              ref={inputRef}
              type={showPin ? 'text' : 'password'}
              value={pin}
              onChange={e => { setPin(e.target.value); setError(null); }}
              onKeyDown={handleKeyDown}
              className="form-input"
              placeholder="••••••••"
              autoComplete="off"
              style={{ paddingRight: '2.5rem' }}
            />
            <button
              type="button"
              onClick={() => setShowPin(v => !v)}
              style={{ position: 'absolute', right: '0.6rem', top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-tertiary)', padding: '0' }}
            >
              {showPin ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {error && (
            <p style={{ fontSize: '0.82rem', color: 'var(--color-error)',
              background: 'var(--color-error-bg, #fef2f2)', padding: '0.4rem 0.6rem',
              borderRadius: '4px', marginTop: '0.5rem' }}>
              {error}
            </p>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={onCancel}>Cancel·lar</button>
          <button
            type="button"
            className="btn-primary"
            onClick={handleVerificar}
            disabled={loading || !pin}
          >
            {loading ? 'Verificant...' : 'Verificar i continuar'}
          </button>
        </div>
      </div>
    </div>
  );
}

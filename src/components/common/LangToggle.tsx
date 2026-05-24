import React from 'react';

export type Lang = 'ca' | 'es' | 'en';

interface LangToggleProps {
  value: Lang;
  onChange: (lang: Lang) => void;
}

const LANGS: Lang[] = ['ca', 'es', 'en'];

export default function LangToggle({ value, onChange }: LangToggleProps) {
  return (
    <div style={{ display: 'inline-flex', gap: '0.2rem' }}>
      {LANGS.map(code => (
        <button
          key={code}
          type="button"
          onClick={() => onChange(code)}
          style={{
            padding: '0.15rem 0.45rem',
            fontSize: '0.72rem',
            fontWeight: 700,
            border: `1px solid ${value === code ? 'var(--color-accent-primary)' : 'var(--color-border)'}`,
            borderRadius: '4px',
            background: value === code ? 'var(--color-accent-primary)' : 'transparent',
            color: value === code ? 'white' : 'var(--color-text-secondary)',
            cursor: 'pointer',
            textTransform: 'uppercase',
            lineHeight: 1.3
          }}
        >
          {code}
        </button>
      ))}
    </div>
  );
}

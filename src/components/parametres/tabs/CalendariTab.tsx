import React from 'react';
import { Plus, Trash2 } from 'lucide-react';

interface Props {
  hook: any;
}

const AUTO_CATS = [
  { key: 'rodatge',        label: '🎬 Rodatge' },
  { key: 'entrega',        label: '📦 Entrega de projecte' },
  { key: 'facturesVenda',  label: '💰 Factures de venda' },
  { key: 'facturesCompra', label: '💸 Factures de compra' },
  { key: 'pressupostos',   label: '📋 Pressupostos' },
];

const DEFAULT_CONFIG = {
  rodatge:       { actiu: true,  color: '#ef4444' },
  entrega:       { actiu: true,  color: '#f59e0b' },
  facturesVenda: { actiu: false, color: '#3b82f6' },
  facturesCompra:{ actiu: false, color: '#ef4444' },
  pressupostos:  { actiu: false, color: '#6366f1' },
};

export default function CalendariTab({ hook }: Props) {
  const {
    parametres,
    actualitzarConfigCalendari,
    afegirCategoriaCalendari,
    actualitzarCategoriaCalendari,
    eliminarCategoriaCalendari
  } = hook;

  const config = parametres.configCalendari || DEFAULT_CONFIG;
  const categoriesCalendari = parametres.categoriesCalendari || [];

  return (
    <div style={{ maxWidth: '900px' }}>
      {/* Auto categories colors */}
      <div style={{
        background: 'var(--color-bg-tertiary)',
        padding: '1.5rem',
        borderRadius: '8px',
        marginBottom: '2rem'
      }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
          🎨 Colors de categories automàtiques
        </h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>
          Defineix el color de cada categoria d'events automàtics. La visibilitat es controla des del propi calendari.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {AUTO_CATS.map(({ key, label }) => {
            const catConfig = (config as any)[key] || { color: '#3b82f6' };
            return (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <input
                  type="color"
                  value={catConfig.color}
                  onChange={(e) => actualitzarConfigCalendari(key, 'color', e.target.value)}
                  style={{ width: '36px', height: '36px', border: 'none', borderRadius: '4px', cursor: 'pointer', padding: '2px', flexShrink: 0 }}
                  title="Selecciona color"
                />
                <span style={{
                  padding: '0.25rem 0.75rem',
                  background: catConfig.color,
                  color: 'white',
                  borderRadius: '4px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  minWidth: '220px'
                }}>
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* User categories */}
      <div style={{
        background: 'var(--color-bg-tertiary)',
        padding: '1.5rem',
        borderRadius: '8px'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '0.5rem'
        }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>
            🏷️ Categories personalitzades
          </h3>
          <button
            type="button"
            className="btn-primary"
            onClick={afegirCategoriaCalendari}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}
          >
            <Plus size={16} />
            Nova Categoria
          </button>
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>
          Crea categories per classificar els teus esdeveniments. Apareixeran al calendari com a filtres de la llegenda.
        </p>

        {categoriesCalendari.length === 0 ? (
          <p style={{
            textAlign: 'center',
            color: 'var(--color-text-tertiary)',
            padding: '1.5rem',
            fontStyle: 'italic'
          }}>
            No hi ha categories personalitzades. Crea'n una!
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {categoriesCalendari.map((cat: any) => (
              <div
                key={cat.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '0.75rem 1rem',
                  background: 'var(--color-bg-secondary)',
                  borderRadius: '8px',
                  borderLeft: `4px solid ${cat.color}`
                }}
              >
                <input
                  type="color"
                  value={cat.color}
                  onChange={(e) => actualitzarCategoriaCalendari(cat.id, 'color', e.target.value)}
                  style={{ width: '36px', height: '36px', border: 'none', borderRadius: '4px', cursor: 'pointer', padding: '2px', flexShrink: 0 }}
                  title="Selecciona color"
                />
                <input
                  type="text"
                  className="form-input"
                  value={cat.nom}
                  onChange={(e) => actualitzarCategoriaCalendari(cat.id, 'nom', e.target.value)}
                  placeholder="Nom de la categoria..."
                  style={{ flex: 1 }}
                />
                <span style={{
                  padding: '0.2rem 0.6rem',
                  background: cat.color,
                  color: 'white',
                  borderRadius: '4px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  whiteSpace: 'nowrap'
                }}>
                  {cat.nom || 'Sense nom'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Eliminar aquesta categoria?')) eliminarCategoriaCalendari(cat.id);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-error)',
                    cursor: 'pointer',
                    padding: '0.25rem',
                    flexShrink: 0
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

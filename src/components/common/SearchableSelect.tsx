import { useState, useRef, useEffect } from 'react';

interface Option {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
}

function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = 'Selecciona...',
  disabled = false,
  required = false
}: SearchableSelectProps) {
  const [search, setSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
        setSearch(''); // Limpiar búsqueda al cerrar
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(o => o.value === value);
  
  // Mostrar: búsqueda activa O label del seleccionado O placeholder
  const displayValue = showDropdown ? search : (selectedOption?.label || '');

  const filteredOptions = options.filter(o =>
    o.label.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (option: Option) => {
    onChange(option.value);
    setSearch('');
    setShowDropdown(false);
  };

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <input
        type="text"
        className="form-input"
        value={displayValue}
        onChange={(e) => {
          setSearch(e.target.value);
          setShowDropdown(true);
        }}
        onFocus={() => {
          setShowDropdown(true);
          setSearch(''); // Limpiar para mostrar todas las opciones
        }}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
      />

      {showDropdown && !disabled && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          maxHeight: '200px',
          overflowY: 'auto',
          background: 'white',
          border: '1px solid var(--color-border)',
          borderRadius: '4px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          zIndex: 1000,
          marginTop: '0.25rem'
        }}>
          {filteredOptions.map(option => (
            <div
              key={option.value}
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(option);
              }}
              style={{
                padding: '0.5rem 0.75rem',
                cursor: 'pointer',
                borderBottom: '1px solid var(--color-border)',
                transition: 'background 0.2s',
                fontSize: '0.85rem',
                background: option.value === value ? 'var(--color-bg-tertiary)' : 'transparent'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-bg-tertiary)'}
              onMouseLeave={(e) => {
                if (option.value !== value) {
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              {option.label}
            </div>
          ))}
          {filteredOptions.length === 0 && (
            <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: '0.85rem' }}>
              No s'han trobat resultats
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default SearchableSelect;
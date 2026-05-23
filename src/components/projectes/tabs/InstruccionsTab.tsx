import type { Projecte } from '../../../types/projecte';

interface Props {
  formData: Projecte;
  setFormData: (data: Projecte) => void;
  esBloquejat: boolean;
}

export default function InstruccionsTab({ formData, setFormData, esBloquejat }: Props) {
  return (
    <div>
      <div className="form-group">
        <label>Instruccions del Client</label>
        <textarea
          className="form-input"
          value={formData.instruccionsClient}
          onChange={(e) => setFormData({ ...formData, instruccionsClient: e.target.value })}
          rows={5}
          disabled={esBloquejat}
          style={{ fontSize: '0.85rem', lineHeight: '1.4' }}
          placeholder="Escriu aquí les instruccions, requisits o preferències del client..."
        />
        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-tertiary)', marginTop: '0.5rem' }}>
          Aquest camp és només de referència interna per l'equip.
        </p>
      </div>

      <div className="form-group">
        <label>Instruccions per Proveïdors</label>
        <textarea
          className="form-input"
          value={formData.instruccionsProveidors}
          onChange={(e) => setFormData({ ...formData, instruccionsProveidors: e.target.value })}
          rows={5}
          disabled={esBloquejat}
          style={{ fontSize: '0.85rem', lineHeight: '1.4' }}
          placeholder="Escriu aquí les instruccions específiques per als proveïdors externs..."
        />
        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-tertiary)', marginTop: '0.5rem' }}>
          Aquesta informació es pot compartir amb els col·laboradors externs assignats a les tasques.
        </p>
      </div>
    </div>
  );
}

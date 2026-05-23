import { X, FileText } from 'lucide-react';
import type { Pressupost } from '../../../types/pressupost';
import type { FacturaVenta } from '../../../types/factura-venta';
import SearchableSelect from '../../common/SearchableSelect';

interface VincularPressupostProps {
  tipus: 'pressupost';
  pressupostos: Pressupost[];
  clientCodi: string;
  onVincular: (codi: string) => void;
  onClose: () => void;
}

interface VincularFacturaProps {
  tipus: 'factura';
  factures: FacturaVenta[];
  clientCodi: string;
  onVincular: (codi: string) => void;
  onClose: () => void;
}

type Props = VincularPressupostProps | VincularFacturaProps;

export default function VincularModal(props: Props) {
  const { tipus, clientCodi, onVincular, onClose } = props;

  if (tipus === 'pressupost') {
    const { pressupostos } = props as VincularPressupostProps;
    const disponibles = pressupostos.filter(p => p.client === clientCodi && !p.projecteCreat && !p.projecteVinculat);

    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
          <div className="modal-header">
            <h2><FileText size={24} />Vincular Pressupost</h2>
            <button className="modal-close" onClick={onClose}><X size={24} /></button>
          </div>
          <div className="modal-body">
            <p style={{ marginBottom: '1rem', color: 'var(--color-text-secondary)' }}>
              Selecciona un pressupost existent per vincular a aquest projecte:
            </p>
            <SearchableSelect
              value=""
              onChange={onVincular}
              options={disponibles.map(p => ({
                value: p.codi,
                label: `${p.codi} - ${p.nomProjecte || 'Sense nom'} (${p.estat})`
              }))}
              placeholder="Selecciona pressupost..."
            />
            {disponibles.length === 0 && (
              <p style={{ marginTop: '1rem', color: 'var(--color-text-tertiary)', fontStyle: 'italic' }}>
                No hi ha pressupostos disponibles per vincular (mateix client i sense projecte associat)
              </p>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel·lar</button>
          </div>
        </div>
      </div>
    );
  }

  const { factures } = props as VincularFacturaProps;
  const disponibles = factures.filter(f => f.client === clientCodi && !f.projecte);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
        <div className="modal-header">
          <h2><FileText size={24} />Vincular Factura</h2>
          <button className="modal-close" onClick={onClose}><X size={24} /></button>
        </div>
        <div className="modal-body">
          <p style={{ marginBottom: '1rem', color: 'var(--color-text-secondary)' }}>
            Selecciona una factura existent per vincular a aquest projecte:
          </p>
          <SearchableSelect
            value=""
            onChange={onVincular}
            options={disponibles.map(f => ({
              value: f.codi,
              label: `${f.codi} - ${(f as any).concepte || 'Sense concepte'} (${(f as any).totalAmbIVA ? (f as any).totalAmbIVA.toFixed(2) : '0.00'}€)`
            }))}
            placeholder="Selecciona factura..."
          />
          {disponibles.length === 0 && (
            <p style={{ marginTop: '1rem', color: 'var(--color-text-tertiary)', fontStyle: 'italic' }}>
              No hi ha factures disponibles per vincular (mateix client i sense projecte associat)
            </p>
          )}
        </div>
        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel·lar</button>
        </div>
      </div>
    </div>
  );
}

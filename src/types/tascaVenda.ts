// Unified sale task type — used identically in Pressupost, Projecte and FacturaVenda.
// The user can freely add, edit, remove and reorder tasks at every stage.
export interface TascaVenda {
  id: string;
  categoria: string;   // user-defined category (from Parametres)
  servei: string;
  descripcio: string;
  quantitat: number;
  unitat: string;
  tarifa: number;      // unit price (no VAT)
  importe: number;     // quantitat × tarifa
  ordre: number;
}

export type EstatAlbara = 'pendent-factura' | 'factura-vinculada' | 'pagat';

export interface AlbaraCompra {
  codi: string;         // ALC-00001
  tdCodi: string;       // TD-0000001 — enllaç a la línia de despesa del projecte
  projecteCodi: string;
  proveidorCodi: string;
  dataCreacio: string;  // YYYY-MM-DD
  estat: EstatAlbara;
  facturaCodi?: string; // FacturaCompra.codi vinculada

  tipusLinia: 'rrhh' | 'material';

  // Camps RRHH (tipusLinia === 'rrhh')
  serveiCodi?: string;
  serveiNom?: string;
  quantitat?: number;
  unitatCodi?: string;
  unitatNom?: string;
  preuProv?: number;   // preu per unitat (estimat)
  cost?: number;       // quantitat * preuProv (estimat)

  // Camps Material (tipusLinia === 'material')
  materialCodi?: string;
  materialNom?: string;
  grupCodi?: string;
  grupNom?: string;
  preuProveidor?: number; // preu estimat del proveïdor
}

import type { Client } from '../types/client';
import type { Proveidor } from '../types/proveidor';
import type { Projecte } from '../types/projecte';
import type { FacturaVenta } from '../types/facturaVenta';
import type { FacturaCompra } from '../types/facturaCompra';
import type { Pressupost } from '../types/pressupost';
import type { CronometreState, PartTreball } from '../types/partTreball';

// Tipos para el store
export interface StoreSchema {
  clients: Client[];
  proveidors: Proveidor[];
  projectes: Projecte[];
  facturesVenda: FacturaVenta[];
  facturesCompra: FacturaCompra[];
  pressupostos: Pressupost[];
  navigateTo?: { type: string; codi: string } | null;
  parametres: {
    dadesEmpresa?: any;
    categories?: any[];
    serveis?: any[];
    unitats?: any[];
    tarifes?: any[];
    materials?: any[];
    grupsMaterials?: any[];
    plantilles?: any[];
    categoriesProveidors?: CategoriaProveidor[];
  };
  partsTreball: PartTreball[];
  cronometre: CronometreState | null;
  version: string;
  migrationCompleted?: boolean;
  settings: {
    nombre: string;
    cif: string;
    direccion: string;
    telefono: string;
    email: string;
    logo: string | null;
  } | null;
  esdevenimentsPersonalitzats: any[];
}

// Mapeo de claves localStorage → electron-store
const STORAGE_KEYS = {
  clients: 'plateaClients',
  proveidors: 'plateaProveidors',
  projectes: 'plateaProjectes',
  facturesVenda: 'plateaFacturesVenda',
  facturesCompra: 'plateaFacturesCompra',
  pressupostos: 'plateaPressupostos',
  navigateTo: 'plateaNavigateTo',
  parametres: 'plateaParametres',
  partsTreball: 'plateaPartsTreball',
  cronometre: 'plateaCronometre',
  settings: 'plateaErpSettings',
  esdevenimentsPersonalitzats: 'plateaEsdevenimentsPersonalitzats'
} as const;

class StorageManager {
  private useElectronStore: boolean;
  private electronStoreAPI: any;

  constructor() {
    this.useElectronStore = typeof window !== 'undefined' && 
                            typeof (window as any).electronStore !== 'undefined';
    
    if (this.useElectronStore) {
      this.electronStoreAPI = (window as any).electronStore;
      console.log('✅ Usando electron-store');
    } else {
      console.log('ℹ️  Usando localStorage (modo desarrollo)');
    }
  }

  // Método genérico get
  get<K extends keyof StoreSchema>(key: K): StoreSchema[K] {
    if (this.useElectronStore) {
      const data = this.electronStoreAPI.get(key);
      return data !== undefined ? data : this.getDefaultValue(key);
    } else {
      const lsKey = STORAGE_KEYS[key as keyof typeof STORAGE_KEYS] || key;
      const data = localStorage.getItem(lsKey);
      if (!data) return this.getDefaultValue(key);
      
      try {
        return JSON.parse(data);
      } catch {
        return this.getDefaultValue(key);
      }
    }
  }

  // Método genérico set
  set<K extends keyof StoreSchema>(key: K, value: StoreSchema[K]): void {
    if (this.useElectronStore) {
      this.electronStoreAPI.set(key, value);
    } else {
      const lsKey = STORAGE_KEYS[key as keyof typeof STORAGE_KEYS] || key;
      localStorage.setItem(lsKey, JSON.stringify(value));
    }
  }

  // Método genérico delete
  delete<K extends keyof StoreSchema>(key: K): void {
    if (this.useElectronStore) {
      this.electronStoreAPI.delete(key);
    } else {
      const lsKey = STORAGE_KEYS[key as keyof typeof STORAGE_KEYS] || key;
      localStorage.removeItem(lsKey);
    }
  }

  // Valores por defecto
  private getDefaultValue<K extends keyof StoreSchema>(key: K): StoreSchema[K] {
    const defaults: Partial<StoreSchema> = {
      clients: [],
      proveidors: [],
      projectes: [],
      facturesVenda: [],
      facturesCompra: [],
      pressupostos: [],
      partsTreball: [],
      cronometre: null,
      navigateTo: null,
      settings: null,
      esdevenimentsPersonalitzats: [],
      parametres: {
        categories: [],
        serveis: [],
        unitats: [],
        tarifes: [],
        materials: [],
        grupsMaterials: [],
        plantilles: [],
        categoriesProveidors: [
          { codi: 'AUDIO', nom: 'Audio', color: '#3b82f6' },
          { codi: 'AUDIO_CLASSICA', nom: 'Audio - clàssica', color: '#8b5cf6' },
          { codi: 'DRONE', nom: 'Operador de drone', color: '#10b981' },
          { codi: 'FOTO', nom: 'Fotografia', color: '#f59e0b' },
          { codi: 'OPERADOR', nom: 'Operador de càmera', color: '#ef4444' },
          { codi: 'REALITZACIO', nom: 'Realització', color: '#ec4899' },
          { codi: 'STREAMING', nom: 'Streaming', color: '#14b8a6' },
          { codi: 'SUPORT', nom: 'Suport tècnic', color: '#6366f1' }
        ]
      },
      version: '1.0.1',
      migrationCompleted: false
    };
    
    return defaults[key] as StoreSchema[K];
  }

  // ============================================================================
  // CLIENTS
  // ============================================================================
  
  getClients(): Client[] {
    return this.get('clients');
  }

  setClients(clients: Client[]): void {
    this.set('clients', clients);
  }

  // ============================================================================
  // FACTURES VENDA
  // ============================================================================

  getFacturesVenda(): FacturaVenta[] {
    return this.get('facturesVenda');
  }

  setFacturesVenda(factures: FacturaVenta[]): void {
    this.set('facturesVenda', factures);
  }

  // ============================================================================
  // FACTURES COMPRA
  // ============================================================================

  getFacturesCompra(): FacturaCompra[] {
    return this.get('facturesCompra');
  }

  setFacturesCompra(factures: FacturaCompra[]): void {
    this.set('facturesCompra', factures);
  }

  // ============================================================================
  // PROJECTES
  // ============================================================================

  getProjectes(): Projecte[] {
    return this.get('projectes');
  }

  setProjectes(projectes: Projecte[]): void {
    this.set('projectes', projectes);
  }

  // ============================================================================
  // PROVEIDORS
  // ============================================================================

  getProveidors(): Proveidor[] {
    return this.get('proveidors');
  }

  setProveidors(proveidors: Proveidor[]): void {
    this.set('proveidors', proveidors);
  }

  // ============================================================================
  // PRESSUPOSTOS
  // ============================================================================

  getPressupostos(): Pressupost[] {
    return this.get('pressupostos');
  }

  setPressupostos(pressupostos: Pressupost[]): void {
    this.set('pressupostos', pressupostos);
  }

  // ============================================================================
  // NAVEGACIÓ (plateaNavigateTo)
  // ============================================================================

  getNavigateTo(): { type: string; codi: string } | null {
    if (this.useElectronStore) {
      return this.electronStoreAPI.get('navigateTo') || null;
    } else {
      const data = localStorage.getItem('plateaNavigateTo');
      if (!data) return null;
      try {
        return JSON.parse(data);
      } catch {
        return null;
      }
    }
  }

  setNavigateTo(data: { type: string; codi: string }): void {
    if (this.useElectronStore) {
      this.electronStoreAPI.set('navigateTo', data);
    } else {
      localStorage.setItem('plateaNavigateTo', JSON.stringify(data));
    }
  }

  deleteNavigateTo(): void {
    if (this.useElectronStore) {
      this.electronStoreAPI.delete('navigateTo');
    } else {
      localStorage.removeItem('plateaNavigateTo');
    }
  }

  // ============================================================================
  // PARÀMETRES
  // ============================================================================

  getParametres(): StoreSchema['parametres'] {
    return this.get('parametres');
  }

  setParametres(parametres: StoreSchema['parametres']): void {
    this.set('parametres', parametres);
  }

  // ============================================================================
  // PARTS TREBALL
  // ============================================================================

  getPartsTreball(): PartTreball[] {
    return this.get('partsTreball');
  }

  setPartsTreball(parts: PartTreball[]): void {
    this.set('partsTreball', parts);
  }

  // ============================================================================
  // CRONÒMETRE
  // ============================================================================

  getCronometre(): CronometreState | null {
    return this.get('cronometre');
  }

  setCronometre(state: CronometreState): void {
    this.set('cronometre', state);
  }

  deleteCronometre(): void {
    this.delete('cronometre');
  }

  // ============================================================================
  // MIGRACIÓ
  // ============================================================================

  migrateFromLocalStorage(): void {
    if (this.useElectronStore) {
      const migrated = this.electronStoreAPI.get('migrationCompleted');
      if (!migrated) {
        console.log('🔄 Migrando datos de localStorage a electron-store...');

        let migratedCount = 0;

        Object.entries(STORAGE_KEYS).forEach(([storeKey, lsKey]) => {
          const data = localStorage.getItem(lsKey);
          if (data) {
            try {
              const parsed = JSON.parse(data);
              this.set(storeKey as keyof StoreSchema, parsed);
              console.log(`✅ Migrado: ${lsKey} → ${storeKey}`);
              migratedCount++;
            } catch (error) {
              console.error(`❌ Error migrando ${lsKey}:`, error);
            }
          }
        });

        if (migratedCount > 0) {
          this.electronStoreAPI.set('migrationCompleted', true);
          console.log(`✅ Migración completada: ${migratedCount} entidades`);
        }
      }

      // Migració v2: claus afegides posteriorment (settings i esdeveniments)
      // S'executa independentment de migrationCompleted per cobrir usuaris que ja havien migrat
      const migratedV2 = this.electronStoreAPI.get('migrationV2Completed');
      if (!migratedV2) {
        const v2Keys: Array<[keyof StoreSchema, string]> = [
          ['settings', 'plateaErpSettings'],
          ['esdevenimentsPersonalitzats', 'plateaEsdevenimentsPersonalitzats']
        ];

        v2Keys.forEach(([storeKey, lsKey]) => {
          const data = localStorage.getItem(lsKey);
          if (data) {
            try {
              const current = this.get(storeKey);
              const isEmpty = current === null || (Array.isArray(current) && current.length === 0);
              if (isEmpty) {
                this.set(storeKey, JSON.parse(data));
                console.log(`✅ Migrat v2: ${lsKey} → ${storeKey}`);
              }
            } catch (error) {
              console.error(`❌ Error migrando v2 ${lsKey}:`, error);
            }
          }
        });

        this.electronStoreAPI.set('migrationV2Completed', true);
      }
    }
  }

  // ============================================================================
  // SETTINGS
  // ============================================================================

  getSettings(): StoreSchema['settings'] {
    return this.get('settings');
  }

  setSettings(settings: StoreSchema['settings']): void {
    this.set('settings', settings);
  }

  // ============================================================================
  // ESDEVENIMENTS PERSONALITZATS
  // ============================================================================

  getEsdevenimentsPersonalitzats(): any[] {
    return this.get('esdevenimentsPersonalitzats');
  }

  setEsdevenimentsPersonalitzats(events: any[]): void {
    this.set('esdevenimentsPersonalitzats', events);
  }

  // ============================================================================
  // UTILITATS
  // ============================================================================

  exportAll(): Partial<StoreSchema> {
    return {
      clients: this.getClients(),
      proveidors: this.getProveidors(),
      projectes: this.getProjectes(),
      facturesVenda: this.getFacturesVenda(),
      facturesCompra: this.getFacturesCompra(),
      pressupostos: this.getPressupostos(),
      parametres: this.getParametres(),
      partsTreball: this.getPartsTreball(),
      cronometre: this.getCronometre(),
      settings: this.getSettings(),
      esdevenimentsPersonalitzats: this.getEsdevenimentsPersonalitzats()
    };
  }

  resetAll(): void {
    (Object.keys(STORAGE_KEYS) as Array<keyof typeof STORAGE_KEYS>).forEach(key => {
      this.delete(key as keyof StoreSchema);
    });
  }

  getStorePath(): string | null {
    if (this.useElectronStore) {
      return this.electronStoreAPI.getPath?.() || null;
    }
    return null;
  }
}

// Singleton
export const storage = new StorageManager();
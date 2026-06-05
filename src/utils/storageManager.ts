import type { Client } from '../types/client';
import type { Proveidor } from '../types/proveidor';
import type { Projecte } from '../types/projecte';
import type { FacturaVenta } from '../types/facturaVenta';
import type { FacturaCompra, ObligacioFiscal } from '../types/facturaCompra';
import type { Pressupost } from '../types/pressupost';
import type { CronometreState, PartTreball } from '../types/partTreball';
import type { AlbaraCompra } from '../types/albara';

const DATA_SCHEMA_VERSION = 5;

// Tipos para el store
export interface StoreSchema {
  clients: Client[];
  proveidors: Proveidor[];
  projectes: Projecte[];
  facturesVenda: FacturaVenta[];
  facturesCompra: FacturaCompra[];
  pressupostos: Pressupost[];
  obligacionsFiscals: ObligacioFiscal[];
  albaransCompra: AlbaraCompra[];
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
  dataSchemaVersion: number;
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
  googleCalendarToken: {
    access_token: string;
    refresh_token: string;
    expires_at: number;
    client_id: string;
    client_secret: string;
    calendar_id: string;
  } | null;
  webSyncConfig: {
    url: string;          // https://auroraerp.plateafilms.com/api
    apiKey: string;       // SYNC_API_KEY del config.php
    autoSync: boolean;
    intervalMinutes: number; // 15 | 30 | 60 | 120
  } | null;
}

// Mapeo de claves localStorage → electron-store
const STORAGE_KEYS = {
  clients: 'plateaClients',
  proveidors: 'plateaProveidors',
  projectes: 'plateaProjectes',
  facturesVenda: 'plateaFacturesVenda',
  facturesCompra: 'plateaFacturesCompra',
  pressupostos: 'plateaPressupostos',
  obligacionsFiscals: 'plateaObligacionsFiscals',
  albaransCompra: 'plateaAlbaransCompra',
  navigateTo: 'plateaNavigateTo',
  parametres: 'plateaParametres',
  partsTreball: 'plateaPartsTreball',
  cronometre: 'plateaCronometre',
  settings: 'plateaErpSettings',
  esdevenimentsPersonalitzats: 'plateaEsdevenimentsPersonalitzats',
  googleCalendarToken: 'plateaGoogleCalendarToken',
  webSyncConfig: 'plateaWebSyncConfig'
} as const;

class StorageManager {
  private useElectronStore: boolean;
  private electronStoreAPI: any;

  constructor() {
    const api = typeof window !== 'undefined' ? (window as any).electronStore : undefined;
    this.useElectronStore = !!api && (api.isAvailable ? api.isAvailable() : typeof api.get === 'function');

    if (this.useElectronStore) {
      this.electronStoreAPI = api;
      console.log('✅ Usando electron-store');
    } else {
      console.log('ℹ️  Usando localStorage (modo desarrollo o electron-store no disponible)');
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
      obligacionsFiscals: [],
      albaransCompra: [],
      partsTreball: [],
      cronometre: null,
      navigateTo: null,
      settings: null,
      esdevenimentsPersonalitzats: [],
      googleCalendarToken: null,
      webSyncConfig: null,
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
      version: __APP_VERSION__,
      dataSchemaVersion: DATA_SCHEMA_VERSION,
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
    // V5 lazy migration: rename typo field esDesepsaGeneral → esDepesaGeneral
    const v5Flag = this.useElectronStore
      ? this.electronStoreAPI.get('migrationV5Completed')
      : localStorage.getItem('plateaMigrationV5');
    if (!v5Flag) {
      const raw = (this.get('facturesCompra') as any[]) || [];
      const needsFix = raw.some((g: any) => 'esDesepsaGeneral' in g);
      if (needsFix) {
        const fixed = raw.map((g: any) => {
          if (!('esDesepsaGeneral' in g)) return g;
          const { esDesepsaGeneral, ...rest } = g;
          return { ...rest, esDepesaGeneral: esDesepsaGeneral };
        });
        this.set('facturesCompra', fixed);
      }
      if (this.useElectronStore) this.electronStoreAPI.set('migrationV5Completed', true);
      else localStorage.setItem('plateaMigrationV5', 'true');
    }

    const data = (this.get('facturesCompra') as any[]) || [];
    return data
      .filter((g: any) => g.tipus !== 'obligacio-fiscal')
      .map((g: any) => {
        // Recalculate using integer cents to fix any floating-point residuals in stored data
        const totalGastoCents = Math.round((g.totalGasto || 0) * 100);
        const totalPagatCents = Math.round(
          (g.pagaments || []).reduce((s: number, p: any) => s + (p.import || 0), 0) * 100
        );
        return {
          ...g,
          pendentPagament: Math.max(0, totalGastoCents - totalPagatCents) / 100,
        };
      });
  }

  getObligacionsFiscals(): ObligacioFiscal[] {
    // Lazy V3 migration: move any OFs still in facturesCompra into obligacionsFiscals.
    // Runs inline so it's timing-safe regardless of React effect order.
    if (this.useElectronStore) {
      if (!this.electronStoreAPI.get('migrationV3Completed')) {
        const allFC = (this.electronStoreAPI.get('facturesCompra') || []) as any[];
        const ofs = allFC.filter((g: any) => g.tipus === 'obligacio-fiscal');
        if (ofs.length > 0) {
          const existing = (this.electronStoreAPI.get('obligacionsFiscals') || []) as any[];
          const merged = [...existing, ...ofs.filter((o: any) => !existing.some((e: any) => e.codi === o.codi))];
          this.electronStoreAPI.set('obligacionsFiscals', merged);
          this.electronStoreAPI.set('facturesCompra', allFC.filter((g: any) => g.tipus !== 'obligacio-fiscal'));
        }
        this.electronStoreAPI.set('migrationV3Completed', true);
      }
    } else {
      const lsFlag = localStorage.getItem('plateaMigrationV3');
      if (!lsFlag) {
        const fcData = localStorage.getItem('plateaFacturesCompra');
        if (fcData) {
          try {
            const allFC = JSON.parse(fcData) as any[];
            const ofs = allFC.filter((g: any) => g.tipus === 'obligacio-fiscal');
            if (ofs.length > 0) {
              const existingData = localStorage.getItem('plateaObligacionsFiscals');
              const existing = existingData ? JSON.parse(existingData) : [];
              const merged = [...existing, ...ofs.filter((o: any) => !existing.some((e: any) => e.codi === o.codi))];
              localStorage.setItem('plateaObligacionsFiscals', JSON.stringify(merged));
              localStorage.setItem('plateaFacturesCompra', JSON.stringify(allFC.filter((g: any) => g.tipus !== 'obligacio-fiscal')));
            }
          } catch {
            // malformed data — skip migration, don't corrupt anything
          }
        }
        localStorage.setItem('plateaMigrationV3', 'true');
      }
    }
    return (this.get('obligacionsFiscals') as any[]) || [];
  }

  setObligacionsFiscals(obs: ObligacioFiscal[]): void {
    this.set('obligacionsFiscals', obs);
  }

  // ============================================================================
  // ALBARANS DE COMPRA
  // ============================================================================

  getAlbaransCompra(): AlbaraCompra[] {
    // V4 lazy migration: assign tdCodi to existing project expense lines and create albarans
    const migrFlag = this.useElectronStore
      ? this.electronStoreAPI.get('migrationV4Completed')
      : localStorage.getItem('plateaMigrationV4');

    if (!migrFlag) {
      this._runV4Migration();
    }

    return (this.get('albaransCompra') as any[]) || [];
  }

  setAlbaransCompra(albarans: AlbaraCompra[]): void {
    this.set('albaransCompra', albarans);
  }

  private _runV4Migration(): void {
    const today = new Date().toISOString().split('T')[0];
    const projects: Projecte[] = (this.get('projectes') as any[]) || [];
    const existing: AlbaraCompra[] = (this.get('albaransCompra') as any[]) || [];

    let tdMax = 0;
    let alcMax = existing.length ? Math.max(...existing.map(a => parseInt(a.codi.replace('ALC-', ''), 10) || 0)) : 0;

    // Find max tdCodi already assigned
    for (const p of projects) {
      for (const r of p.recursosHumans || []) {
        if (r.tdCodi) { const n = parseInt(r.tdCodi.replace('TD-', ''), 10); if (!isNaN(n) && n > tdMax) tdMax = n; }
      }
      for (const m of p.materials || []) {
        if (m.tdCodi) { const n = parseInt(m.tdCodi.replace('TD-', ''), 10); if (!isNaN(n) && n > tdMax) tdMax = n; }
      }
    }

    const newAlbarans: AlbaraCompra[] = [...existing];
    const updatedProjects: Projecte[] = projects.map(p => {
      let changed = false;
      const recursosHumans = (p.recursosHumans || []).map(r => {
        if (!r.proveidor || r.tdCodi) return r;
        tdMax++;
        alcMax++;
        const tdCodi = `TD-${String(tdMax).padStart(7, '0')}`;
        const albara: AlbaraCompra = {
          codi: `ALC-${String(alcMax).padStart(5, '0')}`,
          tdCodi,
          projecteCodi: p.codi,
          proveidorCodi: r.proveidor,
          dataCreacio: today,
          estat: 'pendent-factura',
          tipusLinia: 'rrhh',
          serveiCodi: r.servei,
          quantitat: r.quantitat,
          unitatCodi: r.unitat,
          preuProv: r.preu,
          cost: r.cost,
        };
        newAlbarans.push(albara);
        changed = true;
        return { ...r, tdCodi };
      });

      const materials = (p.materials || []).map(m => {
        if (!m.proveidor || m.tdCodi) return m;
        tdMax++;
        alcMax++;
        const tdCodi = `TD-${String(tdMax).padStart(7, '0')}`;
        const albara: AlbaraCompra = {
          codi: `ALC-${String(alcMax).padStart(5, '0')}`,
          tdCodi,
          projecteCodi: p.codi,
          proveidorCodi: m.proveidor,
          dataCreacio: today,
          estat: 'pendent-factura',
          tipusLinia: 'material',
          materialCodi: m.material,
          grupCodi: m.grup,
          preuProveidor: m.preuProveidor,
        };
        newAlbarans.push(albara);
        changed = true;
        return { ...m, tdCodi };
      });

      return changed ? { ...p, recursosHumans, materials } : p;
    });

    this.set('projectes', updatedProjects);
    this.set('albaransCompra', newAlbarans);

    if (this.useElectronStore) {
      this.electronStoreAPI.set('migrationV4Completed', true);
    } else {
      localStorage.setItem('plateaMigrationV4', 'true');
    }
    console.log(`✅ Migrat v4: albarans creats per a línies de despesa existents`);
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

      // Migració v3: moure ObligacioFiscal de facturesCompra a obligacionsFiscals
      const migratedV3 = this.electronStoreAPI.get('migrationV3Completed');
      if (!migratedV3) {
        const allFactures = (this.electronStoreAPI.get('facturesCompra') || []) as any[];
        const ofs = allFactures.filter((g: any) => g.tipus === 'obligacio-fiscal');
        if (ofs.length > 0) {
          const existingOFs = (this.electronStoreAPI.get('obligacionsFiscals') || []) as any[];
          const mergedOFs = [
            ...existingOFs,
            ...ofs.filter((o: any) => !existingOFs.some((e: any) => e.codi === o.codi))
          ];
          this.electronStoreAPI.set('obligacionsFiscals', mergedOFs);
          this.electronStoreAPI.set('facturesCompra', allFactures.filter((g: any) => g.tipus !== 'obligacio-fiscal'));
          console.log(`✅ Migrat v3: ${ofs.length} obligacions fiscals a clau pròpia`);
        }
        this.electronStoreAPI.set('migrationV3Completed', true);
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
  // VERIFACTU CONFIG
  // ============================================================================

  getVerifactuConfig(): import('../types/verifactu').VerifactuConfig {
    const DEFAULT = { enabled: false, mode: 'no-verifactu' as const, entornTest: true, idSistema: '' };
    try {
      // 'verifactuConfig' is outside StoreSchema — read directly from the underlying store
      let stored: any;
      if (this.useElectronStore) {
        stored = this.electronStoreAPI.get('verifactuConfig');
      } else {
        const raw = localStorage.getItem('verifactuConfig');
        stored = raw ? JSON.parse(raw) : undefined;
      }
      return stored ?? DEFAULT;
    } catch {
      return DEFAULT;
    }
  }

  setVerifactuConfig(config: import('../types/verifactu').VerifactuConfig): void {
    try {
      if (this.useElectronStore) {
        this.electronStoreAPI.set('verifactuConfig', config);
      } else {
        localStorage.setItem('verifactuConfig', JSON.stringify(config));
      }
    } catch { /* ignore */ }
  }

  // Certificat P12/PFX — emmagatzemat en base64 (el format P12 ja xifra amb PIN)
  getVerifactuCertificatP12(): string | null {
    try {
      if (this.useElectronStore) {
        return (this.electronStoreAPI.get('verifactuCertificatP12') as string | undefined) ?? null;
      } else {
        return localStorage.getItem('verifactuCertificatP12');
      }
    } catch { return null; }
  }

  setVerifactuCertificatP12(p12Base64: string): void {
    try {
      if (this.useElectronStore) {
        this.electronStoreAPI.set('verifactuCertificatP12', p12Base64);
      } else {
        localStorage.setItem('verifactuCertificatP12', p12Base64);
      }
    } catch { /* ignore */ }
  }

  deleteVerifactuCertificatP12(): void {
    try {
      if (this.useElectronStore) {
        this.electronStoreAPI.delete('verifactuCertificatP12');
      } else {
        localStorage.removeItem('verifactuCertificatP12');
      }
    } catch { /* ignore */ }
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
      obligacionsFiscals: this.getObligacionsFiscals(),
      parametres: this.getParametres(),
      partsTreball: this.getPartsTreball(),
      cronometre: this.getCronometre(),
      settings: this.getSettings(),
      esdevenimentsPersonalitzats: this.getEsdevenimentsPersonalitzats(),
      version: this.get('version'),
      dataSchemaVersion: this.get('dataSchemaVersion')
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

  // ============================================================================
  // WEB SYNC CONFIG
  // ============================================================================

  getWebSyncConfig(): StoreSchema['webSyncConfig'] {
    return this.get('webSyncConfig');
  }

  setWebSyncConfig(config: StoreSchema['webSyncConfig']): void {
    this.set('webSyncConfig', config);
  }

  // ============================================================================
  // CLOUD BACKUP — timestamp de l'última còpia al servidor
  // ============================================================================

  getLastCloudBackup(): string | null {
    try {
      if (this.useElectronStore) {
        return (this.electronStoreAPI.get('lastCloudBackup') as string | undefined) ?? null;
      }
      return localStorage.getItem('lastCloudBackup');
    } catch { return null; }
  }

  setLastCloudBackup(iso: string): void {
    try {
      if (this.useElectronStore) this.electronStoreAPI.set('lastCloudBackup', iso);
      else localStorage.setItem('lastCloudBackup', iso);
    } catch { /* ignore */ }
  }
}

// Singleton
export const storage = new StorageManager();

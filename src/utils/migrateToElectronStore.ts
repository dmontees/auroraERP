import { storage } from './storageManager';

export function migrateFromLocalStorage() {
  console.log('🔄 Iniciando migración de localStorage a electron-store...');

  try {
    // Mapeo de claves localStorage → electron-store
    const migrations: Array<{
      localStorageKey: string;
      storeKey: keyof ReturnType<typeof storage.export>;
    }> = [
      { localStorageKey: 'plateaClients', storeKey: 'clients' },
      { localStorageKey: 'plateaProveidors', storeKey: 'proveidors' },
      { localStorageKey: 'plateaProjectes', storeKey: 'projectes' },
      { localStorageKey: 'plateaFacturesVenta', storeKey: 'facturesVenda' },
      { localStorageKey: 'plateaFacturesCompra', storeKey: 'facturesCompra' },
      { localStorageKey: 'plateaPressupostos', storeKey: 'pressupostos' },
      { localStorageKey: 'plateaParametres', storeKey: 'parametres' }
    ];

    let migratedCount = 0;

    migrations.forEach(({ localStorageKey, storeKey }) => {
      const data = localStorage.getItem(localStorageKey);
      
      if (data) {
        try {
          const parsed = JSON.parse(data);
          
          // Solo migrar si electron-store está vacío para esta clave
          const currentData = storage.get(storeKey as any);
          if (!currentData || (Array.isArray(currentData) && currentData.length === 0)) {
            storage.set(storeKey as any, parsed);
            console.log(`✅ Migrado: ${localStorageKey} → ${storeKey} (${Array.isArray(parsed) ? parsed.length : 'N/A'} registros)`);
            migratedCount++;
          } else {
            console.log(`⏭️  Saltado: ${storeKey} (ya tiene datos)`);
          }
        } catch (error) {
          console.error(`❌ Error migrando ${localStorageKey}:`, error);
        }
      }
    });

    if (migratedCount > 0) {
      // Marcar migración como completada
      localStorage.setItem('platea_migration_completed', new Date().toISOString());
      console.log(`✅ Migración completada: ${migratedCount} entidades migradas`);
      console.log(`📁 Datos guardados en: ${storage.getStorePath()}`);
    } else {
      console.log('ℹ️  No hay datos para migrar o ya se migró anteriormente');
    }

  } catch (error) {
    console.error('❌ Error durante la migración:', error);
  }
}

// Verificar si es necesaria la migración
export function needsMigration(): boolean {
  // Si ya se completó la migración, no es necesario
  if (localStorage.getItem('platea_migration_completed')) {
    return false;
  }

  // Verificar si hay datos en localStorage
  const hasLocalStorageData = 
    localStorage.getItem('plateaClients') ||
    localStorage.getItem('plateaFacturesVenda') ||
    localStorage.getItem('plateaProjectes');

  return !!hasLocalStorageData;
}
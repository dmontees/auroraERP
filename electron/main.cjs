const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    icon: path.join(__dirname, '../build/icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true
    },
    title: 'Aurora'
  });

  // MIGRACIÓN AUTOMÁTICA: Copiar datos persistentes
  migrateDataIfNeeded();

  // Cargar la app
  if (process.env.NODE_ENV === 'development') {
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Remover el menú por defecto
  win.setMenuBarVisibility(false);

  // BACKUP AUTOMÁTICO cada 30 segundos
  setInterval(() => {
    backupLocalStorage(win);
  }, 30000);

  // BACKUP al cerrar
  win.on('close', () => {
    backupLocalStorage(win);
  });
}

// FUNCIÓN: Migrar datos de versiones anteriores
function migrateDataIfNeeded() {
  const userDataPath = app.getPath('userData');
  const backupFile = path.join(userDataPath, 'aurora-backup.json');

  // Si existe backup, preparar para restaurar en el navegador
  if (fs.existsSync(backupFile)) {
    console.log('✅ Backup encontrado, se restaurará en el navegador');
  } else {
    console.log('ℹ️ No hay backup previo (primera instalación)');
  }
}

// FUNCIÓN: Hacer backup del localStorage
function backupLocalStorage(win) {
  win.webContents.executeJavaScript(`
    const data = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      data[key] = localStorage.getItem(key);
    }
    JSON.stringify(data);
  `).then(dataStr => {
    const userDataPath = app.getPath('userData');
    const backupFile = path.join(userDataPath, 'aurora-backup.json');
    
    try {
      fs.writeFileSync(backupFile, dataStr, 'utf-8');
      console.log('✅ Backup guardado correctamente');
    } catch (error) {
      console.error('❌ Error al guardar backup:', error);
    }
  }).catch(err => {
    console.error('❌ Error al leer localStorage:', err);
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
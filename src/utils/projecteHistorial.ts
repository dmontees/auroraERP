import type { Projecte, HistorialEntry } from '../types/projecte';

/**
 * Añadir entrada al historial del proyecto
 */
export const afegirEntradaHistorial = (
  projecte: Projecte,
  tipus: HistorialEntry['tipus'],
  descripcio: string,
  detalls?: string
): Projecte => {
  const novaEntrada: HistorialEntry = {
    id: `hist-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    data: new Date().toISOString(),
    tipus,
    descripcio,
    detalls
  };
  
  return {
    ...projecte,
    historial: [...(projecte.historial || []), novaEntrada]
  };
};

/**
 * Registrar creación del proyecto
 */
export const registrarCreacioProjecte = (projecte: Projecte, desdePressupost?: string): Projecte => {
  const descripcio = desdePressupost 
    ? `Projecte creat des del pressupost ${desdePressupost}`
    : 'Projecte creat';
  
  return afegirEntradaHistorial(projecte, 'creacio', descripcio, `Estat inicial: ${projecte.estat}`);
};

/**
 * Registrar cambio de estado
 */
export const registrarCanviEstat = (
  projecte: Projecte,
  estatAnterior: string,
  estatNou: string
): Projecte => {
  if (estatAnterior === estatNou) return projecte;
  
  return afegirEntradaHistorial(
    projecte,
    'estat',
    `Estat canviat: ${estatAnterior} → ${estatNou}`,
    `Canvi d'estat del projecte`
  );
};

/**
 * Registrar adición de tareas
 */
export const registrarTascaAfegida = (
  projecte: Projecte,
  numTasques: number,
  importTotal: number
): Projecte => {
  const descripcio = numTasques === 1 
    ? '1 tasca afegida'
    : `${numTasques} tasques afegides`;
  
  return afegirEntradaHistorial(
    projecte,
    'tasca',
    descripcio,
    `Import total: ${importTotal.toFixed(2)}€`
  );
};

/**
 * Registrar vinculación con presupuesto
 */
export const registrarPressupostVinculat = (
  projecte: Projecte,
  codiPressupost: string
): Projecte => {
  return afegirEntradaHistorial(
    projecte,
    'pressupost',
    `Pressupost vinculat: ${codiPressupost}`,
    'Pressupost associat al projecte'
  );
};

/**
 * Registrar vinculación con factura
 */
export const registrarFacturaVinculada = (
  projecte: Projecte,
  codiFactura: string
): Projecte => {
  return afegirEntradaHistorial(
    projecte,
    'factura',
    `Factura vinculada: ${codiFactura}`,
    'Factura associada al projecte'
  );
};

/**
 * Registrar adición de documento
 */
export const registrarDocumentAfegit = (
  projecte: Projecte,
  nomDocument: string,
  tipusDocument: string
): Projecte => {
  return afegirEntradaHistorial(
    projecte,
    'document',
    `Document afegit: ${nomDocument}`,
    `Tipus: ${tipusDocument}`
  );
};

/**
 * Registrar evento del calendario vinculado al proyecto
 */
export const registrarEsdeveniment = (
  projecte: Projecte,
  titolEsdeveniment: string,
  dataEsdeveniment: string
): Projecte => {
  return afegirEntradaHistorial(
    projecte,
    'esdeveniment',
    titolEsdeveniment,
    `Data: ${dataEsdeveniment}`
  );
};

/**
 * Obtener entradas del historial ordenadas por fecha (más reciente primero)
 */
export const obtenirHistorialOrdenat = (projecte: Projecte): HistorialEntry[] => {
  if (!projecte.historial) return [];
  
  return [...projecte.historial].sort((a, b) => 
    new Date(b.data).getTime() - new Date(a.data).getTime()
  );
};
/**
 * Registrar eliminación de tarea
 */
 export const registrarTascaEliminada = (
  projecte: Projecte,
  descripcioTasca: string,
  importTasca: number
): Projecte => {
  return afegirEntradaHistorial(
    projecte,
    'tasca',
    `Tasca eliminada: ${descripcioTasca}`,
    `Import: ${importTasca.toFixed(2)}€`
  );
};

/**
 * Registrar adición de gasto
 */
export const registrarGastoAfegit = (
  projecte: Projecte,
  descripcioGasto: string,
  importGasto: number
): Projecte => {
  return afegirEntradaHistorial(
    projecte,
    'modificacio',
    `Gasto afegit: ${descripcioGasto}`,
    `Import: ${importGasto.toFixed(2)}€`
  );
};

/**
 * Registrar eliminación de gasto
 */
export const registrarGastoEliminat = (
  projecte: Projecte,
  descripcioGasto: string,
  importGasto: number
): Projecte => {
  return afegirEntradaHistorial(
    projecte,
    'modificacio',
    `Gasto eliminat: ${descripcioGasto}`,
    `Import: ${importGasto.toFixed(2)}€`
  );
};

/**
 * Registrar traslado de gasto a tarea
 */
export const registrarGastoTrasladatATasca = (
  projecte: Projecte,
  descripcioGasto: string,
  importGasto: number
): Projecte => {
  return afegirEntradaHistorial(
    projecte,
    'tasca',
    `Gasto convertit a tasca: ${descripcioGasto}`,
    `Import: ${importGasto.toFixed(2)}€`
  );
};

/**
 * Registrar eliminación de documento
 */
export const registrarDocumentEliminat = (
  projecte: Projecte,
  nomDocument: string
): Projecte => {
  return afegirEntradaHistorial(
    projecte,
    'document',
    `Document eliminat: ${nomDocument}`,
    undefined
  );
};

/**
 * Registrar desvinculación de presupuesto
 */
export const registrarPressupostDesvinculat = (
  projecte: Projecte,
  codiPressupost: string
): Projecte => {
  return afegirEntradaHistorial(
    projecte,
    'pressupost',
    `Pressupost desvinculat: ${codiPressupost}`,
    'Pressupost dissociat del projecte'
  );
};

/**
 * Registrar desvinculación de factura
 */
export const registrarFacturaDesvinculada = (
  projecte: Projecte,
  codiFactura: string
): Projecte => {
  return afegirEntradaHistorial(
    projecte,
    'factura',
    `Factura desvinculada: ${codiFactura}`,
    'Factura dissociada del projecte'
  );
};

/**
 * Obtener icono según tipo de entrada y descripción
 */
 export const obtenirIconaHistorial = (entrada: HistorialEntry): string => {
  const { tipus, descripcio } = entrada;
  
  // Detectar si es añadir o eliminar (con verificación de undefined)
  const descripcioLower = descripcio?.toLowerCase() || '';
  const esEliminar = descripcioLower.includes('eliminat') || 
                     descripcioLower.includes('eliminada');
  const esAfegir = descripcioLower.includes('afegit') || 
                   descripcioLower.includes('afegida') ||
                   descripcioLower.includes('convertit');
  
  // Iconos específicos
  if (tipus === 'tasca') {
    if (esEliminar) return '➖';
    if (esAfegir) return '➕';
    return '✅';
  }
  
  if (tipus === 'modificacio') {
    if (esEliminar) return '➖';
    if (esAfegir) return '➕';
    return '✏️';
  }
  
  if (tipus === 'document') {
    if (esEliminar) return '🗑️';
    if (esAfegir) return '📄';
    return '📄';
  }
  
  // Iconos por defecto según tipo
  const icons: Record<string, string> = {
    'creacio': '🆕',
    'estat': '📊',
    'pressupost': '📋',
    'factura': '💰',
    'esdeveniment': '📅'
  };
  
  return icons[tipus] || '📌';
};

/**
 * Obtener color según tipo de entrada
 */
export const obtenirColorHistorial = (tipus: HistorialEntry['tipus']): string => {
  const colors = {
    'creacio': '#10b981',
    'estat': '#3b82f6',
    'tasca': '#8b5cf6',
    'pressupost': '#f59e0b',
    'factura': '#10b981',
    'document': '#6b7280',
    'esdeveniment': '#ec4899',
    'modificacio': '#64748b'
  };
  
  return colors[tipus] || '#6b7280';
};
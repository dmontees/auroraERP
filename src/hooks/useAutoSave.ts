import { useCallback, useEffect, useRef } from 'react';

// Función para detectar si es un proyecto (no cliente, ni proveedor, etc.)
function isProjecte(data: any): boolean {
  return 'estat' in data && 'recursosHumans' in data && 'tasques' in data;
}

// Función para detectar si un proyecto tiene ALGÚN cambio
function hasRealProjectData(data: any): boolean {
  return (
    data.pressupost || 
    data.factura ||
    data.titol || 
    data.client || 
    data.descripcio ||
    data.recursosHumans?.length > 0 ||
    data.materials?.length > 0 ||
    data.tasques?.length > 0 ||
    data.modalitat ||
    data.servei ||
    data.dataEntrega ||
    data.datesEntrega?.length > 0 ||
    data.datesRodatge?.length > 0 ||
    data.dataFinalitzacio ||
    data.instruccionsClient || 
    data.instruccionsProveidors ||
    (data.estat && data.estat !== 'esborrany') ||
    data.historial?.length > 1
  );
}

// Función para detectar si es un cliente
function isClient(data: any): boolean {
  return 'nomFiscal' in data && 'tipusIVA' in data && !('estat' in data);
}

// Función para detectar si un cliente tiene cambios
function hasRealClientData(data: any): boolean {
  return (
    data.nomFiscal ||
    data.nomComercial ||
    data.nif ||
    data.pais !== 'Espanya' ||
    data.domicili ||
    data.telefon ||
    data.correuElectronic ||
    data.web ||
    data.notesInternes ||
    data.personaContacte ||
    data.contactes?.length > 0 ||
    data.tarifesEspecials?.length > 0 ||
    data.tipusIVA !== 'Normal' ||
    data.retencio !== 0
  );
}
// Función para detectar si es un proveedor
function isProveidor(data: any): boolean {
  return 'tipus' in data && 'nomFiscal' in data && 'tipusIVA' in data && !('estat' in data);
}

// Función para detectar si un proveedor tiene cambios
function hasRealProveidorData(data: any): boolean {
  return (
    data.nomFiscal ||
    data.nomComercial ||
    data.nif ||
    data.pais !== 'Espanya' ||
    data.domicili ||
    data.telefon ||
    data.correuElectronic ||
    data.web ||
    data.notesInternes ||
    data.personaContacte ||
    data.contactes?.length > 0 ||
    data.tarifesEspecials?.length > 0 ||
    data.tipusIVA !== 'Normal' ||
    data.retencio !== 0
  );
}
/**
 * Hook para guardar automáticamente cuando cambia formData
 * @param formData - Datos del formulario
 * @param onSave - Función que guarda los datos
 * @param delay - Delay en ms para debounce (opcional, default 500ms)
 * @returns saveNow - Función para guardar inmediatamente
 */
export function useAutoSave<T>(
  formData: T,
  onSave: (data: T) => void,
  delay: number = 500
) {
  const timeoutRef = useRef<NodeJS.Timeout>();
  const isFirstRender = useRef(true);
  const formDataRef = useRef(formData);
  // Keep latest onSave in a ref so it never goes stale without being a dep
  const onSaveRef = useRef(onSave);

  useEffect(() => {
    formDataRef.current = formData;
  }, [formData]);

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  const saveNow = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    const data = formDataRef.current as any;

    if (isProjecte(data) && !hasRealProjectData(data)) {
      console.log('⏭️ No se guarda: proyecto vacío');
      return;
    }
    if (isClient(data) && !hasRealClientData(data)) {
      console.log('⏭️ No se guarda: cliente vacío');
      return;
    }
    if (isProveidor(data) && !hasRealProveidorData(data)) {
      console.log('⏭️ No se guarda: proveedor vacío');
      return;
    }

    onSaveRef.current(formDataRef.current);
  }, []);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    const data = formData as any;

    if (isProjecte(data) && !hasRealProjectData(data)) {
      console.log('⏭️ Autosave cancelado: proyecto vacío');
      return;
    }
    if (isClient(data) && !hasRealClientData(data)) {
      console.log('⏭️ Autosave cancelado: cliente vacío');
      return;
    }

    timeoutRef.current = setTimeout(() => {
      onSaveRef.current(formDataRef.current);
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  // onSave intentionally excluded — kept current via ref to break the re-render loop
  }, [formData, delay]);

  return { saveNow };
}
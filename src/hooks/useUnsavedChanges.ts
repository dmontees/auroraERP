import { useState, useEffect } from 'react';

/**
 * Hook para detectar cambios sin guardar en formularios
 * @param formData - Datos del formulario
 * @param dependency - Dependencia que indica cuándo resetear (ej: modal abierto/cerrado)
 * @returns Funciones para manejar el cierre y actualizar estado
 */
export function useUnsavedChanges<T>(formData: T, dependency?: any) {
  const [estadoInicial, setEstadoInicial] = useState<string>('');

  // Guardar estado inicial cuando se abre el modal
  useEffect(() => {
    setEstadoInicial(JSON.stringify(formData));
  }, [dependency]);

  // Verificar si hay cambios
  const teCambiosSenseGuardar = () => {
    return JSON.stringify(formData) !== estadoInicial;
  };

  // Manejar cierre con confirmación
  const handleCloseWithConfirm = (onClose: () => void) => {
    if (teCambiosSenseGuardar()) {
      if (confirm('Hi ha canvis sense guardar. Estàs segur que vols sortir sense guardar?')) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  // Actualizar estado inicial después de guardar
  const resetEstadoInicial = () => {
    setEstadoInicial(JSON.stringify(formData));
  };

  return {
    teCambiosSenseGuardar,
    handleCloseWithConfirm,
    resetEstadoInicial
  };
}
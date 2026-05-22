import { storage } from '../../utils/storageManager';

export function useClientValidation() {
  
  const hasRealClientData = (data: any): boolean => {
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
  };

  const validateAndClose = (
    formData: any,
    saveNow: () => void,
    onClose: () => void
  ): boolean => {
    const tieneCanvis = hasRealClientData(formData);
    
    if (!tieneCanvis) {
      const clients = storage.getClients();
      const clientExists = clients.some((c: any) => c.codi === formData.codi);
      
      if (clientExists) {
        const filteredClients = clients.filter((c: any) => c.codi !== formData.codi);
        storage.setClients(filteredClients);
      }
      
      onClose();
      return false;
    }
    
    if (!formData.nomFiscal) {
      alert('⚠️ Falta el camp obligatori:\n\n• Nom Fiscal\n\nOmple aquest camp abans de guardar.');
      return false;
    }
    
    saveNow();
    onClose();
    return true;
  };

  return {
    hasRealClientData,
    validateAndClose
  };
}
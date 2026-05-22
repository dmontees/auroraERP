import React from 'react';
import type { FacturaVenta } from '../../../types/facturaVenta';
import type { Plantilla } from '../../../types/parametres';
import PlantillesSelector from '../shared/PlantillesSelector';

interface Props {
  formData: FacturaVenta;
  setFormData: (data: FacturaVenta) => void;
  plantilles: Plantilla[];
  onTogglePlantilla: (codi: string) => void;
  clientBlocked: boolean;
  tePagaments: boolean;
}

export default function NotesTab({
  formData,
  setFormData,
  plantilles,
  onTogglePlantilla,
  clientBlocked,
  tePagaments
}: Props) {
  
  return (
    <PlantillesSelector
      plantilles={plantilles}
      plantillesSeleccionades={formData.plantillesSeleccionades}
      plantillesText={formData.plantillesText}
      onTogglePlantilla={onTogglePlantilla}
      onChangeText={(text) => setFormData({ ...formData, plantillesText: text })}
      disabled={clientBlocked || tePagaments}
    />
  );
}
import type { FacturaVenta, PagamentClient } from '../../../types/facturaVenta';
import type { Client } from '../../../types/client';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export function useFacturaValidation(
  factura: Partial<FacturaVenta>,
  client: Client | undefined,
  allFactures: FacturaVenta[]
) {
  
  const validate = (): ValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validación 1: Requiere cliente
    if (!factura.client) {
      errors.push('Cal seleccionar un client');
    }

    // Validación 2: Requiere al menos una tarea
    const totalTasques = factura.tasques?.reduce((sum, cat) => sum + cat.tasques.length, 0) || 0;
    if (totalTasques === 0) {
      errors.push('Cal afegir almenys una tasca');
    }

    // Validación 3: Vencimiento debe ser >= fecha factura
    if (factura.dataFactura && factura.dataVenciment) {
      const dataFact = new Date(factura.dataFactura);
      const dataVenc = new Date(factura.dataVenciment);
      
      if (dataVenc < dataFact) {
        errors.push('La data de venciment no pot ser anterior a la data de factura');
      }
    }

    // Validación 4: Si método domiciliación, validar IBAN cliente
    if (factura.pagaments && factura.pagaments.length > 0) {
      const teDomiciliacio = factura.pagaments.some(p => p.metode === 'domiciliacio');
      
      if (teDomiciliacio && client && !client.iban) {
        warnings.push('⚠️ El client no té IBAN configurat i té pagaments per domiciliació');
      }
    }

    // Warning 5: Cliente tiene facturas vencidas
    if (client && allFactures.length > 0) {
      const facturesVencidesClient = allFactures.filter(f => 
        f.client === client.codi && 
        f.estat === 'vencuda' &&
        f.codi !== factura.codi // Excluir la factura actual
      );
      
      if (facturesVencidesClient.length > 0) {
        const totalVencudes = facturesVencidesClient.reduce((sum, f) => sum + f.pendentCobrar, 0);
        warnings.push(
          `⚠️ Aquest client té ${facturesVencidesClient.length} factura(es) vençuda(es) ` +
          `amb un total pendent de ${totalVencudes.toFixed(2)}€`
        );
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  };

  const validatePagament = (
    importPagament: number, 
    pendentCobrar: number
  ): ValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (importPagament <= 0) {
      errors.push('L\'import ha de ser superior a 0');
    }

    if (importPagament > pendentCobrar) {
      errors.push(`L'import no pot ser superior al pendent (${pendentCobrar.toFixed(2)}€)`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  };

  return {
    validate,
    validatePagament
  };
}
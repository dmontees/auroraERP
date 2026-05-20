export interface ExportConfig {
  format: 'pdf-executiu' | 'pdf-complet' | 'excel' | 'csv';
  sections: string[];
  includeLogo: boolean;
  includeComparison: boolean;
}
export function storageErrorMessage(error: unknown): string {
  const detail = error instanceof Error ? error.message : String(error);
  if (/quota|exceeded.*storage/i.test(detail)) {
    return 'L’espai de localStorage està ple. Aurora Desktop ha de guardar al fitxer de dades. No esborris les dades locals.';
  }
  return detail || 'Error desconegut en accedir al fitxer de dades.';
}

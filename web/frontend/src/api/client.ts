// =============================================================================
// Aurora ERP Web — Client HTTP base
// Gestiona l'autenticació, errors i la URL base de l'API.
// =============================================================================

// En producció, VITE_API_URL hauria de ser l'URL absoluta de l'API:
// ex. https://erp.tudomini.com/api
const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api';

const TOKEN_KEY = 'aurora_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

type ApiOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  noAuth?: boolean;
};

/**
 * Wrapper sobre fetch que afegeix el token d'autorització i
 * desserialitza la resposta JSON.
 * Llança un Error amb el missatge de l'API en cas d'error HTTP.
 */
export async function apiFetch<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { method = 'GET', body, noAuth = false } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (!noAuth) {
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}/${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // Si el servidor retorna 401, la sessió ha caducat
  if (response.status === 401) {
    clearToken();
    window.location.reload();
    throw new Error('Sessió caducada');
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error((data as { error?: string }).error ?? `Error ${response.status}`);
  }

  return data as T;
}

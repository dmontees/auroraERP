import { apiFetch, clearToken, setToken } from './client';
import type { LoginResponse } from '../types';

export async function login(username: string, password: string): Promise<LoginResponse> {
  const data = await apiFetch<LoginResponse>('auth.php', {
    method: 'POST',
    body: { username, password },
    noAuth: true,
  });
  setToken(data.token);
  return data;
}

export async function logout(): Promise<void> {
  try {
    await apiFetch('auth.php', { method: 'DELETE' });
  } finally {
    clearToken();
  }
}

export async function checkSession(): Promise<LoginResponse['user'] | null> {
  try {
    const data = await apiFetch<{ authenticated: boolean; user?: LoginResponse['user'] }>('auth.php');
    return data.authenticated ? (data.user ?? null) : null;
  } catch {
    return null;
  }
}

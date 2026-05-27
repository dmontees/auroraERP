import { apiFetch } from './client';
import type { ProjectesListResponse, ProjecteDetall, ProjectesFilters } from '../types';

export function getProjectes(filters: Partial<ProjectesFilters> = {}): Promise<ProjectesListResponse> {
  const params = new URLSearchParams();
  if (filters.estat)     params.set('estat',     filters.estat);
  if (filters.arxivat !== undefined) params.set('arxivat', String(filters.arxivat));
  if (filters.client)    params.set('client',    filters.client);
  if (filters.q)         params.set('q',         filters.q);
  if (filters.page)      params.set('page',      String(filters.page));
  if (filters.order_by)  params.set('order_by',  filters.order_by);
  if (filters.order_dir) params.set('order_dir', filters.order_dir);

  const qs = params.toString();
  return apiFetch<ProjectesListResponse>(`projectes.php${qs ? `?${qs}` : ''}`);
}

export function getProjecte(codi: string): Promise<ProjecteDetall> {
  return apiFetch<ProjecteDetall>(`projectes.php?codi=${encodeURIComponent(codi)}`);
}

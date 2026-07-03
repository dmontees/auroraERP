import { apiFetch } from './client'
import type {
  PressupostDetall,
  PressupostosFilters,
  PressupostosListResponse,
} from '../types'

export function getPressupostos(filters: Partial<PressupostosFilters> = {}): Promise<PressupostosListResponse> {
  const params = new URLSearchParams()
  if (filters.estat) params.set('estat', filters.estat)
  if (filters.client) params.set('client', filters.client)
  if (filters.q) params.set('q', filters.q)
  if (filters.page) params.set('page', String(filters.page))
  if (filters.order_by) params.set('order_by', filters.order_by)
  if (filters.order_dir) params.set('order_dir', filters.order_dir)

  const qs = params.toString()
  return apiFetch<PressupostosListResponse>(`pressupostos.php${qs ? `?${qs}` : ''}`)
}

export function getPressupost(codi: string): Promise<PressupostDetall> {
  return apiFetch<PressupostDetall>(`pressupostos.php?codi=${encodeURIComponent(codi)}`)
}

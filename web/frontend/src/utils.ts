import type { EstatPressupost, EstatProjecte } from './types'

export function formatCurrency(val: number | null | undefined): string {
  if (val == null) return '—'
  return new Intl.NumberFormat('ca-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(val)
}

export function formatDate(val: string | null | undefined): string {
  if (!val) return '—'
  const d = new Date(val)
  if (isNaN(d.getTime())) return val
  return new Intl.DateTimeFormat('ca-ES', { day: '2-digit', month: 'short' }).format(d)
}

export function formatDateFull(val: string | null | undefined): string {
  if (!val) return '—'
  const d = new Date(val)
  if (isNaN(d.getTime())) return val
  return new Intl.DateTimeFormat('ca-ES', { day: '2-digit', month: 'long', year: 'numeric' }).format(d)
}

export function formatDatetime(val: string | null | undefined): string {
  if (!val) return '—'
  const d = new Date(val)
  if (isNaN(d.getTime())) return val
  return new Intl.DateTimeFormat('ca-ES', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(d)
}

const ESTAT_LABELS: Record<EstatProjecte, string> = {
  esborrany:          'Esborrany',
  planificat:         'Planificat',
  rodatge:            'Rodatge',
  edicio:             'Edició',
  esperant_feedback:  'Esp. feedback',
  revisio:            'Revisió',
  acabat:             'Acabat',
  facturat:           'Facturat',
}

export function estatLabel(estat: EstatProjecte): string {
  return ESTAT_LABELS[estat] ?? estat
}

const ESTAT_PRESSUPOST_LABELS: Record<EstatPressupost, string> = {
  esborrany: 'Esborrany',
  enviat: 'Enviat',
  acceptat: 'Acceptat',
  rebutjat: 'Rebutjat',
}

export function estatPressupostLabel(estat: EstatPressupost): string {
  return ESTAT_PRESSUPOST_LABELS[estat] ?? estat
}

export function percentLabel(val: number): string {
  return `${val.toFixed(1)}%`
}

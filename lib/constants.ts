import type { ReasonCode } from '@/lib/types'

export const RAW_INPUT_SOURCE_TYPE = 'notes'

export const REASON_LABELS: Record<ReasonCode, string> = {
  too_generic: 'Too generic',
  voice_off: 'Voice is off',
  factual_issue: 'Factual issue',
  repetitive: 'Repetitive',
  other: 'Other',
}

export const REASON_OPTIONS = (
  Object.keys(REASON_LABELS) as ReasonCode[]
).map((value) => ({ value, label: REASON_LABELS[value] }))

export function reasonLabel(code: string | null | undefined) {
  if (!code) return 'Unspecified'
  return REASON_LABELS[code as ReasonCode] ?? code
}

export function formatSeconds(total: number | null | undefined) {
  if (total == null || Number.isNaN(total)) return '0s'
  const rounded = Math.round(total)
  if (rounded < 60) return `${rounded}s`
  const m = Math.floor(rounded / 60)
  const s = rounded % 60
  return s === 0 ? `${m}m` : `${m}m ${s}s`
}

export function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`
}

export function formatDate(value: string | null | undefined) {
  if (!value) return 'Unknown date'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unknown date'
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

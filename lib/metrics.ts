import type { Decision, DraftStatus, ReasonCode } from '@/lib/types'

export interface DraftRow {
  id: string
  status: DraftStatus
  archive_checks_enabled: boolean
  hook: string | null
  created_at: string
  raw_input_id: string
  title: string | null
}

export interface ReviewRow {
  id: string
  draft_id: string
  decision: Decision
  reason_code: ReasonCode | null
  reason_text: string | null
  review_seconds: number | null
  created_at: string | null
  archive_checks_enabled: boolean
  hook: string | null
  title: string | null
}

export interface GroupStats {
  drafts: number
  reviews: number
  acceptanceRate: number
  acceptedAsIsRate: number
  rejectionRate: number
  avgSeconds: number
  topReason: { code: string; count: number } | null
}

export interface ReasonCount {
  code: string
  count: number
}

export interface MetricsSummary {
  totalDrafts: number
  pendingDrafts: DraftRow[]
  reviewsCompleted: number
  acceptanceRate: number
  acceptedAsIsRate: number
  rejectionRate: number
  avgSeconds: number
  reasons: ReasonCount[]
  withChecks: GroupStats
  withoutChecks: GroupStats
}

function one<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

export function normalizeDraftRows(rows: unknown[]): DraftRow[] {
  return rows.map((raw) => {
    const row = raw as Record<string, unknown>
    const input = one(row.raw_inputs as { title: string | null } | null)
    return {
      id: row.id as string,
      status: row.status as DraftStatus,
      archive_checks_enabled: Boolean(row.archive_checks_enabled),
      hook: (row.hook as string | null) ?? null,
      created_at: row.created_at as string,
      raw_input_id: row.raw_input_id as string,
      title: input?.title ?? null,
    }
  })
}

export function normalizeReviewRows(rows: unknown[]): ReviewRow[] {
  const normalized = rows.map((raw) => {
    const row = raw as Record<string, unknown>
    const draft = one(
      row.drafts as {
        archive_checks_enabled: boolean
        hook: string | null
        raw_inputs: { title: string | null } | { title: string | null }[] | null
      } | null,
    )
    const input = one(draft?.raw_inputs)
    return {
      id: row.id as string,
      draft_id: row.draft_id as string,
      decision: row.decision as Decision,
      reason_code: (row.reason_code as ReasonCode | null) ?? null,
      reason_text: (row.reason_text as string | null) ?? null,
      review_seconds: (row.review_seconds as number | null) ?? null,
      created_at: (row.created_at as string | null) ?? null,
      archive_checks_enabled: Boolean(draft?.archive_checks_enabled),
      hook: draft?.hook ?? null,
      title: input?.title ?? null,
    }
  })
  return normalized.sort((a, b) =>
    (b.created_at ?? '').localeCompare(a.created_at ?? ''),
  )
}

function countReasons(reviews: ReviewRow[]): ReasonCount[] {
  const counts = new Map<string, number>()
  for (const review of reviews) {
    if (review.decision !== 'reject') continue
    const code = review.reason_code ?? 'other'
    counts.set(code, (counts.get(code) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([code, count]) => ({ code, count }))
    .sort((a, b) => b.count - a.count)
}

function ratio(part: number, total: number) {
  return total === 0 ? 0 : part / total
}

function average(values: number[]) {
  return values.length === 0
    ? 0
    : values.reduce((sum, v) => sum + v, 0) / values.length
}

function groupStats(drafts: DraftRow[], reviews: ReviewRow[]): GroupStats {
  const accepted = reviews.filter((r) => r.decision === 'accept').length
  const edited = reviews.filter((r) => r.decision === 'edit').length
  const rejected = reviews.filter((r) => r.decision === 'reject').length
  const seconds = reviews
    .map((r) => r.review_seconds)
    .filter((v): v is number => typeof v === 'number')
  const reasons = countReasons(reviews)
  return {
    drafts: drafts.length,
    reviews: reviews.length,
    acceptanceRate: ratio(accepted + edited, reviews.length),
    acceptedAsIsRate: ratio(accepted, reviews.length),
    rejectionRate: ratio(rejected, reviews.length),
    avgSeconds: average(seconds),
    topReason: reasons[0] ?? null,
  }
}

export function computeMetrics(
  drafts: DraftRow[],
  reviews: ReviewRow[],
): MetricsSummary {
  const overall = groupStats(drafts, reviews)
  return {
    totalDrafts: drafts.length,
    pendingDrafts: drafts.filter((d) => d.status === 'pending_review'),
    reviewsCompleted: reviews.length,
    acceptanceRate: overall.acceptanceRate,
    acceptedAsIsRate: overall.acceptedAsIsRate,
    rejectionRate: overall.rejectionRate,
    avgSeconds: overall.avgSeconds,
    reasons: countReasons(reviews),
    withChecks: groupStats(
      drafts.filter((d) => d.archive_checks_enabled),
      reviews.filter((r) => r.archive_checks_enabled),
    ),
    withoutChecks: groupStats(
      drafts.filter((d) => !d.archive_checks_enabled),
      reviews.filter((r) => !r.archive_checks_enabled),
    ),
  }
}

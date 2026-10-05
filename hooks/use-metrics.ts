'use client'

import useSWR from 'swr'
import { useWorkspace } from '@/components/workspace-provider'
import {
  computeMetrics,
  normalizeDraftRows,
  normalizeReviewRows,
  type DraftRow,
  type MetricsSummary,
  type ReviewRow,
} from '@/lib/metrics'
import { createClient } from '@/lib/supabase/client'

export interface MetricsData {
  summary: MetricsSummary
  drafts: DraftRow[]
  reviews: ReviewRow[]
}

async function fetchMetrics(creatorId: string): Promise<MetricsData> {
  const supabase = createClient()

  const [draftsRes, reviewsRes] = await Promise.all([
    supabase
      .from('drafts')
      .select(
        'id, status, archive_checks_enabled, hook, created_at, raw_input_id, raw_inputs!inner(title, creator_id)',
      )
      .eq('raw_inputs.creator_id', creatorId)
      .order('created_at', { ascending: false }),
    supabase
      .from('reviews')
      .select(
        '*, drafts!inner(archive_checks_enabled, hook, raw_input_id, raw_inputs!inner(title, creator_id))',
      )
      .eq('drafts.raw_inputs.creator_id', creatorId),
  ])

  if (draftsRes.error) throw new Error(draftsRes.error.message)
  if (reviewsRes.error) throw new Error(reviewsRes.error.message)

  const drafts = normalizeDraftRows(draftsRes.data ?? [])
  const reviews = normalizeReviewRows(reviewsRes.data ?? [])
  return { summary: computeMetrics(drafts, reviews), drafts, reviews }
}

export function useMetrics() {
  const { creator } = useWorkspace()
  return useSWR<MetricsData>(['metrics', creator.id], () =>
    fetchMetrics(creator.id),
  )
}

export function isMetricsKey(key: unknown) {
  return Array.isArray(key) && key[0] === 'metrics'
}

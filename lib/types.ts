export type DraftStatus = 'pending_review' | 'accepted' | 'edited' | 'rejected'
export type CheckType = 'source' | 'voice' | 'repetition'
export type Severity = 'info' | 'warn' | 'block'
export type Decision = 'accept' | 'edit' | 'reject'
export type ReasonCode =
  | 'too_generic'
  | 'voice_off'
  | 'factual_issue'
  | 'repetitive'
  | 'other'

export interface Creator {
  id: string
  workspace_id: string
  handle: string
  reviewer_type: string | null
  voice_profile: Record<string, unknown> | null
}

export interface Workspace {
  id: string
  name: string
}

export interface ContentMetrics {
  likes?: number | null
  comments?: number | null
  plays?: number | null
}

export interface ContentItem {
  id: string
  workspace_id: string
  creator_id: string
  external_id: string | null
  url: string | null
  caption: string | null
  hashtags: string[] | null
  published_at: string | null
  duration_s: number | null
  metrics: ContentMetrics | null
  is_sponsored: boolean | null
  has_speech: boolean | null
}

export interface Transcript {
  id: string
  content_item_id: string
  text: string | null
  language: string | null
}

export interface RawInput {
  id: string
  workspace_id: string
  creator_id: string
  title: string | null
  body: string | null
  source_type: string | null
  created_by: string | null
  created_at?: string
}

export interface Draft {
  id: string
  workspace_id: string
  raw_input_id: string
  run_id: string | null
  version: number | null
  hook: string | null
  body: string | null
  model: string | null
  archive_checks_enabled: boolean
  status: DraftStatus
  created_at: string
}

export interface FindingEvidence {
  similar_content_id?: string
  quote?: string
  [key: string]: unknown
}

export interface DraftFinding {
  id: string
  draft_id: string
  check_type: CheckType
  severity: Severity
  message: string | null
  evidence: FindingEvidence | null
}

export interface Review {
  id: string
  workspace_id: string
  draft_id: string
  reviewer_id: string | null
  reviewer_type: string | null
  decision: Decision
  final_body: string | null
  reason_code: ReasonCode | null
  reason_text: string | null
  review_seconds: number | null
  created_at?: string
}

'use client'

import { AlertTriangleIcon, CheckIcon, PencilIcon, XIcon } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import useSWR, { mutate as globalMutate } from 'swr'
import { FindingsPanel } from '@/components/findings-panel'
import { ErrorState, PageHeader } from '@/components/state-views'
import { useWorkspace } from '@/components/workspace-provider'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { isMetricsKey } from '@/hooks/use-metrics'
import { REASON_OPTIONS, formatSeconds } from '@/lib/constants'
import { createClient } from '@/lib/supabase/client'
import type {
  ContentItem,
  Decision,
  Draft,
  DraftFinding,
  RawInput,
  ReasonCode,
} from '@/lib/types'

interface ReviewData {
  draft: Draft
  rawInput: RawInput | null
  findings: DraftFinding[]
  similar: ContentItem[]
}

async function fetchReviewData(draftId: string): Promise<ReviewData | null> {
  const supabase = createClient()

  const { data: draft, error } = await supabase
    .from('drafts')
    .select('*')
    .eq('id', draftId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!draft) return null

  const [rawRes, findingsRes] = await Promise.all([
    supabase
      .from('raw_inputs')
      .select('*')
      .eq('id', (draft as Draft).raw_input_id)
      .maybeSingle(),
    supabase.from('draft_findings').select('*').eq('draft_id', draftId),
  ])
  if (rawRes.error) throw new Error(rawRes.error.message)
  if (findingsRes.error) throw new Error(findingsRes.error.message)

  const findings = (findingsRes.data ?? []) as DraftFinding[]
  const similarIds = Array.from(
    new Set(
      findings
        .map((f) => f.evidence?.similar_content_id)
        .filter((id): id is string => typeof id === 'string'),
    ),
  )

  let similar: ContentItem[] = []
  if (similarIds.length > 0) {
    const { data, error: similarError } = await supabase
      .from('content_items')
      .select('*')
      .in('id', similarIds)
    if (similarError) throw new Error(similarError.message)
    similar = (data ?? []) as ContentItem[]
  }

  return {
    draft: draft as Draft,
    rawInput: (rawRes.data as RawInput | null) ?? null,
    findings,
    similar,
  }
}

function ReviewSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
      <Skeleton className="h-96 w-full" />
      <Skeleton className="h-96 w-full" />
      <Skeleton className="h-96 w-full" />
    </div>
  )
}

export function ReviewWorkspace({ draftId }: { draftId: string }) {
  const { data, error, isLoading, mutate } = useSWR(
    ['review', draftId],
    () => fetchReviewData(draftId),
    { revalidateOnFocus: false },
  )

  if (isLoading) {
    return (
      <>
        <PageHeader title="Review draft" />
        <ReviewSkeleton />
      </>
    )
  }

  if (error) {
    return (
      <>
        <PageHeader title="Review draft" />
        <ErrorState
          title="Could not load this draft"
          message={error.message}
          onRetry={() => mutate()}
        />
      </>
    )
  }

  if (!data) {
    return (
      <>
        <PageHeader title="Review draft" />
        <ErrorState
          title="Draft not found"
          message="It may have been removed, or you may not have access to it."
          onRetry={() => mutate()}
        />
      </>
    )
  }

  return <ReviewForm key={data.draft.id} data={data} />
}

function ReviewForm({ data }: { data: ReviewData }) {
  const { draft, rawInput, findings, similar } = data
  const router = useRouter()
  const { creator, user } = useWorkspace()

  const initialText = [draft.hook, draft.body]
    .filter((part): part is string => Boolean(part && part.trim()))
    .join('\n\n')
  const [text, setText] = useState(initialText)
  const [rejecting, setRejecting] = useState(false)
  const [reasonCode, setReasonCode] = useState<ReasonCode | ''>('')
  const [reasonText, setReasonText] = useState('')
  const [saveRule, setSaveRule] = useState(false)
  const [ruleText, setRuleText] = useState('')
  const [submitting, setSubmitting] = useState<Decision | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const startedAt = useRef(Date.now())

  useEffect(() => {
    const id = setInterval(() => {
      setElapsed(Math.round((Date.now() - startedAt.current) / 1000))
    }, 1000)
    return () => clearInterval(id)
  }, [])

  const alreadyReviewed = draft.status !== 'pending_review'
  const hasBlock = findings.some((f) => f.severity === 'block')
  const edited = text.trim() !== initialText.trim()
  const busy = submitting !== null

  async function submit(decision: Decision) {
    setFormError(null)

    if (decision === 'edit' && !text.trim()) {
      setFormError('Edited script cannot be empty.')
      return
    }
    if (decision === 'reject' && !reasonCode) {
      setFormError('Choose a reason for rejecting this draft.')
      return
    }
    if (saveRule && !ruleText.trim()) {
      setFormError('Write the rule you want to save, or untick the box.')
      return
    }

    setSubmitting(decision)
    const supabase = createClient()
    const reviewSeconds = Math.max(
      1,
      Math.round((Date.now() - startedAt.current) / 1000),
    )

    try {
      const { data: review, error: reviewError } = await supabase
        .from('reviews')
        .insert({
          workspace_id: draft.workspace_id,
          draft_id: draft.id,
          reviewer_id: user.id,
          reviewer_type: creator.reviewer_type,
          decision,
          final_body: decision === 'edit' ? text.trim() : null,
          reason_code: decision === 'reject' ? reasonCode : null,
          reason_text:
            decision === 'reject' && reasonText.trim() ? reasonText.trim() : null,
          review_seconds: reviewSeconds,
        })
        .select('id')
        .single()
      if (reviewError) throw new Error(reviewError.message)

      const status =
        decision === 'accept'
          ? 'accepted'
          : decision === 'edit'
            ? 'edited'
            : 'rejected'
      const { error: draftError } = await supabase
        .from('drafts')
        .update({ status })
        .eq('id', draft.id)
      if (draftError) throw new Error(draftError.message)

      if (saveRule) {
        const { error: ruleError } = await supabase
          .from('creator_rules')
          .insert({
            workspace_id: draft.workspace_id,
            creator_id: creator.id,
            rule: ruleText.trim(),
            source_review_id: review.id,
            active: true,
          })
        if (ruleError) {
          toast.error(`Review saved, but the rule was not: ${ruleError.message}`)
        }
      }

      await globalMutate(isMetricsKey)
      toast.success(
        decision === 'accept'
          ? 'Draft accepted'
          : decision === 'edit'
            ? 'Edits saved and draft accepted'
            : 'Draft rejected',
      )
      router.push('/history')
    } catch (err) {
      setSubmitting(null)
      setFormError(
        err instanceof Error ? err.message : 'Could not save your review.',
      )
    }
  }

  return (
    <>
      <PageHeader
        title="Review draft"
        description={rawInput?.title || 'Untitled input'}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {draft.archive_checks_enabled ? 'Checks on' : 'Checks off'}
            </Badge>
            {alreadyReviewed ? (
              <Badge variant="secondary">{draft.status.replace('_', ' ')}</Badge>
            ) : null}
          </div>
        }
      />

      {hasBlock ? (
        <Alert variant="destructive">
          <AlertTriangleIcon />
          <AlertTitle>Blocking issues found</AlertTitle>
          <AlertDescription>
            At least one finding is marked as blocking. Review the findings
            before accepting this draft.
          </AlertDescription>
        </Alert>
      ) : null}

      {alreadyReviewed ? (
        <Alert>
          <AlertTitle>This draft has already been reviewed</AlertTitle>
          <AlertDescription>
            Decisions are locked. See the outcome in{' '}
            <Link href="/history" className="underline underline-offset-4">
              Review History
            </Link>
            .
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_minmax(0,1fr)]">
        <Card className="self-start">
          <CardHeader>
            <CardTitle>Raw input</CardTitle>
            <CardDescription>What the script was drafted from.</CardDescription>
          </CardHeader>
          <CardContent>
            {rawInput?.body ? (
              <p className="max-h-[32rem] overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                {rawInput.body}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                The original input is not available.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="self-start">
          <CardHeader>
            <CardTitle>Draft</CardTitle>
            <CardDescription>
              Edit the hook and script directly. Nothing is published
              automatically.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {draft.hook ? (
              <p className="text-sm font-medium">
                <span className="text-muted-foreground">Hook: </span>
                {draft.hook}
              </p>
            ) : null}
            <Textarea
              aria-label="Draft script"
              className="min-h-96 leading-relaxed"
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={alreadyReviewed || busy}
            />
          </CardContent>
        </Card>

        <FindingsPanel
          findings={findings}
          similar={similar}
          checksEnabled={draft.archive_checks_enabled}
        />
      </div>

      {!alreadyReviewed ? (
        <div className="sticky bottom-0 -mx-4 border-t bg-background/95 px-4 py-4 backdrop-blur md:-mx-8 md:px-8">
          <div className="flex flex-col gap-4">
            {rejecting ? (
              <FieldGroup className="max-w-xl">
                <Field>
                  <FieldLabel htmlFor="reason-code">Reason</FieldLabel>
                  <Select
                    value={reasonCode}
                    onValueChange={(v) => setReasonCode(v as ReasonCode)}
                  >
                    <SelectTrigger id="reason-code" className="w-full">
                      <SelectValue placeholder="Choose a reason" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {REASON_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel htmlFor="reason-text">
                    Details (optional)
                  </FieldLabel>
                  <Textarea
                    id="reason-text"
                    value={reasonText}
                    onChange={(e) => setReasonText(e.target.value)}
                  />
                </Field>
              </FieldGroup>
            ) : null}

            <div className="flex flex-col gap-3">
              <Field orientation="horizontal">
                <Checkbox
                  id="save-rule"
                  checked={saveRule}
                  onCheckedChange={(v) => setSaveRule(v === true)}
                />
                <FieldLabel htmlFor="save-rule" className="font-normal">
                  Save my reason as a rule for next time
                </FieldLabel>
              </Field>
              {saveRule ? (
                <Input
                  aria-label="Rule text"
                  className="max-w-xl"
                  placeholder="e.g. Avoid opening with a rhetorical question"
                  value={ruleText}
                  onChange={(e) => setRuleText(e.target.value)}
                />
              ) : null}
            </div>

            {formError ? (
              <p role="alert" className="text-sm text-destructive">
                {formError}
              </p>
            ) : null}

            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={() => submit('accept')} disabled={busy || edited}>
                {submitting === 'accept' ? (
                  <Spinner data-icon="inline-start" />
                ) : (
                  <CheckIcon data-icon="inline-start" />
                )}
                Accept
              </Button>
              <Button
                variant="secondary"
                onClick={() => submit('edit')}
                disabled={busy || !edited || !text.trim()}
              >
                {submitting === 'edit' ? (
                  <Spinner data-icon="inline-start" />
                ) : (
                  <PencilIcon data-icon="inline-start" />
                )}
                Save edits & accept
              </Button>
              {rejecting ? (
                <>
                  <Button
                    variant="destructive"
                    onClick={() => submit('reject')}
                    disabled={busy}
                  >
                    {submitting === 'reject' ? (
                      <Spinner data-icon="inline-start" />
                    ) : (
                      <XIcon data-icon="inline-start" />
                    )}
                    Confirm reject
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setRejecting(false)}
                    disabled={busy}
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => setRejecting(true)}
                  disabled={busy}
                >
                  <XIcon data-icon="inline-start" />
                  Reject
                </Button>
              )}
              <span className="ml-auto text-sm text-muted-foreground tabular-nums">
                Review time {formatSeconds(elapsed)}
              </span>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}

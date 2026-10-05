'use client'

import {
  CheckCircle2Icon,
  CircleDashedIcon,
  FileTextIcon,
  SparklesIcon,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/state-views'
import { useWorkspace } from '@/components/workspace-provider'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { RAW_INPUT_SOURCE_TYPE } from '@/lib/constants'
import { createClient } from '@/lib/supabase/client'

const POLL_INTERVAL_MS = 3000
const POLL_TIMEOUT_MS = 90_000

type Phase =
  | { kind: 'idle' }
  | { kind: 'running'; step: number }
  | { kind: 'error'; message: string }

const STEPS = ['Understanding', 'Drafting', 'Checking'] as const

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function StudioView() {
  const router = useRouter()
  const { creator, user } = useWorkspace()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [checks, setChecks] = useState(true)
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' })
  const rawInputIdRef = useRef<string | null>(null)
  const runTokenRef = useRef(0)

  useEffect(() => {
    return () => {
      runTokenRef.current += 1
    }
  }, [])

  const running = phase.kind === 'running'
  const canSubmit = body.trim().length > 0 && !running

  async function pollForDraft(rawInputId: string, token: number) {
    const supabase = createClient()
    const started = Date.now()

    while (Date.now() - started < POLL_TIMEOUT_MS) {
      if (runTokenRef.current !== token) return null
      const elapsed = Date.now() - started
      setPhase({
        kind: 'running',
        step: elapsed < 8000 ? 1 : checks ? 2 : 1,
      })

      const { data, error } = await supabase
        .from('drafts')
        .select('id')
        .eq('raw_input_id', rawInputId)
        .order('created_at', { ascending: false })
        .limit(1)
      if (error) throw new Error(error.message)
      if (data && data.length > 0) return data[0].id as string

      await wait(POLL_INTERVAL_MS)
    }
    throw new Error(
      'Timed out after 90 seconds waiting for a draft. The workflow may still be running; try again shortly.',
    )
  }

  async function run() {
    const token = ++runTokenRef.current
    setPhase({ kind: 'running', step: 0 })

    try {
      const supabase = createClient()

      if (!rawInputIdRef.current) {
        const { data, error } = await supabase
          .from('raw_inputs')
          .insert({
            workspace_id: creator.workspace_id,
            creator_id: creator.id,
            title: title.trim() || null,
            body: body.trim(),
            source_type: RAW_INPUT_SOURCE_TYPE,
            created_by: user.id,
          })
          .select('id')
          .single()
        if (error) throw new Error(error.message)
        rawInputIdRef.current = data.id as string
      }
      if (runTokenRef.current !== token) return
      const rawInputId = rawInputIdRef.current

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          raw_input_id: rawInputId,
          creator_id: creator.id,
          archive_checks_enabled: checks,
        }),
      })
      if (!res.ok) {
        const payload = await res.json().catch(() => null)
        throw new Error(payload?.error ?? 'Generation request failed.')
      }
      if (runTokenRef.current !== token) return

      const draftId = await pollForDraft(rawInputId, token)
      if (!draftId || runTokenRef.current !== token) return

      toast.success('Draft ready for review')
      router.push(`/review/${draftId}`)
    } catch (err) {
      if (runTokenRef.current !== token) return
      setPhase({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Something went wrong.',
      })
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    rawInputIdRef.current = null
    void run()
  }

  return (
    <>
      <PageHeader
        title="Content Studio"
        description="Paste notes, a transcript, or a topic. Creator OS drafts a Reel script and checks it against the archive."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <Card>
          <form onSubmit={handleSubmit}>
            <CardHeader>
              <CardTitle>Raw material</CardTitle>
              <CardDescription>
                Writing for @{creator.handle}. Nothing is published
                automatically.
              </CardDescription>
            </CardHeader>
            <CardContent className="mt-6 flex flex-col gap-6">
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="title">Title</FieldLabel>
                  <Input
                    id="title"
                    placeholder="Optional working title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    disabled={running}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="raw-body">Raw material</FieldLabel>
                  <Textarea
                    id="raw-body"
                    placeholder="Notes, a transcript, or a topic"
                    className="min-h-72"
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    disabled={running}
                  />
                </Field>
                <Field orientation="horizontal">
                  <Switch
                    id="archive-checks"
                    checked={checks}
                    onCheckedChange={setChecks}
                    disabled={running}
                  />
                  <div className="flex flex-col gap-1">
                    <FieldLabel htmlFor="archive-checks">
                      Run archive checks
                    </FieldLabel>
                    <FieldDescription>
                      Compare the draft against past content for sources,
                      voice, and repetition.
                    </FieldDescription>
                  </div>
                </Field>
              </FieldGroup>
              <Button type="submit" disabled={!canSubmit} className="self-start">
                {running ? (
                  <Spinner data-icon="inline-start" />
                ) : (
                  <SparklesIcon data-icon="inline-start" />
                )}
                Generate Reel script
              </Button>
            </CardContent>
          </form>
        </Card>

        <Card className="self-start">
          <CardHeader>
            <CardTitle>Progress</CardTitle>
            <CardDescription>
              {phase.kind === 'running'
                ? 'This usually takes under a minute.'
                : 'Status of the current run.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {phase.kind === 'idle' ? (
              <Empty className="border-0 p-0">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <FileTextIcon />
                  </EmptyMedia>
                  <EmptyTitle>No run yet</EmptyTitle>
                  <EmptyDescription>
                    Add your raw material and generate a script to start.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : null}

            {phase.kind === 'running' ? (
              <ol
                className="flex flex-col gap-4"
                aria-live="polite"
                aria-label="Generation progress"
              >
                {STEPS.filter((_, i) => checks || i < 2).map((label, i) => {
                  const state =
                    i < phase.step
                      ? 'done'
                      : i === phase.step
                        ? 'active'
                        : 'pending'
                  return (
                    <li key={label} className="flex items-center gap-3 text-sm">
                      {state === 'done' ? (
                        <CheckCircle2Icon
                          className="size-5 text-primary"
                          aria-hidden
                        />
                      ) : state === 'active' ? (
                        <Spinner className="size-5" />
                      ) : (
                        <CircleDashedIcon
                          className="size-5 text-muted-foreground"
                          aria-hidden
                        />
                      )}
                      <span
                        className={
                          state === 'pending'
                            ? 'text-muted-foreground'
                            : 'font-medium'
                        }
                      >
                        {label}
                      </span>
                    </li>
                  )
                })}
              </ol>
            ) : null}

            {phase.kind === 'error' ? (
              <div className="flex flex-col gap-4">
                <Alert variant="destructive">
                  <AlertTitle>Generation failed</AlertTitle>
                  <AlertDescription>{phase.message}</AlertDescription>
                </Alert>
                <Button
                  variant="outline"
                  className="self-start"
                  onClick={() => void run()}
                >
                  Retry
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </>
  )
}

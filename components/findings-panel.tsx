'use client'

import { ShieldCheckIcon } from 'lucide-react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
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
import { formatDate } from '@/lib/constants'
import type { CheckType, ContentItem, DraftFinding, Severity } from '@/lib/types'

const CHECK_LABELS: Record<CheckType, string> = {
  source: 'Source',
  voice: 'Voice',
  repetition: 'Repetition',
}
const CHECK_ORDER: CheckType[] = ['source', 'voice', 'repetition']

const SEVERITY_VARIANT: Record<
  Severity,
  'secondary' | 'outline' | 'destructive'
> = {
  info: 'outline',
  warn: 'secondary',
  block: 'destructive',
}

function FindingCard({ finding }: { finding: DraftFinding }) {
  const evidence = finding.evidence
  const quote = typeof evidence?.quote === 'string' ? evidence.quote : null
  const similarId =
    typeof evidence?.similar_content_id === 'string'
      ? evidence.similar_content_id
      : null

  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <Badge variant={SEVERITY_VARIANT[finding.severity]}>
            {finding.severity}
          </Badge>
        </div>
        {finding.message ? (
          <p className="text-sm leading-relaxed">{finding.message}</p>
        ) : null}
        {quote ? (
          <blockquote className="border-l-2 pl-3 text-sm italic text-muted-foreground">
            {quote}
          </blockquote>
        ) : null}
        {similarId ? (
          <Link
            href={`/library?item=${similarId}`}
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            View archive item
          </Link>
        ) : null}
      </CardContent>
    </Card>
  )
}

export function FindingsPanel({
  findings,
  similar,
  checksEnabled,
}: {
  findings: DraftFinding[]
  similar: ContentItem[]
  checksEnabled: boolean
}) {
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Quality findings</CardTitle>
          <CardDescription>
            Grouped by check type.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {findings.length === 0 ? (
            <Empty className="border-0 p-0">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <ShieldCheckIcon />
                </EmptyMedia>
                <EmptyTitle>
                  {checksEnabled ? 'No findings' : 'Checks were off'}
                </EmptyTitle>
                <EmptyDescription>
                  {checksEnabled
                    ? 'The archive checks did not flag anything for this draft.'
                    : 'This draft was generated without archive checks.'}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            CHECK_ORDER.map((type) => {
              const group = findings.filter((f) => f.check_type === type)
              if (group.length === 0) return null
              return (
                <section key={type} className="flex flex-col gap-3">
                  <h3 className="text-sm font-medium">
                    {CHECK_LABELS[type]}{' '}
                    <span className="text-muted-foreground tabular-nums">
                      ({group.length})
                    </span>
                  </h3>
                  {group.map((f) => (
                    <FindingCard key={f.id} finding={f} />
                  ))}
                </section>
              )
            })
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Similar past content</CardTitle>
          <CardDescription>Archive items referenced by findings.</CardDescription>
        </CardHeader>
        <CardContent>
          {similar.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No similar content referenced.
            </p>
          ) : (
            <ul className="flex flex-col divide-y">
              {similar.map((item) => (
                <li key={item.id}>
                  <Link
                    href={`/library?item=${item.id}`}
                    className="-mx-2 flex flex-col gap-1 rounded-md px-2 py-3 transition-colors hover:bg-accent/50"
                  >
                    <span className="line-clamp-2 text-sm">
                      {item.caption || 'No caption'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(item.published_at)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

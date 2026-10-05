'use client'

import { ClipboardCheckIcon } from 'lucide-react'
import Link from 'next/link'
import { ErrorState, PageHeader } from '@/components/state-views'
import { ReasonsChart } from '@/components/reasons-chart'
import { StatCard, StatCardSkeleton } from '@/components/stat-card'
import { Badge } from '@/components/ui/badge'
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
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useMetrics } from '@/hooks/use-metrics'
import {
  formatDate,
  formatPercent,
  formatSeconds,
  reasonLabel,
} from '@/lib/constants'
import type { GroupStats } from '@/lib/metrics'
import type { Decision } from '@/lib/types'

const DECISION_BADGE: Record<
  Decision,
  { label: string; variant: 'default' | 'secondary' | 'destructive' }
> = {
  accept: { label: 'Accepted', variant: 'default' },
  edit: { label: 'Edited', variant: 'secondary' },
  reject: { label: 'Rejected', variant: 'destructive' },
}

function ComparisonTable({
  withChecks,
  withoutChecks,
}: {
  withChecks: GroupStats
  withoutChecks: GroupStats
}) {
  const rows: { label: string; render: (g: GroupStats) => string }[] = [
    { label: 'Drafts', render: (g) => String(g.drafts) },
    { label: 'Reviews', render: (g) => String(g.reviews) },
    { label: 'Acceptance rate', render: (g) => formatPercent(g.acceptanceRate) },
    {
      label: 'Accepted as-is',
      render: (g) => formatPercent(g.acceptedAsIsRate),
    },
    { label: 'Rejection rate', render: (g) => formatPercent(g.rejectionRate) },
    { label: 'Avg. review time', render: (g) => formatSeconds(g.avgSeconds) },
    {
      label: 'Top rejection reason',
      render: (g) => (g.topReason ? reasonLabel(g.topReason.code) : 'None'),
    },
  ]

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Metric</TableHead>
          <TableHead className="text-right">Archive checks on</TableHead>
          <TableHead className="text-right">Archive checks off</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.label}>
            <TableCell className="font-medium">{row.label}</TableCell>
            <TableCell className="text-right tabular-nums">
              {row.render(withChecks)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {row.render(withoutChecks)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export function HistoryView() {
  const { data, error, isLoading, mutate } = useMetrics()

  return (
    <>
      <PageHeader
        title="History"
        description="Review outcomes, rejection reasons, and whether archive checks change them."
      />

      {error ? (
        <ErrorState
          title="Could not load history"
          message={error.message}
          onRetry={() => mutate()}
        />
      ) : isLoading || !data ? (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <StatCardSkeleton key={i} />
            ))}
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      ) : data.summary.reviewsCompleted === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ClipboardCheckIcon />
            </EmptyMedia>
            <EmptyTitle>No reviews yet</EmptyTitle>
            <EmptyDescription>
              Once you accept, edit, or reject a draft, the outcomes show up
              here.
            </EmptyDescription>
          </EmptyHeader>
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href="/" />}
          >
            Go to dashboard
          </Button>
        </Empty>
      ) : (
        <>
          <section
            aria-label="Summary"
            className="grid grid-cols-1 gap-4 sm:grid-cols-3"
          >
            <StatCard
              label="Acceptance rate"
              value={formatPercent(data.summary.acceptanceRate)}
              hint={`${formatPercent(data.summary.acceptedAsIsRate)} accepted as-is`}
            />
            <StatCard
              label="Rejection rate"
              value={formatPercent(data.summary.rejectionRate)}
            />
            <StatCard
              label="Avg. review time"
              value={formatSeconds(data.summary.avgSeconds)}
            />
          </section>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Rejection reasons</CardTitle>
                <CardDescription>
                  Why drafts were turned down.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {data.summary.reasons.length === 0 ? (
                  <p className="py-12 text-center text-sm text-muted-foreground">
                    No rejections recorded.
                  </p>
                ) : (
                  <ReasonsChart reasons={data.summary.reasons} />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Archive checks comparison</CardTitle>
                <CardDescription>
                  Drafts generated with archive checks on versus off.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ComparisonTable
                  withChecks={data.summary.withChecks}
                  withoutChecks={data.summary.withoutChecks}
                />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent reviews</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Draft</TableHead>
                    <TableHead>Decision</TableHead>
                    <TableHead className="hidden md:table-cell">Reason</TableHead>
                    <TableHead className="hidden sm:table-cell text-right">
                      Time
                    </TableHead>
                    <TableHead className="hidden lg:table-cell">Checks</TableHead>
                    <TableHead className="text-right">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.reviews.slice(0, 25).map((review) => {
                    const badge = DECISION_BADGE[review.decision]
                    return (
                      <TableRow key={review.id}>
                        <TableCell className="max-w-64">
                          <Link
                            href={`/review/${review.draft_id}`}
                            className="block truncate font-medium hover:underline"
                          >
                            {review.title || review.hook || 'Untitled draft'}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Badge variant={badge.variant}>{badge.label}</Badge>
                        </TableCell>
                        <TableCell className="hidden text-muted-foreground md:table-cell">
                          {review.reason_code
                            ? reasonLabel(review.reason_code)
                            : '—'}
                        </TableCell>
                        <TableCell className="hidden text-right tabular-nums sm:table-cell">
                          {formatSeconds(review.review_seconds)}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <Badge variant="outline">
                            {review.archive_checks_enabled ? 'On' : 'Off'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {formatDate(review.created_at)}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </>
  )
}

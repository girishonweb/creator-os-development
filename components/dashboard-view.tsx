'use client'

import { ArrowRightIcon, InboxIcon, PenLineIcon } from 'lucide-react'
import Link from 'next/link'
import { useWorkspace } from '@/components/workspace-provider'
import { PageHeader, ErrorState } from '@/components/state-views'
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
import { useMetrics } from '@/hooks/use-metrics'
import { formatDate, formatPercent, formatSeconds } from '@/lib/constants'

export function DashboardView() {
  const { creator } = useWorkspace()
  const { data, error, isLoading, mutate } = useMetrics()

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={`How @${creator.handle}'s scripts are performing in review.`}
        actions={
          <Button nativeButton={false} render={<Link href="/studio" />}>
            <PenLineIcon data-icon="inline-start" />
            New script
          </Button>
        }
      />

      {error ? (
        <ErrorState
          title="Could not load metrics"
          message={error.message}
          onRetry={() => mutate()}
        />
      ) : (
        <>
          <section
            aria-label="Summary"
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
          >
            {isLoading || !data ? (
              Array.from({ length: 4 }).map((_, i) => (
                <StatCardSkeleton key={i} />
              ))
            ) : (
              <>
                <StatCard
                  label="Total drafts"
                  value={String(data.summary.totalDrafts)}
                  hint={`${data.summary.pendingDrafts.length} waiting for review`}
                />
                <StatCard
                  label="Reviews completed"
                  value={String(data.summary.reviewsCompleted)}
                />
                <StatCard
                  label="Acceptance rate"
                  value={formatPercent(data.summary.acceptanceRate)}
                  hint={`${formatPercent(data.summary.acceptedAsIsRate)} accepted as-is`}
                />
                <StatCard
                  label="Avg. review time"
                  value={formatSeconds(data.summary.avgSeconds)}
                />
              </>
            )}
          </section>

          <Card>
            <CardHeader>
              <CardTitle>Waiting for review</CardTitle>
              <CardDescription>
                Drafts that have been generated but not yet decided.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading || !data ? (
                <div className="flex flex-col gap-3">
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-14 w-full" />
                </div>
              ) : data.summary.pendingDrafts.length === 0 ? (
                <Empty>
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <InboxIcon />
                    </EmptyMedia>
                    <EmptyTitle>Nothing to review</EmptyTitle>
                    <EmptyDescription>
                      New drafts appear here as soon as they are generated.
                    </EmptyDescription>
                  </EmptyHeader>
                  <Button
                    variant="outline"
                    nativeButton={false}
                    render={<Link href="/studio" />}
                  >
                    Write a new script
                  </Button>
                </Empty>
              ) : (
                <ul className="flex flex-col divide-y">
                  {data.summary.pendingDrafts.map((draft) => (
                    <li key={draft.id}>
                      <Link
                        href={`/review/${draft.id}`}
                        className="-mx-2 flex items-center justify-between gap-4 rounded-md px-2 py-3 transition-colors hover:bg-accent/50"
                      >
                        <div className="flex min-w-0 flex-col gap-1">
                          <p className="truncate text-sm font-medium">
                            {draft.title || draft.hook || 'Untitled draft'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Generated {formatDate(draft.created_at)}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-3">
                          <Badge variant="outline">
                            {draft.archive_checks_enabled
                              ? 'Checks on'
                              : 'Checks off'}
                          </Badge>
                          <ArrowRightIcon
                            className="size-4 text-muted-foreground"
                            aria-hidden
                          />
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </>
  )
}

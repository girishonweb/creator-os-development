'use client'

import { LibraryIcon, SearchIcon } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useMemo, useState } from 'react'
import useSWR from 'swr'
import { ContentDetailSheet } from '@/components/content-detail-sheet'
import { ErrorState, PageHeader } from '@/components/state-views'
import { useWorkspace } from '@/components/workspace-provider'
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
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate } from '@/lib/constants'
import { createClient } from '@/lib/supabase/client'
import type { ContentItem } from '@/lib/types'

async function fetchContent(creatorId: string): Promise<ContentItem[]> {
  const { data, error } = await createClient()
    .from('content_items')
    .select('*')
    .eq('creator_id', creatorId)
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(300)
  if (error) throw new Error(error.message)
  return (data ?? []) as ContentItem[]
}

export function LibraryView() {
  const { creator } = useWorkspace()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const selectedId = searchParams.get('item')
  const [query, setQuery] = useState('')

  const { data, error, isLoading, mutate } = useSWR(
    ['content', creator.id],
    () => fetchContent(creator.id),
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!data) return []
    if (!q) return data
    return data.filter((item) => {
      const caption = (item.caption ?? '').toLowerCase()
      const tags = (item.hashtags ?? []).join(' ').toLowerCase()
      return caption.includes(q) || tags.includes(q)
    })
  }, [data, query])

  function selectItem(id: string | null) {
    router.replace(id ? `${pathname}?item=${id}` : pathname, { scroll: false })
  }

  return (
    <>
      <PageHeader
        title="Library"
        description={`The archive of past content from @${creator.handle} that new drafts are checked against.`}
      />

      <InputGroup className="max-w-md">
        <InputGroupAddon>
          <SearchIcon />
        </InputGroupAddon>
        <InputGroupInput
          type="search"
          placeholder="Search captions and hashtags"
          aria-label="Search library"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </InputGroup>

      {error ? (
        <ErrorState
          title="Could not load the library"
          message={error.message}
          onRetry={() => mutate()}
        />
      ) : isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <LibraryIcon />
            </EmptyMedia>
            <EmptyTitle>
              {query ? 'No matching content' : 'The library is empty'}
            </EmptyTitle>
            <EmptyDescription>
              {query
                ? 'Try a different search term.'
                : 'Past posts will appear here once they are imported.'}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => selectItem(item.id)}
                className="block h-full w-full rounded-xl text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Card className="h-full transition-colors hover:bg-accent/40">
                  <CardHeader>
                    <CardDescription>
                      {formatDate(item.published_at)}
                    </CardDescription>
                    <CardTitle className="line-clamp-3 text-sm font-medium leading-relaxed">
                      {item.caption || 'No caption'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-wrap items-center gap-2">
                    {item.is_sponsored ? (
                      <Badge variant="secondary">Sponsored</Badge>
                    ) : null}
                    {item.has_speech ? (
                      <Badge variant="outline">Speech</Badge>
                    ) : null}
                    {item.metrics?.likes != null ? (
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {item.metrics.likes.toLocaleString()} likes
                      </span>
                    ) : null}
                    {item.metrics?.comments != null ? (
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {item.metrics.comments.toLocaleString()} comments
                      </span>
                    ) : null}
                  </CardContent>
                </Card>
              </button>
            </li>
          ))}
        </ul>
      )}

      <ContentDetailSheet
        itemId={selectedId}
        listItem={data?.find((i) => i.id === selectedId) ?? null}
        onClose={() => selectItem(null)}
      />
    </>
  )
}

'use client'

import { ExternalLinkIcon } from 'lucide-react'
import useSWR from 'swr'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate, formatSeconds } from '@/lib/constants'
import { createClient } from '@/lib/supabase/client'
import type { ContentItem, Transcript } from '@/lib/types'

async function fetchItem(id: string): Promise<ContentItem | null> {
  const { data, error } = await createClient()
    .from('content_items')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return (data as ContentItem | null) ?? null
}

async function fetchTranscript(id: string): Promise<Transcript | null> {
  const { data, error } = await createClient()
    .from('transcripts')
    .select('*')
    .eq('content_item_id', id)
    .limit(1)
  if (error) throw new Error(error.message)
  return ((data ?? [])[0] as Transcript | undefined) ?? null
}

export function ContentDetailSheet({
  itemId,
  listItem,
  onClose,
}: {
  itemId: string | null
  listItem: ContentItem | null
  onClose: () => void
}) {
  const { data: fetched } = useSWR(
    itemId && !listItem ? ['content-item', itemId] : null,
    () => fetchItem(itemId!),
  )
  const { data: transcript, isLoading: transcriptLoading } = useSWR(
    itemId ? ['transcript', itemId] : null,
    () => fetchTranscript(itemId!),
  )

  const item = listItem ?? fetched ?? null

  return (
    <Sheet open={Boolean(itemId)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full gap-0 sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>Archive item</SheetTitle>
          <SheetDescription>
            {item ? formatDate(item.published_at) : 'Loading details'}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="min-h-0 flex-1">
          {!item ? (
            <div className="flex flex-col gap-3 p-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ) : (
            <div className="flex flex-col gap-6 p-4">
              <div className="flex flex-wrap items-center gap-2">
                {item.is_sponsored ? (
                  <Badge variant="secondary">Sponsored</Badge>
                ) : null}
                {item.has_speech ? <Badge variant="outline">Speech</Badge> : null}
                {item.duration_s != null ? (
                  <Badge variant="outline">{formatSeconds(item.duration_s)}</Badge>
                ) : null}
              </div>

              <section className="flex flex-col gap-2">
                <h3 className="text-sm font-medium">Caption</h3>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                  {item.caption || 'No caption'}
                </p>
              </section>

              {item.hashtags && item.hashtags.length > 0 ? (
                <section className="flex flex-col gap-2">
                  <h3 className="text-sm font-medium">Hashtags</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {item.hashtags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        #{tag.replace(/^#/, '')}
                      </Badge>
                    ))}
                  </div>
                </section>
              ) : null}

              <section className="flex flex-col gap-2">
                <h3 className="text-sm font-medium">Metrics</h3>
                <dl className="grid grid-cols-3 gap-3 text-sm">
                  {(
                    [
                      ['Likes', item.metrics?.likes],
                      ['Comments', item.metrics?.comments],
                      ['Plays', item.metrics?.plays],
                    ] as const
                  ).map(([label, value]) => (
                    <div key={label} className="flex flex-col">
                      <dt className="text-xs text-muted-foreground">{label}</dt>
                      <dd className="font-medium tabular-nums">
                        {value != null ? value.toLocaleString() : '—'}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>

              <section className="flex flex-col gap-2">
                <h3 className="text-sm font-medium">Transcript</h3>
                {transcriptLoading ? (
                  <Skeleton className="h-24 w-full" />
                ) : transcript?.text ? (
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                    {transcript.text}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No transcript available for this item.
                  </p>
                )}
              </section>

              {item.url ? (
                <Button
                  variant="outline"
                  className="self-start"
                  nativeButton={false}
                  render={
                    <a href={item.url} target="_blank" rel="noopener noreferrer" />
                  }
                >
                  <ExternalLinkIcon data-icon="inline-start" />
                  Open original
                </Button>
              ) : null}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}

'use client'

import { BuildingIcon, LogOutIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { createClient } from '@/lib/supabase/client'
import type { WorkspaceLoadResult } from '@/lib/workspace'

export function WorkspaceProblem({
  result,
}: {
  result: Exclude<WorkspaceLoadResult, { status: 'ok' }>
}) {
  const router = useRouter()

  async function signOut() {
    await createClient().auth.signOut()
    router.replace('/login')
    router.refresh()
  }

  const copy = {
    'no-workspace': {
      title: 'No workspace yet',
      description:
        'Your account is not a member of any workspace. Ask an admin to add you, then sign in again.',
    },
    'no-creator': {
      title: 'No creator in this workspace',
      description:
        'This workspace does not have a creator profile yet. Add one to start generating scripts.',
    },
    error: {
      title: 'Could not load your workspace',
      description:
        result.status === 'error'
          ? result.message
          : 'Something went wrong. Please try again.',
    },
  }[result.status]

  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <BuildingIcon />
          </EmptyMedia>
          <EmptyTitle>{copy.title}</EmptyTitle>
          <EmptyDescription>{copy.description}</EmptyDescription>
        </EmptyHeader>
        <Button variant="outline" onClick={signOut}>
          <LogOutIcon data-icon="inline-start" />
          Sign out
        </Button>
      </Empty>
    </main>
  )
}

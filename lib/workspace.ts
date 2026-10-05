import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Creator, Workspace } from '@/lib/types'

export interface WorkspaceContextData {
  user: { id: string; email: string | null }
  workspace: Workspace
  creator: Creator
  creators: Creator[]
}

export type WorkspaceLoadResult =
  | { status: 'ok'; data: WorkspaceContextData }
  | { status: 'no-workspace' }
  | { status: 'no-creator'; workspace: Workspace }
  | { status: 'error'; message: string }

export async function loadWorkspaceContext(): Promise<WorkspaceLoadResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: memberships, error: memberError } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .limit(1)

  if (memberError) return { status: 'error', message: memberError.message }
  const workspaceId = memberships?.[0]?.workspace_id as string | undefined
  if (!workspaceId) return { status: 'no-workspace' }

  const { data: workspaceRow } = await supabase
    .from('workspaces')
    .select('id, name')
    .eq('id', workspaceId)
    .maybeSingle()

  const workspace: Workspace = {
    id: workspaceId,
    name: (workspaceRow?.name as string | undefined) ?? 'Workspace',
  }

  const { data: creators, error: creatorError } = await supabase
    .from('creators')
    .select('id, workspace_id, handle, reviewer_type, voice_profile')
    .eq('workspace_id', workspaceId)
    .order('handle', { ascending: true })

  if (creatorError) return { status: 'error', message: creatorError.message }
  if (!creators || creators.length === 0) {
    return { status: 'no-creator', workspace }
  }

  return {
    status: 'ok',
    data: {
      user: { id: user.id, email: user.email ?? null },
      workspace,
      creator: creators[0] as Creator,
      creators: creators as Creator[],
    },
  }
}

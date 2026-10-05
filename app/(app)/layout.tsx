import { AppShell } from '@/components/app-shell'
import { WorkspaceProblem } from '@/components/workspace-problem'
import { WorkspaceProvider } from '@/components/workspace-provider'
import { loadWorkspaceContext } from '@/lib/workspace'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const result = await loadWorkspaceContext()

  if (result.status !== 'ok') {
    return <WorkspaceProblem result={result} />
  }

  return (
    <WorkspaceProvider value={result.data}>
      <AppShell>{children}</AppShell>
    </WorkspaceProvider>
  )
}

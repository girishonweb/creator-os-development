'use client'

import { createContext, useContext } from 'react'
import type { WorkspaceContextData } from '@/lib/workspace'

const WorkspaceContext = createContext<WorkspaceContextData | null>(null)

export function WorkspaceProvider({
  value,
  children,
}: {
  value: WorkspaceContextData
  children: React.ReactNode
}) {
  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  )
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext)
  if (!ctx) throw new Error('useWorkspace must be used within WorkspaceProvider')
  return ctx
}

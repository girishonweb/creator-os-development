'use client'

import {
  HistoryIcon,
  LayoutDashboardIcon,
  LibraryIcon,
  LogOutIcon,
  MenuIcon,
  PenLineIcon,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { ThemeToggle } from '@/components/theme-toggle'
import { useWorkspace } from '@/components/workspace-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboardIcon },
  { href: '/studio', label: 'Studio', icon: PenLineIcon },
  { href: '/library', label: 'Library', icon: LibraryIcon },
  { href: '/history', label: 'History', icon: HistoryIcon },
]

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()

  return (
    <nav aria-label="Primary" className="flex flex-col gap-1">
      {NAV_ITEMS.map((item) => {
        const active =
          item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              active
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
            )}
          >
            <item.icon className="size-4" aria-hidden />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2 px-3">
      <span className="flex size-7 items-center justify-center rounded-md bg-primary text-xs font-semibold text-primary-foreground">
        C
      </span>
      <span className="text-sm font-semibold tracking-tight">Creator OS</span>
    </Link>
  )
}

function SidebarFooter() {
  const router = useRouter()
  const { user } = useWorkspace()

  async function signOut() {
    await createClient().auth.signOut()
    router.replace('/login')
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-2 px-3">
      <p className="truncate text-xs text-muted-foreground">{user.email}</p>
      <Button variant="outline" size="sm" onClick={signOut}>
        <LogOutIcon data-icon="inline-start" />
        Sign out
      </Button>
    </div>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { workspace, creator } = useWorkspace()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="flex min-h-svh">
      <aside className="sticky top-0 hidden h-svh w-60 shrink-0 flex-col justify-between border-r bg-sidebar py-5 md:flex">
        <div className="flex flex-col gap-6">
          <Brand />
          <div className="px-2">
            <NavLinks />
          </div>
        </div>
        <SidebarFooter />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/90 px-4 backdrop-blur md:px-6">
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  aria-label="Open navigation"
                />
              }
            >
              <MenuIcon />
            </SheetTrigger>
            <SheetContent side="left" className="w-64 gap-0 p-0">
              <SheetHeader className="sr-only">
                <SheetTitle>Navigation</SheetTitle>
                <SheetDescription>Browse Creator OS sections</SheetDescription>
              </SheetHeader>
              <div className="flex h-full flex-col justify-between py-5">
                <div className="flex flex-col gap-6">
                  <Brand />
                  <div className="px-2">
                    <NavLinks onNavigate={() => setMenuOpen(false)} />
                  </div>
                </div>
                <SidebarFooter />
              </div>
            </SheetContent>
          </Sheet>

          <div className="flex min-w-0 items-center gap-2 text-sm">
            <span className="truncate text-muted-foreground">
              {workspace.name}
            </span>
            <Separator orientation="vertical" className="h-4" />
            <Badge variant="secondary" className="truncate">
              @{creator.handle}
            </Badge>
          </div>

          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

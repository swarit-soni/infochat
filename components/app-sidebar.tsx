import { Suspense } from 'react'

import { isAnonymousMode } from '@/lib/auth/provider'
import type { AppUser } from '@/lib/auth/types'
import { cn } from '@/lib/utils'
import { isBetaVersion } from '@/lib/version/semver'

import { Badge } from '@/components/ui/badge'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarRail,
  SidebarTrigger
} from '@/components/ui/sidebar'

import packageJson from '../package.json'

import { ChatHistorySection } from './sidebar/chat-history-section'
import { ChatHistorySkeleton } from './sidebar/chat-history-skeleton'
import { HomeLink } from './sidebar/home-link'
import { LibraryMenuItem } from './sidebar/library-menu-item'
import { NewChatMenuItem } from './sidebar/new-chat-menu-item'
import { IconLogo } from './ui/icons'
import UserMenu from './user-menu'

interface AppSidebarProps {
  user?: AppUser | null
}

export default function AppSidebar({ user }: AppSidebarProps) {
  // Anonymous mode has no per-user library, and the server actions reject it,
  // so the entry point follows the same switch the pages use.
  const libraryAvailable = !isAnonymousMode()
  const isBeta = isBetaVersion(packageJson.version)

  return (
    <Sidebar side="left" variant="sidebar" collapsible="offcanvas">
      <SidebarHeader className="flex flex-row justify-between items-center">
        <HomeLink className="flex items-center gap-2 px-2 py-3">
          <IconLogo className={cn('size-5')} />
          <span className="font-display text-base tracking-wide">SERA</span>
          {isBeta && (
            <Badge
              variant="secondary"
              className="px-1.5 py-0 text-[10px] font-medium uppercase tracking-wide"
            >
              Beta
            </Badge>
          )}
        </HomeLink>
        <SidebarTrigger />
      </SidebarHeader>
      <SidebarContent className="flex flex-col px-2 py-4 h-full">
        <SidebarMenu>
          <NewChatMenuItem />
          {libraryAvailable && <LibraryMenuItem />}
        </SidebarMenu>
        <div className="flex-1 overflow-y-auto">
          <Suspense fallback={<ChatHistorySkeleton />}>
            <ChatHistorySection />
          </Suspense>
        </div>
      </SidebarContent>
      {user && (
        <SidebarFooter>
          <UserMenu user={user} />
        </SidebarFooter>
      )}
      <SidebarRail />
    </Sidebar>
  )
}

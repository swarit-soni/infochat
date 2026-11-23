import React from 'react'

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { signOut } from '@/lib/actions/auth'
import type { AppUser } from '@/lib/auth/types'
import { chatStore } from '@/lib/chat-store'
import { AppUserProvider } from '@/lib/contexts/app-user-context'

import UserMenu from '@/components/user-menu'

vi.mock('@/lib/actions/auth', () => ({
  signOut: vi.fn()
}))

const { mockPush, mockRefresh } = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockRefresh: vi.fn()
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh })
}))

vi.mock('@/components/usage-budget-provider', () => ({
  useUsageBudget: () => ({
    usage: null,
    isLow: false,
    isExhausted: false,
    refreshUsage: vi.fn()
  })
}))

vi.mock('@/components/account-settings-dialog', () => ({
  AccountSettingsDialog: () => null
}))

vi.mock('@/components/external-link-items', () => ({
  ExternalLinkItems: () => null
}))

vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => children,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => (
    <div role="menu">{children}</div>
  ),
  DropdownMenuItem: ({
    children,
    onSelect,
    onClick
  }: {
    children: React.ReactNode
    onSelect?: (event: { preventDefault: () => void }) => void
    onClick?: () => void
  }) => (
    <button
      role="menuitem"
      onClick={() => {
        onSelect?.({ preventDefault: vi.fn() })
        onClick?.()
      }}
    >
      {children}
    </button>
  ),
  DropdownMenuLabel: ({ children }: { children: React.ReactNode }) => children,
  DropdownMenuSeparator: () => <hr />,
  DropdownMenuSub: ({ children }: { children: React.ReactNode }) => children,
  DropdownMenuSubContent: ({ children }: { children: React.ReactNode }) =>
    children,
  DropdownMenuSubTrigger: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => children
}))

const user: AppUser = {
  id: 'user-1',
  email: 'person@example.com',
  name: 'Test Person'
}

const capabilities = {
  signUp: true,
  passwordReset: true,
  deleteUser: true,
  oauth: false,
  emailVerification: false,
  share: true
}

describe('UserMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('signs out through the auth server action and refreshes the router', async () => {
    vi.mocked(signOut).mockResolvedValue({ success: true })
    render(
      <AppUserProvider user={user} capabilities={capabilities}>
        <UserMenu user={user} />
      </AppUserProvider>
    )

    chatStore.getOrCreate('cached', { messages: [] })

    fireEvent.click(screen.getByRole('menuitem', { name: /Logout/ }))

    await waitFor(() => {
      expect(signOut).toHaveBeenCalledTimes(1)
      expect(chatStore.get('cached')).toBeUndefined()
      expect(mockPush).toHaveBeenCalledWith('/')
      expect(mockRefresh).toHaveBeenCalled()
    })
  })

  it('shows the user profile information', () => {
    render(
      <AppUserProvider user={user} capabilities={capabilities}>
        <UserMenu user={user} />
      </AppUserProvider>
    )

    expect(screen.getByText('Test Person')).toBeInTheDocument()
    expect(screen.getByText('person@example.com')).toBeInTheDocument()
  })

  it('shows the Mentor or Student badge when userType is present', () => {
    const mentorUser: AppUser = {
      ...user,
      email: 'mentor@kalvium.com',
      userType: 'mentor'
    }
    const { rerender } = render(
      <AppUserProvider user={mentorUser} capabilities={capabilities}>
        <UserMenu user={mentorUser} />
      </AppUserProvider>
    )
    expect(screen.getByText('Mentor')).toBeInTheDocument()

    const studentUser: AppUser = {
      ...user,
      email: 'student@kalvium.community',
      userType: 'student'
    }
    rerender(
      <AppUserProvider user={studentUser} capabilities={capabilities}>
        <UserMenu user={studentUser} />
      </AppUserProvider>
    )
    expect(screen.getByText('Student')).toBeInTheDocument()
  })

  it('shows Mentor Portal link only for mentors and never shows an Admin link', () => {
    const mentorUser: AppUser = {
      ...user,
      email: 'mentor@kalvium.com',
      userType: 'mentor',
      role: 'mentor'
    }
    const { rerender } = render(
      <AppUserProvider user={mentorUser} capabilities={capabilities}>
        <UserMenu user={mentorUser} />
      </AppUserProvider>
    )

    const mentorLink = screen.getByRole('link', { name: 'Mentor Portal' })
    expect(mentorLink).toHaveAttribute('href', '/mentor')
    expect(screen.queryByText('Admin')).not.toBeInTheDocument()

    const studentUser: AppUser = {
      ...user,
      email: 'student@kalvium.community',
      userType: 'student',
      role: 'admin'
    }
    rerender(
      <AppUserProvider user={studentUser} capabilities={capabilities}>
        <UserMenu user={studentUser} />
      </AppUserProvider>
    )
    expect(
      screen.queryByRole('link', { name: 'Mentor Portal' })
    ).not.toBeInTheDocument()
    expect(screen.queryByText('Admin')).not.toBeInTheDocument()
  })
})

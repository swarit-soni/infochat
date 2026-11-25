import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getAuthProvider, isAnonymousMode } from '@/lib/auth/provider'
import { getUserProfile } from '@/lib/db/actions'

import { getCurrentUser } from '../get-current-user'

vi.mock('react', async importOriginal => {
  const actual = await importOriginal<typeof import('react')>()
  return {
    ...actual,
    cache: <T extends (...args: never[]) => unknown>(fn: T) => fn
  }
})

vi.mock('@/lib/colleges/store', async () =>
  (await import('@/lib/colleges/testing')).collegeStoreMock()
)

vi.mock('@/lib/auth/provider', () => ({
  getAuthProvider: vi.fn(),
  isAnonymousMode: vi.fn()
}))

vi.mock('@/lib/db/actions', () => ({
  getUserProfile: vi.fn()
}))

describe('getCurrentUser', () => {
  const providerGetCurrentUser = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(isAnonymousMode).mockReturnValue(false)
    vi.mocked(getAuthProvider).mockReturnValue({
      name: 'supabase',
      getCurrentUser: providerGetCurrentUser
    } as never)
  })

  it('uses the verified college for authentic college email domains', async () => {
    providerGetCurrentUser.mockResolvedValue({
      id: 'u-bkbirla',
      email: 'student@bkbck.edu.in',
      userType: 'student',
      college: 'bkbirla'
    })
    vi.mocked(getUserProfile).mockResolvedValue({
      college: 'bkbirla',
      campus: null,
      onboardedAt: new Date()
    } as never)

    const user = await getCurrentUser()
    expect(user).toMatchObject({
      college: 'bkbirla',
      collegeVerified: true,
      collegeOnboarded: true
    })
  })

  it('requires partner campus onboarding for verified Kalvium students', async () => {
    providerGetCurrentUser.mockResolvedValue({
      id: 'u-kalvium',
      email: 'student@kalvium.community',
      userType: 'student',
      college: 'kalvium'
    })
    vi.mocked(getUserProfile).mockResolvedValue({
      college: 'kalvium',
      campus: null,
      onboardedAt: new Date()
    } as never)

    expect(await getCurrentUser()).toMatchObject({
      college: 'kalvium',
      collegeVerified: true,
      collegeOnboarded: false
    })

    vi.mocked(getUserProfile).mockResolvedValue({
      college: 'kalvium',
      campus: 'jecrc',
      onboardedAt: new Date()
    } as never)

    expect(await getCurrentUser()).toMatchObject({
      college: 'kalvium',
      campus: 'jecrc',
      collegeVerified: true,
      collegeOnboarded: true
    })
  })

  it('allows sera-demo enrollment without an authentic college email domain', async () => {
    providerGetCurrentUser.mockResolvedValue({
      id: 'u-demo',
      email: 'guest@gmail.com',
      userType: null,
      college: null
    })
    vi.mocked(getUserProfile).mockResolvedValue({
      college: 'sera-demo',
      campus: null,
      onboardedAt: new Date()
    } as never)

    expect(await getCurrentUser()).toMatchObject({
      college: 'sera-demo',
      collegeVerified: false,
      collegeOnboarded: true
    })
  })

  it('allows a verified student who opted into sera-demo to view sera-demo', async () => {
    providerGetCurrentUser.mockResolvedValue({
      id: 'u-student-demo',
      email: 'student@kalvium.community',
      userType: 'student',
      college: 'kalvium'
    })
    vi.mocked(getUserProfile).mockResolvedValue({
      college: 'sera-demo',
      campus: null,
      onboardedAt: new Date()
    } as never)

    expect(await getCurrentUser()).toMatchObject({
      college: 'sera-demo',
      collegeVerified: false,
      collegeOnboarded: true
    })
  })

  it('ignores stale unverified real colleges in user_profiles', async () => {
    providerGetCurrentUser.mockResolvedValue({
      id: 'u-stale',
      email: 'someone@gmail.com',
      userType: null,
      college: null
    })
    vi.mocked(getUserProfile).mockResolvedValue({
      college: 'bkbirla',
      campus: null,
      onboardedAt: new Date()
    } as never)

    expect(await getCurrentUser()).toMatchObject({
      college: null,
      collegeVerified: false,
      collegeOnboarded: true
    })
  })

  it('keeps mentor college authoritative even if profile stores sera-demo', async () => {
    providerGetCurrentUser.mockResolvedValue({
      id: 'u-mentor',
      email: 'mentor@kalvium.com',
      userType: 'mentor',
      college: 'kalvium'
    })
    vi.mocked(getUserProfile).mockResolvedValue({
      college: 'sera-demo',
      campus: null,
      onboardedAt: new Date()
    } as never)

    expect(await getCurrentUser()).toMatchObject({
      college: 'kalvium',
      collegeVerified: true,
      collegeOnboarded: true
    })
  })
})

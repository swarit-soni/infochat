import { NextRequest } from 'next/server'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { upsertUserProfile } from '@/lib/db/actions'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

import { GET } from '../route'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn()
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn()
}))

vi.mock('@/lib/db/actions', () => ({
  upsertUserProfile: vi.fn()
}))

describe('GET /auth/oauth', () => {
  const exchangeCodeForSession = vi.fn()
  const getUser = vi.fn()
  const signOut = vi.fn()
  const deleteUser = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    exchangeCodeForSession.mockResolvedValue({ error: null })
    signOut.mockResolvedValue({ error: null })
    deleteUser.mockResolvedValue({ data: { user: null }, error: null })
    vi.mocked(upsertUserProfile).mockResolvedValue({} as never)
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        exchangeCodeForSession,
        getUser,
        signOut
      }
    } as never)
    vi.mocked(createAdminClient).mockReturnValue({
      auth: { admin: { deleteUser } }
    } as never)
  })

  it('redirects to unauthorized_domain when Supabase returns a domain/hook error', async () => {
    const request = new NextRequest(
      'http://localhost:3000/auth/oauth?error=access_denied&error_description=Only+%40kalvium.com+and+%40kalvium.community+Google+accounts+are+allowed.'
    )

    const response = await GET(request)

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe(
      'http://localhost:3000/auth/login?error=unauthorized_domain'
    )
    expect(response.cookies.get('auth_next')?.value).toBe('')
    expect(exchangeCodeForSession).not.toHaveBeenCalled()
  })

  it('redirects to oauth_failed for generic OAuth provider errors', async () => {
    const request = new NextRequest(
      'http://localhost:3000/auth/oauth?error=access_denied&error_description=User+cancelled+login'
    )

    const response = await GET(request)

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe(
      'http://localhost:3000/auth/login?error=oauth_failed'
    )
  })

  it('redirects to oauth_failed when code is missing or exchange fails', async () => {
    const missingCodeRes = await GET(
      new NextRequest('http://localhost:3000/auth/oauth')
    )
    expect(missingCodeRes.headers.get('location')).toBe(
      'http://localhost:3000/auth/login?error=oauth_failed'
    )

    exchangeCodeForSession.mockResolvedValue({
      error: { message: 'invalid code' }
    })
    const failedExchangeRes = await GET(
      new NextRequest('http://localhost:3000/auth/oauth?code=bad-code')
    )
    expect(failedExchangeRes.headers.get('location')).toBe(
      'http://localhost:3000/auth/login?error=oauth_failed'
    )
  })

  it('signs out, deletes user, and redirects when email domain is disallowed', async () => {
    getUser.mockResolvedValue({
      data: {
        user: {
          id: 'user-bad',
          email: 'user@gmail.com',
          app_metadata: { provider: 'google' },
          user_metadata: { full_name: 'Bad User' }
        }
      },
      error: null
    })

    const request = new NextRequest(
      'http://localhost:3000/auth/oauth?code=valid-code'
    )
    const response = await GET(request)

    expect(signOut).toHaveBeenCalledTimes(1)
    expect(deleteUser).toHaveBeenCalledWith('user-bad')
    expect(upsertUserProfile).not.toHaveBeenCalled()
    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe(
      'http://localhost:3000/auth/login?error=unauthorized_domain'
    )
    expect(response.cookies.get('auth_next')?.value).toBe('')
  })

  it('signs out and rejects non-Google users even with a Kalvium email', async () => {
    getUser.mockResolvedValue({
      data: {
        user: {
          id: 'user-email',
          email: 'mentor@kalvium.com',
          app_metadata: { provider: 'email', providers: ['email'] },
          user_metadata: { provider: 'google' }
        }
      },
      error: null
    })

    const response = await GET(
      new NextRequest('http://localhost:3000/auth/oauth?code=valid-code')
    )

    expect(signOut).toHaveBeenCalledTimes(1)
    expect(deleteUser).toHaveBeenCalledWith('user-email')
    expect(response.headers.get('location')).toBe(
      'http://localhost:3000/auth/login?error=unauthorized_domain'
    )
  })

  it('still redirects cleanly when admin deletion fails (e.g. SUPABASE_SECRET_KEY unset)', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(createAdminClient).mockImplementation(() => {
      throw new Error('Missing SUPABASE_SECRET_KEY')
    })
    getUser.mockResolvedValue({
      data: {
        user: {
          id: 'user-bad',
          email: 'outsider@example.com',
          app_metadata: { provider: 'google' }
        }
      },
      error: null
    })

    const response = await GET(
      new NextRequest('http://localhost:3000/auth/oauth?code=valid-code')
    )

    expect(signOut).toHaveBeenCalledTimes(1)
    expect(response.headers.get('location')).toBe(
      'http://localhost:3000/auth/login?error=unauthorized_domain'
    )
  })

  it('upserts mentor profile and redirects to safe auth_next cookie for @kalvium.com', async () => {
    getUser.mockResolvedValue({
      data: {
        user: {
          id: 'mentor-1',
          email: 'Alice@Kalvium.com',
          app_metadata: { provider: 'google', providers: ['google'] },
          user_metadata: {
            full_name: 'Alice Mentor',
            avatar_url: 'https://example.com/a.png'
          }
        }
      },
      error: null
    })

    const request = new NextRequest(
      'http://localhost:3000/auth/oauth?code=good-code',
      {
        headers: {
          cookie: 'auth_next=%2Fsearch%2Fchat-1'
        }
      }
    )

    const response = await GET(request)

    expect(upsertUserProfile).toHaveBeenCalledWith({
      id: 'mentor-1',
      email: 'alice@kalvium.com',
      userType: 'mentor',
      name: 'Alice Mentor',
      avatarUrl: 'https://example.com/a.png'
    })
    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe(
      'http://localhost:3000/search/chat-1'
    )
    expect(response.cookies.get('auth_next')?.value).toBe('')
  })

  it('upserts student profile for @kalvium.community and ignores off-site next', async () => {
    getUser.mockResolvedValue({
      data: {
        user: {
          id: 'student-1',
          email: 'bob@kalvium.community',
          app_metadata: { providers: ['google'] },
          user_metadata: { name: 'Bob Student', picture: 'https://img/b.png' }
        }
      },
      error: null
    })

    const request = new NextRequest(
      'http://localhost:3000/auth/oauth?code=good-code&next=//evil.example.com'
    )

    const response = await GET(request)

    expect(upsertUserProfile).toHaveBeenCalledWith({
      id: 'student-1',
      email: 'bob@kalvium.community',
      userType: 'student',
      name: 'Bob Student',
      avatarUrl: 'https://img/b.png'
    })
    expect(response.headers.get('location')).toBe('http://localhost:3000/')
  })

  it('does not block OAuth redirect when profile upsert throws', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(upsertUserProfile).mockRejectedValue(
      new Error('relation "user_profiles" does not exist')
    )
    getUser.mockResolvedValue({
      data: {
        user: {
          id: 'student-2',
          email: 'carol@kalvium.community',
          app_metadata: { provider: 'google' }
        }
      },
      error: null
    })

    const response = await GET(
      new NextRequest('http://localhost:3000/auth/oauth?code=good-code')
    )

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('http://localhost:3000/')
  })
})

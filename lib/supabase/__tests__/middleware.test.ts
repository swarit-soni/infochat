import { NextRequest } from 'next/server'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { updateSession } from '../middleware'

vi.mock('@supabase/ssr', () => ({ createServerClient: vi.fn() }))
vi.mock('@/lib/supabase/keys', () => ({
  getSupabasePublishableKey: vi.fn(() => 'publishable-key')
}))

import { createServerClient } from '@supabase/ssr'

describe('updateSession', () => {
  const getUser = vi.fn()
  const signOut = vi.fn()
  const originalGuestChat = process.env.ENABLE_GUEST_CHAT
  let cookieHandlers: {
    cookies: {
      setAll: (
        cookies: Array<{
          name: string
          value: string
          options?: Record<string, unknown>
        }>
      ) => void
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.ENABLE_GUEST_CHAT
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
    signOut.mockResolvedValue({ error: null })
    vi.mocked(createServerClient).mockImplementation(((
      _url: string,
      _key: string,
      options: typeof cookieHandlers
    ) => {
      cookieHandlers = options
      // updateSession reads the session through getClaims(); the tests
      // describe users the way getUser() returns them.
      const getClaims = async () => {
        const result = await getUser()
        const user = result?.data?.user
        return { data: user ? { claims: user } : null, error: null }
      }
      return { auth: { getClaims, signOut } } as never
    }) as never)
  })

  afterEach(() => {
    if (originalGuestChat === undefined) {
      delete process.env.ENABLE_GUEST_CHAT
    } else {
      process.env.ENABLE_GUEST_CHAT = originalGuestChat
    }
  })

  it('redirects unauthenticated root requests to /auth/login when guest chat is disabled', async () => {
    getUser.mockResolvedValue({ data: { user: null } })

    const response = await updateSession(
      new NextRequest('http://localhost:3000/')
    )

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe(
      'http://localhost:3000/auth/login'
    )
  })

  it('preserves ?next= for unauthenticated non-root protected routes', async () => {
    getUser.mockResolvedValue({ data: { user: null } })

    const response = await updateSession(
      new NextRequest('http://localhost:3000/search/abc?q=hello')
    )

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe(
      'http://localhost:3000/auth/login?next=%2Fsearch%2Fabc%3Fq%3Dhello'
    )
  })

  it('allows /auth and /api without authentication', async () => {
    getUser.mockResolvedValue({ data: { user: null } })

    const authRes = await updateSession(
      new NextRequest('http://localhost:3000/auth/login')
    )
    expect(authRes.status).toBe(200)

    const apiRes = await updateSession(
      new NextRequest('http://localhost:3000/api/health')
    )
    expect(apiRes.status).toBe(200)
  })

  it('allows / and /share unauthenticated only when ENABLE_GUEST_CHAT=true, while protecting other routes', async () => {
    process.env.ENABLE_GUEST_CHAT = 'true'
    getUser.mockResolvedValue({ data: { user: null } })

    const rootRes = await updateSession(
      new NextRequest('http://localhost:3000/')
    )
    expect(rootRes.status).toBe(200)

    const shareRes = await updateSession(
      new NextRequest('http://localhost:3000/share/chat-1')
    )
    expect(shareRes.status).toBe(200)

    const searchRes = await updateSession(
      new NextRequest('http://localhost:3000/search/chat-1')
    )
    expect(searchRes.status).toBe(307)
    expect(searchRes.headers.get('location')).toBe(
      'http://localhost:3000/auth/login?next=%2Fsearch%2Fchat-1'
    )
  })

  it('allows valid Kalvium Google sessions', async () => {
    getUser.mockResolvedValue({
      data: {
        user: {
          id: 'user-1',
          email: 'mentor@kalvium.com',
          app_metadata: { provider: 'google' }
        }
      }
    })

    const response = await updateSession(
      new NextRequest('http://localhost:3000/search/abc')
    )

    expect(response.status).toBe(200)
    expect(signOut).not.toHaveBeenCalled()
  })

  it('lets any Google account through, regardless of email domain', async () => {
    getUser.mockResolvedValue({
      data: {
        user: {
          id: 'user-gmail',
          email: 'user@gmail.com',
          app_metadata: { provider: 'google' }
        }
      }
    })

    const response = await updateSession(
      new NextRequest('http://localhost:3000/search/abc')
    )

    expect(signOut).not.toHaveBeenCalled()
    expect(response.headers.get('location')).toBeNull()
  })

  it('signs out non-Google sessions, preserves cleared cookies, and redirects to unauthorized_domain', async () => {
    getUser.mockResolvedValue({
      data: {
        user: {
          id: 'user-bad',
          email: 'user@gmail.com',
          app_metadata: { provider: 'github' }
        }
      }
    })
    signOut.mockImplementation(async () => {
      cookieHandlers.cookies.setAll([
        {
          name: 'sb-fheytswhnzhiibxrqzqo-auth-token',
          value: '',
          options: { maxAge: 0, path: '/' }
        }
      ])
      return { error: null }
    })

    const response = await updateSession(
      new NextRequest('http://localhost:3000/search/abc')
    )

    expect(signOut).toHaveBeenCalledTimes(1)
    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe(
      'http://localhost:3000/auth/login?error=unauthorized_domain'
    )
    expect(
      response.cookies.get('sb-fheytswhnzhiibxrqzqo-auth-token')?.value
    ).toBe('')
  })

  it('signs out non-Google sessions even with a Kalvium email', async () => {
    getUser.mockResolvedValue({
      data: {
        user: {
          id: 'user-email',
          email: 'student@kalvium.community',
          app_metadata: { provider: 'email' },
          user_metadata: { provider: 'google' }
        }
      }
    })

    const response = await updateSession(
      new NextRequest('http://localhost:3000/')
    )

    expect(signOut).toHaveBeenCalledTimes(1)
    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe(
      'http://localhost:3000/auth/login?error=unauthorized_domain'
    )
  })

  it('redirects unauthenticated requests for /mentor to /auth/mentor', async () => {
    getUser.mockResolvedValue({ data: { user: null } })

    const response = await updateSession(
      new NextRequest('http://localhost:3000/mentor')
    )

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe(
      'http://localhost:3000/auth/mentor?next=%2Fmentor'
    )
  })
})

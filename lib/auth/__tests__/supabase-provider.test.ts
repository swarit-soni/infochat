import { NextRequest, NextResponse } from 'next/server'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { supabaseAuthProvider, toAppUser } from '@/lib/auth/providers/supabase'
import { createClient } from '@/lib/supabase/server'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn()
}))
vi.mock('@/lib/supabase/middleware', () => ({
  updateSession: vi.fn()
}))
vi.mock('@/lib/supabase/keys', () => ({
  hasSupabasePublicConfig: vi.fn(() => true)
}))
vi.mock('next/headers', () => ({ headers: vi.fn() }))

import { headers } from 'next/headers'

import { hasSupabasePublicConfig } from '@/lib/supabase/keys'
import { updateSession } from '@/lib/supabase/middleware'

describe('supabase provider', () => {
  const getUser = vi.fn()
  const signInWithOAuth = vi.fn()
  const signOut = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(hasSupabasePublicConfig).mockReturnValue(true)
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser,
        signInWithOAuth,
        signOut
      }
    } as never)
    vi.mocked(headers).mockResolvedValue(
      new Headers({ origin: 'http://localhost:3000' }) as never
    )
  })

  it('exposes Google-only capabilities and omits password methods', () => {
    expect(supabaseAuthProvider.capabilities).toEqual({
      signUp: false,
      passwordReset: false,
      deleteUser: true,
      oauth: true,
      emailVerification: false,
      share: true
    })
    expect(supabaseAuthProvider.signIn).toBeUndefined()
    expect(supabaseAuthProvider.signUp).toBeUndefined()
    expect(supabaseAuthProvider.requestPasswordReset).toBeUndefined()
    expect(supabaseAuthProvider.updatePassword).toBeUndefined()
  })

  describe('toAppUser & getCurrentUser', () => {
    it('maps @kalvium.com Google users as mentor', async () => {
      getUser.mockResolvedValue({
        data: {
          user: {
            id: 'u-1',
            email: 'Mentor@Kalvium.COM',
            created_at: '2026-01-01T00:00:00Z',
            app_metadata: { provider: 'google', providers: ['google'] },
            user_metadata: {
              full_name: 'Mentor Name',
              avatar_url: 'https://img.example/1.png'
            }
          }
        }
      })

      const user = await supabaseAuthProvider.getCurrentUser()

      expect(user).toEqual({
        id: 'u-1',
        email: 'mentor@kalvium.com',
        name: 'Mentor Name',
        image: 'https://img.example/1.png',
        createdAt: '2026-01-01T00:00:00Z',
        userType: 'mentor',
        role: 'mentor'
      })
    })

    it('maps @kalvium.community Google users as student', () => {
      const user = toAppUser({
        id: 'u-2',
        email: 'student@kalvium.community',
        app_metadata: { providers: ['google'] },
        user_metadata: {
          name: 'Student Name',
          picture: 'https://img.example/2.png'
        }
      } as never)

      expect(user).toEqual({
        id: 'u-2',
        email: 'student@kalvium.community',
        name: 'Student Name',
        image: 'https://img.example/2.png',
        createdAt: null,
        userType: 'student',
        role: 'student'
      })
    })

    it('returns null for disallowed email domains or non-Google providers', async () => {
      getUser.mockResolvedValueOnce({
        data: {
          user: {
            id: 'u-3',
            email: 'user@gmail.com',
            app_metadata: { provider: 'google' },
            user_metadata: {}
          }
        }
      })
      await expect(supabaseAuthProvider.getCurrentUser()).resolves.toBeNull()

      getUser.mockResolvedValueOnce({
        data: {
          user: {
            id: 'u-4',
            email: 'mentor@kalvium.com',
            app_metadata: { provider: 'email', providers: ['email'] },
            user_metadata: { provider: 'google' }
          }
        }
      })
      await expect(supabaseAuthProvider.getCurrentUser()).resolves.toBeNull()
    })
  })

  describe('signInWithOAuth', () => {
    it('configures Google OAuth with /auth/oauth callback and select_account prompt', async () => {
      signInWithOAuth.mockResolvedValue({
        data: { url: 'https://accounts.google.com/o/oauth2/auth' },
        error: null
      })

      const result = await supabaseAuthProvider.signInWithOAuth!('google')

      expect(signInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: {
          redirectTo: 'http://localhost:3000/auth/oauth',
          queryParams: {
            prompt: 'select_account'
          }
        }
      })
      expect(result).toEqual({
        success: true,
        redirectTo: 'https://accounts.google.com/o/oauth2/auth'
      })
    })

    it('rejects non-Google OAuth providers', async () => {
      const result = await supabaseAuthProvider.signInWithOAuth!('github')

      expect(result).toEqual({
        success: false,
        error: 'Only Google sign-in is supported.'
      })
      expect(signInWithOAuth).not.toHaveBeenCalled()
    })
  })

  describe('handleSession', () => {
    it('delegates directly to updateSession even when ?code= is present', async () => {
      const next = NextResponse.next()
      vi.mocked(updateSession).mockResolvedValue(next)
      const req = new NextRequest('http://localhost:3000/?code=abc')

      const response = await supabaseAuthProvider.handleSession(req)

      expect(updateSession).toHaveBeenCalledTimes(1)
      expect(updateSession).toHaveBeenCalledWith(req)
      expect(response).toBe(next)
    })

    it('passes through when Supabase is not configured', async () => {
      vi.mocked(hasSupabasePublicConfig).mockReturnValue(false)
      const req = new NextRequest('http://localhost:3000/')

      const response = await supabaseAuthProvider.handleSession(req)

      expect(updateSession).not.toHaveBeenCalled()
      expect(response.status).toBe(200)
    })
  })
})

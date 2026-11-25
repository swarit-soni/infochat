import { cookies } from 'next/headers'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getAuthProvider } from '@/lib/auth/provider'
import {
  AUTH_COLLEGE_COOKIE,
  AUTH_STUDENT_COLLEGE_COOKIE,
  NOT_ENROLLED_COLLEGE
} from '@/lib/colleges/registry'

import { signInStudentWithGoogle, signInWithGoogle } from '../auth'

vi.mock('next/headers', () => ({
  cookies: vi.fn()
}))

vi.mock('@/lib/colleges/store', async () =>
  (await import('@/lib/colleges/testing')).collegeStoreMock()
)

vi.mock('@/lib/auth/provider', () => ({
  getAuthProvider: vi.fn()
}))

describe('auth server actions', () => {
  const cookieStore = {
    set: vi.fn(),
    delete: vi.fn()
  }
  const signInWithOAuth = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(cookies).mockResolvedValue(cookieStore as never)
    signInWithOAuth.mockResolvedValue({
      success: true,
      redirectTo: 'https://accounts.google.com/o/oauth2/auth'
    })
    vi.mocked(getAuthProvider).mockReturnValue({
      signInWithOAuth
    } as never)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  describe('signInStudentWithGoogle', () => {
    it('sets the student college cookie and login hint for a single-domain college', async () => {
      const result = await signInStudentWithGoogle('bkbirla')

      expect(result.success).toBe(true)
      expect(cookieStore.delete).toHaveBeenCalledWith(AUTH_COLLEGE_COOKIE)
      expect(cookieStore.set).toHaveBeenCalledWith(
        AUTH_STUDENT_COLLEGE_COOKIE,
        'bkbirla',
        expect.objectContaining({ httpOnly: true, maxAge: 300, path: '/' })
      )
      expect(signInWithOAuth).toHaveBeenCalledWith('google', {
        loginHintDomain: 'bkbck.edu.in'
      })
    })

    it('omits the login hint for multi-domain colleges', async () => {
      const result = await signInStudentWithGoogle('iitm')

      expect(result.success).toBe(true)
      expect(cookieStore.set).toHaveBeenCalledWith(
        AUTH_STUDENT_COLLEGE_COOKIE,
        'iitm',
        expect.any(Object)
      )
      expect(signInWithOAuth).toHaveBeenCalledWith('google', undefined)
    })

    it('allows sera-demo without a login hint domain', async () => {
      const result = await signInStudentWithGoogle('sera-demo')

      expect(result.success).toBe(true)
      expect(cookieStore.set).toHaveBeenCalledWith(
        AUTH_STUDENT_COLLEGE_COOKIE,
        'sera-demo',
        expect.any(Object)
      )
      expect(signInWithOAuth).toHaveBeenCalledWith('google', undefined)
    })

    it('allows Not enrolled yet without a login hint domain', async () => {
      const result = await signInStudentWithGoogle(NOT_ENROLLED_COLLEGE)

      expect(result.success).toBe(true)
      expect(cookieStore.set).toHaveBeenCalledWith(
        AUTH_STUDENT_COLLEGE_COOKIE,
        NOT_ENROLLED_COLLEGE,
        expect.any(Object)
      )
      expect(signInWithOAuth).toHaveBeenCalledWith('google')
    })

    it('rejects unknown or disabled colleges without starting OAuth', async () => {
      expect(await signInStudentWithGoogle('harvard')).toEqual({
        success: false,
        error: 'Unknown college.'
      })

      vi.stubEnv('SERA_KALVIUM_STUDENT_DOMAINS', '')
      expect(await signInStudentWithGoogle('kalvium')).toEqual({
        success: false,
        error: 'Student sign-in is not set up for Kalvium yet.'
      })
      expect(cookieStore.set).not.toHaveBeenCalled()
      expect(signInWithOAuth).not.toHaveBeenCalled()
    })
  })

  describe('signInWithGoogle', () => {
    it('clears the student college cookie when starting staff sign-in', async () => {
      const result = await signInWithGoogle('kalvium')

      expect(result.success).toBe(true)
      expect(cookieStore.delete).toHaveBeenCalledWith(
        AUTH_STUDENT_COLLEGE_COOKIE
      )
      expect(cookieStore.set).toHaveBeenCalledWith(
        AUTH_COLLEGE_COOKIE,
        'kalvium',
        expect.any(Object)
      )
      expect(signInWithOAuth).toHaveBeenCalledWith('google', {
        loginHintDomain: 'kalvium.com'
      })
    })
  })
})

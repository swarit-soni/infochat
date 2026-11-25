import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getCurrentUser } from '@/lib/auth/get-current-user'
import { setUserProfileCollege } from '@/lib/db/actions'

import { saveEnrolledCollege } from '../onboarding'

vi.mock('@/lib/colleges/store', async () =>
  (await import('@/lib/colleges/testing')).collegeStoreMock()
)
vi.mock('@/lib/auth/get-current-user', () => ({
  getCurrentUser: vi.fn()
}))

vi.mock('@/lib/db/actions', () => ({
  setUserProfileCollege: vi.fn()
}))

describe('saveEnrolledCollege', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(setUserProfileCollege).mockResolvedValue({ id: 'u1' } as never)
  })

  it('requires a signed-in user', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null)
    expect(await saveEnrolledCollege('jecrc')).toMatchObject({
      success: false
    })
    expect(setUserProfileCollege).not.toHaveBeenCalled()
  })

  it('allows unverified accounts to save sera-demo or Not enrolled yet, and blocks real colleges', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: 'u1',
      email: 'someone@gmail.com'
    })

    expect(await saveEnrolledCollege('sera-demo')).toEqual({ success: true })
    expect(setUserProfileCollege).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'u1' }),
      'sera-demo',
      null
    )

    expect(await saveEnrolledCollege('none')).toEqual({ success: true })
    expect(setUserProfileCollege).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'u1' }),
      null,
      null
    )

    vi.mocked(setUserProfileCollege).mockClear()
    expect(await saveEnrolledCollege('bkbirla')).toEqual({
      success: false,
      error:
        'Sign in with your B.K. Birla College Google account (@bkbck.edu.in) to enroll at B.K. Birla College.'
    })
    expect(await saveEnrolledCollege('kalvium', 'jecrc')).toMatchObject({
      success: false
    })
    expect(await saveEnrolledCollege('iitm')).toMatchObject({
      success: false
    })
    expect(setUserProfileCollege).not.toHaveBeenCalled()
  })

  it('rejects unknown answers', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: 'u1',
      email: 'someone@gmail.com'
    })
    expect(await saveEnrolledCollege('harvard')).toMatchObject({
      success: false
    })
    expect(setUserProfileCollege).not.toHaveBeenCalled()
  })

  it('requires and validates partner campus for Kalvium students', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: 'u1',
      email: 'student@kalvium.community',
      college: 'kalvium',
      collegeVerified: true
    } as never)
    expect(await saveEnrolledCollege('kalvium')).toMatchObject({
      success: false,
      error: 'Please choose your campus.'
    })
    expect(await saveEnrolledCollege('kalvium', 'bkbirla')).toMatchObject({
      success: false
    })
    expect(await saveEnrolledCollege('kalvium', 'jecrc')).toEqual({
      success: true
    })
    expect(setUserProfileCollege).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'u1' }),
      'kalvium',
      'jecrc'
    )
  })

  it('keeps a college verified from a college email domain', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: 'u2',
      email: 'student@kalvium.community',
      college: 'kalvium',
      collegeVerified: true
    } as never)
    // The answer can't move the student to another college; only the
    // campus is saved.
    expect(await saveEnrolledCollege('jecrc', 'none')).toEqual({
      success: true
    })
    expect(setUserProfileCollege).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'u2' }),
      'kalvium',
      'none'
    )
  })

  it('lets a verified student temporarily on sera-demo switch back to their verified college, not another college', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: 'u3',
      email: 'student@kalvium.community',
      college: 'sera-demo',
      collegeVerified: false
    } as never)

    expect(await saveEnrolledCollege('iitm')).toMatchObject({
      success: false
    })
    expect(setUserProfileCollege).not.toHaveBeenCalled()

    expect(await saveEnrolledCollege('kalvium', 'jecrc')).toEqual({
      success: true
    })
    expect(setUserProfileCollege).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'u3' }),
      'kalvium',
      'jecrc'
    )
  })
})

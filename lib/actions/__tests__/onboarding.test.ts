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

  it('saves the chosen college, or null for students not enrolled anywhere', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: 'u1',
      email: 'someone@gmail.com'
    })

    expect(await saveEnrolledCollege('bkbirla')).toEqual({ success: true })
    expect(setUserProfileCollege).toHaveBeenLastCalledWith(
      'u1',
      'bkbirla',
      null
    )

    expect(await saveEnrolledCollege('none')).toEqual({ success: true })
    expect(setUserProfileCollege).toHaveBeenLastCalledWith('u1', null, null)
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

  it('asks Kalvium students for their partner campus', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: 'u1',
      email: 'someone@gmail.com'
    })
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
      'u1',
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
      'u2',
      'kalvium',
      'none'
    )
  })
})

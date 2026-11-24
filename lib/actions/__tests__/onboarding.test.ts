import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getCurrentUser } from '@/lib/auth/get-current-user'
import { setUserProfileCollege } from '@/lib/db/actions'

import { saveEnrolledCollege } from '../onboarding'

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
    expect(setUserProfileCollege).toHaveBeenLastCalledWith('u1', 'bkbirla')

    expect(await saveEnrolledCollege('none')).toEqual({ success: true })
    expect(setUserProfileCollege).toHaveBeenLastCalledWith('u1', null)
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

  it('keeps a college verified from a college email domain', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: 'u2',
      email: 'student@kalvium.community'
    })
    expect(await saveEnrolledCollege('jecrc')).toEqual({ success: true })
    expect(setUserProfileCollege).not.toHaveBeenCalled()
  })
})

import { NextRequest } from 'next/server'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getUserProfile, upsertUserProfile } from '@/lib/db/actions'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

import { GET } from '../route'

vi.mock('@/lib/colleges/store', async () =>
  (await import('@/lib/colleges/testing')).collegeStoreMock()
)
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn()
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn()
}))

vi.mock('@/lib/db/actions', () => ({
  upsertUserProfile: vi.fn(),
  getUserProfile: vi.fn()
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
    // By default the account already answered the enrolled-college question.
    vi.mocked(getUserProfile).mockResolvedValue({
      onboardedAt: new Date('2026-11-01T00:00:00Z')
    } as never)
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

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('redirects to unauthorized_domain when Supabase returns a domain/hook error', async () => {
    const request = new NextRequest(
      'http://localhost:3000/auth/oauth?error=access_denied&error_description=Please+sign+in+with+a+Google+account.'
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

  it('signs in any Google account and sends a new one to the enrolled-college question', async () => {
    vi.mocked(getUserProfile).mockResolvedValue({ onboardedAt: null } as never)
    getUser.mockResolvedValue({
      data: {
        user: {
          id: 'user-gmail',
          email: 'user@gmail.com',
          app_metadata: { provider: 'google' },
          user_metadata: { full_name: 'Gmail User' }
        }
      },
      error: null
    })

    const request = new NextRequest(
      'http://localhost:3000/auth/oauth?code=valid-code'
    )
    const response = await GET(request)

    expect(signOut).not.toHaveBeenCalled()
    expect(deleteUser).not.toHaveBeenCalled()
    // No verified college: the profile keeps any self-reported college.
    expect(upsertUserProfile).toHaveBeenCalledWith({
      id: 'user-gmail',
      email: 'user@gmail.com',
      userType: 'student',
      college: null,
      name: 'Gmail User',
      avatarUrl: null
    })
    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe(
      'http://localhost:3000/onboarding/college'
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
          app_metadata: { provider: 'email', providers: ['email'] }
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
      college: 'kalvium',
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
      college: 'kalvium',
      name: 'Bob Student',
      avatarUrl: 'https://img/b.png'
    })
    // Kalvium has a partner campus, so a new student says which one first.
    expect(response.headers.get('location')).toBe(
      'http://localhost:3000/onboarding/college'
    )
  })

  it('skips onboarding once a Kalvium student has chosen a campus', async () => {
    vi.mocked(getUserProfile).mockResolvedValue({
      onboardedAt: new Date(),
      college: 'kalvium',
      campus: 'jecrc'
    } as never)
    getUser.mockResolvedValue({
      data: {
        user: {
          id: 'student-3',
          email: 'dan@kalvium.community',
          app_metadata: { providers: ['google'] }
        }
      },
      error: null
    })

    const response = await GET(
      new NextRequest('http://localhost:3000/auth/oauth?code=good-code')
    )
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

  it('allows non-production SERA_MENTOR_EMAILS login in preview as a Kalvium mentor', async () => {
    vi.stubEnv('VERCEL_ENV', 'preview')
    vi.stubEnv('SERA_MENTOR_EMAILS', 'kalvium:tester@gmail.com')
    getUser.mockResolvedValue({
      data: {
        user: {
          id: 'test-mentor-1',
          email: 'Tester@Gmail.com',
          app_metadata: { provider: 'google', providers: ['google'] },
          user_metadata: { full_name: 'Test Mentor' }
        }
      },
      error: null
    })

    const response = await GET(
      new NextRequest('http://localhost:3000/auth/oauth?code=good-code', {
        headers: {
          cookie: 'auth_next=%2Fmentor'
        }
      })
    )

    expect(signOut).not.toHaveBeenCalled()
    expect(deleteUser).not.toHaveBeenCalled()
    expect(upsertUserProfile).toHaveBeenCalledWith(
      expect.objectContaining({ userType: 'mentor', college: 'kalvium' })
    )
    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe(
      'http://localhost:3000/mentor'
    )
  })

  it('signs in SERA_MENTOR_EMAILS external account in production without mentor access', async () => {
    vi.stubEnv('VERCEL_ENV', 'production')
    vi.stubEnv('SERA_MENTOR_EMAILS', 'kalvium:tester@gmail.com')
    getUser.mockResolvedValue({
      data: {
        user: {
          id: 'test-mentor-1',
          email: 'tester@gmail.com',
          app_metadata: { provider: 'google', providers: ['google'] }
        }
      },
      error: null
    })

    const response = await GET(
      new NextRequest('http://localhost:3000/auth/oauth?code=good-code')
    )

    expect(signOut).not.toHaveBeenCalled()
    expect(deleteUser).not.toHaveBeenCalled()
    expect(upsertUserProfile).toHaveBeenCalledWith(
      expect.objectContaining({ userType: 'student', college: null })
    )
    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('http://localhost:3000/')
  })

  describe("a college's mentor login", () => {
    function mentorLoginRequest(college: string) {
      return new NextRequest(
        'http://localhost:3000/auth/oauth?code=good-code',
        { headers: { cookie: `auth_college=${college}` } }
      )
    }

    it("admits that college's mentors and lands on its dashboard", async () => {
      getUser.mockResolvedValue({
        data: {
          user: {
            id: 'mentor-1',
            email: 'alice@kalvium.com',
            app_metadata: { provider: 'google' }
          }
        },
        error: null
      })

      const response = await GET(mentorLoginRequest('kalvium'))

      expect(signOut).not.toHaveBeenCalled()
      expect(response.headers.get('location')).toBe(
        'http://localhost:3000/kalvium/mentor'
      )
      expect(response.cookies.get('auth_college')?.value).toBe('')
    })

    it('turns away a mentor of another college without deleting the account', async () => {
      vi.stubEnv('SERA_JECRC_MENTOR_EMAILS', 'prof@jecrcu.edu.in')
      getUser.mockResolvedValue({
        data: {
          user: {
            id: 'jecrc-mentor',
            email: 'prof@jecrcu.edu.in',
            app_metadata: { provider: 'google' }
          }
        },
        error: null
      })

      const response = await GET(mentorLoginRequest('kalvium'))

      expect(signOut).toHaveBeenCalled()
      expect(deleteUser).not.toHaveBeenCalled()
      expect(upsertUserProfile).not.toHaveBeenCalled()
      expect(response.headers.get('location')).toBe(
        'http://localhost:3000/kalvium/auth/mentor?error=wrong_college&college=jecrc'
      )
    })

    it('turns away students and other accounts', async () => {
      getUser.mockResolvedValue({
        data: {
          user: {
            id: 'student-1',
            email: 'student@jecrcu.edu.in',
            app_metadata: { provider: 'google' }
          }
        },
        error: null
      })

      const response = await GET(mentorLoginRequest('jecrc'))

      expect(signOut).toHaveBeenCalled()
      expect(deleteUser).not.toHaveBeenCalled()
      expect(response.headers.get('location')).toBe(
        'http://localhost:3000/jecrc/auth/mentor?error=not_mentor'
      )
    })
  })

  describe('student college selection cookie', () => {
    function studentLoginRequest(
      collegeSelection: string,
      extraCookies: string[] = []
    ) {
      const cookies = [
        `auth_student_college=${collegeSelection}`,
        ...extraCookies
      ].join('; ')
      return new NextRequest(
        'http://localhost:3000/auth/oauth?code=good-code',
        {
          headers: { cookie: cookies }
        }
      )
    }

    it('admits a student whose Google account matches the chosen real college', async () => {
      vi.mocked(getUserProfile).mockResolvedValue({
        onboardedAt: null
      } as never)
      getUser.mockResolvedValue({
        data: {
          user: {
            id: 'bkbirla-student',
            email: 'student@bkbck.edu.in',
            app_metadata: { provider: 'google' }
          }
        },
        error: null
      })

      const response = await GET(studentLoginRequest('bkbirla'))

      expect(signOut).not.toHaveBeenCalled()
      expect(upsertUserProfile).toHaveBeenCalledWith({
        id: 'bkbirla-student',
        email: 'student@bkbck.edu.in',
        userType: 'student',
        college: 'bkbirla',
        name: null,
        avatarUrl: null
      })
      expect(response.headers.get('location')).toBe('http://localhost:3000/')
      expect(response.cookies.get('auth_student_college')?.value).toBe('')
    })

    it('sends a matching Kalvium student to partner campus onboarding', async () => {
      vi.mocked(getUserProfile).mockResolvedValue({
        onboardedAt: null
      } as never)
      getUser.mockResolvedValue({
        data: {
          user: {
            id: 'kalvium-student',
            email: 'student@kalvium.community',
            app_metadata: { provider: 'google' }
          }
        },
        error: null
      })

      const response = await GET(studentLoginRequest('kalvium'))

      expect(signOut).not.toHaveBeenCalled()
      expect(upsertUserProfile).toHaveBeenCalledWith(
        expect.objectContaining({ college: 'kalvium', userType: 'student' })
      )
      expect(response.headers.get('location')).toBe(
        'http://localhost:3000/onboarding/college'
      )
    })

    it('rejects a personal Google account when a real college was chosen, without deleting the user', async () => {
      getUser.mockResolvedValue({
        data: {
          user: {
            id: 'personal-1',
            email: 'personal@gmail.com',
            app_metadata: { provider: 'google' }
          }
        },
        error: null
      })

      const response = await GET(
        studentLoginRequest('bkbirla', ['auth_next=%2Fsearch%2Fabc'])
      )

      expect(signOut).toHaveBeenCalledTimes(1)
      expect(deleteUser).not.toHaveBeenCalled()
      expect(upsertUserProfile).not.toHaveBeenCalled()
      expect(response.headers.get('location')).toBe(
        'http://localhost:3000/auth/login?error=wrong_student_domain&college=bkbirla&next=%2Fsearch%2Fabc'
      )
      expect(response.cookies.get('auth_student_college')?.value).toBe('')
    })

    it('rejects an email from a different college and reports the actual college', async () => {
      getUser.mockResolvedValue({
        data: {
          user: {
            id: 'iitb-student',
            email: 'student@iitb.ac.in',
            app_metadata: { provider: 'google' }
          }
        },
        error: null
      })

      const response = await GET(studentLoginRequest('iitm'))

      expect(signOut).toHaveBeenCalledTimes(1)
      expect(deleteUser).not.toHaveBeenCalled()
      expect(upsertUserProfile).not.toHaveBeenCalled()
      expect(response.headers.get('location')).toBe(
        'http://localhost:3000/auth/login?error=wrong_student_domain&college=iitm&actual=iitb'
      )
    })

    it('rejects a real college whose student domain has been disabled', async () => {
      vi.stubEnv('SERA_KALVIUM_STUDENT_DOMAINS', '')
      getUser.mockResolvedValue({
        data: {
          user: {
            id: 'kalvium-student',
            email: 'student@kalvium.community',
            app_metadata: { provider: 'google' }
          }
        },
        error: null
      })

      const response = await GET(studentLoginRequest('kalvium'))

      expect(signOut).toHaveBeenCalledTimes(1)
      expect(upsertUserProfile).not.toHaveBeenCalled()
      expect(response.headers.get('location')).toBe(
        'http://localhost:3000/auth/login?error=college_unavailable&college=kalvium'
      )
    })

    it('saves sera-demo for any non-mentor Google account and skips onboarding', async () => {
      vi.mocked(getUserProfile).mockResolvedValue({
        college: 'sera-demo',
        campus: null,
        onboardedAt: new Date()
      } as never)
      getUser.mockResolvedValue({
        data: {
          user: {
            id: 'demo-user',
            email: 'visitor@gmail.com',
            app_metadata: { provider: 'google' }
          }
        },
        error: null
      })

      const response = await GET(
        studentLoginRequest('sera-demo', ['auth_next=%2Fsearch%2Fdemo'])
      )

      expect(signOut).not.toHaveBeenCalled()
      expect(upsertUserProfile).toHaveBeenCalledWith({
        id: 'demo-user',
        email: 'visitor@gmail.com',
        userType: 'student',
        college: 'sera-demo',
        campus: null,
        name: null,
        avatarUrl: null
      })
      expect(response.headers.get('location')).toBe(
        'http://localhost:3000/search/demo'
      )
    })

    it('saves Not enrolled yet for personal Google accounts without redirecting to onboarding', async () => {
      vi.mocked(getUserProfile).mockResolvedValue({
        college: null,
        campus: null,
        onboardedAt: new Date()
      } as never)
      getUser.mockResolvedValue({
        data: {
          user: {
            id: 'exploring-user',
            email: 'applicant@gmail.com',
            app_metadata: { provider: 'google' }
          }
        },
        error: null
      })

      const response = await GET(studentLoginRequest('none'))

      expect(upsertUserProfile).toHaveBeenCalledWith({
        id: 'exploring-user',
        email: 'applicant@gmail.com',
        userType: 'student',
        college: null,
        campus: null,
        onboarded: true,
        name: null,
        avatarUrl: null
      })
      expect(response.headers.get('location')).toBe('http://localhost:3000/')
    })

    it('still saves a verified college if an authentic college email chooses Not enrolled yet', async () => {
      vi.mocked(getUserProfile).mockResolvedValue({
        college: 'bkbirla',
        campus: null,
        onboardedAt: new Date()
      } as never)
      getUser.mockResolvedValue({
        data: {
          user: {
            id: 'verified-student',
            email: 'student@bkbck.edu.in',
            app_metadata: { provider: 'google' }
          }
        },
        error: null
      })

      const response = await GET(studentLoginRequest('none'))

      expect(upsertUserProfile).toHaveBeenCalledWith({
        id: 'verified-student',
        email: 'student@bkbck.edu.in',
        userType: 'student',
        college: 'bkbirla',
        name: null,
        avatarUrl: null
      })
      expect(response.headers.get('location')).toBe('http://localhost:3000/')
    })
  })
})

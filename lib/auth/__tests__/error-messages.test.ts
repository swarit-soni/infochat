import { describe, expect, it } from 'vitest'

import { UNAUTHORIZED_DOMAIN_ERROR } from '@/lib/auth/domain'

import { getAuthErrorMessage } from '../error-messages'

describe('getAuthErrorMessage', () => {
  it('returns null when no error is present', () => {
    expect(getAuthErrorMessage(undefined)).toBeNull()
  })

  it('formats wrong_student_domain with expected domain(s) for personal accounts', () => {
    expect(
      getAuthErrorMessage('wrong_student_domain', {
        collegeName: 'B.K. Birla College',
        expectedDomains: ['bkbck.edu.in']
      })
    ).toBe(
      'Please sign in with your B.K. Birla College Google account (@bkbck.edu.in) to save B.K. Birla College as your enrolled college, or choose "Not enrolled yet".'
    )

    expect(
      getAuthErrorMessage('wrong_student_domain', {
        collegeName: 'IIT Madras',
        expectedDomains: ['smail.iitm.ac.in', 'iitm.ac.in']
      })
    ).toBe(
      'Please sign in with your IIT Madras Google account (@smail.iitm.ac.in / @iitm.ac.in) to save IIT Madras as your enrolled college, or choose "Not enrolled yet".'
    )
  })

  it('mentions the account college when wrong_student_domain hits another college email', () => {
    expect(
      getAuthErrorMessage('wrong_student_domain', {
        collegeName: 'IIT Madras',
        expectedDomains: ['smail.iitm.ac.in', 'iitm.ac.in'],
        actualCollegeName: 'IIT Bombay'
      })
    ).toBe(
      'That Google account belongs to IIT Bombay, not IIT Madras. Sign in with your IIT Madras Google account (@smail.iitm.ac.in / @iitm.ac.in), or choose IIT Bombay instead.'
    )
  })

  it('handles college_unavailable and existing error codes', () => {
    expect(
      getAuthErrorMessage('college_unavailable', { collegeName: 'Kalvium' })
    ).toBe(
      'Student sign-in for Kalvium is not set up yet. Choose another college or "Not enrolled yet".'
    )
    expect(getAuthErrorMessage('unauthorized_domain')).toBe(
      UNAUTHORIZED_DOMAIN_ERROR
    )
    expect(getAuthErrorMessage('oauth_failed')).toBe(
      'Google sign-in failed. Please try again.'
    )
    expect(getAuthErrorMessage('unknown_code')).toBe(
      'Unable to sign in. Please try again.'
    )
  })
})

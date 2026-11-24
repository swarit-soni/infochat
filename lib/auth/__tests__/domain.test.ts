import { describe, expect, it } from 'vitest'

import {
  extractEmailDomain,
  getCollegeIdentityFromEmail,
  getUserTypeFromEmail,
  isAllowedEmail,
  isGoogleAuthUser,
  isNonProductionStage,
  normalizeEmail,
  USER_TYPES
} from '@/lib/auth/domain'
import {
  getLoginHintDomain,
  getNonProdMentorOverrides
} from '@/lib/colleges/access'

describe('auth domain rules', () => {
  it('defines mentor and student user types', () => {
    expect(USER_TYPES).toEqual(['mentor', 'student'])
  })

  describe('normalizeEmail', () => {
    it('trims and lowercases valid emails', () => {
      expect(normalizeEmail('  Mentor.Name@Kalvium.COM  ')).toBe(
        'mentor.name@kalvium.com'
      )
    })

    it('returns null for empty or structurally invalid emails', () => {
      expect(normalizeEmail(null)).toBeNull()
      expect(normalizeEmail(undefined)).toBeNull()
      expect(normalizeEmail('')).toBeNull()
      expect(normalizeEmail('   ')).toBeNull()
      expect(normalizeEmail('not-an-email')).toBeNull()
      expect(normalizeEmail('@kalvium.com')).toBeNull()
      expect(normalizeEmail('user@')).toBeNull()
      expect(normalizeEmail('a@b@kalvium.com')).toBeNull()
      expect(normalizeEmail('user name@kalvium.com')).toBeNull()
    })
  })

  describe('extractEmailDomain', () => {
    it('extracts lowercased domain for valid emails', () => {
      expect(extractEmailDomain('Student@Kalvium.Community')).toBe(
        'kalvium.community'
      )
      expect(extractEmailDomain('  alice@kalvium.com ')).toBe('kalvium.com')
    })

    it('returns null when email is invalid', () => {
      expect(extractEmailDomain('alice')).toBeNull()
      expect(extractEmailDomain('a@b@kalvium.com')).toBeNull()
      expect(extractEmailDomain('@kalvium.com')).toBeNull()
      expect(extractEmailDomain('alice@')).toBeNull()
    })
  })

  describe('getUserTypeFromEmail & isAllowedEmail', () => {
    it('classifies @kalvium.com as mentor', () => {
      expect(getUserTypeFromEmail('mentor@kalvium.com')).toBe('mentor')
      expect(getUserTypeFromEmail('  MENTOR+tag@KALVIUM.COM ')).toBe('mentor')
      expect(isAllowedEmail('mentor@kalvium.com')).toBe(true)
    })

    it('classifies @kalvium.community as student', () => {
      expect(getUserTypeFromEmail('student@kalvium.community')).toBe('student')
      expect(getUserTypeFromEmail('Student@Kalvium.Community')).toBe('student')
      expect(isAllowedEmail('student@kalvium.community')).toBe(true)
    })

    it('rejects lookalike, subdomain, and external email domains', () => {
      const rejected = [
        'user@evil-kalvium.com',
        'user@sub.kalvium.com',
        'user@kalvium.com.evil.com',
        'user@sub.kalvium.community',
        'user@kalvium.community.evil.com',
        'user@gmail.com',
        'user@kalvium.org',
        'user@kalvium.com.',
        'a@kalvium.com@evil.com',
        'toString@kalvium.com' /* valid */,
        'user@__proto__',
        'user@constructor',
        '',
        null,
        undefined
      ]

      for (const email of rejected) {
        if (email === 'toString@kalvium.com') {
          expect(getUserTypeFromEmail(email)).toBe('mentor')
          continue
        }
        expect(getUserTypeFromEmail(email)).toBeNull()
        expect(isAllowedEmail(email)).toBe(false)
      }
    })
  })

  describe('isGoogleAuthUser', () => {
    it('returns true when app_metadata.provider is google', () => {
      expect(isGoogleAuthUser({ app_metadata: { provider: 'google' } })).toBe(
        true
      )
    })

    it('returns true when app_metadata.providers includes google', () => {
      expect(
        isGoogleAuthUser({
          app_metadata: { provider: 'email', providers: ['email', 'google'] }
        })
      ).toBe(true)
    })

    it('ignores user_metadata and rejects non-google providers', () => {
      expect(
        isGoogleAuthUser({
          app_metadata: { provider: 'email', providers: ['email'] },
          user_metadata: { provider: 'google' }
        } as never)
      ).toBe(false)

      expect(
        isGoogleAuthUser({
          app_metadata: { providers: 'google' }
        })
      ).toBe(false)

      expect(isGoogleAuthUser(null)).toBe(false)
      expect(isGoogleAuthUser({})).toBe(false)
    })
  })

  describe('non-production SERA_MENTOR_EMAILS override', () => {
    it('classifies allowlisted test emails as mentor in preview/development stages', () => {
      const previewEnv = {
        VERCEL_ENV: 'preview',
        NODE_ENV: 'production',
        SERA_MENTOR_EMAILS: ' Tester@Gmail.com , second@example.com '
      }

      expect(isNonProductionStage(previewEnv)).toBe(true)
      expect(Array.from(getNonProdMentorOverrides(previewEnv))).toEqual([
        ['tester@gmail.com', 'kalvium'],
        ['second@example.com', 'kalvium']
      ])
      expect(getUserTypeFromEmail('tester@gmail.com', previewEnv)).toBe(
        'mentor'
      )
      expect(
        getCollegeIdentityFromEmail('tester@gmail.com', previewEnv)
      ).toEqual({ college: 'kalvium', userType: 'mentor' })
      expect(isAllowedEmail('tester@gmail.com', previewEnv)).toBe(true)
      // Test mentors may use any domain, so Google must not filter the picker.
      expect(
        getLoginHintDomain('kalvium', 'mentor', previewEnv)
      ).toBeUndefined()
      expect(getUserTypeFromEmail('other@gmail.com', previewEnv)).toBeNull()
    })

    it('strictly ignores SERA_MENTOR_EMAILS in production stages', () => {
      const vercelProdEnv = {
        VERCEL_ENV: 'production',
        NODE_ENV: 'production',
        SERA_MENTOR_EMAILS: 'tester@gmail.com'
      }
      const selfHostedProdEnv = {
        NODE_ENV: 'production',
        SERA_MENTOR_EMAILS: 'tester@gmail.com'
      }

      for (const prodEnv of [vercelProdEnv, selfHostedProdEnv]) {
        expect(isNonProductionStage(prodEnv)).toBe(false)
        expect(getNonProdMentorOverrides(prodEnv).size).toBe(0)
        expect(getLoginHintDomain('kalvium', 'mentor', prodEnv)).toBe(
          'kalvium.com'
        )
        expect(getUserTypeFromEmail('tester@gmail.com', prodEnv)).toBeNull()
        expect(isAllowedEmail('tester@gmail.com', prodEnv)).toBe(false)
        expect(getUserTypeFromEmail('mentor@kalvium.com', prodEnv)).toBe(
          'mentor'
        )
      }
    })
  })
})

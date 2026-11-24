import { describe, expect, it } from 'vitest'

import {
  getCollegeLoginConfig,
  getDefaultCollege,
  getLoginHintDomain,
  isCollegeLoginEnabled,
  isCollegeRoleEnabled,
  resolveCollegeIdentity
} from '../access'
import {
  collegePath,
  getCollegeFromPathname,
  getOfficialWebDomains,
  getVisibleColleges,
  isCollegeSlug
} from '../registry'

const PROD = { NODE_ENV: 'production' }

describe('college registry', () => {
  it('recognises college slugs only', () => {
    expect(isCollegeSlug('kalvium')).toBe(true)
    expect(isCollegeSlug('jecrc')).toBe(true)
    expect(isCollegeSlug('bkbirla')).toBe(true)
    expect(isCollegeSlug('search')).toBe(false)
    expect(isCollegeSlug('__proto__')).toBe(false)
    expect(isCollegeSlug(undefined)).toBe(false)
  })

  it('builds and parses college paths', () => {
    expect(collegePath('jecrc')).toBe('/jecrc')
    expect(collegePath('jecrc', '/')).toBe('/jecrc')
    expect(collegePath('kalvium', '/search/abc')).toBe('/kalvium/search/abc')
    expect(collegePath('kalvium', 'auth/mentor')).toBe('/kalvium/auth/mentor')
    expect(getCollegeFromPathname('/kalvium/auth/mentor')).toBe('kalvium')
    expect(getCollegeFromPathname('/jecrc')).toBe('jecrc')
    expect(getCollegeFromPathname('/search/abc')).toBeNull()
    expect(getCollegeFromPathname('/')).toBeNull()
    expect(getCollegeFromPathname(null)).toBeNull()
  })

  it('lets Kalvium read its partner JECRC, but not the other way round', () => {
    expect(getVisibleColleges('kalvium')).toEqual(['kalvium', 'jecrc'])
    expect(getVisibleColleges('jecrc')).toEqual(['jecrc'])
    expect(getVisibleColleges('bkbirla')).toEqual(['bkbirla'])
    expect(getOfficialWebDomains('kalvium')).toEqual([
      'kalvium.com',
      'jecrcuniversity.edu.in'
    ])
    expect(getOfficialWebDomains('bkbirla')).toEqual(['bkbck.edu.in'])
  })
})

describe('resolveCollegeIdentity', () => {
  it('keeps Kalvium mentor and student domains', () => {
    expect(resolveCollegeIdentity('a@kalvium.com', PROD)).toEqual({
      college: 'kalvium',
      userType: 'mentor'
    })
    expect(resolveCollegeIdentity('B@Kalvium.Community', PROD)).toEqual({
      college: 'kalvium',
      userType: 'student'
    })
  })

  it('treats @jecrcu.edu.in as JECRC students unless on the mentor allowlist', () => {
    const env = {
      ...PROD,
      SERA_JECRC_MENTOR_EMAILS: 'Faculty@JECRCU.edu.in, outsider@gmail.com'
    }
    expect(resolveCollegeIdentity('student@jecrcu.edu.in', env)).toEqual({
      college: 'jecrc',
      userType: 'student'
    })
    expect(resolveCollegeIdentity('faculty@jecrcu.edu.in', env)).toEqual({
      college: 'jecrc',
      userType: 'mentor'
    })
    // The allowlist cannot admit accounts outside JECRC's domain.
    expect(resolveCollegeIdentity('outsider@gmail.com', env)).toBeNull()
  })

  it('rejects B.K. Birla accounts until its domains are configured', () => {
    expect(resolveCollegeIdentity('student@bkbck.edu.in', PROD)).toBeNull()
    expect(isCollegeLoginEnabled('bkbirla', PROD)).toBe(false)

    const env = {
      ...PROD,
      SERA_BKBIRLA_STUDENT_DOMAINS: '@bkbck.edu.in',
      SERA_BKBIRLA_MENTOR_DOMAINS: 'staff.bkbck.edu.in'
    }
    expect(isCollegeLoginEnabled('bkbirla', env)).toBe(true)
    expect(resolveCollegeIdentity('s@bkbck.edu.in', env)).toEqual({
      college: 'bkbirla',
      userType: 'student'
    })
    expect(resolveCollegeIdentity('t@staff.bkbck.edu.in', env)).toEqual({
      college: 'bkbirla',
      userType: 'mentor'
    })
  })

  it('lets a deployment disable a role with an empty domain list', () => {
    const env = { ...PROD, SERA_KALVIUM_STUDENT_DOMAINS: '' }
    expect(isCollegeRoleEnabled('kalvium', 'student', env)).toBe(false)
    expect(isCollegeRoleEnabled('kalvium', 'mentor', env)).toBe(true)
    expect(resolveCollegeIdentity('s@kalvium.community', env)).toBeNull()
    expect(getCollegeLoginConfig('kalvium', env).studentDomains).toEqual([])
  })

  it('maps college-prefixed non-production test mentors', () => {
    const env = {
      VERCEL_ENV: 'preview',
      SERA_MENTOR_EMAILS: 'jecrc:tester@gmail.com, bare@gmail.com'
    }
    expect(resolveCollegeIdentity('tester@gmail.com', env)).toEqual({
      college: 'jecrc',
      userType: 'mentor'
    })
    expect(resolveCollegeIdentity('bare@gmail.com', env)).toEqual({
      college: 'kalvium',
      userType: 'mentor'
    })
  })

  it('pre-filters Google to a single login domain', () => {
    expect(getLoginHintDomain('kalvium', 'student', PROD)).toBe(
      'kalvium.community'
    )
    expect(getLoginHintDomain('jecrc', 'mentor', PROD)).toBe('jecrcu.edu.in')
    expect(getLoginHintDomain('bkbirla', 'student', PROD)).toBeUndefined()
  })

  it('falls back to Kalvium as the default college', () => {
    expect(getDefaultCollege({})).toBe('kalvium')
    expect(getDefaultCollege({ SERA_DEFAULT_COLLEGE: 'JECRC' })).toBe('jecrc')
    expect(getDefaultCollege({ SERA_DEFAULT_COLLEGE: 'nope' })).toBe('kalvium')
  })
})

import { describe, expect, it } from 'vitest'

import {
  applyCollegeEnvOverrides,
  getLoginHintDomain,
  isCollegeRoleEnabled,
  isOpenStudentCollege,
  isStudentEnrollmentEnabled,
  resolveCollegeIdentity
} from '../access'
import { DEFAULT_COLLEGE_DIRECTORY, DEFAULT_COLLEGES } from '../defaults'
import {
  type College,
  collegePath,
  createCollegeDirectory,
  formatAuthority,
  getCollege,
  getCollegeSegment,
  getOfficialWebDomains,
  getPartnerCampuses,
  getVisibleCollegesFor,
  isCollegeSlug,
  isValidCollegeSlugFormat
} from '../registry'

const PROD = { NODE_ENV: 'production' }
const DIR = DEFAULT_COLLEGE_DIRECTORY

function college(slug: string): College {
  const found = getCollege(DIR, slug)
  if (!found) throw new Error(`missing ${slug}`)
  return found
}

/** A directory with env overrides applied, as the server builds it. */
function directoryWith(env: Record<string, string>) {
  return createCollegeDirectory(
    DEFAULT_COLLEGES.map(c => applyCollegeEnvOverrides(c, env))
  )
}

describe('college directory', () => {
  it('includes the launch colleges, the demo college, and the ten NIRF institutions', () => {
    const slugs = DIR.list.map(c => c.slug)
    expect(slugs.slice(0, 4)).toEqual([
      'kalvium',
      'jecrc',
      'bkbirla',
      'sera-demo'
    ])
    expect(slugs).toEqual(
      expect.arrayContaining([
        'sera-demo',
        'iitm',
        'iisc',
        'iitb',
        'iitd',
        'iitk',
        'iitkgp',
        'iitr',
        'aiims',
        'jnu',
        'bhu'
      ])
    )
    expect(slugs).toHaveLength(14)
    for (const c of DIR.list) {
      expect(isValidCollegeSlugFormat(c.slug)).toBe(true)
    }
  })

  it('recognises directory slugs only', () => {
    expect(isCollegeSlug(DIR, 'kalvium')).toBe(true)
    expect(isCollegeSlug(DIR, 'iitb')).toBe(true)
    expect(isCollegeSlug(DIR, 'search')).toBe(false)
    expect(isCollegeSlug(DIR, '__proto__')).toBe(false)
    expect(isCollegeSlug(DIR, undefined)).toBe(false)
    expect(isValidCollegeSlugFormat('search')).toBe(false)
    expect(isValidCollegeSlugFormat('Bad Slug')).toBe(false)
  })

  it('hides disabled colleges', () => {
    const directory = createCollegeDirectory([
      { ...college('iitb'), enabled: false },
      college('jnu')
    ])
    expect(directory.list.map(c => c.slug)).toEqual(['jnu'])
    expect(getCollege(directory, 'iitb')).toBeNull()
  })

  it('builds and parses college paths', () => {
    expect(collegePath('jecrc')).toBe('/jecrc')
    expect(collegePath('kalvium', 'auth/mentor')).toBe('/kalvium/auth/mentor')
    expect(getCollegeSegment('/iitb/auth/mentor')).toBe('iitb')
    expect(getCollegeSegment('/search/abc')).toBeNull()
    expect(getCollegeSegment('/')).toBeNull()
    expect(getCollegeSegment(null)).toBeNull()
  })

  it('scopes visibility by college and partner campus', () => {
    expect(getVisibleCollegesFor(DIR, 'kalvium')).toEqual(['kalvium', 'jecrc'])
    expect(getVisibleCollegesFor(DIR, 'kalvium', 'jecrc')).toEqual([
      'kalvium',
      'jecrc'
    ])
    expect(getVisibleCollegesFor(DIR, 'kalvium', 'none')).toEqual(['kalvium'])
    expect(getVisibleCollegesFor(DIR, 'jecrc')).toEqual(['jecrc'])
    expect(getVisibleCollegesFor(DIR, 'sera-demo')).toEqual(['sera-demo'])
    expect(getVisibleCollegesFor(DIR, 'iitd')).toEqual(['iitd'])
    expect(getVisibleCollegesFor(DIR, null)).toHaveLength(14)
    expect(getPartnerCampuses(DIR, 'kalvium').map(c => c.slug)).toEqual([
      'jecrc'
    ])
    expect(getOfficialWebDomains(DIR, 'kalvium')).toEqual([
      'kalvium.com',
      'jecrcuniversity.edu.in'
    ])
    expect(getOfficialWebDomains(DIR, 'sera-demo')).toEqual([
      'sera-demo.example'
    ])
    expect(getOfficialWebDomains(DIR, 'aiims')).toEqual([
      'aiims.edu',
      'aiimsexams.ac.in'
    ])
  })

  it('labels authorities by short name', () => {
    expect(formatAuthority(DIR, 'iitkgp')).toBe('IIT Kharagpur')
    expect(formatAuthority(DIR, 'joint')).toBe('Joint notice')
    expect(formatAuthority(DIR, 'unknown')).toBe('unknown')
  })
})

describe('resolveCollegeIdentity', () => {
  it('keeps Kalvium mentor and student domains', () => {
    expect(resolveCollegeIdentity('a@kalvium.com', DIR, PROD)).toEqual({
      college: 'kalvium',
      userType: 'mentor'
    })
    expect(resolveCollegeIdentity('B@Kalvium.Community', DIR, PROD)).toEqual({
      college: 'kalvium',
      userType: 'student'
    })
  })

  it('treats shared-domain accounts as students unless allowlisted', () => {
    const directory = {
      ...DIR,
      mentorEmails: {
        iitb: ['prof@iitb.ac.in'],
        jecrc: ['faculty@jecrcu.edu.in']
      }
    }
    expect(resolveCollegeIdentity('s@iitb.ac.in', directory, PROD)).toEqual({
      college: 'iitb',
      userType: 'student'
    })
    expect(resolveCollegeIdentity('Prof@IITB.ac.in', directory, PROD)).toEqual({
      college: 'iitb',
      userType: 'mentor'
    })
    expect(
      resolveCollegeIdentity('faculty@jecrcu.edu.in', directory, PROD)
    ).toEqual({ college: 'jecrc', userType: 'mentor' })
    // An allowlist entry on another college's domain grants nothing there.
    expect(
      resolveCollegeIdentity(
        'prof@iitb.ac.in',
        { ...DIR, mentorEmails: { jnu: ['prof@iitb.ac.in'] } },
        PROD
      )
    ).toEqual({ college: 'iitb', userType: 'student' })
    expect(resolveCollegeIdentity('x@gmail.com', directory, PROD)).toBeNull()
  })

  it('maps IIT Madras smail addresses to IIT Madras students', () => {
    expect(
      resolveCollegeIdentity('cs21b001@smail.iitm.ac.in', DIR, PROD)
    ).toEqual({
      college: 'iitm',
      userType: 'student'
    })
  })

  it('accepts @bkbck.edu.in students while keeping B.K. Birla staff login closed until configured', () => {
    expect(resolveCollegeIdentity('student@bkbck.edu.in', DIR, PROD)).toEqual({
      college: 'bkbirla',
      userType: 'student'
    })
    expect(isCollegeRoleEnabled(college('bkbirla'), 'student')).toBe(true)
    expect(isCollegeRoleEnabled(college('bkbirla'), 'mentor')).toBe(false)

    const env = {
      ...PROD,
      SERA_BKBIRLA_STUDENT_DOMAINS: '',
      SERA_BKBIRLA_MENTOR_DOMAINS: 'staff.bkbck.edu.in'
    }
    const directory = directoryWith(env)
    expect(resolveCollegeIdentity('s@bkbck.edu.in', directory, env)).toBeNull()
    expect(
      resolveCollegeIdentity('t@staff.bkbck.edu.in', directory, env)
    ).toEqual({ college: 'bkbirla', userType: 'mentor' })
  })

  it('lets a deployment disable a role with an empty domain list', () => {
    const env = { ...PROD, SERA_KALVIUM_STUDENT_DOMAINS: '' }
    const kalvium = applyCollegeEnvOverrides(college('kalvium'), env)
    expect(isCollegeRoleEnabled(kalvium, 'student')).toBe(false)
    expect(isCollegeRoleEnabled(kalvium, 'mentor')).toBe(true)
    expect(
      resolveCollegeIdentity('s@kalvium.community', directoryWith(env), env)
    ).toBeNull()
  })

  it('maps college-prefixed non-production test mentors only', () => {
    const env = {
      VERCEL_ENV: 'preview',
      SERA_MENTOR_EMAILS: 'jecrc:tester@gmail.com, bare@gmail.com, nope:x@y.z'
    }
    expect(resolveCollegeIdentity('tester@gmail.com', DIR, env)).toEqual({
      college: 'jecrc',
      userType: 'mentor'
    })
    expect(resolveCollegeIdentity('bare@gmail.com', DIR, env)).toBeNull()
    expect(resolveCollegeIdentity('x@y.z', DIR, env)).toBeNull()
  })

  it('pre-filters Google to a single login domain', () => {
    expect(getLoginHintDomain(college('kalvium'), 'student', PROD)).toBe(
      'kalvium.community'
    )
    expect(getLoginHintDomain(college('bkbirla'), 'student', PROD)).toBe(
      'bkbck.edu.in'
    )
    expect(getLoginHintDomain(college('iitb'), 'mentor', PROD)).toBe(
      'iitb.ac.in'
    )
    expect(getLoginHintDomain(college('jnu'), 'mentor', PROD)).toBeUndefined()
    expect(
      getLoginHintDomain(college('bkbirla'), 'mentor', PROD)
    ).toBeUndefined()
  })

  it('marks only sera-demo as an open student college', () => {
    expect(isOpenStudentCollege('sera-demo')).toBe(true)
    expect(isOpenStudentCollege(college('sera-demo'))).toBe(true)
    expect(isOpenStudentCollege(college('bkbirla'))).toBe(false)
    expect(isOpenStudentCollege(null)).toBe(false)

    expect(isStudentEnrollmentEnabled(college('sera-demo'))).toBe(true)
    expect(isStudentEnrollmentEnabled(college('bkbirla'))).toBe(true)
    const disabledKalvium = applyCollegeEnvOverrides(college('kalvium'), {
      ...PROD,
      SERA_KALVIUM_STUDENT_DOMAINS: ''
    })
    expect(isStudentEnrollmentEnabled(disabledKalvium)).toBe(false)
  })

  it('keeps demo college login closed until mentor domains and allowlist are set', () => {
    expect(isCollegeRoleEnabled(college('sera-demo'), 'mentor')).toBe(false)
    expect(isCollegeRoleEnabled(college('sera-demo'), 'student')).toBe(false)
    expect(
      resolveCollegeIdentity('student@sera-demo.example', DIR, PROD)
    ).toBeNull()

    const env = {
      ...PROD,
      SERA_SERA_DEMO_MENTOR_DOMAINS: 'gmail.com'
    }
    const directory = {
      ...directoryWith(env),
      mentorEmails: { 'sera-demo': ['presenter@gmail.com'] }
    }
    expect(
      resolveCollegeIdentity('Presenter@gmail.com', directory, env)
    ).toEqual({
      college: 'sera-demo',
      userType: 'mentor'
    })
    expect(
      resolveCollegeIdentity('visitor@gmail.com', directory, env)
    ).toBeNull()
  })
})

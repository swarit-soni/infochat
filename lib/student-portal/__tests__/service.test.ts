import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  withOptionalRLS: vi.fn()
}))

vi.mock('@/lib/db/with-rls', () => ({
  withOptionalRLS: mocks.withOptionalRLS
}))

import {
  formatStudentPortalSearchResults,
  hasStudentPortalIntegration,
  retrieveStudentPortalData
} from '../service'

describe('hasStudentPortalIntegration', () => {
  it('enables integration only for sera-demo', () => {
    expect(hasStudentPortalIntegration('sera-demo')).toBe(true)
    expect(hasStudentPortalIntegration('kalvium')).toBe(false)
    expect(hasStudentPortalIntegration('jecrc')).toBe(false)
    expect(hasStudentPortalIntegration('iitb')).toBe(false)
    expect(hasStudentPortalIntegration(null)).toBe(false)
    expect(hasStudentPortalIntegration(undefined)).toBe(false)
  })
})

describe('retrieveStudentPortalData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  it('returns unintegrated immediately for non-demo colleges without touching DB', async () => {
    const result = await retrieveStudentPortalData({
      college: 'kalvium',
      view: 'overview'
    })
    expect(result).toEqual({
      integrated: false,
      college: 'kalvium',
      studentProfile: null
    })
    expect(mocks.withOptionalRLS).not.toHaveBeenCalled()
  })

  it('falls back to demo attendance, assignments, and timetable when DB is unavailable', async () => {
    mocks.withOptionalRLS.mockRejectedValue(
      new Error('relation "student_attendance" does not exist')
    )
    const now = new Date('2026-11-25T16:30:00+05:30')

    const snapshot = await retrieveStudentPortalData({
      college: 'sera-demo',
      view: 'overview',
      day: 'tomorrow',
      timeframe: 'this_week',
      now
    })

    expect(snapshot.integrated).toBe(true)
    expect(snapshot.studentProfile?.college).toBe('sera-demo')

    expect(snapshot.attendance?.overallAttended).toBe(116)
    expect(snapshot.attendance?.overallTotal).toBe(141)
    expect(snapshot.attendance?.overallPercentage).toBe(82.3)
    expect(snapshot.attendance?.subjects).toHaveLength(5)
    expect(snapshot.attendance?.subjectsBelowMinimum).toEqual([
      'Computer Organisation (71.4%)'
    ])
    const compOrg = snapshot.attendance?.subjects.find(
      s => s.courseCode === 'CS205'
    )
    expect(compOrg?.belowMinimum).toBe(true)
    expect(compOrg?.classesNeededForMinimum).toBe(4)

    expect(snapshot.assignments?.items).toHaveLength(4)
    expect(snapshot.assignments?.earliestPending?.courseCode).toBe('CS201L')
    expect(
      snapshot.assignments?.dueBeforeFridayPending.map(i => i.courseCode)
    ).toEqual(['CS201L', 'CS205'])

    expect(snapshot.timetable?.mode).toBe('day')
    expect(snapshot.timetable?.requestedLabel).toBe('Tomorrow (Thursday)')
    expect(snapshot.timetable?.classes).toHaveLength(4)
    expect(snapshot.timetable?.classes[0].courseCode).toBe('CS205')

    const formatted = formatStudentPortalSearchResults(snapshot)
    expect(formatted.map(r => r.url)).toEqual([
      'https://sera-demo.example/portal#attendance',
      'https://sera-demo.example/portal#assignments',
      'https://sera-demo.example/portal#timetable'
    ])
  })

  it('returns all assignments when timeframe is all and provides Monday preview on Sunday', async () => {
    mocks.withOptionalRLS.mockRejectedValue(new Error('no db'))
    const now = new Date('2026-11-25T16:30:00+05:30')

    const assignmentsSnap = await retrieveStudentPortalData({
      college: 'sera-demo',
      view: 'assignments',
      timeframe: 'all',
      now
    })
    expect(assignmentsSnap.assignments?.items).toHaveLength(5)
    expect(assignmentsSnap.attendance).toBeUndefined()
    expect(assignmentsSnap.timetable).toBeUndefined()

    const sundaySnap = await retrieveStudentPortalData({
      college: 'sera-demo',
      view: 'timetable',
      day: 'sunday',
      now
    })
    expect(sundaySnap.timetable?.classes).toEqual([])
    expect(sundaySnap.timetable?.nextClassDay?.dayName).toBe('Monday')
    expect(sundaySnap.timetable?.nextClassDay?.classes).toHaveLength(4)
  })

  it('prefers user-specific DB rows over shared NULL rows when present', async () => {
    const dbRows = [
      {
        id: 'att-shared',
        college: 'sera-demo',
        userId: null,
        courseCode: 'CS201',
        courseName: 'Data Structures',
        faculty: 'Prof. Ananya Rao',
        attendedClasses: 10,
        totalClasses: 20,
        minimumRequiredPct: 75,
        sortOrder: 1
      },
      {
        id: 'att-user',
        college: 'sera-demo',
        userId: 'user-123',
        courseCode: 'CS201',
        courseName: 'Data Structures',
        faculty: 'Prof. Ananya Rao',
        attendedClasses: 19,
        totalClasses: 20,
        minimumRequiredPct: 75,
        sortOrder: 1
      }
    ]
    mocks.withOptionalRLS.mockImplementation(async (_uid, cb) => {
      const tx = {
        select: () => ({
          from: () => ({
            where: () => ({
              orderBy: async () => dbRows
            })
          })
        })
      }
      return cb(tx)
    })

    const snap = await retrieveStudentPortalData({
      college: 'sera-demo',
      userId: 'user-123',
      view: 'attendance'
    })
    expect(snap.attendance?.subjects).toHaveLength(1)
    expect(snap.attendance?.overallPercentage).toBe(95)
    expect(snap.attendance?.subjectsBelowMinimum).toEqual([])
  })
})

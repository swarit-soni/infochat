import { describe, expect, it } from 'vitest'

import {
  formatIstDateTime,
  formatRelativeDayLabel,
  getDaysUntilUpcomingFriday,
  isDueBeforeUpcomingFriday,
  isInCurrentDemoWeek,
  resolveRelativeDueAt,
  resolveTimetableDay
} from '../schedule-dates'

describe('student portal schedule dates', () => {
  it('computes days until upcoming Friday strictly after today', () => {
    expect(getDaysUntilUpcomingFriday(0)).toBe(5) // Sunday -> Friday
    expect(getDaysUntilUpcomingFriday(1)).toBe(4) // Monday -> Friday
    expect(getDaysUntilUpcomingFriday(2)).toBe(3) // Tuesday -> Friday
    expect(getDaysUntilUpcomingFriday(3)).toBe(2) // Wednesday -> Friday
    expect(getDaysUntilUpcomingFriday(4)).toBe(1) // Thursday -> Friday
    expect(getDaysUntilUpcomingFriday(5)).toBe(7) // Friday -> next Friday
    expect(getDaysUntilUpcomingFriday(6)).toBe(6) // Saturday -> next Friday
  })

  it.each([
    ['Sunday', '2026-11-22T09:00:00+05:30'],
    ['Monday', '2026-11-23T09:00:00+05:30'],
    ['Tuesday', '2026-11-24T09:00:00+05:30'],
    ['Wednesday', '2026-11-25T16:30:00+05:30'],
    ['Thursday', '2026-11-26T09:00:00+05:30'],
    ['Friday', '2026-11-27T09:00:00+05:30'],
    ['Saturday', '2026-11-28T09:00:00+05:30']
  ])('keeps relative due slots ordered and scoped on %s', (_day, isoNow) => {
    const now = new Date(isoNow)
    const yesterday = resolveRelativeDueAt('yesterday_night', now)
    const early = resolveRelativeDueAt('before_friday_early', now)
    const late = resolveRelativeDueAt('before_friday_late', now)
    const friday = resolveRelativeDueAt('friday_evening', now)
    const nextWeek = resolveRelativeDueAt('next_week', now)

    expect(yesterday.getTime()).toBeLessThan(early.getTime())
    expect(early.getTime()).toBeLessThan(late.getTime())
    expect(late.getTime()).toBeLessThan(friday.getTime())
    expect(friday.getTime()).toBeLessThan(nextWeek.getTime())

    expect(isDueBeforeUpcomingFriday(yesterday, now)).toBe(true)
    expect(isDueBeforeUpcomingFriday(early, now)).toBe(true)
    expect(isDueBeforeUpcomingFriday(late, now)).toBe(true)
    expect(isDueBeforeUpcomingFriday(friday, now)).toBe(false)
    expect(isDueBeforeUpcomingFriday(nextWeek, now)).toBe(false)

    expect(isInCurrentDemoWeek(yesterday, now)).toBe(true)
    expect(isInCurrentDemoWeek(early, now)).toBe(true)
    expect(isInCurrentDemoWeek(late, now)).toBe(true)
    expect(isInCurrentDemoWeek(friday, now)).toBe(true)
    expect(isInCurrentDemoWeek(nextWeek, now)).toBe(false)
  })

  it('formats IST dates and relative day labels accurately', () => {
    const wed = new Date('2026-11-25T16:30:00+05:30')
    const early = resolveRelativeDueAt('before_friday_early', wed)
    const yesterday = resolveRelativeDueAt('yesterday_night', wed)

    expect(formatIstDateTime(early)).toContain('Thursday, 26 November 2026')
    expect(formatIstDateTime(early)).toContain('5:00 PM IST')
    expect(formatRelativeDayLabel(early, wed)).toBe('Tomorrow')
    expect(formatRelativeDayLabel(yesterday, wed)).toBe('Yesterday')
  })

  it('resolves timetable days including tomorrow, Sunday, and full week', () => {
    const wed = new Date('2026-11-25T16:30:00+05:30')
    expect(resolveTimetableDay('tomorrow', wed)).toMatchObject({
      mode: 'day',
      dayOfWeek: 4,
      dayName: 'Thursday',
      label: 'Tomorrow (Thursday)'
    })
    expect(resolveTimetableDay('today', wed)).toMatchObject({
      mode: 'day',
      dayOfWeek: 3,
      dayName: 'Wednesday',
      label: 'Today (Wednesday)'
    })
    expect(resolveTimetableDay('week', wed)).toEqual({ mode: 'week' })

    const sat = new Date('2026-11-28T16:30:00+05:30')
    expect(resolveTimetableDay('tomorrow', sat)).toMatchObject({
      mode: 'day',
      dayOfWeek: 0,
      dayName: 'Sunday',
      label: 'Tomorrow (Sunday)'
    })
  })
})

import type { RelativeDueSlot } from '@/lib/db/schema'

export const IST_TIMEZONE = 'Asia/Kolkata'

const WEEKDAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday'
] as const

const SHORT_WEEKDAY_TO_INDEX: Readonly<Record<string, number>> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6
}

export const TIMETABLE_DAY_PARAMS = [
  'today',
  'tomorrow',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
  'week'
] as const

export type TimetableDayParam = (typeof TIMETABLE_DAY_PARAMS)[number]

const NAMED_WEEKDAYS: Readonly<Record<string, number>> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6
}

export interface IstDateParts {
  year: number
  month: number
  day: number
  weekday: number
}

/** Return the calendar date and weekday (0 = Sunday .. 6 = Saturday) in IST. */
export function getIstDateParts(date: Date = new Date()): IstDateParts {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: IST_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short'
  })
  const parts = formatter.formatToParts(date)
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find(part => part.type === type)?.value ?? ''

  const year = Number(get('year'))
  const month = Number(get('month'))
  const day = Number(get('day'))
  const weekday = SHORT_WEEKDAY_TO_INDEX[get('weekday')] ?? 0

  return { year, month, day, weekday }
}

/** Construct a UTC Date corresponding to the given IST wall-clock time. */
export function makeIstDate(
  year: number,
  month: number,
  day: number,
  addDays: number,
  hour: number,
  minute: number
): Date {
  return new Date(
    Date.UTC(year, month - 1, day + addDays, hour - 5, minute - 30, 0, 0)
  )
}

/**
 * Days from `weekday` (0..6) until the next Friday strictly after today
 * (so on Friday itself, returns 7).
 */
export function getDaysUntilUpcomingFriday(weekday: number): number {
  const raw = (5 - weekday + 7) % 7
  return raw === 0 ? 7 : raw
}

/**
 * Resolve a relative assignment slot to a concrete IST deadline so live demos
 * always have recent submitted work, urgent pre-Friday tasks, and next-week tasks.
 */
export function resolveRelativeDueAt(
  slot: RelativeDueSlot,
  now: Date = new Date()
): Date {
  const { year, month, day, weekday } = getIstDateParts(now)
  const daysUntilFriday = getDaysUntilUpcomingFriday(weekday)

  switch (slot) {
    case 'yesterday_night':
      return makeIstDate(year, month, day, -1, 23, 59)
    case 'before_friday_early':
      if (daysUntilFriday >= 3) {
        return makeIstDate(year, month, day, daysUntilFriday - 2, 18, 0)
      }
      if (daysUntilFriday === 2) {
        return makeIstDate(year, month, day, 1, 17, 0)
      }
      return makeIstDate(year, month, day, 0, 20, 0)
    case 'before_friday_late':
      return makeIstDate(year, month, day, daysUntilFriday - 1, 23, 59)
    case 'friday_evening':
      return makeIstDate(year, month, day, daysUntilFriday, 18, 0)
    case 'next_week':
      return makeIstDate(year, month, day, daysUntilFriday + 4, 23, 59)
  }
}

export function formatIstDate(date: Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: IST_TIMEZONE
  }).format(date)
}

export function formatIstDateTime(date: Date): string {
  const datePart = formatIstDate(date)
  const timePart = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: IST_TIMEZONE
  }).format(date)
  return `${datePart} at ${timePart} IST`
}

function getIstDayIndex(date: Date): number {
  const { year, month, day } = getIstDateParts(date)
  return Math.floor(Date.UTC(year, month - 1, day) / 86_400_000)
}

export function formatRelativeDayLabel(
  dueAt: Date,
  now: Date = new Date()
): string {
  const diffDays = getIstDayIndex(dueAt) - getIstDayIndex(now)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Tomorrow'
  if (diffDays === -1) return 'Yesterday'
  if (diffDays < -1) return `${Math.abs(diffDays)} days ago`
  return `In ${diffDays} days`
}

/** Whether `dueAt` falls strictly before 00:00 IST of the upcoming Friday. */
export function isDueBeforeUpcomingFriday(
  dueAt: Date,
  now: Date = new Date()
): boolean {
  const { year, month, day, weekday } = getIstDateParts(now)
  const daysUntilFriday = getDaysUntilUpcomingFriday(weekday)
  const upcomingFridayStart = makeIstDate(
    year,
    month,
    day,
    daysUntilFriday,
    0,
    0
  )
  return dueAt.getTime() < upcomingFridayStart.getTime()
}

/**
 * Whether `dueAt` belongs to the current demo week window (from two days ago
 * through the upcoming Friday night in IST).
 */
export function isInCurrentDemoWeek(
  dueAt: Date,
  now: Date = new Date()
): boolean {
  const { year, month, day, weekday } = getIstDateParts(now)
  const daysUntilFriday = getDaysUntilUpcomingFriday(weekday)
  const windowStart = makeIstDate(year, month, day, -2, 0, 0).getTime()
  const windowEnd =
    makeIstDate(year, month, day, daysUntilFriday, 23, 59).getTime() + 59_999
  const ts = dueAt.getTime()
  return ts >= windowStart && ts <= windowEnd
}

export type ResolvedTimetableTarget =
  | {
      mode: 'day'
      dayOfWeek: number
      dayName: string
      label: string
      dateFormatted: string
    }
  | {
      mode: 'week'
    }

/** Resolve a day request (`today`, `tomorrow`, weekday name, or `week`) in IST. */
export function resolveTimetableDay(
  day: TimetableDayParam | undefined,
  now: Date = new Date()
): ResolvedTimetableTarget {
  if (day === 'week') {
    return { mode: 'week' }
  }

  const { year, month, day: dayNum, weekday } = getIstDateParts(now)
  let offsetDays = 0

  if (!day || day === 'today') {
    offsetDays = 0
  } else if (day === 'tomorrow') {
    offsetDays = 1
  } else {
    const targetWeekday = NAMED_WEEKDAYS[day]
    if (targetWeekday !== undefined) {
      offsetDays = (targetWeekday - weekday + 7) % 7
    }
  }

  const targetDate = makeIstDate(year, month, dayNum, offsetDays, 12, 0)
  const targetParts = getIstDateParts(targetDate)
  const dayName = WEEKDAY_NAMES[targetParts.weekday]
  const label =
    day === 'tomorrow'
      ? `Tomorrow (${dayName})`
      : day === 'today' || !day
        ? `Today (${dayName})`
        : dayName

  return {
    mode: 'day',
    dayOfWeek: targetParts.weekday,
    dayName,
    label,
    dateFormatted: formatIstDate(targetDate)
  }
}

export function getWeekdayName(dayOfWeek: number): string {
  return WEEKDAY_NAMES[dayOfWeek] ?? 'Unknown'
}

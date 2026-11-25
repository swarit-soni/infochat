import { and, asc, eq, isNull, or } from 'drizzle-orm'

import {
  studentAssignments,
  type StudentAssignmentStatus,
  studentAttendance,
  studentTimetable
} from '@/lib/db/schema'
import { withOptionalRLS } from '@/lib/db/with-rls'
import type { SearchResultItem } from '@/lib/types'

import {
  DEFAULT_DEMO_ASSIGNMENTS,
  DEFAULT_DEMO_ATTENDANCE,
  DEFAULT_DEMO_TIMETABLE,
  DEMO_STUDENT_PROFILE,
  type DemoAssignmentRecord,
  type DemoAttendanceRecord,
  type DemoStudentProfile,
  type DemoTimetableRecord
} from './demo-data'
import {
  formatIstDateTime,
  formatRelativeDayLabel,
  getWeekdayName,
  isDueBeforeUpcomingFriday,
  isInCurrentDemoWeek,
  resolveRelativeDueAt,
  resolveTimetableDay,
  type TimetableDayParam
} from './schedule-dates'

export type StudentPortalView =
  | 'attendance'
  | 'assignments'
  | 'timetable'
  | 'overview'

export type AssignmentTimeframe = 'this_week' | 'upcoming' | 'all'

export interface ComputedAttendanceItem {
  courseCode: string
  courseName: string
  faculty: string | null
  attendedClasses: number
  totalClasses: number
  minimumRequiredPct: number
  percentage: number
  belowMinimum: boolean
  classesNeededForMinimum: number
}

export interface ComputedAttendanceSummary {
  subjects: ComputedAttendanceItem[]
  overallAttended: number
  overallTotal: number
  overallPercentage: number
  subjectsBelowMinimum: string[]
}

export interface ComputedAssignmentItem {
  id: string
  courseCode: string
  courseName: string
  title: string
  description: string | null
  dueAt: string
  dueDateFormatted: string
  dueRelative: string
  dueBeforeFriday: boolean
  status: StudentAssignmentStatus
  isSubmitted: boolean
  estimatedMinutes: number | null
  submissionPortalUrl: string | null
}

export interface ComputedAssignmentsSummary {
  timeframe: AssignmentTimeframe
  items: ComputedAssignmentItem[]
  earliestPending: ComputedAssignmentItem | null
  dueBeforeFridayPending: ComputedAssignmentItem[]
}

export interface ComputedTimetableClass {
  dayOfWeek: number
  dayName: string
  startTime: string
  endTime: string
  courseCode: string
  courseName: string
  sessionType: string
  room: string
  faculty: string | null
}

export interface ComputedTimetableSummary {
  mode: 'day' | 'week'
  requestedLabel: string
  dateFormatted: string | null
  classes: ComputedTimetableClass[]
  nextClassDay: {
    dayName: string
    classes: ComputedTimetableClass[]
  } | null
}

export interface StudentPortalSnapshot {
  integrated: boolean
  college: string | null
  studentProfile: DemoStudentProfile | null
  attendance?: ComputedAttendanceSummary
  assignments?: ComputedAssignmentsSummary
  timetable?: ComputedTimetableSummary
}

const INTEGRATED_COLLEGES = new Set<string>(['sera-demo'])

/**
 * Colleges that have a live student-portal integration (attendance,
 * assignments, and timetable). Only `sera-demo` is integrated today.
 */
export function hasStudentPortalIntegration(
  college: string | null | undefined
): boolean {
  return Boolean(college && INTEGRATED_COLLEGES.has(college))
}

function roundPct(attended: number, total: number): number {
  if (total <= 0) return 0
  return Math.round((attended / total) * 1000) / 10
}

function classesNeeded(
  attended: number,
  total: number,
  minimumRequiredPct: number
): number {
  if (total <= 0 || minimumRequiredPct >= 100 || minimumRequiredPct <= 0) {
    return 0
  }
  const currentPct = (attended / total) * 100
  if (currentPct >= minimumRequiredPct) return 0
  return Math.max(
    0,
    Math.ceil(
      (minimumRequiredPct * total - 100 * attended) / (100 - minimumRequiredPct)
    )
  )
}

function preferUserRows<T extends { userId: string | null }>(
  rows: T[],
  userId: string | null | undefined
): T[] {
  if (!userId) return rows.filter(row => row.userId === null)
  const userRows = rows.filter(row => row.userId === userId)
  return userRows.length > 0
    ? userRows
    : rows.filter(row => row.userId === null)
}

async function loadAttendanceRows(
  college: string,
  userId?: string | null
): Promise<DemoAttendanceRecord[]> {
  try {
    const rows = await withOptionalRLS(userId ?? null, tx =>
      tx
        .select()
        .from(studentAttendance)
        .where(
          and(
            eq(studentAttendance.college, college),
            userId
              ? or(
                  isNull(studentAttendance.userId),
                  eq(studentAttendance.userId, userId)
                )
              : isNull(studentAttendance.userId)
          )
        )
        .orderBy(
          asc(studentAttendance.sortOrder),
          asc(studentAttendance.courseCode)
        )
    )
    const selected = preferUserRows(rows, userId)
    if (selected.length > 0) return selected
  } catch (error) {
    console.warn(
      '[StudentPortal] Failed to query student_attendance, using demo fallback:',
      error instanceof Error ? error.message : String(error)
    )
  }
  return college === 'sera-demo' ? [...DEFAULT_DEMO_ATTENDANCE] : []
}

async function loadAssignmentRows(
  college: string,
  userId?: string | null
): Promise<DemoAssignmentRecord[]> {
  try {
    const rows = await withOptionalRLS(userId ?? null, tx =>
      tx
        .select()
        .from(studentAssignments)
        .where(
          and(
            eq(studentAssignments.college, college),
            userId
              ? or(
                  isNull(studentAssignments.userId),
                  eq(studentAssignments.userId, userId)
                )
              : isNull(studentAssignments.userId)
          )
        )
        .orderBy(
          asc(studentAssignments.sortOrder),
          asc(studentAssignments.title)
        )
    )
    const selected = preferUserRows(rows, userId)
    if (selected.length > 0) return selected
  } catch (error) {
    console.warn(
      '[StudentPortal] Failed to query student_assignments, using demo fallback:',
      error instanceof Error ? error.message : String(error)
    )
  }
  return college === 'sera-demo' ? [...DEFAULT_DEMO_ASSIGNMENTS] : []
}

async function loadTimetableRows(
  college: string,
  userId?: string | null
): Promise<DemoTimetableRecord[]> {
  try {
    const rows = await withOptionalRLS(userId ?? null, tx =>
      tx
        .select()
        .from(studentTimetable)
        .where(
          and(
            eq(studentTimetable.college, college),
            userId
              ? or(
                  isNull(studentTimetable.userId),
                  eq(studentTimetable.userId, userId)
                )
              : isNull(studentTimetable.userId)
          )
        )
        .orderBy(
          asc(studentTimetable.dayOfWeek),
          asc(studentTimetable.sortOrder),
          asc(studentTimetable.startTime)
        )
    )
    const selected = preferUserRows(rows, userId)
    if (selected.length > 0) return selected
  } catch (error) {
    console.warn(
      '[StudentPortal] Failed to query student_timetable, using demo fallback:',
      error instanceof Error ? error.message : String(error)
    )
  }
  return college === 'sera-demo' ? [...DEFAULT_DEMO_TIMETABLE] : []
}

function buildAttendanceSummary(
  rows: DemoAttendanceRecord[]
): ComputedAttendanceSummary {
  const subjects: ComputedAttendanceItem[] = rows.map(row => {
    const percentage = roundPct(row.attendedClasses, row.totalClasses)
    const belowMinimum = percentage < row.minimumRequiredPct
    return {
      courseCode: row.courseCode,
      courseName: row.courseName,
      faculty: row.faculty,
      attendedClasses: row.attendedClasses,
      totalClasses: row.totalClasses,
      minimumRequiredPct: row.minimumRequiredPct,
      percentage,
      belowMinimum,
      classesNeededForMinimum: classesNeeded(
        row.attendedClasses,
        row.totalClasses,
        row.minimumRequiredPct
      )
    }
  })

  const overallAttended = subjects.reduce(
    (sum, s) => sum + s.attendedClasses,
    0
  )
  const overallTotal = subjects.reduce((sum, s) => sum + s.totalClasses, 0)

  return {
    subjects,
    overallAttended,
    overallTotal,
    overallPercentage: roundPct(overallAttended, overallTotal),
    subjectsBelowMinimum: subjects
      .filter(s => s.belowMinimum)
      .map(s => `${s.courseName} (${s.percentage}%)`)
  }
}

function resolveAssignmentDueDate(row: DemoAssignmentRecord, now: Date): Date {
  if (row.relativeDueSlot) {
    return resolveRelativeDueAt(row.relativeDueSlot, now)
  }
  if (row.dueAt) {
    return new Date(row.dueAt)
  }
  return resolveRelativeDueAt('friday_evening', now)
}

function buildAssignmentsSummary(
  rows: DemoAssignmentRecord[],
  timeframe: AssignmentTimeframe,
  now: Date
): ComputedAssignmentsSummary {
  const enriched = rows
    .map(row => {
      const dueDate = resolveAssignmentDueDate(row, now)
      const isSubmitted = row.status === 'submitted'
      const dueBeforeFriday = isDueBeforeUpcomingFriday(dueDate, now)
      return {
        dueDate,
        item: {
          id: row.id,
          courseCode: row.courseCode,
          courseName: row.courseName,
          title: row.title,
          description: row.description,
          dueAt: dueDate.toISOString(),
          dueDateFormatted: formatIstDateTime(dueDate),
          dueRelative: formatRelativeDayLabel(dueDate, now),
          dueBeforeFriday,
          status: row.status,
          isSubmitted,
          estimatedMinutes: row.estimatedMinutes,
          submissionPortalUrl: row.submissionPortalUrl
        } satisfies ComputedAssignmentItem
      }
    })
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())

  const filtered = enriched
    .filter(({ dueDate, item }) => {
      if (timeframe === 'all') return true
      if (timeframe === 'this_week') return isInCurrentDemoWeek(dueDate, now)
      return !item.isSubmitted || dueDate.getTime() >= now.getTime()
    })
    .map(({ item }) => item)

  const pending = filtered.filter(item => !item.isSubmitted)
  const earliestPending = pending[0] ?? null
  const dueBeforeFridayPending = pending.filter(item => item.dueBeforeFriday)

  return {
    timeframe,
    items: filtered,
    earliestPending,
    dueBeforeFridayPending
  }
}

function toTimetableClass(row: DemoTimetableRecord): ComputedTimetableClass {
  return {
    dayOfWeek: row.dayOfWeek,
    dayName: getWeekdayName(row.dayOfWeek),
    startTime: row.startTime,
    endTime: row.endTime,
    courseCode: row.courseCode,
    courseName: row.courseName,
    sessionType: row.sessionType,
    room: row.room,
    faculty: row.faculty
  }
}

function buildTimetableSummary(
  rows: DemoTimetableRecord[],
  day: TimetableDayParam | undefined,
  now: Date
): ComputedTimetableSummary {
  const target = resolveTimetableDay(day, now)
  const sorted = [...rows].sort(
    (a, b) =>
      a.dayOfWeek - b.dayOfWeek ||
      a.sortOrder - b.sortOrder ||
      a.startTime.localeCompare(b.startTime)
  )

  if (target.mode === 'week') {
    return {
      mode: 'week',
      requestedLabel: 'Weekly Schedule (Monday–Saturday)',
      dateFormatted: null,
      classes: sorted.map(toTimetableClass),
      nextClassDay: null
    }
  }

  const dayClasses = sorted
    .filter(row => row.dayOfWeek === target.dayOfWeek)
    .map(toTimetableClass)

  let nextClassDay: ComputedTimetableSummary['nextClassDay'] = null
  if (dayClasses.length === 0) {
    for (let offset = 1; offset <= 7; offset++) {
      const candidateDay = (target.dayOfWeek + offset) % 7
      const candidateClasses = sorted
        .filter(row => row.dayOfWeek === candidateDay)
        .map(toTimetableClass)
      if (candidateClasses.length > 0) {
        nextClassDay = {
          dayName: getWeekdayName(candidateDay),
          classes: candidateClasses
        }
        break
      }
    }
  }

  return {
    mode: 'day',
    requestedLabel: target.label,
    dateFormatted: target.dateFormatted,
    classes: dayClasses,
    nextClassDay
  }
}

/**
 * Fetch structured student portal records (attendance, assignments, timetable)
 * for an integrated college, falling back to `DEFAULT_DEMO_*` if Postgres
 * hasn't received migration 0027 yet.
 */
export async function retrieveStudentPortalData(options: {
  college: string | null | undefined
  userId?: string | null
  view?: StudentPortalView
  day?: TimetableDayParam
  timeframe?: AssignmentTimeframe
  now?: Date
}): Promise<StudentPortalSnapshot> {
  const college = options.college ?? null
  if (!hasStudentPortalIntegration(college) || !college) {
    return { integrated: false, college, studentProfile: null }
  }

  const now = options.now ?? new Date()
  const view = options.view ?? 'overview'
  const timeframe = options.timeframe ?? 'this_week'
  const defaultDay: TimetableDayParam = options.day ?? 'tomorrow'

  const needAttendance = view === 'attendance' || view === 'overview'
  const needAssignments = view === 'assignments' || view === 'overview'
  const needTimetable = view === 'timetable' || view === 'overview'

  const [attendanceRows, assignmentRows, timetableRows] = await Promise.all([
    needAttendance
      ? loadAttendanceRows(college, options.userId)
      : Promise.resolve([]),
    needAssignments
      ? loadAssignmentRows(college, options.userId)
      : Promise.resolve([]),
    needTimetable
      ? loadTimetableRows(college, options.userId)
      : Promise.resolve([])
  ])

  return {
    integrated: true,
    college,
    studentProfile: DEMO_STUDENT_PROFILE,
    ...(needAttendance && {
      attendance: buildAttendanceSummary(attendanceRows)
    }),
    ...(needAssignments && {
      assignments: buildAssignmentsSummary(assignmentRows, timeframe, now)
    }),
    ...(needTimetable && {
      timetable: buildTimetableSummary(timetableRows, defaultDay, now)
    })
  }
}

function formatAssignmentStatusLabel(status: StudentAssignmentStatus): string {
  switch (status) {
    case 'submitted':
      return 'Submitted'
    case 'in_progress':
      return 'In Progress'
    case 'overdue':
      return 'Overdue'
    case 'pending':
      return 'Pending'
  }
}

/**
 * Format a `StudentPortalSnapshot` into citation-ready `SearchResultItem[]`
 * entries consumed by `getStudentRecords` and the LLM prompt.
 */
export function formatStudentPortalSearchResults(
  snapshot: StudentPortalSnapshot
): SearchResultItem[] {
  if (!snapshot.integrated || !snapshot.studentProfile) return []
  const portalUrl = snapshot.studentProfile.portalUrl
  const results: SearchResultItem[] = []

  if (snapshot.attendance) {
    const lines = [
      `Student: ${snapshot.studentProfile.studentLabel}`,
      `Overall Attendance: ${snapshot.attendance.overallAttended}/${snapshot.attendance.overallTotal} (${snapshot.attendance.overallPercentage}%)`,
      ...snapshot.attendance.subjects.map(
        s =>
          `- ${s.courseCode} ${s.courseName}: ${s.attendedClasses}/${s.totalClasses} (${s.percentage}%) — ${
            s.belowMinimum
              ? `Below ${s.minimumRequiredPct}% minimum (need ${s.classesNeededForMinimum} consecutive classes to reach ${s.minimumRequiredPct}%)`
              : `On track (min ${s.minimumRequiredPct}%)`
          }${s.faculty ? ` | Faculty: ${s.faculty}` : ''}`
      )
    ]
    results.push({
      title: `${snapshot.studentProfile.collegeName} — Attendance Record`,
      url: `${portalUrl}#attendance`,
      content: lines.join('\n')
    })
  }

  if (snapshot.assignments) {
    const lines = [
      `Student: ${snapshot.studentProfile.studentLabel}`,
      `Timeframe: ${snapshot.assignments.timeframe}`,
      ...(snapshot.assignments.earliestPending
        ? [
            `Earliest Pending Deadline: ${snapshot.assignments.earliestPending.title} (${snapshot.assignments.earliestPending.courseCode}) — ${snapshot.assignments.earliestPending.dueDateFormatted} (${snapshot.assignments.earliestPending.dueRelative})`
          ]
        : ['All shown assignments are submitted.']),
      ...snapshot.assignments.items.map(
        item =>
          `- [${formatAssignmentStatusLabel(item.status)}] ${item.courseCode} ${item.courseName} — ${item.title} | Due: ${item.dueDateFormatted} (${item.dueRelative}) | Due before Friday: ${item.dueBeforeFriday ? 'Yes' : 'No'}${
            item.estimatedMinutes ? ` | Est. ${item.estimatedMinutes} min` : ''
          }`
      )
    ]
    results.push({
      title: `${snapshot.studentProfile.collegeName} — Assignments (${snapshot.assignments.timeframe})`,
      url: `${portalUrl}#assignments`,
      content: lines.join('\n')
    })
  }

  if (snapshot.timetable) {
    const lines = [
      `Student: ${snapshot.studentProfile.studentLabel}`,
      `Schedule: ${snapshot.timetable.requestedLabel}${snapshot.timetable.dateFormatted ? ` — ${snapshot.timetable.dateFormatted}` : ''}`
    ]
    if (snapshot.timetable.classes.length > 0) {
      lines.push(
        ...snapshot.timetable.classes.map(
          c =>
            `- ${snapshot.timetable!.mode === 'week' ? `${c.dayName} ` : ''}${c.startTime}–${c.endTime}: ${c.courseCode} ${c.courseName} (${c.sessionType}) | ${c.room}${c.faculty ? ` | ${c.faculty}` : ''}`
        )
      )
    } else {
      lines.push('No scheduled classes on this day.')
      if (snapshot.timetable.nextClassDay) {
        lines.push(
          `Next scheduled class day (${snapshot.timetable.nextClassDay.dayName}):`,
          ...snapshot.timetable.nextClassDay.classes.map(
            c =>
              `- ${c.startTime}–${c.endTime}: ${c.courseCode} ${c.courseName} (${c.sessionType}) | ${c.room}${c.faculty ? ` | ${c.faculty}` : ''}`
          )
        )
      }
    }
    results.push({
      title: `${snapshot.studentProfile.collegeName} — Timetable (${snapshot.timetable.requestedLabel})`,
      url: `${portalUrl}#timetable`,
      content: lines.join('\n')
    })
  }

  return results
}

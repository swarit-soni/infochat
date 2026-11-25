'use client'

import { useState } from 'react'
import Link from 'next/link'

import { signInStudentWithGoogle, signInWithGoogle } from '@/lib/actions/auth'
import { USER_TYPE_LABELS } from '@/lib/auth/domain'
import { safeRedirectPath } from '@/lib/auth/redirect-target'
import {
  collegePath,
  type CollegeSlug,
  DEMO_COLLEGE_SLUG,
  NOT_ENROLLED_COLLEGE
} from '@/lib/colleges/registry'
import { useAuthCapabilities } from '@/lib/contexts/app-user-context'
import { cn } from '@/lib/utils/index'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { IconLogo } from '@/components/ui/icons'

export interface StudentCollegeOption {
  slug: CollegeSlug
  name: string
  shortName: string
  location: string
  studentDomains: string[]
  openAccess?: boolean
}

export interface StudentLoginOption {
  value: string
  label: string
  shortName: string
  description: string
  studentDomains: string[]
  openAccess: boolean
  enabled: boolean
}

function toStudentLoginOption(
  college: StudentCollegeOption
): StudentLoginOption {
  const openAccess = Boolean(college.openAccess)
  return {
    value: college.slug,
    label: college.name,
    shortName: college.shortName,
    description: college.location,
    studentDomains: college.studentDomains,
    openAccess,
    enabled: openAccess || college.studentDomains.length > 0
  }
}

const NOT_ENROLLED_OPTION: StudentLoginOption = {
  value: NOT_ENROLLED_COLLEGE,
  label: 'Not enrolled yet',
  shortName: 'Not enrolled yet',
  description: "I'm exploring colleges or applying for admission",
  studentDomains: [],
  openAccess: true,
  enabled: true
}

/**
 * Put the demo university first, followed by admission seekers and listed
 * colleges in display order.
 */
export function buildStudentLoginOptions(
  colleges: StudentCollegeOption[]
): StudentLoginOption[] {
  const mapped = colleges.map(toStudentLoginOption)
  const demo = mapped.find(college => college.value === DEMO_COLLEGE_SLUG)
  if (!demo) {
    return [NOT_ENROLLED_OPTION, ...mapped]
  }
  const rest = mapped.filter(college => college.value !== DEMO_COLLEGE_SLUG)
  return [
    { ...demo, openAccess: true, enabled: true },
    NOT_ENROLLED_OPTION,
    ...rest
  ]
}

function formatStudentOptionSubtext(option: StudentLoginOption): string {
  const accessText = option.openAccess
    ? 'Any Google account'
    : option.studentDomains.length > 0
      ? option.studentDomains.map(domain => `@${domain}`).join(' / ')
      : 'Student sign-in not set up yet'
  return option.description
    ? `${option.description} · ${accessText}`
    : accessText
}

function GoogleIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-4"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  )
}

export function LoginForm({
  className,
  mentorCollege,
  mentorCollegeName,
  mentorDomains = [],
  studentColleges = [],
  initialCollege = null,
  next,
  initialError = null,
  isBeta = false,
  ...props
}: React.ComponentPropsWithoutRef<'div'> & {
  /**
   * Set for a college's mentor login (`/<college>/auth/mentor`). Omitted for
   * the regular student login, which asks for the college first.
   */
  mentorCollege?: CollegeSlug
  /** Short display name of `mentorCollege`. */
  mentorCollegeName?: string
  /** Email domains accepted as mentors of `mentorCollege` (empty: not set up). */
  mentorDomains?: string[]
  /** Colleges offered on the regular student login. */
  studentColleges?: StudentCollegeOption[]
  /** Pre-selected college (or `none`) when returning from an OAuth error. */
  initialCollege?: string | null
  next?: string
  initialError?: string | null
  isBeta?: boolean
}) {
  const isMentor = mentorCollege !== undefined
  const studentOptions = isMentor
    ? []
    : buildStudentLoginOptions(studentColleges)
  const initialStudentMatch =
    !isMentor && initialCollege
      ? (studentOptions.find(
          option => option.value === initialCollege && option.enabled
        ) ?? null)
      : null

  const [selectedCollege, setSelectedCollege] = useState<string | null>(
    initialStudentMatch?.value ?? null
  )
  const [step, setStep] = useState<'college' | 'google'>(
    initialStudentMatch ? 'google' : 'college'
  )
  const [error, setError] = useState<string | null>(initialError)
  const [isLoading, setIsLoading] = useState(false)
  const capabilities = useAuthCapabilities()

  const college =
    mentorCollege !== undefined
      ? { shortName: mentorCollegeName ?? mentorCollege }
      : null
  const isEnabled = !isMentor || mentorDomains.length > 0
  const selectedStudentOption = !isMentor
    ? (studentOptions.find(
        option => option.value === selectedCollege && option.enabled
      ) ?? null)
    : null
  const safeNext = next ? safeRedirectPath(next) : null
  const nextQuery =
    safeNext && safeNext !== '/' ? `?next=${encodeURIComponent(safeNext)}` : ''
  const alternateHref = isMentor ? `/auth/login${nextQuery}` : '/auth/mentor'
  const expectedDomain = mentorDomains.map(domain => `@${domain}`).join(' / ')

  const handleContinueCollege = (event: React.FormEvent) => {
    event.preventDefault()
    if (!selectedStudentOption) {
      setError('Please choose an option.')
      return
    }
    setError(null)
    setStep('google')
  }

  const handleGoogleSignIn = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Supabase's redirect allowlist matches the callback URL exactly, so
      // the destination rides in a short-lived cookie, not the redirectTo.
      // Always write it: a login without a destination must clear a stale
      // cookie left by an abandoned attempt, or that old destination would
      // hijack the later sign-in.
      const redirectTarget =
        next ??
        (mentorCollege ? collegePath(mentorCollege, '/mentor') : undefined)
      document.cookie = redirectTarget
        ? `auth_next=${encodeURIComponent(
            safeRedirectPath(redirectTarget)
          )}; path=/; max-age=300; SameSite=Lax`
        : 'auth_next=; path=/; max-age=0; SameSite=Lax'

      const result = isMentor
        ? await signInWithGoogle(mentorCollege)
        : await signInStudentWithGoogle(selectedStudentOption?.value ?? '')
      if (!result.success) {
        throw new Error(result.error ?? 'An OAuth error occurred')
      }
      if (result.redirectTo) {
        window.location.href = result.redirectTo
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An OAuth error occurred')
      setIsLoading(false)
    }
  }

  const studentDescription = !capabilities.oauth
    ? 'Sign in with your Google account.'
    : step === 'college'
      ? 'Choose your college first, then sign in with your Google account.'
      : selectedStudentOption?.value === NOT_ENROLLED_COLLEGE
        ? 'Sign in with any Google account to explore colleges on Sera.'
        : selectedStudentOption?.openAccess
          ? `Sign in with any Google account to explore ${selectedStudentOption.shortName}.`
          : `Sign in with your ${selectedStudentOption?.shortName} Google account to verify your enrollment.`

  return (
    <div
      className={cn('flex flex-col items-center gap-6', className)}
      {...props}
    >
      <Card className={cn('w-full', isMentor ? 'max-w-sm' : 'max-w-md')}>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl flex flex-col items-center justify-center gap-4">
            <IconLogo className="size-12" />
            <span className="inline-flex items-center gap-2">
              <span>{isMentor ? 'Staff sign in' : 'Sign in to Sera'}</span>
              {isBeta && (
                <Badge
                  variant="secondary"
                  className="px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide"
                >
                  Beta
                </Badge>
              )}
            </span>
          </CardTitle>
          <CardDescription>
            {college
              ? `Sign in with your ${college.shortName} staff Google account to manage ${college.shortName} campus data.`
              : studentDescription}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isMentor ? (
            <div className="flex flex-col gap-4">
              {college && (
                <div className="rounded-lg border bg-(--md-sys-color-surface-container)/40 p-3 text-xs text-(--md-sys-color-on-surface-variant)">
                  <div className="flex items-center justify-between gap-2">
                    <span className="min-w-0">
                      <span className="block font-medium text-(--md-sys-color-on-surface)">
                        {college.shortName}
                      </span>
                      <span className="break-all">
                        {isEnabled ? expectedDomain : 'Sign-in not set up yet'}
                      </span>
                    </span>
                    <Badge variant="secondary">{USER_TYPE_LABELS.mentor}</Badge>
                  </div>
                </div>
              )}

              {error && (
                <p
                  role="alert"
                  className="rounded-md border border-(--md-sys-color-error)/30 bg-(--md-sys-color-error)/10 p-3 text-sm text-(--md-sys-color-error)"
                >
                  {error}
                </p>
              )}

              {!isEnabled ? (
                <p className="text-center text-sm text-(--md-sys-color-on-surface-variant)">
                  Staff sign-in for {college?.shortName} is not set up yet.
                  Please contact your college administrator.
                </p>
              ) : capabilities.oauth ? (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-2"
                  onClick={handleGoogleSignIn}
                  disabled={isLoading}
                >
                  <GoogleIcon />
                  {isLoading
                    ? 'Redirecting to Google...'
                    : 'Sign In with Google'}
                </Button>
              ) : (
                <p className="text-center text-sm text-(--md-sys-color-on-surface-variant)">
                  Google sign-in is unavailable in the current configuration.
                </p>
              )}
            </div>
          ) : !capabilities.oauth ? (
            <div className="flex flex-col gap-4">
              {error && (
                <p
                  role="alert"
                  className="rounded-md border border-(--md-sys-color-error)/30 bg-(--md-sys-color-error)/10 p-3 text-sm text-(--md-sys-color-error)"
                >
                  {error}
                </p>
              )}
              <p className="text-center text-sm text-(--md-sys-color-on-surface-variant)">
                Google sign-in is unavailable in the current configuration.
              </p>
            </div>
          ) : step === 'college' ? (
            <form
              onSubmit={handleContinueCollege}
              className="flex flex-col gap-4"
            >
              <div className="max-h-[45vh] overflow-y-auto pr-1">
                <fieldset className="flex flex-col gap-2">
                  <legend className="mb-1 text-sm font-medium">
                    Which college are you enrolled in?
                  </legend>
                  {studentOptions.map(option => (
                    <label
                      key={option.value}
                      className={cn(
                        'flex items-start gap-3 rounded-lg border p-3 text-sm transition-colors',
                        option.enabled
                          ? 'cursor-pointer hover:bg-(--md-sys-color-surface-container-high)'
                          : 'cursor-not-allowed opacity-60',
                        option.enabled &&
                          selectedCollege === option.value &&
                          'border-(--md-sys-color-primary) bg-(--md-sys-color-surface-container-high)'
                      )}
                    >
                      <input
                        type="radio"
                        name="student-college"
                        value={option.value}
                        disabled={!option.enabled}
                        checked={selectedCollege === option.value}
                        onChange={() => {
                          setSelectedCollege(option.value)
                          setError(null)
                        }}
                        className="mt-1"
                      />
                      <span>
                        <span className="block font-medium">
                          {option.label}
                        </span>
                        <span className="block text-xs text-(--md-sys-color-on-surface-variant)">
                          {formatStudentOptionSubtext(option)}
                        </span>
                      </span>
                    </label>
                  ))}
                </fieldset>
              </div>

              {error && (
                <p
                  role="alert"
                  className="rounded-md border border-(--md-sys-color-error)/30 bg-(--md-sys-color-error)/10 p-3 text-sm text-(--md-sys-color-error)"
                >
                  {error}
                </p>
              )}

              <Button type="submit" className="w-full">
                Continue
              </Button>
            </form>
          ) : (
            <div className="flex flex-col gap-4">
              {selectedStudentOption && (
                <div className="rounded-lg border bg-(--md-sys-color-surface-container)/40 p-3 text-xs text-(--md-sys-color-on-surface-variant)">
                  <div className="flex items-center justify-between gap-2">
                    <span className="min-w-0">
                      <span className="block font-medium text-(--md-sys-color-on-surface)">
                        {selectedStudentOption.shortName}
                      </span>
                      <span className="break-all">
                        {selectedStudentOption.openAccess
                          ? 'Any Google account'
                          : selectedStudentOption.studentDomains
                              .map(domain => `@${domain}`)
                              .join(' / ')}
                      </span>
                    </span>
                    <Badge variant="secondary">
                      {selectedStudentOption.value === NOT_ENROLLED_COLLEGE
                        ? 'Exploring'
                        : USER_TYPE_LABELS.student}
                    </Badge>
                  </div>
                </div>
              )}

              {error && (
                <p
                  role="alert"
                  className="rounded-md border border-(--md-sys-color-error)/30 bg-(--md-sys-color-error)/10 p-3 text-sm text-(--md-sys-color-error)"
                >
                  {error}
                </p>
              )}

              <Button
                type="button"
                variant="outline"
                className="w-full gap-2"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
              >
                <GoogleIcon />
                {isLoading ? 'Redirecting to Google...' : 'Sign In with Google'}
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="w-full"
                disabled={isLoading}
                onClick={() => {
                  setError(null)
                  setStep('college')
                }}
              >
                Change college
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      <div className="flex flex-col items-center gap-2 text-center text-xs text-(--md-sys-color-on-surface-variant)">
        <p>
          {isMentor ? 'Not staff? ' : 'College staff? '}
          <Link
            href={alternateHref}
            className="underline underline-offset-4 hover:text-(--md-sys-color-on-surface)"
          >
            {isMentor ? 'Regular login' : 'Staff login'}
          </Link>
        </p>
        {isMentor && (
          <Link href="/auth/mentor" className="hover:underline">
            Staff at a different college?
          </Link>
        )}
        <Link href="/" className="hover:underline">
          &larr; Back to Home
        </Link>
      </div>
    </div>
  )
}

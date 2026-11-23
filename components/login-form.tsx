'use client'

import { useState } from 'react'
import Link from 'next/link'

import { signInWithGoogle } from '@/lib/actions/auth'
import {
  DOMAIN_BY_USER_TYPE,
  USER_TYPE_LABELS,
  type UserType
} from '@/lib/auth/domain'
import { safeRedirectPath } from '@/lib/auth/redirect-target'
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
  mode = 'student',
  next,
  initialError = null,
  isBeta = false,
  ...props
}: React.ComponentPropsWithoutRef<'div'> & {
  mode?: UserType
  next?: string
  initialError?: string | null
  isBeta?: boolean
}) {
  const [error, setError] = useState<string | null>(initialError)
  const [isLoading, setIsLoading] = useState(false)
  const capabilities = useAuthCapabilities()

  const isMentor = mode === 'mentor'
  const safeNext = next ? safeRedirectPath(next) : null
  const nextQuery =
    safeNext && safeNext !== '/' ? `?next=${encodeURIComponent(safeNext)}` : ''
  const alternateHref = isMentor
    ? `/auth/login${nextQuery}`
    : `/auth/mentor${nextQuery}`
  const expectedDomain = `@${DOMAIN_BY_USER_TYPE[mode]}`
  const roleLabel = USER_TYPE_LABELS[mode]

  const handleGoogleSignIn = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Supabase's redirect allowlist matches the callback URL exactly, so
      // the destination rides in a short-lived cookie, not the redirectTo.
      // Always write it: a login without a destination must clear a stale
      // cookie left by an abandoned attempt, or that old destination would
      // hijack the later sign-in.
      const redirectTarget = next ?? (isMentor ? '/mentor' : undefined)
      document.cookie = redirectTarget
        ? `auth_next=${encodeURIComponent(
            safeRedirectPath(redirectTarget)
          )}; path=/; max-age=300; SameSite=Lax`
        : 'auth_next=; path=/; max-age=0; SameSite=Lax'

      const result = await signInWithGoogle(mode)
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

  return (
    <div
      className={cn('flex flex-col items-center gap-6', className)}
      {...props}
    >
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl flex flex-col items-center justify-center gap-4">
            <IconLogo className="size-12" />
            <span className="inline-flex items-center gap-2">
              <span>{isMentor ? 'Mentor sign in' : 'Sign in to Sera'}</span>
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
            {isMentor
              ? 'Sign in with your Kalvium mentor Google account to manage campus data.'
              : 'Sign in with your Kalvium student Google account.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <div className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
              <div className="flex items-center justify-between gap-2">
                <span>{expectedDomain}</span>
                <Badge variant="secondary">{roleLabel}</Badge>
              </div>
            </div>

            {error && (
              <p
                role="alert"
                className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
              >
                {error}
              </p>
            )}

            {capabilities.oauth ? (
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
            ) : (
              <p className="text-center text-sm text-muted-foreground">
                Google sign-in is unavailable in the current configuration.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
      <div className="flex flex-col items-center gap-2 text-center text-xs text-muted-foreground">
        <p>
          {isMentor ? 'Looking for student login? ' : 'Are you a mentor? '}
          <Link
            href={alternateHref}
            className="underline underline-offset-4 hover:text-foreground"
          >
            {isMentor ? 'Student login' : 'Mentor login'}
          </Link>
        </p>
        <Link href="/" className="hover:underline">
          &larr; Back to Home
        </Link>
      </div>
    </div>
  )
}

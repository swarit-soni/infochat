import Link from 'next/link'
import { redirect } from 'next/navigation'

import { getAuthErrorMessage } from '@/lib/auth/error-messages'
import { getCurrentUser } from '@/lib/auth/get-current-user'
import { isAnonymousMode } from '@/lib/auth/provider'
import { safeRedirectPath } from '@/lib/auth/redirect-target'
import { getDefaultCollege, isCollegeRoleEnabled } from '@/lib/colleges/access'
import {
  COLLEGE_SLUGS,
  collegePath,
  getCollege,
  getCollegeFromPathname
} from '@/lib/colleges/registry'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { IconLogo } from '@/components/ui/icons'

export const dynamic = 'force-dynamic'

/**
 * Landing page: every college has its own disconnected area, so a visitor
 * first picks theirs. Signed-in users go straight to their college.
 */
export default async function CollegePickerPage(props: {
  searchParams: Promise<{ next?: string; error?: string }>
}) {
  const { next, error } = await props.searchParams

  if (isAnonymousMode()) {
    redirect(collegePath(getDefaultCollege()))
  }

  const user = await getCurrentUser()
  if (user?.college) {
    redirect(collegePath(user.college))
  }

  const safeNext = next ? safeRedirectPath(next) : undefined
  const nextCollege = getCollegeFromPathname(safeNext)
  if (nextCollege && safeNext) {
    redirect(
      `${collegePath(nextCollege, '/auth/student')}?next=${encodeURIComponent(safeNext)}`
    )
  }
  const nextQuery =
    safeNext && safeNext !== '/' ? `?next=${encodeURIComponent(safeNext)}` : ''
  const errorMessage = getAuthErrorMessage(error)

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="flex w-full max-w-2xl flex-col items-center gap-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <IconLogo className="size-12" />
          <h1 className="text-2xl font-semibold">Welcome to Sera</h1>
          <p className="text-sm text-muted-foreground">
            Choose your college. Each college has its own sign-in, assistant and
            knowledge base.
          </p>
        </div>

        {errorMessage && (
          <p
            role="alert"
            className="w-full rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
          >
            {errorMessage}
          </p>
        )}

        <div className="grid w-full gap-4 sm:grid-cols-3">
          {COLLEGE_SLUGS.map(slug => {
            const college = getCollege(slug)
            const studentEnabled = isCollegeRoleEnabled(slug, 'student')
            const mentorEnabled = isCollegeRoleEnabled(slug, 'mentor')
            return (
              <Card key={slug} className="flex flex-col">
                <CardHeader>
                  <CardTitle className="text-base">
                    {college.shortName}
                  </CardTitle>
                  <CardDescription>{college.location}</CardDescription>
                </CardHeader>
                <CardContent className="mt-auto flex flex-col gap-2">
                  {studentEnabled || mentorEnabled ? (
                    <>
                      {studentEnabled && (
                        <Button asChild size="sm">
                          <Link
                            href={`${collegePath(slug, '/auth/student')}${nextQuery}`}
                          >
                            Student login
                          </Link>
                        </Button>
                      )}
                      {mentorEnabled && (
                        <Button asChild size="sm" variant="outline">
                          <Link href={collegePath(slug, '/auth/mentor')}>
                            Mentor login
                          </Link>
                        </Button>
                      )}
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Sign-in is not set up for this college yet.
                    </p>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}

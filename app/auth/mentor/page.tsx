import Link from 'next/link'
import { redirect } from 'next/navigation'

import { getAuthErrorMessage } from '@/lib/auth/error-messages'
import { getCurrentUser } from '@/lib/auth/get-current-user'
import { isCollegeRoleEnabled } from '@/lib/colleges/access'
import { collegePath } from '@/lib/colleges/registry'
import { getCollegeDirectory } from '@/lib/colleges/store'

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
 * Mentor entry point. Each college has its own, disconnected mentor login
 * and dashboard at `/<college>/auth/mentor` and `/<college>/mentor`.
 */
export default async function MentorCollegePickerPage(props: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await props.searchParams
  const user = await getCurrentUser()
  if (user?.userType === 'mentor' && user.college) {
    redirect(collegePath(user.college, '/mentor'))
  }
  const errorMessage = getAuthErrorMessage(error)
  const { list: colleges } = await getCollegeDirectory()

  return (
    <div className="h-full w-full overflow-y-auto">
      <div className="mx-auto flex min-h-full w-full max-w-2xl flex-col items-center justify-center gap-6 p-6 md:p-10">
        <div className="flex flex-col items-center gap-3 text-center">
          <IconLogo className="size-12" />
          <h1 className="text-2xl font-semibold">Staff sign in</h1>
          <p className="text-sm text-(--md-sys-color-on-surface-variant)">
            Choose your college. Each college has its own staff sign-in and
            dashboard.
          </p>
        </div>

        {errorMessage && (
          <p
            role="alert"
            className="w-full rounded-md border border-(--md-sys-color-error)/30 bg-(--md-sys-color-error)/10 p-3 text-sm text-(--md-sys-color-error)"
          >
            {errorMessage}
          </p>
        )}

        <div className="grid w-full gap-4 sm:grid-cols-2 md:grid-cols-3">
          {colleges.map(college => {
            const slug = college.slug
            const enabled = isCollegeRoleEnabled(college, 'mentor')
            return (
              <Card key={slug} className="flex flex-col">
                <CardHeader>
                  <CardTitle className="text-base">
                    {college.shortName}
                  </CardTitle>
                  <CardDescription>{college.location}</CardDescription>
                </CardHeader>
                <CardContent className="mt-auto">
                  {enabled ? (
                    <Button asChild size="sm" className="w-full">
                      <Link href={collegePath(slug, '/auth/mentor')}>
                        Staff login
                      </Link>
                    </Button>
                  ) : (
                    <p className="text-xs text-(--md-sys-color-on-surface-variant)">
                      Staff sign-in is not set up for this college yet.
                    </p>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>

        <Link
          href="/auth/login"
          className="text-xs text-(--md-sys-color-on-surface-variant) hover:underline"
        >
          Not staff? Regular login
        </Link>
      </div>
    </div>
  )
}

import { redirect } from 'next/navigation'

import { getCurrentUser } from '@/lib/auth/get-current-user'
import { safeRedirectPath } from '@/lib/auth/redirect-target'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { IconLogo } from '@/components/ui/icons'

import { EnrolledCollegeForm } from '@/components/onboarding/enrolled-college-form'

export const dynamic = 'force-dynamic'

/**
 * Student sign-up step: "Which college are you enrolled in?". The answer
 * decides which college's knowledge base Sera answers from; students who
 * are not enrolled anywhere (e.g. admission seekers) get every college's.
 */
export default async function EnrolledCollegePage(props: {
  searchParams: Promise<{ next?: string; change?: string }>
}) {
  const { next, change } = await props.searchParams
  const destination = safeRedirectPath(next)

  const user = await getCurrentUser()
  if (!user) {
    redirect(`/auth/login?next=${encodeURIComponent('/onboarding/college')}`)
  }
  // Already answered (unless changing it), or verified from a college
  // email domain (userType is only set for college-domain accounts).
  if ((user.collegeOnboarded && change !== '1') || user.userType) {
    redirect(destination)
  }

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="flex flex-col items-center gap-4 text-2xl">
            <IconLogo className="size-12" />
            Which college are you enrolled in?
          </CardTitle>
          <CardDescription>
            Sera answers questions about fees, exams, notices and campus life
            from your college&apos;s official sources.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EnrolledCollegeForm next={destination} />
        </CardContent>
      </Card>
    </div>
  )
}

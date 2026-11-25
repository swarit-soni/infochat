import Link from 'next/link'
import { redirect } from 'next/navigation'

import { getMentorPortalOverview } from '@/lib/actions/mentor'
import { getCurrentUser } from '@/lib/auth/get-current-user'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

import { MentorPortalClient } from '@/components/mentor/mentor-portal-client'

export const dynamic = 'force-dynamic'

export default async function MentorPortalPage() {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/auth/mentor?next=%2Fmentor')
  }
  if (user.userType !== 'mentor') {
    redirect('/')
  }

  const overview = await getMentorPortalOverview()

  return (
    <div className="h-full w-full overflow-y-auto">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 pb-12 pt-16">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold">Mentor Data Portal</h1>
              <Badge variant="secondary">Mentor</Badge>
            </div>
            <p className="text-sm text-(--md-sys-color-on-surface-variant)">
              Signed in as {user.email}. Curate official Kalvium X JECRC
              circulars, approve urgent updates, manage Eventum events, and
              review knowledge gaps.
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/">Back to Sera Chat</Link>
          </Button>
        </div>

        <MentorPortalClient initialData={overview} />
      </div>
    </div>
  )
}

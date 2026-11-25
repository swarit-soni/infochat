import Link from 'next/link'
import { redirect } from 'next/navigation'

import { getMentorPortalOverview } from '@/lib/actions/mentor'
import { getCurrentUser } from '@/lib/auth/get-current-user'
import {
  collegePath,
  getCollege,
  getOfficialWebDomains,
  getPartnerCampuses,
  JOINT_AUTHORITY_LABEL
} from '@/lib/colleges/registry'
import { getCollegeDirectory } from '@/lib/colleges/store'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

import { MentorPortalClient } from '@/components/mentor/mentor-portal-client'

export const dynamic = 'force-dynamic'

export default async function CollegeMentorPortalPage(props: {
  params: Promise<{ college: string }>
}) {
  const { college } = await props.params
  const directory = await getCollegeDirectory()
  const collegeConfig = getCollege(directory, college)
  if (!collegeConfig) {
    redirect('/')
  }

  const user = await getCurrentUser()
  if (!user) {
    redirect(
      `${collegePath(college, '/auth/mentor')}?next=${encodeURIComponent(
        collegePath(college, '/mentor')
      )}`
    )
  }
  if (user.userType !== 'mentor') {
    redirect('/')
  }
  if (user.college !== college) {
    // Mentor dashboards are disconnected: go to your own college's.
    redirect(user.college ? collegePath(user.college, '/mentor') : '/')
  }

  const overview = await getMentorPortalOverview()
  const authorities = [
    { value: collegeConfig.slug, label: collegeConfig.shortName },
    ...getPartnerCampuses(directory, collegeConfig.slug).map(partner => ({
      value: partner.slug,
      label: partner.shortName
    })),
    { value: 'joint', label: JOINT_AUTHORITY_LABEL }
  ]

  return (
    <div className="h-full w-full overflow-y-auto">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 pb-12 pt-16">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold">Mentor Data Portal</h1>
              <Badge variant="secondary">{collegeConfig.shortName}</Badge>
            </div>
            <p className="text-sm text-(--md-sys-color-on-surface-variant)">
              Signed in as {user.email}. Curate {collegeConfig.shortName}{' '}
              circulars, approve urgent updates, manage events, and review
              knowledge gaps.
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/">Back to Sera Chat</Link>
          </Button>
        </div>

        <MentorPortalClient
          initialData={overview}
          college={collegeConfig}
          authorities={authorities}
          officialDomains={getOfficialWebDomains(directory, collegeConfig.slug)}
        />
      </div>
    </div>
  )
}

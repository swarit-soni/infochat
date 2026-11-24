import { redirect } from 'next/navigation'

import { getCurrentUser } from '@/lib/auth/get-current-user'
import { collegePath, isCollegeSlug } from '@/lib/colleges/registry'

/**
 * Tenant guard for a college's dashboards (chat and mentor portal): a
 * signed-in account may only use its own college's area. Login pages sit
 * outside this group so another college's account can still switch.
 */
export default async function CollegeDashboardLayout(props: {
  children: React.ReactNode
  params: Promise<{ college: string }>
}) {
  const { college } = await props.params
  const user = await getCurrentUser()
  if (user?.college && isCollegeSlug(college) && user.college !== college) {
    redirect(collegePath(user.college))
  }
  return props.children
}

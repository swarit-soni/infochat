import { redirect } from 'next/navigation'

import { getDefaultCollege } from '@/lib/colleges/access'
import { getCollegeFromPathname } from '@/lib/colleges/registry'

export const dynamic = 'force-dynamic'

/**
 * Legacy login URL. Each college now has its own login page; send the
 * visitor to the college their destination belongs to (or the default).
 */
export default async function LegacyStudentLoginPage(props: {
  searchParams: Promise<{ next?: string; error?: string }>
}) {
  const { next, error } = await props.searchParams
  const college = getCollegeFromPathname(next) ?? getDefaultCollege()
  const params = new URLSearchParams()
  if (next) params.set('next', next)
  if (error) params.set('error', error)
  const query = params.size > 0 ? `?${params}` : ''
  redirect(`/${college}/auth/student${query}`)
}

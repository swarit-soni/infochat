import { redirect } from 'next/navigation'

import { getCurrentUser } from '@/lib/auth/get-current-user'
import { getDefaultCollege } from '@/lib/colleges/access'

/** Legacy `/search?q=` entry point: continue in the user's college area. */
export default async function LegacySearchPage(props: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await props.searchParams
  const user = await getCurrentUser()
  const college = user?.college ?? getDefaultCollege()
  redirect(q ? `/${college}/search?q=${encodeURIComponent(q)}` : `/${college}`)
}

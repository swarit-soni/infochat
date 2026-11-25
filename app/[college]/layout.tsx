import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { getCollege } from '@/lib/colleges/registry'
import { getCollegeDirectory } from '@/lib/colleges/store'

// Colleges are data (managed at /admin/colleges), so these routes are dynamic.
export const dynamic = 'force-dynamic'

export async function generateMetadata(props: {
  params: Promise<{ college: string }>
}): Promise<Metadata> {
  const { college } = await props.params
  const config = getCollege(await getCollegeDirectory(), college)
  if (!config) return {}
  return {
    title: {
      default: `Sera · ${config.shortName}`,
      template: `%s · Sera · ${config.shortName}`
    }
  }
}

export default async function CollegeLayout(props: {
  children: React.ReactNode
  params: Promise<{ college: string }>
}) {
  const { college } = await props.params
  if (!getCollege(await getCollegeDirectory(), college)) {
    notFound()
  }
  return props.children
}

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import {
  COLLEGE_SLUGS,
  getCollege,
  isCollegeSlug
} from '@/lib/colleges/registry'

export function generateStaticParams() {
  return COLLEGE_SLUGS.map(college => ({ college }))
}

export async function generateMetadata(props: {
  params: Promise<{ college: string }>
}): Promise<Metadata> {
  const { college } = await props.params
  if (!isCollegeSlug(college)) return {}
  return {
    title: {
      default: `Sera · ${getCollege(college).shortName}`,
      template: `%s · Sera · ${getCollege(college).shortName}`
    }
  }
}

export default async function CollegeLayout(props: {
  children: React.ReactNode
  params: Promise<{ college: string }>
}) {
  const { college } = await props.params
  if (!isCollegeSlug(college)) {
    notFound()
  }
  return props.children
}

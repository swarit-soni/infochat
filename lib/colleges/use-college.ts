'use client'

import { usePathname } from 'next/navigation'

import { useAppUser } from '@/lib/contexts/app-user-context'

import { type CollegeSlug, getCollegeFromPathname } from './registry'

/**
 * The college the user is looking at: the college area in the URL
 * (`/<slug>/...`, e.g. a mentor dashboard), else the signed-in user's own
 * college, else null (not enrolled, or a guest).
 */
export function useCollege(): CollegeSlug | null {
  const pathname = usePathname()
  const user = useAppUser()
  return getCollegeFromPathname(pathname) ?? user?.college ?? null
}

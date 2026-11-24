'use client'

import { useCallback } from 'react'
import { usePathname } from 'next/navigation'

import { useAppUser } from '@/lib/contexts/app-user-context'

import {
  collegePath,
  type CollegeSlug,
  getCollegeFromPathname
} from './registry'

/**
 * The college whose area the user is in: from the URL (`/<slug>/...`), else
 * the signed-in user's own college, else null (college picker, shared links).
 */
export function useCollege(): CollegeSlug | null {
  const pathname = usePathname()
  const user = useAppUser()
  return getCollegeFromPathname(pathname) ?? user?.college ?? null
}

/**
 * Build in-app links inside the current college's area, e.g.
 * `href('/search/abc')` → `/kalvium/search/abc`. Outside a college area the
 * path is returned unchanged.
 */
export function useCollegeHref(): (path?: string) => string {
  const college = useCollege()
  return useCallback(
    (path = '/') => (college ? collegePath(college, path) : path),
    [college]
  )
}

/** Whether `pathname` is the chat home (`/<college>` or legacy `/`). */
export function isChatHomePath(pathname: string | null | undefined): boolean {
  if (!pathname) return false
  if (pathname === '/') return true
  const college = getCollegeFromPathname(pathname)
  return college !== null && pathname === `/${college}`
}

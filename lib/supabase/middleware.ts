import { type NextRequest, NextResponse } from 'next/server'

import { type CookieOptions, createServerClient } from '@supabase/ssr'

import { isAllowedEmail, isGoogleAuthUser } from '@/lib/auth/domain'
import { collegePath, getCollegeFromPathname } from '@/lib/colleges/registry'

import { getSupabasePublishableKey } from './keys'

function matchesPathPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`)
}

function isPublicPath(pathname: string): boolean {
  if (
    matchesPathPrefix(pathname, '/auth') ||
    matchesPathPrefix(pathname, '/api')
  ) {
    return true
  }

  // Each college's mentor login, `/<college>/auth/mentor`.
  const college = getCollegeFromPathname(pathname)
  if (college && matchesPathPrefix(pathname, `/${college}/auth`)) {
    return true
  }

  if (process.env.ENABLE_GUEST_CHAT === 'true') {
    return pathname === '/' || matchesPathPrefix(pathname, '/share')
  }

  return false
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request
  })
  const supabaseKey = getSupabasePublishableKey()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseKey!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(
          cookiesToSet: Array<{
            name: string
            value: string
            options?: CookieOptions
          }>
        ) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        }
      }
    }
  )

  // Do not run code between createServerClient and
  // supabase.auth.getClaims(). A simple mistake could make it very hard to
  // debug issues with users being randomly logged out.

  // IMPORTANT: DO NOT REMOVE auth.getClaims()
  // getClaims() refreshes an expired session (writing the new cookies through
  // setAll above) and verifies the JWT locally against the project's cached
  // JWKS, so it costs no Auth server round trip per request the way getUser()
  // does. With a legacy symmetric JWT secret it falls back to getUser().
  const { data } = await supabase.auth.getClaims()
  const user = data?.claims ?? null

  const pathname = request.nextUrl.pathname

  // Reject and sign out sessions from disallowed domains or non-Google providers.
  if (
    user &&
    (!isAllowedEmail(user.email) ||
      !isGoogleAuthUser({ app_metadata: user.app_metadata }))
  ) {
    await supabase.auth.signOut()
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/auth/login'
    loginUrl.search = ''
    loginUrl.searchParams.set('error', 'unauthorized_domain')
    const redirectResponse = NextResponse.redirect(loginUrl)
    for (const cookie of supabaseResponse.cookies.getAll()) {
      redirectResponse.cookies.set(cookie)
    }
    return redirectResponse
  }

  // Redirect to login if the user is not authenticated and the path is not public.
  if (!user && !isPublicPath(pathname)) {
    const loginUrl = request.nextUrl.clone()
    const college = getCollegeFromPathname(pathname)
    loginUrl.pathname = college
      ? collegePath(college, '/auth/mentor')
      : matchesPathPrefix(pathname, '/mentor')
        ? '/auth/mentor'
        : '/auth/login'
    loginUrl.search = ''
    if (pathname !== '/') {
      loginUrl.searchParams.set('next', `${pathname}${request.nextUrl.search}`)
    }
    return NextResponse.redirect(loginUrl)
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is.
  // If you're creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return supabaseResponse
}

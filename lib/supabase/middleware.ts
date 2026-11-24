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
    pathname === '/' ||
    matchesPathPrefix(pathname, '/auth') ||
    matchesPathPrefix(pathname, '/api')
  ) {
    return true
  }

  const college = getCollegeFromPathname(pathname)
  if (college && matchesPathPrefix(pathname, `/${college}/auth`)) {
    return true
  }

  if (process.env.ENABLE_GUEST_CHAT === 'true') {
    return (
      (college !== null && pathname === `/${college}`) ||
      matchesPathPrefix(pathname, '/share')
    )
  }

  return false
}

/** Where an unauthenticated visitor to `pathname` should sign in. */
function loginPathFor(pathname: string): string {
  const college = getCollegeFromPathname(pathname)
  if (!college) {
    // Outside any college area there is no login to pick: show the
    // college picker, which carries ?next= into the chosen login.
    return '/'
  }
  return collegePath(
    college,
    matchesPathPrefix(pathname, `/${college}/mentor`)
      ? '/auth/mentor'
      : '/auth/student'
  )
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
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // IMPORTANT: DO NOT REMOVE auth.getUser()

  const {
    data: { user }
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // Reject and sign out sessions from disallowed domains or non-Google providers.
  if (user && (!isAllowedEmail(user.email) || !isGoogleAuthUser(user))) {
    await supabase.auth.signOut()
    const loginUrl = request.nextUrl.clone()
    const college = getCollegeFromPathname(pathname)
    loginUrl.pathname = college ? collegePath(college, '/auth/student') : '/'
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
    loginUrl.pathname = loginPathFor(pathname)
    loginUrl.search = ''
    const college = getCollegeFromPathname(pathname)
    if (!college || pathname !== `/${college}`) {
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

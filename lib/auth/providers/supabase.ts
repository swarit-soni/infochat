import { cache } from 'react'
import { type NextRequest, NextResponse } from 'next/server'

import type { User as SupabaseUser } from '@supabase/supabase-js'

import {
  getCollegeIdentityFromEmail,
  isAllowedEmail,
  isGoogleAuthUser,
  normalizeEmail
} from '@/lib/auth/domain'
import { getRequestOrigin } from '@/lib/auth/request'
import type { AppUser, AuthActionResult, AuthProvider } from '@/lib/auth/types'
import type { IdentityDirectory } from '@/lib/colleges/access'
import { getCollegeDirectory } from '@/lib/colleges/store'
import { createAdminClient } from '@/lib/supabase/admin'
import { hasSupabasePublicConfig } from '@/lib/supabase/keys'
import { updateSession } from '@/lib/supabase/middleware'
import { createClient } from '@/lib/supabase/server'

function metaString(
  metadata: Record<string, unknown>,
  ...keys: string[]
): string | null {
  for (const key of keys) {
    const value = metadata[key]
    if (typeof value === 'string' && value) {
      return value
    }
  }
  return null
}

export function toAppUser(
  user: SupabaseUser,
  directory: IdentityDirectory = { list: [] }
): AppUser | null {
  const email = normalizeEmail(user.email)
  if (!email || !isGoogleAuthUser(user)) {
    return null
  }
  // Any Google account may sign in. A college email domain decides mentor
  // access and, for students, their college; other accounts get neither here
  // (their self-reported college comes from user_profiles, see
  // getCurrentUser).
  const identity = getCollegeIdentityFromEmail(email, directory)
  const userType = identity?.userType ?? null
  const college = identity?.college ?? null

  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>
  return {
    id: user.id,
    email,
    name: metaString(metadata, 'full_name', 'name'),
    image: metaString(metadata, 'avatar_url', 'picture'),
    createdAt: user.created_at ?? null,
    userType,
    role: userType,
    college
  }
}

// The full user (getUser) is one Auth server round trip; cache() shares it
// across the layout, page and metadata of a single server render.
const getCurrentSupabaseUser = cache(async (): Promise<AppUser | null> => {
  if (!hasSupabasePublicConfig()) {
    return null // Supabase is not configured
  }

  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()
  return data.user ? toAppUser(data.user, await getCollegeDirectory()) : null
})

// Most callers only need the id. getClaims() verifies the session JWT locally
// against the project's cached JWKS instead of calling the Auth server, and
// the same email / Google-provider gate as toAppUser is applied to the
// claims so an id is only returned for a user getCurrentUser would accept.
const getCurrentSupabaseUserId = cache(
  async (): Promise<string | undefined> => {
    if (!hasSupabasePublicConfig()) {
      return undefined
    }

    const supabase = await createClient()
    const { data } = await supabase.auth.getClaims()
    const claims = data?.claims
    if (
      !claims?.sub ||
      !isAllowedEmail(claims.email) ||
      !isGoogleAuthUser({ app_metadata: claims.app_metadata })
    ) {
      return undefined
    }
    return claims.sub
  }
)

export const supabaseAuthProvider: AuthProvider = {
  name: 'supabase',
  capabilities: {
    signUp: false,
    passwordReset: false,
    deleteUser: true,
    oauth: true,
    emailVerification: false,
    share: true
  },

  getCurrentUser: getCurrentSupabaseUser,

  getCurrentUserId: getCurrentSupabaseUserId,

  async handleSession(request: NextRequest): Promise<NextResponse> {
    if (!hasSupabasePublicConfig()) {
      // If Supabase is not configured, just pass the request through
      return NextResponse.next({ request })
    }
    return updateSession(request)
  },

  async signInWithOAuth(
    provider: string,
    options?: { loginHintDomain?: string }
  ): Promise<AuthActionResult> {
    if (provider !== 'google') {
      return {
        success: false,
        error: 'Only Google sign-in is supported.'
      }
    }

    const supabase = await createClient()
    const origin = await getRequestOrigin()
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // Fixed callback URL: Supabase's redirect allowlist matches the
        // configured Redirect URLs exactly, so a ?next= query here would
        // fall out of the allowlist and break the exchange. The login form
        // carries the destination in a short-lived cookie instead.
        redirectTo: `${origin}/auth/oauth`,
        queryParams: {
          prompt: 'select_account',
          ...(options?.loginHintDomain ? { hd: options.loginHintDomain } : {})
        }
      }
    })
    if (error) {
      return { success: false, error: error.message }
    }
    return { success: true, redirectTo: data.url }
  },

  async signOut(): Promise<AuthActionResult> {
    const supabase = await createClient()
    const { error } = await supabase.auth.signOut()
    return error ? { success: false, error: error.message } : { success: true }
  },

  validateDeleteUserConfig(): string | null {
    try {
      createAdminClient()
      return null
    } catch (error) {
      console.error('Supabase admin client is not configured:', error)
      return 'Account deletion is not configured. Set SUPABASE_SECRET_KEY.'
    }
  },

  async deleteUser(userId: string): Promise<AuthActionResult> {
    try {
      const adminClient = createAdminClient()
      const { error } = await adminClient.auth.admin.deleteUser(userId)
      if (error) {
        throw error
      }
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error && error.message
            ? error.message
            : 'Failed to delete user'
      }
    }
  }
}

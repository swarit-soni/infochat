// Resolves the Postgres connection string and TLS settings for the app.
//
// DATABASE_RESTRICTED_URL / DATABASE_URL are the documented variables. The
// Vercel <-> Supabase Marketplace integration does not set either of them; it
// injects POSTGRES_URL (pooled, transaction mode) instead. Without this
// fallback a Vercel deployment linked through the integration has no database,
// so every chat save silently fails and follow-up prompts error out.

export type DatabaseUrlSource =
  | 'DATABASE_RESTRICTED_URL'
  | 'DATABASE_URL'
  | 'POSTGRES_URL'

export type ResolvedDatabaseUrl = {
  url: string
  source: DatabaseUrlSource
}

type Env = Record<string, string | undefined>

const SOURCES: DatabaseUrlSource[] = [
  'DATABASE_RESTRICTED_URL', // Restricted (RLS-enforced) user is preferred
  'DATABASE_URL',
  'POSTGRES_URL' // Vercel Supabase integration
]

export function resolveDatabaseUrl(
  env: Env = process.env
): ResolvedDatabaseUrl | undefined {
  for (const source of SOURCES) {
    const value = env[source]?.trim()
    if (value) return { url: value, source }
  }
  return undefined
}

// Query parameters postgres.js understands. Anything else in the URL is sent
// to the server as a startup parameter, and integration-only markers such as
// Supabase's `supa=base-pooler.x` or Prisma's `pgbouncer=true` are not valid
// Postgres settings.
const SUPPORTED_QUERY_PARAMS = new Set([
  'sslmode',
  'sslrootcert',
  'ssl',
  'application_name',
  'options',
  'search_path',
  'connect_timeout',
  'idle_timeout',
  'max_lifetime',
  'target_session_attrs'
])

export type SslSetting = false | 'require' | { rejectUnauthorized: boolean }

export type DatabaseConnectionConfig = {
  url: string
  ssl: SslSetting
}

/**
 * Normalize a connection string for postgres.js and pick the TLS mode.
 *
 * - DATABASE_SSL_DISABLED=true turns TLS off (local/Docker Postgres).
 * - sslmode=require / prefer / allow keep libpq semantics: encrypted, but the
 *   server certificate is not verified. Supabase's pooler certificate is
 *   issued by Supabase's own CA, which Node does not trust by default, and the
 *   integration URL carries sslmode=require for exactly this reason.
 * - Anything else verifies the certificate.
 */
export function buildConnectionConfig(
  rawUrl: string,
  env: Env = process.env
): DatabaseConnectionConfig {
  let url = rawUrl
  let sslmode: string | undefined

  try {
    const parsed = new URL(rawUrl)
    sslmode = parsed.searchParams.get('sslmode')?.toLowerCase() ?? undefined
    for (const key of [...parsed.searchParams.keys()]) {
      if (!SUPPORTED_QUERY_PARAMS.has(key)) parsed.searchParams.delete(key)
    }
    // sslmode is translated into the explicit ssl option below.
    parsed.searchParams.delete('sslmode')
    url = parsed.toString()
  } catch {
    // Not a URL postgres.js can parse either; pass it through unchanged so the
    // driver reports its own error.
  }

  if (env.DATABASE_SSL_DISABLED === 'true' || sslmode === 'disable') {
    return { url, ssl: false }
  }

  if (sslmode === 'require' || sslmode === 'prefer' || sslmode === 'allow') {
    return { url, ssl: 'require' }
  }

  return { url, ssl: { rejectUnauthorized: true } }
}

import { sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

import { buildConnectionConfig, resolveDatabaseUrl } from './connection-config'
import * as relations from './relations'
import * as schema from './schema'

// For server-side usage only
// Use restricted user for application if available, otherwise fall back to regular user
const isDevelopment = process.env.NODE_ENV === 'development'
const isTest = process.env.NODE_ENV === 'test'

// Connection with connection pooling for server environments
// Prefer restricted user for application runtime, then DATABASE_URL, then the
// POSTGRES_URL injected by the Vercel Supabase integration.
const resolvedDatabaseUrl = resolveDatabaseUrl()
const restrictedDatabaseUrl =
  resolvedDatabaseUrl?.source === 'DATABASE_RESTRICTED_URL'
    ? resolvedDatabaseUrl.url
    : undefined
const connectionString =
  resolvedDatabaseUrl?.url ??
  (isTest ? 'postgres://user:pass@localhost:5432/testdb' : undefined)

const databaseErrorMessage =
  'DATABASE_URL, DATABASE_RESTRICTED_URL, or POSTGRES_URL environment variable is not set'

const createDatabase = (rawUrl: string) => {
  // Log which connection is being used (for debugging)
  if (isDevelopment) {
    console.log(
      '[DB] Using connection:',
      restrictedDatabaseUrl
        ? 'Restricted User (RLS Active)'
        : 'Owner User (RLS Bypassed)'
    )
  }

  // SSL: DATABASE_SSL_DISABLED=true turns it off (local/Docker PostgreSQL);
  // sslmode=require in the URL encrypts without verifying (Supabase pooler);
  // otherwise the server certificate is verified.
  const { url, ssl } = buildConnectionConfig(rawUrl)

  const client = postgres(url, {
    ssl,
    prepare: false,
    max: 20 // Max 20 connections
  })

  return drizzle(client, {
    schema: { ...schema, ...relations }
  })
}

type Database = ReturnType<typeof createDatabase>

export const db: Database = connectionString
  ? createDatabase(connectionString)
  : new Proxy({} as Database, {
      get() {
        throw new Error(databaseErrorMessage)
      }
    })

if (!connectionString) {
  console.warn(
    '[DB] Database is not configured. Only guest chat (ENABLE_GUEST_CHAT=true) works without a database.'
  )
}

// Helper type for all tables
export type Schema = typeof schema

// Verify restricted user permissions on startup
if (restrictedDatabaseUrl && !isTest) {
  // Only run verification in server environments, not during build
  if (typeof window === 'undefined' && process.env.NODE_ENV !== 'production') {
    ;(async () => {
      try {
        const result = await db.execute<{ current_user: string }>(
          sql`SELECT current_user`
        )
        const currentUser = result[0]?.current_user

        if (isDevelopment) {
          console.log('[DB] ✓ Connection verified as user:', currentUser)
        }

        // Verify it's the restricted user (app_user)
        if (
          currentUser &&
          !currentUser.includes('app_user') &&
          !currentUser.includes('neondb_owner')
        ) {
          console.warn(
            '[DB] ⚠️ Warning: Expected app_user but connected as:',
            currentUser
          )
        }
      } catch (error) {
        console.error('[DB] ✗ Failed to verify database connection:', error)
        // Log the error but don't terminate the application
        // This allows development to continue even with connection issues
      }
    })()
  }
}

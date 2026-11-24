import * as dotenv from 'dotenv'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'

import 'dotenv/config'

import { buildConnectionConfig } from './connection-config'

// Load from .env.local if DATABASE_URL is not set
if (!process.env.DATABASE_URL) {
  dotenv.config({ path: '.env.local' })
}

// Migrations need DDL rights and a session-mode connection, so prefer the
// owner URL and the integration's non-pooling URL over pooled ones.
function resolveMigrationUrl(): string | undefined {
  return (
    process.env.DATABASE_URL?.trim() ||
    process.env.POSTGRES_URL_NON_POOLING?.trim() ||
    process.env.POSTGRES_URL?.trim() ||
    undefined
  )
}

// This script is used to run migrations on the database
// Run it with: bun run lib/db/migrate.ts

const runMigrations = async () => {
  const rawUrl = resolveMigrationUrl()
  if (!rawUrl) {
    console.error(
      'DATABASE_URL (or POSTGRES_URL_NON_POOLING / POSTGRES_URL) is not defined in environment variables'
    )
    process.exit(1)
  }

  // Respect DATABASE_SSL_DISABLED flag (used in local Docker Postgres).
  // Otherwise encrypt without verifying the certificate so Supabase Postgres
  // migrations work from local dev as well as production.
  const { url } = buildConnectionConfig(rawUrl)
  const sslDisabled = process.env.DATABASE_SSL_DISABLED === 'true'

  const sql = postgres(url, {
    ssl: sslDisabled ? false : { rejectUnauthorized: false },
    prepare: false
  })

  const db = drizzle(sql)

  console.log('Running migrations...')

  try {
    await migrate(db, { migrationsFolder: 'drizzle' })
    console.log('Migrations completed successfully')
  } catch (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  }

  await sql.end()
  process.exit(0)
}

runMigrations()

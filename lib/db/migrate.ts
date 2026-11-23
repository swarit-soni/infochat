import * as dotenv from 'dotenv'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'

import 'dotenv/config'

// Load from .env.local if DATABASE_URL is not set
if (!process.env.DATABASE_URL) {
  dotenv.config({ path: '.env.local' })
}

// This script is used to run migrations on the database
// Run it with: bun run lib/db/migrate.ts

const runMigrations = async () => {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not defined in environment variables')
    process.exit(1)
  }

  const connectionString = process.env.DATABASE_URL

  // Respect DATABASE_SSL_DISABLED flag (used in local Docker Postgres).
  // Use SSL with rejectUnauthorized: false by default so Supabase Postgres
  // migrations work from local dev as well as production.
  const sslDisabled = process.env.DATABASE_SSL_DISABLED === 'true'

  const sql = postgres(connectionString, {
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

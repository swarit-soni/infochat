import { cache } from 'react'

import { sql } from 'drizzle-orm'

import { db } from '@/lib/db'
import { collegeMentorAllowlist, colleges } from '@/lib/db/schema'

import { DEFAULT_COLLEGES } from './defaults'
import { buildDirectory, type ServerCollegeDirectory } from './directory'
import type { College, CollegeDirectory } from './registry'

export type { ServerCollegeDirectory }

const CACHE_TTL_MS = 60_000
let memo: { loadedAt: number; directory: ServerCollegeDirectory } | null = null

function rowToCollege(row: typeof colleges.$inferSelect): College {
  return {
    slug: row.slug,
    name: row.name,
    shortName: row.shortName,
    location: row.location,
    website: row.website,
    officialWebDomains: row.officialWebDomains,
    partnerColleges: row.partnerColleges,
    mentorDomains: row.mentorDomains,
    studentDomains: row.studentDomains,
    mentorRequiresAllowlist: row.mentorRequiresAllowlist,
    aliases: row.aliases,
    squadLabel: row.squadLabel,
    residencyLabel: row.residencyLabel,
    eventsLabel: row.eventsLabel,
    gchatSpaces: row.gchatSpaces,
    enabled: row.enabled,
    sortOrder: row.sortOrder
  }
}

async function loadDirectory(): Promise<ServerCollegeDirectory> {
  try {
    const { rows, allowlist } = await db.transaction(async tx => {
      // The allowlist is only readable with this flag (see its RLS policy).
      await tx.execute(
        sql`SELECT set_config('app.college_directory_read', 'true', true)`
      )
      const rows = await tx.select().from(colleges)
      const allowlist = await tx
        .select({
          college: collegeMentorAllowlist.college,
          email: collegeMentorAllowlist.email
        })
        .from(collegeMentorAllowlist)
      return { rows, allowlist }
    })
    if (rows.length > 0) {
      return buildDirectory(rows.map(rowToCollege), allowlist)
    }
    console.warn(
      '[Colleges] The colleges table is empty; using built-in defaults.'
    )
  } catch (error) {
    console.warn(
      '[Colleges] Could not load colleges; using built-in defaults:',
      error instanceof Error ? error.message : String(error)
    )
  }
  return buildDirectory(DEFAULT_COLLEGES, [])
}

/**
 * The enabled colleges, from the `colleges` table. Cached per server
 * instance for a minute (and per render); admin edits call
 * `invalidateCollegeDirectory()` so they show up immediately on that instance.
 */
export const getCollegeDirectory = cache(
  async (): Promise<ServerCollegeDirectory> => {
    if (memo && Date.now() - memo.loadedAt < CACHE_TTL_MS) {
      return memo.directory
    }
    const directory = await loadDirectory()
    memo = { loadedAt: Date.now(), directory }
    return directory
  }
)

export function invalidateCollegeDirectory(): void {
  memo = null
}

/** A client-safe copy of the directory (drops the mentor allowlist). */
export function toPublicDirectory(
  directory: ServerCollegeDirectory
): CollegeDirectory {
  return { list: directory.list, bySlug: directory.bySlug }
}

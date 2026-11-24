import type { CollegeSlug } from '@/lib/colleges/registry'
import type {
  KnowledgeAuthority,
  KnowledgeDomain,
  KnowledgePriority,
  KnowledgeSourceSystem
} from '@/lib/db/schema'

/**
 * A knowledge-base document researched from a college's official public
 * sources. Seeded with `bun run seed:knowledge` (scripts/seed-knowledge-base.ts).
 *
 * Content is restricted to what the cited source says; anything uncertain is
 * flagged in the text so Sera can tell students to confirm it.
 */
export interface KnowledgeSeedDocument {
  /** Owning college (tenant). Kalvium also reads JECRC's documents. */
  college: CollegeSlug
  title: string
  domain: KnowledgeDomain
  sourceSystem: KnowledgeSourceSystem
  authority: KnowledgeAuthority
  priority?: KnowledgePriority
  program?: string
  semester?: string
  /** When the source took effect or was published (ISO date). */
  effectiveDate: string
  /** When the information stops applying (ISO date), if it is time-bound. */
  expiresAt?: string
  actionRequired?: string
  /** The official page or PDF the content was taken from. */
  sourceUrl: string
  /** Markdown. Tables are kept intact by the chunker. */
  content: string
}

/** Date the sources below were read and checked. */
export const KNOWLEDGE_SEED_VERIFIED_ON = '2026-11-24'

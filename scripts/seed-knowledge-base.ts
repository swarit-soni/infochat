/**
 * Load the researched knowledge base (lib/rag/knowledge-seed) into Postgres.
 *
 *   bun run seed:knowledge             # all colleges
 *   bun run seed:knowledge jecrc       # one college
 *   bun run seed:knowledge --dry-run   # list what would be ingested
 *
 * Needs DATABASE_URL (or POSTGRES_URL). With GOOGLE_GENERATIVE_AI_API_KEY set,
 * chunks get Gemini embeddings; without it they are full-text searchable only.
 * Re-running is safe: documents are de-duplicated per college by content hash.
 */
import { isCollegeSlug } from '@/lib/colleges/registry'
import { ingestKnowledgeDocument } from '@/lib/rag/ingestion'
import { KNOWLEDGE_SEED } from '@/lib/rag/knowledge-seed'

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const colleges = args.filter(arg => !arg.startsWith('--'))
  for (const college of colleges) {
    if (!isCollegeSlug(college)) {
      throw new Error(`Unknown college "${college}".`)
    }
  }

  const documents = KNOWLEDGE_SEED.filter(
    doc => colleges.length === 0 || colleges.includes(doc.college)
  )
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim()) {
    console.warn(
      'GOOGLE_GENERATIVE_AI_API_KEY is not set: chunks will have no embeddings (full-text search only).'
    )
  }

  let created = 0
  let skipped = 0
  for (const doc of documents) {
    if (dryRun) {
      console.log(`[dry-run] ${doc.college} · ${doc.title}`)
      continue
    }
    const result = await ingestKnowledgeDocument({
      college: doc.college,
      title: doc.title,
      content: doc.content,
      domain: doc.domain,
      sourceSystem: doc.sourceSystem,
      authority: doc.authority,
      priority: doc.priority ?? 'standard',
      program: doc.program ?? null,
      semester: doc.semester ?? null,
      effectiveDate: new Date(doc.effectiveDate),
      expiresAt: doc.expiresAt ? new Date(doc.expiresAt) : null,
      actionRequired: doc.actionRequired ?? null,
      sourceUrl: doc.sourceUrl,
      channel: 'web_crawl',
      senderRole: 'system',
      status: 'active'
    })
    if (result.deduplicated) {
      skipped++
      console.log(`= ${doc.college} · ${doc.title} (already present)`)
    } else {
      created++
      console.log(
        `+ ${doc.college} · ${doc.title} (${result.chunkCount} chunks)`
      )
    }
  }

  console.log(
    dryRun
      ? `${documents.length} documents would be ingested.`
      : `Done: ${created} added, ${skipped} already present.`
  )
  process.exit(0)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})

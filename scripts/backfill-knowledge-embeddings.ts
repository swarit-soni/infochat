/**
 * Fill in Gemini embeddings for knowledge chunks that have none (e.g. the
 * seeded knowledge base, which was loaded with full-text search only).
 *
 *   bun run backfill:knowledge-embeddings
 *
 * Needs DATABASE_URL (or POSTGRES_URL) and GOOGLE_GENERATIVE_AI_API_KEY.
 * Safe to re-run: only chunks with a NULL embedding are touched.
 */
import { eq, isNull } from 'drizzle-orm'

import { db } from '@/lib/db'
import { knowledgeChunks } from '@/lib/db/schema'
import { generateDocumentEmbeddings } from '@/lib/rag/embeddings'

const BATCH_SIZE = 20

async function main() {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim()) {
    throw new Error('GOOGLE_GENERATIVE_AI_API_KEY is required.')
  }

  let updated = 0
  for (;;) {
    const chunks = await db
      .select({ id: knowledgeChunks.id, content: knowledgeChunks.content })
      .from(knowledgeChunks)
      .where(isNull(knowledgeChunks.embedding))
      .limit(BATCH_SIZE)
    if (chunks.length === 0) break

    const embeddings = await generateDocumentEmbeddings(
      chunks.map(chunk => chunk.content)
    )
    if (embeddings.every(embedding => embedding === null)) {
      throw new Error('Embedding generation failed; stopping.')
    }
    for (const [index, chunk] of chunks.entries()) {
      const embedding = embeddings[index]
      if (!embedding) continue
      await db
        .update(knowledgeChunks)
        .set({ embedding })
        .where(eq(knowledgeChunks.id, chunk.id))
      updated++
    }
    console.log(`Embedded ${updated} chunks so far`)
  }

  console.log(`Done: ${updated} chunks embedded.`)
  process.exit(0)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})

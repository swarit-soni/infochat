import { google } from '@ai-sdk/google'
import { embed, embedMany } from 'ai'

import { EMBEDDING_DIMENSIONS } from '@/lib/db/schema'

export const EMBEDDING_MODEL_ID = 'gemini-embedding-001'

function isEmbeddingConfigured(): boolean {
  return Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim())
}

/**
 * Generate a 768-dimension query embedding for hybrid pgvector retrieval.
 * Degrades gracefully to null when offline or when API keys are unconfigured.
 */
export async function generateQueryEmbedding(
  query: string
): Promise<number[] | null> {
  const trimmed = query.trim()
  if (!trimmed || !isEmbeddingConfigured()) {
    return null
  }

  try {
    const result = await embed({
      model: google.embeddingModel(EMBEDDING_MODEL_ID),
      value: trimmed,
      dimensions: EMBEDDING_DIMENSIONS,
      providerOptions: {
        google: {
          outputDimensionality: EMBEDDING_DIMENSIONS,
          taskType: 'RETRIEVAL_QUERY'
        }
      }
    })
    return Array.isArray(result.embedding) &&
      result.embedding.length === EMBEDDING_DIMENSIONS
      ? result.embedding
      : null
  } catch (error) {
    console.warn(
      '[RAG] Query embedding generation failed, falling back to full-text search:',
      error instanceof Error ? error.message : String(error)
    )
    return null
  }
}

/**
 * Generate 768-dimension document embeddings for an array of chunks.
 * Returns null entries on missing credentials or provider failure so FTS
 * indexing still succeeds without blocking document ingestion.
 */
export async function generateDocumentEmbeddings(
  texts: string[]
): Promise<Array<number[] | null>> {
  if (texts.length === 0) return []
  if (!isEmbeddingConfigured()) {
    return texts.map(() => null)
  }

  try {
    const result = await embedMany({
      model: google.embeddingModel(EMBEDDING_MODEL_ID),
      values: texts.map(t => t.trim() || ' '),
      dimensions: EMBEDDING_DIMENSIONS,
      providerOptions: {
        google: {
          outputDimensionality: EMBEDDING_DIMENSIONS,
          taskType: 'RETRIEVAL_DOCUMENT'
        }
      }
    })

    return texts.map((_, index) => {
      const vector = result.embeddings[index]
      return Array.isArray(vector) && vector.length === EMBEDDING_DIMENSIONS
        ? vector
        : null
    })
  } catch (error) {
    console.warn(
      '[RAG] Document embedding generation failed, storing chunks for full-text search only:',
      error instanceof Error ? error.message : String(error)
    )
    return texts.map(() => null)
  }
}

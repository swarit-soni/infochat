import { BKBIRLA_KNOWLEDGE } from './bkbirla'
import { JECRC_KNOWLEDGE } from './jecrc'
import { KALVIUM_KNOWLEDGE } from './kalvium'
import { NATIONAL_KNOWLEDGE } from './national'
import type { KnowledgeSeedDocument } from './types'

export type { KnowledgeSeedDocument } from './types'
export { KNOWLEDGE_SEED_VERIFIED_ON } from './types'

/** Every researched knowledge-base document, across all colleges. */
export const KNOWLEDGE_SEED: readonly KnowledgeSeedDocument[] = [
  ...KALVIUM_KNOWLEDGE,
  ...JECRC_KNOWLEDGE,
  ...BKBIRLA_KNOWLEDGE,
  ...NATIONAL_KNOWLEDGE
]

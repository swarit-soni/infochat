import aiims from './data/aiims.json'
import bhu from './data/bhu.json'
import iisc from './data/iisc.json'
import iitb from './data/iitb.json'
import iitd from './data/iitd.json'
import iitk from './data/iitk.json'
import iitkgp from './data/iitkgp.json'
import iitm from './data/iitm.json'
import iitr from './data/iitr.json'
import jnu from './data/jnu.json'
import type { KnowledgeSeedDocument } from './types'

type SeedEntry = Omit<KnowledgeSeedDocument, 'college' | 'authority'>

/**
 * India's ten top-ranked institutions (NIRF 2025, overall). Each JSON file
 * holds documents researched from that institution's official website,
 * read 2026-11-25. Each document is owned by, and issued by, its college.
 */
const NATIONAL_SOURCES: Record<string, readonly unknown[]> = {
  iitm,
  iisc,
  iitb,
  iitd,
  iitk,
  iitkgp,
  iitr,
  aiims,
  jnu,
  bhu
}

export const NATIONAL_KNOWLEDGE: KnowledgeSeedDocument[] = Object.entries(
  NATIONAL_SOURCES
).flatMap(([college, docs]) =>
  (docs as SeedEntry[]).map(doc => ({ ...doc, college, authority: college }))
)

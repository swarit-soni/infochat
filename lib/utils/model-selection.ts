import { ReadonlyRequestCookies } from 'next/dist/server/web/spec-extension/adapters/request-cookies'

import { DEFAULT_MODEL, FIXED_MODEL } from '@/lib/config/default-model'
import { Model } from '@/lib/types/models'
import { SearchMode } from '@/lib/types/search'
import { isProviderEnabled } from '@/lib/utils/registry'

interface ModelSelectionParams {
  searchMode?: SearchMode
  cookieStore?: ReadonlyRequestCookies
}

/**
 * Returns the fixed universal model (Gemini 3.5 Flash-Lite) for all users
 * when the Google provider is enabled. User and mode-based model selection
 * are disabled.
 */
export async function selectModel(
  _params: ModelSelectionParams = {}
): Promise<Model | null> {
  if (!isProviderEnabled(FIXED_MODEL.providerId)) {
    console.warn(
      `[ModelSelection] Fixed model provider "${FIXED_MODEL.providerId}" is not enabled (set GOOGLE_GENERATIVE_AI_API_KEY).`
    )
    return null
  }

  return FIXED_MODEL
}

export { DEFAULT_MODEL, FIXED_MODEL }

import { Model } from '@/lib/types/models'

export const FIXED_MODEL: Model = {
  id: 'gemini-3.5-flash-lite',
  name: 'Gemini 3.5 Flash-Lite',
  provider: 'Google',
  providerId: 'google'
}

export const DEFAULT_MODEL: Model = FIXED_MODEL

// Answers fall back to this model when the fixed model is overloaded (Gemini
// "high demand" 503s). It is the model Sera ran on before Gemini 3.5.
export const FALLBACK_MODEL_ID = 'google:gemini-3.1-flash-lite'

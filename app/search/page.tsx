import { redirect } from 'next/navigation'

import { getCurrentUserId } from '@/lib/auth/get-current-user'
import { isAnonymousMode } from '@/lib/auth/provider'
import { FIXED_MODEL } from '@/lib/config/default-model'
import { generateUUID } from '@/lib/utils'
import { isProviderEnabled } from '@/lib/utils/registry'

import { Chat } from '@/components/chat'

export const maxDuration = 60

export default async function SearchPage(props: {
  searchParams: Promise<{ q: string }>
}) {
  const { q } = await props.searchParams
  if (!q) {
    redirect('/')
  }

  const id = generateUUID()
  const userId = await getCurrentUserId()
  const isCloudDeployment = process.env.MORPHIC_CLOUD_DEPLOYMENT === 'true'
  const libraryAvailable = !isAnonymousMode()
  const hasAvailableModels = isProviderEnabled(FIXED_MODEL.providerId)

  return (
    <Chat
      id={id}
      query={q}
      isGuest={!userId}
      isCloudDeployment={isCloudDeployment}
      libraryAvailable={libraryAvailable}
      hasAvailableModels={hasAvailableModels}
    />
  )
}

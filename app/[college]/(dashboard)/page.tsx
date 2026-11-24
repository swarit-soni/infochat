import { getCurrentUserId } from '@/lib/auth/get-current-user'
import { isAnonymousMode } from '@/lib/auth/provider'
import { FIXED_MODEL } from '@/lib/config/default-model'
import { isProviderEnabled } from '@/lib/utils/registry'

import { Chat } from '@/components/chat'

export default async function CollegeHomePage() {
  const userId = await getCurrentUserId()
  const isCloudDeployment = process.env.SERA_CLOUD_DEPLOYMENT === 'true'
  const libraryAvailable = !isAnonymousMode()
  const hasAvailableModels = isProviderEnabled(FIXED_MODEL.providerId)

  return (
    <Chat
      isGuest={!userId}
      isCloudDeployment={isCloudDeployment}
      libraryAvailable={libraryAvailable}
      hasAvailableModels={hasAvailableModels}
    />
  )
}

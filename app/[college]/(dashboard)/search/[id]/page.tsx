import { cache } from 'react'
import { notFound, redirect } from 'next/navigation'

import { getChatMeta } from '@/lib/actions/chat'
import { getCurrentUserId } from '@/lib/auth/get-current-user'
import { isAnonymousMode } from '@/lib/auth/provider'
import { FIXED_MODEL } from '@/lib/config/default-model'
import { isProviderEnabled } from '@/lib/utils/registry'

import { Chat } from '@/components/chat'

export const maxDuration = 60

// Dedupe the read shared by generateMetadata and the page within one request
const getChat = cache(getChatMeta)

export async function generateMetadata(props: {
  params: Promise<{ college: string; id: string }>
}) {
  const { id } = await props.params
  const userId = await getCurrentUserId()

  const chat = await getChat(id, userId)

  if (!chat) {
    return { title: 'Search' }
  }

  return {
    title: chat.title.toString().slice(0, 50) || 'Search'
  }
}

export default async function SearchPage(props: {
  params: Promise<{ college: string; id: string }>
}) {
  const { college, id } = await props.params
  const loginPath = `/${college}/auth/student?next=${encodeURIComponent(
    `/${college}/search/${id}`
  )}`
  const userId = await getCurrentUserId()

  const chat = await getChat(id, userId)

  if (!chat) {
    // A logged-out visitor cannot tell a private chat from a missing one:
    // both are hidden behind null by the permission check in the loader.
    // Send them to sign in (the owner can then open their private link)
    // instead of a dead-end 404; public chats render above without a
    // login bounce. The ?next= carries the chat back through the login.
    if (!userId) {
      redirect(loginPath)
    }
    notFound()
  }

  if (chat.visibility === 'private' && !userId) {
    redirect(loginPath)
  }

  const isCloudDeployment = process.env.SERA_CLOUD_DEPLOYMENT === 'true'
  const libraryAvailable = !isAnonymousMode()
  const hasAvailableModels = isProviderEnabled(FIXED_MODEL.providerId)

  return (
    <Chat
      id={id}
      isGuest={!userId}
      isCloudDeployment={isCloudDeployment}
      libraryAvailable={libraryAvailable}
      hasAvailableModels={hasAvailableModels}
    />
  )
}

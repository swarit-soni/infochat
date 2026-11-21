import { redirect } from 'next/navigation'

import { safeRedirectPath } from '@/lib/auth/redirect-target'

export const dynamic = 'force-dynamic'

export default async function SignUpPage({
  searchParams
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const { next } = await searchParams
  if (next) {
    const safeNext = safeRedirectPath(next)
    if (safeNext !== '/') {
      redirect(`/auth/login?next=${encodeURIComponent(safeNext)}`)
    }
  }
  redirect('/auth/login')
}

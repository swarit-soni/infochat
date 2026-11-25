import { IconAlertCircle as AlertCircle } from '@tabler/icons-react'

import { toPublicErrorPayload } from '@/lib/errors/public-error'

import { Card } from '@/components/ui/card'

interface ChatErrorProps {
  error: Error | string | null | undefined
}

export function ChatError({ error }: ChatErrorProps) {
  if (!error) return null

  const errorMessage = toPublicErrorPayload(error).error

  return (
    <Card className="border-(--md-sys-color-error) bg-(--md-sys-color-error)/10 p-4">
      <div className="flex items-center gap-3">
        <AlertCircle className="size-5 text-(--md-sys-color-error) shrink-0" />
        <p className="text-sm text-(--md-sys-color-error)">{errorMessage}</p>
      </div>
    </Card>
  )
}

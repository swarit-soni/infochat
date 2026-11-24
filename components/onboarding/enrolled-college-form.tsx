'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { saveEnrolledCollege } from '@/lib/actions/onboarding'
import { COLLEGE_SLUGS, getCollege } from '@/lib/colleges/registry'
import { cn } from '@/lib/utils/index'

import { Button } from '@/components/ui/button'

const OPTIONS = [
  ...COLLEGE_SLUGS.map(slug => ({
    value: slug as string,
    label: getCollege(slug).name,
    description: getCollege(slug).location
  })),
  {
    value: 'none',
    label: 'Not enrolled yet',
    description: "I'm exploring colleges or applying for admission"
  }
]

export function EnrolledCollegeForm({ next }: { next: string }) {
  const router = useRouter()
  const [answer, setAnswer] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!answer) {
      setError('Please choose an option.')
      return
    }
    setError(null)
    startTransition(async () => {
      const result = await saveEnrolledCollege(answer)
      if (!result.success) {
        setError(result.error ?? 'Could not save your answer.')
        return
      }
      router.replace(next)
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <fieldset className="flex flex-col gap-2">
        <legend className="sr-only">Which college are you enrolled in?</legend>
        {OPTIONS.map(option => (
          <label
            key={option.value}
            className={cn(
              'flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm transition-colors hover:bg-accent',
              answer === option.value && 'border-primary bg-accent'
            )}
          >
            <input
              type="radio"
              name="enrolled-college"
              value={option.value}
              checked={answer === option.value}
              onChange={() => setAnswer(option.value)}
              className="mt-1"
            />
            <span>
              <span className="block font-medium">{option.label}</span>
              <span className="block text-xs text-muted-foreground">
                {option.description}
              </span>
            </span>
          </label>
        ))}
      </fieldset>

      {error && (
        <p
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {error}
        </p>
      )}

      <Button type="submit" disabled={isPending}>
        {isPending ? 'Saving...' : 'Continue'}
      </Button>
    </form>
  )
}

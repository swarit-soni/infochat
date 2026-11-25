'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { saveEnrolledCollege } from '@/lib/actions/onboarding'
import { cn } from '@/lib/utils/index'

import { Button } from '@/components/ui/button'

export interface CollegeOption {
  value: string
  label: string
  description: string
  /** Partner campuses a student of this college can be on. */
  campuses: { value: string; label: string }[]
}

const NOT_ENROLLED: CollegeOption = {
  value: 'none',
  label: 'Not enrolled yet',
  description: "I'm exploring colleges or applying for admission",
  campuses: []
}

function OptionList({
  name,
  legend,
  options,
  value,
  onChange
}: {
  name: string
  legend: string
  options: { value: string; label: string; description?: string }[]
  value: string | null
  onChange: (value: string) => void
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-sm font-medium">{legend}</legend>
      {options.map(option => (
        <label
          key={option.value}
          className={cn(
            'flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm transition-colors hover:bg-accent',
            value === option.value && 'border-primary bg-accent'
          )}
        >
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
            className="mt-1"
          />
          <span>
            <span className="block font-medium">{option.label}</span>
            {option.description && (
              <span className="block text-xs text-muted-foreground">
                {option.description}
              </span>
            )}
          </span>
        </label>
      ))}
    </fieldset>
  )
}

/**
 * Student sign-up questions. `lockedCollege` is set when the college is
 * verified from the student's email domain: only the campus is asked.
 */
export function EnrolledCollegeForm({
  next,
  colleges,
  lockedCollege = null,
  initialCampus = null
}: {
  next: string
  colleges: CollegeOption[]
  lockedCollege?: string | null
  initialCampus?: string | null
}) {
  const router = useRouter()
  const [answer, setAnswer] = useState<string | null>(lockedCollege)
  const [campus, setCampus] = useState<string | null>(initialCampus)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const options = [...colleges, NOT_ENROLLED]
  const selected = options.find(option => option.value === answer) ?? null
  const campusOptions = selected?.campuses.length
    ? [...selected.campuses, { value: 'none', label: `${selected.label} only` }]
    : []

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!answer) {
      setError('Please choose an option.')
      return
    }
    if (campusOptions.length > 0 && !campus) {
      setError('Please choose your campus.')
      return
    }
    setError(null)
    startTransition(async () => {
      const result = await saveEnrolledCollege(
        answer,
        campusOptions.length > 0 ? campus : null
      )
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
      {!lockedCollege && (
        <div className="max-h-[50vh] overflow-y-auto pr-1">
          <OptionList
            name="enrolled-college"
            legend="Which college are you enrolled in?"
            options={options}
            value={answer}
            onChange={value => {
              setAnswer(value)
              setCampus(null)
            }}
          />
        </div>
      )}

      {campusOptions.length > 0 && (
        <OptionList
          name="campus"
          legend="Which campus are you on?"
          options={campusOptions}
          value={campus}
          onChange={setCampus}
        />
      )}

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

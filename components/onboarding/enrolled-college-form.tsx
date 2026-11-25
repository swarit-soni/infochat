'use client'

import { useState, useTransition } from 'react'

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

const DEMO_COLLEGE_SLUG = 'sera-demo'

/** Put the demo university at the top for live onboarding walkthroughs. */
export function buildOnboardingOptions(
  colleges: CollegeOption[]
): CollegeOption[] {
  const demo = colleges.find(college => college.value === DEMO_COLLEGE_SLUG)
  if (!demo) return [NOT_ENROLLED, ...colleges]
  const rest = colleges.filter(college => college.value !== DEMO_COLLEGE_SLUG)
  return [demo, NOT_ENROLLED, ...rest]
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
            'flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm transition-colors hover:bg-(--md-sys-color-surface-container-high)',
            value === option.value &&
              'border-(--md-sys-color-primary) bg-(--md-sys-color-surface-container-high)'
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
              <span className="block text-xs text-(--md-sys-color-on-surface-variant)">
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
  const [answer, setAnswer] = useState<string | null>(lockedCollege)
  const [campus, setCampus] = useState<string | null>(initialCampus)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [isLeaving, setIsLeaving] = useState(false)

  // List the demo university first for live demos, followed by admission seekers.
  const options = buildOnboardingOptions(colleges)
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
      // A full navigation: the client router may still hold the pre-onboarding
      // render of `next` (a redirect back here), which would leave this form
      // stuck on "Saving...".
      setIsLeaving(true)
      window.location.replace(next)
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
          className="rounded-md border border-(--md-sys-color-error)/30 bg-(--md-sys-color-error)/10 p-3 text-sm text-(--md-sys-color-error)"
        >
          {error}
        </p>
      )}

      <Button type="submit" disabled={isPending || isLeaving}>
        {isPending || isLeaving ? 'Saving...' : 'Continue'}
      </Button>
    </form>
  )
}

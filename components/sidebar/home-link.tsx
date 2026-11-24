'use client'

import type { ComponentProps, MouseEvent } from 'react'
import Link from 'next/link'

import { useCollegeHref } from '@/lib/colleges/use-college'
import { SHORTCUT_EVENTS } from '@/lib/keyboard-shortcuts'

// A chat started on the home page only rewrites the URL, so navigating to "/"
// keeps it on screen. Let the mounted ChatPanel reset it instead, and fall back
// to normal navigation when nothing handles the event.
function handleHomeClick(event: MouseEvent<HTMLAnchorElement>) {
  if (
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  ) {
    return
  }

  const handled = !window.dispatchEvent(
    new CustomEvent(SHORTCUT_EVENTS.newChat, { cancelable: true })
  )
  if (handled) event.preventDefault()
}

export function HomeLink(
  props: Omit<ComponentProps<typeof Link>, 'href' | 'onClick'>
) {
  const collegeHref = useCollegeHref()
  return <Link {...props} href={collegeHref('/')} onClick={handleHomeClick} />
}

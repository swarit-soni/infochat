'use client'

import { useState } from 'react'

import {
  IconChevronDown as ChevronDown,
  IconChevronUp as ChevronUp,
  IconFileText as FileText
} from '@tabler/icons-react'

import { faviconUrl } from '@/lib/utils/favicon'

// Collapsed card for a pasted text blob (a `data-pastedContent` part, or a
// legacy `<user-content>` block in old messages).
export function PastedContentCard({
  text,
  label = 'Pasted content'
}: {
  text: string
  label?: string
}) {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <button
        type="button"
        className="flex w-fit items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-(--md-sys-color-on-surface-variant) hover:bg-(--md-sys-color-surface-container) hover:text-(--md-sys-color-on-surface)"
        onClick={() => setOpen(o => !o)}
      >
        <FileText className="size-3.5 shrink-0" />
        {label} · {text.length.toLocaleString()} chars
        {open ? (
          <ChevronUp className="size-3.5 shrink-0" />
        ) : (
          <ChevronDown className="size-3.5 shrink-0" />
        )}
      </button>
      {open && (
        <p className="mt-1.5 max-h-60 overflow-auto whitespace-pre-wrap break-words text-xs text-(--md-sys-color-on-surface-variant)/80">
          {text}
        </p>
      )}
    </div>
  )
}

// Favicon chip for a pasted URL (a `data-sourceUrl` part). Clickable.
export function UrlChip({ url }: { url: string }) {
  let host = url
  try {
    host = new URL(url).host.replace(/^www\./, '')
  } catch {}
  const favicon = faviconUrl(host, 32)
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex w-fit items-center gap-1.5 rounded-full border border-(--md-sys-color-outline) bg-(--md-sys-color-surface) py-1 pl-2 pr-2.5 text-xs text-(--md-sys-color-on-surface-variant) hover:text-(--md-sys-color-on-surface)"
    >
      {favicon && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={favicon}
          alt=""
          width={14}
          height={14}
          className="size-3.5 shrink-0 rounded-sm"
        />
      )}
      <span className="max-w-[220px] truncate">{host}</span>
    </a>
  )
}

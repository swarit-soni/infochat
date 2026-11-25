'use client'

import type { ComponentFn } from '@json-render/react'

import type { CatalogType } from './shared'

export const Badge: ComponentFn<CatalogType, 'Badge'> = ({ props }) => {
  return (
    <span className="w-fit rounded bg-(--md-sys-color-surface-container) px-1.5 py-0.5 text-[11px] text-(--md-sys-color-on-surface-variant)">
      {props.text}
    </span>
  )
}

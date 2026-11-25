import * as React from 'react'

import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-hidden focus:ring-2 focus:ring-(--md-sys-color-primary) focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-(--md-sys-color-primary) text-(--md-sys-color-on-primary) hover:bg-(--md-sys-color-primary)/80',
        secondary:
          'border-transparent bg-(--md-sys-color-secondary-container) text-(--md-sys-color-on-secondary-container) hover:bg-(--md-sys-color-secondary-container)/80',
        destructive:
          'border-transparent bg-(--md-sys-color-error) text-(--md-sys-color-on-error) hover:bg-(--md-sys-color-error)/80',
        outline: 'text-(--md-sys-color-on-surface)'
      }
    },
    defaultVariants: {
      variant: 'default'
    }
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }

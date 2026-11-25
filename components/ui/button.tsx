import * as React from 'react'

import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils/index'

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-(--md-sys-color-surface) transition-[background-color,border-color,color,box-shadow,transform] duration-[140ms] ease-[var(--motion-ease-out)] active:scale-[0.98] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-(--md-sys-color-primary) focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'bg-(--md-sys-color-primary) text-(--md-sys-color-on-primary) hover:bg-(--md-sys-color-primary)/90',
        destructive:
          'bg-(--md-sys-color-error) text-(--md-sys-color-on-error) hover:bg-(--md-sys-color-error)/90',
        outline:
          'border border-(--md-sys-color-outline) bg-(--md-sys-color-surface) hover:bg-(--md-sys-color-surface-container-high) hover:text-(--md-sys-color-on-surface)',
        secondary:
          'bg-(--md-sys-color-secondary-container) text-(--md-sys-color-on-secondary-container) hover:bg-(--md-sys-color-secondary-container)/80',
        ghost:
          'hover:bg-(--md-sys-color-surface-container-high) hover:text-(--md-sys-color-on-surface)',
        link: 'text-(--md-sys-color-primary) underline-offset-4 hover:underline'
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'size-10'
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'default'
    }
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }

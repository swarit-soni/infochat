import { cn } from '@/lib/utils/index'

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-(--md-sys-color-surface-container)',
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }

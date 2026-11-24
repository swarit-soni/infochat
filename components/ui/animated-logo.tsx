'use client'

import { useEffect, useState } from 'react'

import { cn } from '@/lib/utils'

import {
  OWL_DEFAULT_COLOR,
  OWL_EYE_RADIUS,
  OWL_EYES,
  OwlBody
} from './owl-mark'

export function AnimatedLogo({
  animate = true,
  className,
  bodyColor,
  ...props
}: React.ComponentProps<'svg'> & {
  animate?: boolean
  /** Owl color; the body is a lighter gradient of it. */
  bodyColor?: string
}) {
  const [isBlinking, setIsBlinking] = useState(false)

  useEffect(() => {
    if (animate) {
      return
    }

    let blinkTimeoutId: ReturnType<typeof setTimeout> | undefined
    let nextBlinkTimeoutId: ReturnType<typeof setTimeout>

    const scheduleBlink = () => {
      const nextDelay = Math.random() * 5000 + 2000

      nextBlinkTimeoutId = setTimeout(() => {
        setIsBlinking(true)

        blinkTimeoutId = setTimeout(() => {
          setIsBlinking(false)
          scheduleBlink()
        }, 200)
      }, nextDelay)
    }

    scheduleBlink()

    return () => {
      if (blinkTimeoutId) {
        clearTimeout(blinkTimeoutId)
      }
      clearTimeout(nextBlinkTimeoutId)
    }
  }, [animate])

  return (
    <svg
      fill="currentColor"
      viewBox="0 0 256 256"
      role="img"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('size-8', className)}
      {...props}
    >
      <OwlBody bodyColor={bodyColor} />
      <g
        className={cn(
          'origin-center',
          animate &&
            'animate-[lookAround_2.8s_var(--motion-ease-in-out)_infinite] will-change-transform motion-reduce:animate-none motion-reduce:will-change-auto'
        )}
      >
        {OWL_EYES.map(eye => (
          <ellipse
            key={eye.cx}
            cx={eye.cx}
            cy={eye.cy}
            rx={OWL_EYE_RADIUS}
            ry={OWL_EYE_RADIUS}
            style={{ fill: bodyColor ?? OWL_DEFAULT_COLOR }}
            className={cn(!animate && isBlinking && 'animate-blink')}
          />
        ))}
      </g>
    </svg>
  )
}

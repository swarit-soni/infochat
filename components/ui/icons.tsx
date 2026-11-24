'use client'

import { useEffect, useRef } from 'react'

import { cn } from '@/lib/utils'

import {
  OWL_DEFAULT_COLOR,
  OWL_EYE_RADIUS,
  OWL_EYES,
  OwlBody,
  OwlOutline
} from './owl-mark'

type LogoProps = React.ComponentProps<'svg'> & {
  /** Owl color; the body is a lighter gradient of it. */
  bodyColor?: string
}

function IconLogo({ className, bodyColor, ...props }: LogoProps) {
  return (
    <svg
      fill="currentColor"
      viewBox="0 0 256 256"
      role="img"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('size-4', className)}
      {...props}
    >
      <OwlBody bodyColor={bodyColor} />
      {OWL_EYES.map(eye => (
        <circle
          key={eye.cx}
          cx={eye.cx}
          cy={eye.cy}
          r={OWL_EYE_RADIUS}
          style={{ fill: bodyColor ?? OWL_DEFAULT_COLOR }}
        />
      ))}
    </svg>
  )
}

function IconLogoOutline({ className, ...props }: React.ComponentProps<'svg'>) {
  return (
    <svg
      fill="currentColor"
      viewBox="0 0 256 256"
      role="img"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('size-4', className)}
      {...props}
    >
      <OwlOutline />
      <g transform="translate(128 128) scale(0.9) translate(-128 -128)">
        {OWL_EYES.map(eye => (
          <circle
            key={eye.cx}
            cx={eye.cx}
            cy={eye.cy}
            r={OWL_EYE_RADIUS}
            fill="currentColor"
          />
        ))}
      </g>
    </svg>
  )
}

function IconBlinkingLogo({ className, bodyColor, ...props }: LogoProps) {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const blinkElements = svg.querySelectorAll('.blink')
    const initialPositions = Array.from(blinkElements).map(el => ({
      cx: parseFloat(el.getAttribute('cx') || '0'),
      cy: parseFloat(el.getAttribute('cy') || '0')
    }))

    const triggerBlink = () => {
      blinkElements.forEach(el => {
        el.classList.add('animate-blink')
        setTimeout(() => {
          el.classList.remove('animate-blink')
        }, 200)
      })
    }

    const randomInterval = () => Math.random() * 8000 + 2000

    let timeoutId: ReturnType<typeof setTimeout>
    const startBlinking = () => {
      triggerBlink()
      timeoutId = setTimeout(startBlinking, randomInterval())
    }

    startBlinking()

    const handleMove = (clientX: number, clientY: number) => {
      if (svgRef.current) {
        // Map the pointer into the SVG's viewBox units so it shares a
        // coordinate space with the eye centers.
        const ctm = svgRef.current.getScreenCTM()
        if (!ctm) return
        const pointer = new DOMPoint(clientX, clientY).matrixTransform(
          ctm.inverse()
        )

        // How far the eyes may shift, and the pointer distance (in viewBox
        // units) at which they reach it.
        const maxMove = 4
        const reach = 96

        blinkElements.forEach((el, index) => {
          const { cx, cy } = initialPositions[index]
          const vx = pointer.x - cx
          const vy = pointer.y - cy
          const distance = Math.hypot(vx, vy)
          // Point toward the cursor, easing in until it is `reach` away.
          const factor =
            distance === 0
              ? 0
              : (maxMove * Math.min(distance, reach)) / reach / distance
          const targetDx = vx * factor
          const targetDy = vy * factor

          let velocityX = 0
          let velocityY = 0
          const damping = 0.05

          const animate = () => {
            const currentCx = parseFloat(el.getAttribute('cx') || '0')
            const currentCy = parseFloat(el.getAttribute('cy') || '0')

            const dx = (targetDx - (currentCx - cx)) * 0.1
            const dy = (targetDy - (currentCy - cy)) * 0.1

            velocityX = velocityX * damping + dx
            velocityY = velocityY * damping + dy

            el.setAttribute('cx', (currentCx + velocityX).toString())
            el.setAttribute('cy', (currentCy + velocityY).toString())

            if (Math.abs(velocityX) > 0.1 || Math.abs(velocityY) > 0.1) {
              requestAnimationFrame(animate)
            }
          }

          requestAnimationFrame(animate)
        })
      }
    }

    const handleMouseMove = (event: MouseEvent) => {
      handleMove(event.clientX, event.clientY)
    }

    const handleTouchMove = (event: TouchEvent) => {
      if (event.touches.length > 0) {
        handleMove(event.touches[0].clientX, event.touches[0].clientY)
      }
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('touchmove', handleTouchMove)

    return () => {
      clearTimeout(timeoutId)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('touchmove', handleTouchMove)
    }
  }, [])

  return (
    <svg
      ref={svgRef}
      fill="currentColor"
      viewBox="0 0 256 256"
      role="img"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('size-4', className)}
      {...props}
    >
      <OwlBody bodyColor={bodyColor} />
      {OWL_EYES.map(eye => (
        <ellipse
          key={eye.cx}
          cx={eye.cx}
          cy={eye.cy}
          rx={OWL_EYE_RADIUS}
          ry={OWL_EYE_RADIUS}
          style={{ fill: bodyColor ?? OWL_DEFAULT_COLOR }}
          className="blink"
        />
      ))}
    </svg>
  )
}

export { IconBlinkingLogo, IconLogo, IconLogoOutline }

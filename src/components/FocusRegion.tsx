import { useEffect, useRef, type KeyboardEvent, type PropsWithChildren } from 'react'

const FOCUSABLE_SELECTOR = [
  'button:not(:disabled)',
  'a[href]',
  'input:not(:disabled)',
  'select:not(:disabled)',
  'textarea:not(:disabled)',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

type Direction = 'up' | 'down' | 'left' | 'right'

export function FocusRegion({ children }: PropsWithChildren) {
  const regionRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function activateFromArrow(event: globalThis.KeyboardEvent) {
      if (!directionFromKey(event.key)) return

      const region = regionRef.current
      const activeElement = document.activeElement
      if (!region || (activeElement instanceof HTMLElement && region.contains(activeElement))) return

      const first = getFocusableElements(region)[0]
      if (!first) return

      event.preventDefault()
      focusAndReveal(first)
    }

    document.addEventListener('keydown', activateFromArrow)
    return () => document.removeEventListener('keydown', activateFromArrow)
  }, [])

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (
      event.key === 'Enter' &&
      event.target instanceof HTMLInputElement &&
      event.target.type === 'checkbox'
    ) {
      event.preventDefault()
      event.target.click()
      event.target.focus()
      return
    }

    const direction = directionFromKey(event.key)
    if (!direction || !(event.target instanceof HTMLElement)) return
    if (isTextControl(event.target)) return

    const focusables = getFocusableElements(event.currentTarget)
    const currentIndex = focusables.indexOf(event.target)
    if (currentIndex < 0) return

    const next = findDirectionalTarget(focusables, currentIndex, direction)
    if (!next) return

    event.preventDefault()
    focusAndReveal(next)
  }

  return <div ref={regionRef} onKeyDown={handleKeyDown}>{children}</div>
}

function focusAndReveal(element: HTMLElement) {
  element.focus({ preventScroll: true })

  const revealTarget = element.matches('input[type="checkbox"], input[type="radio"]')
    ? element.closest('label')
    : element
  if (!revealTarget || typeof revealTarget.scrollIntoView !== 'function') return

  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  revealTarget.scrollIntoView({
    behavior: reducedMotion ? 'auto' : 'smooth',
    block: 'nearest',
    inline: 'nearest',
  })
}

function getFocusableElements(region: HTMLElement): HTMLElement[] {
  return [...region.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)]
    .filter((element) => !element.closest('[inert]'))
}

function directionFromKey(key: string): Direction | undefined {
  if (key === 'ArrowUp') return 'up'
  if (key === 'ArrowDown') return 'down'
  if (key === 'ArrowLeft') return 'left'
  if (key === 'ArrowRight') return 'right'
  return undefined
}

function isTextControl(element: HTMLElement): boolean {
  return (
    element.matches(
      'textarea, select, input:not([type]), input[type="text"], input[type="search"], input[type="email"], input[type="url"], input[type="tel"], input[type="password"], input[type="number"], [contenteditable="true"]',
    ) ||
    Boolean(element.closest('[role="textbox"]'))
  )
}

function findDirectionalTarget(
  elements: readonly HTMLElement[],
  currentIndex: number,
  direction: Direction,
): HTMLElement | undefined {
  const current = elements[currentIndex]
  const currentRect = current.getBoundingClientRect()
  const currentCenter = centerOf(currentRect)
  let best: { element: HTMLElement; score: number } | undefined

  for (const candidate of elements) {
    if (candidate === current) continue
    const candidateCenter = centerOf(candidate.getBoundingClientRect())
    const dx = candidateCenter.x - currentCenter.x
    const dy = candidateCenter.y - currentCenter.y
    const primary = primaryDistance(direction, dx, dy)
    if (primary <= 1) continue

    const secondary = direction === 'left' || direction === 'right' ? Math.abs(dy) : Math.abs(dx)
    if (secondary > primary) continue
    const score = primary * 1000 + secondary * 10 + Math.hypot(dx, dy)
    if (!best || score < best.score) best = { element: candidate, score }
  }

  if (best) return best.element

  if (direction === 'left' || direction === 'up') return elements[currentIndex - 1]
  return elements[currentIndex + 1]
}

function centerOf(rect: DOMRect): { x: number; y: number } {
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
}

function primaryDistance(direction: Direction, dx: number, dy: number): number {
  if (direction === 'left') return -dx
  if (direction === 'right') return dx
  if (direction === 'up') return -dy
  return dy
}

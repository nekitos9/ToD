export function focusAndReveal(element: HTMLElement) {
  element.focus({ preventScroll: true })

  const revealTarget = element.matches('input[type="checkbox"], input[type="radio"]')
    ? element.closest('label')
    : element
  if (!(revealTarget instanceof HTMLElement)) return

  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const scrollContainer = revealTarget.closest<HTMLElement>('.setup-screen__scroll, .screen__scroll')
  if (!scrollContainer || typeof scrollContainer.scrollBy !== 'function') return
  const rect = revealTarget.getBoundingClientRect()
  const navigation = scrollContainer.parentElement?.querySelector<HTMLElement>('.bottom-navigation')
  const topLimit = Math.max(scrollContainer.getBoundingClientRect().top + 16, 16)
  const bottomLimit = (navigation?.getBoundingClientRect().top ?? window.innerHeight) - 16
  const delta = rect.top < topLimit
    ? rect.top - topLimit
    : rect.bottom > bottomLimit ? rect.bottom - bottomLimit : 0
  if (Math.abs(delta) < 1) return
  scrollContainer.scrollBy({ behavior: reducedMotion ? 'auto' : 'smooth', top: delta })
}

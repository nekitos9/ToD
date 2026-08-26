import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { Button } from './Button'
import { Dialog } from './Dialog'
import { FocusRegion } from './FocusRegion'

describe('FocusRegion', () => {
  it('activates focus navigation from an arrow key without prior focus', () => {
    render(
      <FocusRegion>
        <Button>Первая</Button>
        <Button disabled>Недоступна</Button>
        <Button>Вторая</Button>
      </FocusRegion>,
    )

    fireEvent.keyDown(document, { key: 'ArrowDown' })

    expect(screen.getByRole('button', { name: 'Первая' })).toHaveFocus()
  })

  it('moves focus with arrow keys and skips disabled controls', () => {
    render(
      <FocusRegion>
        <Button>Первая</Button>
        <Button disabled>Недоступна</Button>
        <Button>Вторая</Button>
      </FocusRegion>,
    )

    const first = screen.getByRole('button', { name: 'Первая' })
    first.focus()
    fireEvent.keyDown(first, { key: 'ArrowRight' })

    expect(screen.getByRole('button', { name: 'Вторая' })).toHaveFocus()
  })
})

describe('Dialog', () => {
  it('requests closing when the native dialog is cancelled', () => {
    function Example() {
      const [open, setOpen] = useState(true)
      return (
        <Dialog actions={<button type="button">Хорошо</button>} onClose={() => setOpen(false)} open={open} title="Заголовок">
          <p>Текст</p>
        </Dialog>
      )
    }

    render(<Example />)
    const dialog = screen.getByRole('dialog')
    fireEvent(dialog, new Event('cancel', { bubbles: false, cancelable: true }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

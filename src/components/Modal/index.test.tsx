// @vitest-environment jsdom
import Modal from '@/components/Modal'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeAll, expect, it } from 'vitest'

// jsdom has no dialog methods, so the dialog opens and closes by its attribute alone
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true
  }
  HTMLDialogElement.prototype.close = function () {
    this.open = false
  }
})

afterEach(cleanup)

it('keeps its close button, and focus on it, when it renders again', () => {
  const { rerender } = render(
    <Modal open header='Title' closeButton>
      One
    </Modal>,
  )
  const close = screen.getByRole('button')
  close.focus()

  rerender(
    <Modal open header='Title' closeButton>
      Two
    </Modal>,
  )
  expect(screen.getByRole('button')).toBe(close)
  expect(document.activeElement).toBe(close)
})

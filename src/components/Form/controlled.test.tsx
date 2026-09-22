// @vitest-environment jsdom
import Form from '@/components/Form'
import { FieldSchema } from '@/types/fields'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true
afterEach(cleanup)

const schema: Array<FieldSchema> = [
  { type: 'text', name: 'a', label: 'A' },
  { type: 'text', name: 'b', label: 'B' },
]

// A parent that controls values by echoing every change back in, which must
// settle rather than feed back forever
const harness = (spy: (values: Record<string, any>) => void, stable: boolean) => {
  const Harness = () => {
    const [values, setValues] = useState<Record<string, any>>({})

    const onValuesChange = (next: Record<string, any>) => {
      spy(next)
      setValues(next)
    }

    return <Form schema={schema} values={values} onValuesChange={stable ? setValues : onValuesChange} />
  }

  return <Harness />
}

describe('controlled values', () => {
  it('settles after sequential edits with an inline callback', () => {
    const spy = vi.fn()
    render(harness(spy, false))

    fireEvent.change(screen.getByLabelText(/A/), { target: { value: 'one' } })
    fireEvent.change(screen.getByLabelText(/B/), { target: { value: 'two' } })

    expect((screen.getByLabelText(/A/) as HTMLInputElement).value).toBe('one')
    expect((screen.getByLabelText(/B/) as HTMLInputElement).value).toBe('two')

    // One values emission per originating change, and none on mount
    expect(spy.mock.calls.map(([values]) => values)).toEqual([{ a: 'one' }, { a: 'one', b: 'two' }])
  })

  it('settles after sequential edits with a stable callback', () => {
    const spy = vi.fn()
    render(harness(spy, true))

    fireEvent.change(screen.getByLabelText(/A/), { target: { value: 'one' } })
    fireEvent.change(screen.getByLabelText(/B/), { target: { value: 'two' } })

    expect((screen.getByLabelText(/A/) as HTMLInputElement).value).toBe('one')
    expect((screen.getByLabelText(/B/) as HTMLInputElement).value).toBe('two')
  })

  it('adopts a controlled reset from the parent', () => {
    const Harness = () => {
      const [values, setValues] = useState<Record<string, any>>({ a: 'seed' })
      return (
        <div>
          <Form schema={schema} values={values} onValuesChange={setValues} />
          <button type='button' onClick={() => setValues({})}>
            Reset
          </button>
        </div>
      )
    }
    render(<Harness />)

    const input = screen.getByLabelText(/A/) as HTMLInputElement
    expect(input.value).toBe('seed')

    fireEvent.change(input, { target: { value: 'edited' } })
    expect(input.value).toBe('edited')

    fireEvent.click(screen.getByText('Reset'))
    expect(input.value).toBe('')
  })
})

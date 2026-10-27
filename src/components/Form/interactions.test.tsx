// @vitest-environment jsdom
import Form, { FormHandle } from '@/components/Form'
import { FieldSchema } from '@/types/fields'
import { ValidationReport } from '@/types/inputs'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createRef } from 'react'
import { afterEach, describe, expect, it } from 'vitest'

;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true

afterEach(cleanup)

describe('form interactions', () => {
  it('reports messages under path keys as fields are validated', async () => {
    const ref = createRef<FormHandle>()
    let latestMessages: Record<string, any> = {}
    let latestValidity: Record<string, boolean | undefined> = {}

    render(
      <Form
        ref={ref}
        schema={[
          { type: 'text', name: 'first_name', label: 'First name', required: true },
          {
            type: 'group',
            name: 'address',
            label: 'Address',
            options: { fields: [{ type: 'text', name: 'town', label: 'Town', required: true }] },
          },
          {
            type: 'repeater',
            name: 'pets',
            label: 'Pets',
            options: { fields: [{ type: 'text', name: 'petname', label: 'Pet name', required: true }] },
          },
        ]}
        values={{ pets: [{ petname: '' }] }}
        onMessagesChange={(messages) => (latestMessages = messages)}
        onValidityChange={(validity) => (latestValidity = validity)}
      />,
    )

    let report: undefined | ValidationReport
    act(() => {
      report = ref.current?.validate()
    })

    // The report is available synchronously
    expect(report?.isValid).toBe(false)

    // Every field's messages arrive under its path
    await waitFor(() => {
      expect(latestMessages['first_name']).toEqual(['This field is required.'])
      expect(latestMessages['address.town']).toEqual(['This field is required.'])
      expect(latestMessages['pets.0.petname']).toEqual(['This field is required.'])
    })

    // Containers aggregate their nested fields validity
    await waitFor(() => {
      expect(latestValidity['address']).toBe(false)
      expect(latestValidity['pets']).toBe(false)
      expect(latestValidity['address.town']).toBe(false)
      expect(latestValidity['pets.0.petname']).toBe(false)
    })
  })

  it('reports and clears messages as a user types', async () => {
    let latestMessages: Record<string, any> = {}

    render(
      <Form
        schema={[{ type: 'text', name: 'first_name', label: 'First name', options: { minLength: 3 } }]}
        onMessagesChange={(messages) => (latestMessages = messages)}
      />,
    )

    const input = screen.getByLabelText(/First name/)

    fireEvent.change(input, { target: { value: 'ab' } })

    await waitFor(() => {
      expect(latestMessages['first_name']).toEqual(['This field requires a minimum of 3 character(s).'])
    })

    fireEvent.change(input, { target: { value: 'abc' } })

    await waitFor(() => {
      expect(latestMessages['first_name']).toEqual([])
    })
  })

  it('shows an applied server report inline until fields report for themselves', async () => {
    const ref = createRef<FormHandle>()

    render(
      <Form
        ref={ref}
        schema={[
          { type: 'text', name: 'username', label: 'Username' },
          {
            type: 'repeater',
            name: 'pets',
            label: 'Pets',
            options: { fields: [{ type: 'text', name: 'petname', label: 'Pet name', required: true }] },
          },
        ]}
        values={{ username: 'taken', pets: [{ petname: '' }] }}
      />,
    )

    // A report as a server would produce it, including a server only error
    act(() => {
      ref.current?.applyReport({
        isValid: false,
        fields: {
          username: { isValid: false, messages: ['Already taken.'] },
          pets: {
            isValid: false,
            messages: [],
            children: [
              { isValid: false, fields: { petname: { isValid: false, messages: ['This field is required.'] } } },
            ],
          },
        },
      })
    })

    // Both the top level and the nested message display inline
    await waitFor(() => {
      expect(screen.getByText('Already taken.')).toBeTruthy()
      expect(screen.getByText('This field is required.')).toBeTruthy()
    })

    // Editing the nested field clears its injected message through live validation
    fireEvent.change(screen.getByLabelText(/Pet name/), { target: { value: 'Rex' } })

    await waitFor(() => {
      expect(screen.queryByText('This field is required.')).toBeNull()
      expect(screen.getByText('Already taken.')).toBeTruthy()
    })
  })

  it('shows and hides fields as their conditions change', async () => {
    render(
      <Form
        schema={[
          { type: 'boolean', name: 'has_pets', label: 'Has pets', options: { message: 'Yes' } },
          {
            type: 'repeater',
            name: 'pets',
            label: 'Pets',
            conditions: [{ field: 'has_pets', operator: 'equals', value: true }],
            options: {
              fields: [
                { type: 'text', name: 'petname', label: 'Pet name' },
                {
                  type: 'text',
                  name: 'chip_id',
                  label: 'Chip ID',
                  conditions: [{ field: 'petname', operator: 'notEmpty' }],
                },
              ],
            },
          },
        ]}
        values={{ pets: [{ petname: '' }] }}
      />,
    )

    // The repeater is hidden until the boolean is checked
    expect(screen.queryByText('Pets')).toBeNull()

    fireEvent.click(screen.getByLabelText(/Yes/))

    await waitFor(() => {
      expect(screen.getByText('Pets')).toBeTruthy()
      expect(screen.getByLabelText(/Pet name/)).toBeTruthy()
    })

    // The nested field is hidden until its sibling has a value
    expect(screen.queryByLabelText(/Chip ID/)).toBeNull()

    fireEvent.change(screen.getByLabelText(/Pet name/), { target: { value: 'Rex' } })

    await waitFor(() => {
      expect(screen.getByLabelText(/Chip ID/)).toBeTruthy()
    })
  })

  it('removes path entries when fields unmount', async () => {
    const ref = createRef<FormHandle>()
    let latestMessages: Record<string, any> = {}

    render(
      <Form
        ref={ref}
        schema={[
          {
            type: 'repeater',
            name: 'pets',
            label: 'Pets',
            options: { fields: [{ type: 'text', name: 'petname', label: 'Pet name', required: true }] },
          },
        ]}
        values={{ pets: [{ petname: '' }] }}
        onMessagesChange={(messages) => (latestMessages = messages)}
      />,
    )

    act(() => {
      ref.current?.validate()
    })

    await waitFor(() => {
      expect(latestMessages['pets.0.petname']).toEqual(['This field is required.'])
    })

    fireEvent.click(screen.getByText('Remove row'))

    await waitFor(() => {
      expect(latestMessages['pets.0.petname']).toBeUndefined()
    })
  })
})

describe('identifier interactions', () => {
  const schema: Array<FieldSchema> = [
    { type: 'text', name: 'title', label: 'Title' },
    { type: 'identifier', name: 'slug', label: 'Slug', options: { source: 'title' } },
  ]

  const title = () => screen.getByLabelText(/Title/) as HTMLInputElement
  const slug = () => screen.getByLabelText(/Slug/) as HTMLInputElement

  it('follows its source until the slug is edited', async () => {
    render(<Form schema={schema} />)

    fireEvent.change(title(), { target: { value: 'Hello World' } })
    await waitFor(() => expect(slug().value).toBe('hello-world'))

    fireEvent.change(title(), { target: { value: 'Hello World Again' } })
    await waitFor(() => expect(slug().value).toBe('hello-world-again'))

    // A typed slug stops the following
    fireEvent.change(slug(), { target: { value: 'custom' } })
    fireEvent.change(title(), { target: { value: 'Something else' } })
    expect(slug().value).toBe('custom')
  })

  it('keeps a saved slug when the title changes', () => {
    render(<Form schema={schema} values={{ title: 'My Post', slug: 'my-post' }} />)

    fireEvent.change(title(), { target: { value: 'My Renamed Post' } })
    expect(slug().value).toBe('my-post')
  })

  it('keeps a saved slug that loads after the form renders', async () => {
    const { rerender } = render(<Form schema={schema} values={{}} />)
    rerender(<Form schema={schema} values={{ title: 'My Post', slug: 'my-post' }} />)
    await waitFor(() => expect(slug().value).toBe('my-post'))

    fireEvent.change(title(), { target: { value: 'My Renamed Post' } })
    expect(slug().value).toBe('my-post')
  })

  it('picks the source back up when the slug is cleared', async () => {
    render(<Form schema={schema} values={{ title: 'My Post', slug: 'old-slug' }} />)

    fireEvent.change(slug(), { target: { value: '' } })
    fireEvent.blur(slug())
    await waitFor(() => expect(slug().value).toBe('my-post'))

    fireEvent.change(title(), { target: { value: 'New Title' } })
    await waitFor(() => expect(slug().value).toBe('new-title'))
  })

  it('tidies an invalid value when the field loses focus', async () => {
    let latestMessages: Record<string, any> = {}

    render(
      <Form
        schema={[{ type: 'identifier', name: 'slug', label: 'Slug' }]}
        onMessagesChange={(messages) => (latestMessages = messages)}
      />,
    )

    fireEvent.change(slug(), { target: { value: 'My Custom Slug!' } })
    await waitFor(() => expect(latestMessages['slug']).toEqual(['A valid identifier required, e.g. my-page.']))

    fireEvent.blur(slug())
    await waitFor(() => {
      expect(slug().value).toBe('my-custom-slug')
      expect(latestMessages['slug']).toEqual([])
    })
  })

  it('leaves a valid value alone when the field loses focus', async () => {
    render(<Form schema={[{ type: 'identifier', name: 'key', label: 'Key', options: { format: 'camel' } }]} />)

    const key = () => screen.getByLabelText(/Key/) as HTMLInputElement

    fireEvent.change(key(), { target: { value: 'my HTTP server' } })
    fireEvent.blur(key())
    await waitFor(() => expect(key().value).toBe('myHttpServer'))

    // Valid camel case keeps its own casing rather than being reformatted
    fireEvent.change(key(), { target: { value: 'myHTTPServer' } })
    fireEvent.blur(key())
    expect(key().value).toBe('myHTTPServer')
  })

  it('follows the title in its own repeater item', async () => {
    render(
      <Form
        schema={[
          { type: 'text', name: 'title', label: 'Page title' },
          {
            type: 'repeater',
            name: 'sections',
            label: 'Sections',
            options: {
              fields: [
                { type: 'text', name: 'title', label: 'Section title' },
                { type: 'identifier', name: 'anchor', label: 'Anchor', options: { source: 'title', format: 'snake' } },
              ],
            },
          },
        ]}
        values={{ sections: [{ title: '' }, { title: '' }] }}
      />,
    )

    const anchors = () => screen.getAllByLabelText(/Anchor/) as Array<HTMLInputElement>

    fireEvent.change(screen.getAllByLabelText(/Section title/)[0], { target: { value: 'Getting Started' } })
    fireEvent.change(screen.getByLabelText(/Page title/), { target: { value: 'Docs Home' } })

    await waitFor(() => expect(anchors().map((anchor) => anchor.value)).toEqual(['getting_started', '']))
  })
})

describe('flexible interactions', () => {
  const schema: Array<FieldSchema> = [
    {
      type: 'flexible',
      name: 'blocks',
      label: 'Blocks',
      options: {
        layouts: [
          { name: 'hero', label: 'Hero', fields: [{ type: 'text', name: 'title', label: 'Title', required: true }] },
          { name: 'quote', label: 'Quote', fields: [{ type: 'text', name: 'quote', label: 'Quote text' }] },
        ],
      },
    },
  ]

  it('adds, edits, moves and deletes blocks', async () => {
    let latestValues: Record<string, any> = {}

    render(<Form schema={schema} onValuesChange={(values) => (latestValues = values)} />)

    fireEvent.click(screen.getByText('Add Hero'))
    fireEvent.click(screen.getByText('Add Quote'))
    fireEvent.change(screen.getByLabelText(/Title/), { target: { value: 'Welcome' } })

    await waitFor(() => {
      expect(latestValues.blocks).toEqual([{ _layout: 'hero', title: 'Welcome' }, { _layout: 'quote' }])
    })

    // Move the quote above the hero, then delete the hero
    fireEvent.click(screen.getAllByText('Move up')[1])
    await waitFor(() => expect(latestValues.blocks.map((block: any) => block._layout)).toEqual(['quote', 'hero']))

    fireEvent.click(screen.getAllByText('Delete')[1])
    await waitFor(() => expect(latestValues.blocks).toEqual([{ _layout: 'quote' }]))
  })

  it('reports block fields under their path and marks the field invalid', async () => {
    const ref = createRef<FormHandle>()
    let latestMessages: Record<string, any> = {}
    let latestValidity: Record<string, boolean | undefined> = {}

    render(
      <Form
        ref={ref}
        schema={schema}
        values={{
          blocks: [
            { _layout: 'quote', quote: 'Hi' },
            { _layout: 'hero', title: '' },
          ],
        }}
        onMessagesChange={(messages) => (latestMessages = messages)}
        onValidityChange={(validity) => (latestValidity = validity)}
      />,
    )

    act(() => {
      ref.current?.validate()
    })

    await waitFor(() => {
      expect(latestMessages['blocks.1.title']).toEqual(['This field is required.'])
      expect(latestValidity['blocks']).toBe(false)
    })
  })

  it('clears block messages when blocks move rather than leaving them on the wrong block', async () => {
    render(
      <Form
        schema={schema}
        values={{
          blocks: [
            { _layout: 'hero', title: '' },
            { _layout: 'hero', title: 'Hi' },
          ],
        }}
      />,
    )

    fireEvent.change(screen.getAllByLabelText(/Title/)[0], { target: { value: 'x' } })
    fireEvent.change(screen.getAllByLabelText(/Title/)[0], { target: { value: '' } })
    await waitFor(() => expect(screen.getByText('This field is required.')).toBeTruthy())

    // The valid block moves to the top, where the old first block's message must not follow it
    fireEvent.click(screen.getAllByText('Move up')[1])
    await waitFor(() => expect(screen.getAllByLabelText<HTMLInputElement>(/Title/)[0].value).toBe('Hi'))
    expect(screen.queryByText('This field is required.')).toBeNull()
  })

  it('shows a block whose layout no longer exists so it can be deleted', async () => {
    let latestValues: Record<string, any> = {}

    render(
      <Form
        schema={schema}
        values={{ blocks: [{ _layout: 'gallery', images: [] }] }}
        onValuesChange={(values) => (latestValues = values)}
      />,
    )

    expect(screen.getByText('Invalid field type.')).toBeTruthy()

    fireEvent.click(screen.getByText('Delete'))
    await waitFor(() => expect(latestValues.blocks).toEqual([]))
  })
})

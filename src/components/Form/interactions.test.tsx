// @vitest-environment jsdom
import Form, { FormHandle } from '@/components/Form'
import { FieldSchema } from '@/types/fields'
import { ValidationReport } from '@/types/inputs'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createRef, useState } from 'react'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

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

  it('matches conditions against defaults and untouched fields, as validation does', () => {
    const ref = createRef<FormHandle>()

    render(
      <Form
        ref={ref}
        schema={[
          { type: 'boolean', name: 'featured', label: 'Featured', defaultValue: true, options: { message: 'Yes' } },
          {
            type: 'text',
            name: 'note',
            label: 'Note',
            required: true,
            conditions: [{ field: 'featured', operator: 'equals', value: true }],
          },
          {
            type: 'repeater',
            name: 'links',
            label: 'Links',
            options: {
              fields: [
                { type: 'boolean', name: 'external', label: 'External', options: { message: 'Opens elsewhere' } },
                {
                  type: 'text',
                  name: 'rel',
                  label: 'Rel',
                  conditions: [{ field: 'external', operator: 'equals', value: false }],
                },
              ],
            },
          },
        ]}
        values={{ links: [{}] }}
      />,
    )

    // The default checks the box, and the item's untouched box counts as unchecked
    expect(screen.getByLabelText(/Note/)).toBeTruthy()
    expect(screen.getByLabelText(/Rel/)).toBeTruthy()

    // Validation counts the same fields, so the required note is on screen to fill in
    let report: undefined | ValidationReport
    act(() => {
      report = ref.current?.validate()
    })

    expect(report?.fields.note?.isValid).toBe(false)
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

describe('repeater interactions', () => {
  // Pricing plans whose button sits in a group
  const plans = (options: Record<string, any> = {}): Array<FieldSchema> => [
    {
      type: 'repeater',
      name: 'plans',
      label: 'Plans',
      options: {
        ...options,
        fields: [
          { type: 'text', name: 'name', label: 'Plan name' },
          {
            type: 'group',
            name: 'button',
            label: 'Button',
            options: { fields: [{ type: 'text', name: 'label', label: 'Button label' }] },
          },
        ],
      },
    },
  ]

  it('adds a row holding a group', async () => {
    let latestValues: Record<string, any> = {}

    render(<Form schema={plans()} onValuesChange={(values) => (latestValues = values)} />)

    fireEvent.click(screen.getByText('Add row'))
    fireEvent.change(screen.getByLabelText(/Button label/), { target: { value: 'Buy now' } })

    // The untouched plan name is left unset, as in a new flexible block
    await waitFor(() => expect(latestValues.plans).toEqual([{ button: { label: 'Buy now' } }]))
  })

  it('seeds its minimum rows holding a group', () => {
    render(<Form schema={plans({ minimum: 1 })} />)

    expect(screen.getByLabelText(/Button label/)).toBeTruthy()
  })

  it('shows a saved row whose group is null', () => {
    render(<Form schema={plans()} values={{ plans: [{ name: 'Pro', button: null }] }} />)

    expect(screen.getByLabelText(/Button label/)).toBeTruthy()
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

  it('keeps a generated slug while a parent passes the values back', () => {
    const ref = createRef<FormHandle>()
    const requiredSlug = [schema[0], { ...schema[1], required: true }]
    let saved: Record<string, any> = {}

    function Editor() {
      const [values, setValues] = useState<Record<string, any>>({})
      saved = values
      return <Form ref={ref} schema={requiredSlug} values={values} onValuesChange={setValues} />
    }

    render(<Editor />)

    // Typed quickly, the second keystroke lands before the parent renders the slug the first one generated
    act(() => {
      fireEvent.change(title(), { target: { value: 'Hello' } })
      fireEvent.change(title(), { target: { value: 'Hello!' } })
    })

    let report: undefined | ValidationReport
    act(() => {
      report = ref.current?.validate()
    })

    expect(report?.isValid).toBe(true)
    expect(saved).toEqual({ title: 'Hello!', slug: 'hello' })
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

describe('schema builder interactions', () => {
  // jsdom has no dialog methods, so the editors open and close by their attribute alone
  beforeAll(() => {
    HTMLDialogElement.prototype.showModal = function () {
      this.open = true
    }
    HTMLDialogElement.prototype.close = function () {
      this.open = false
    }
  })

  const schema: Array<FieldSchema> = [{ type: 'schemabuilder', name: 'fields', label: 'Fields' }]

  // The innermost open editor, since a nested schema builder opens its editor inside its parent's
  const editor = () => within([...document.querySelectorAll<HTMLElement>('dialog[open]')].at(-1)!)
  const save = () => fireEvent.click(editor().getByRole('button', { name: 'Save' }))
  const createButton = (container: Pick<typeof screen, 'getByText'>, type: string) => {
    return container.getByText(type, { selector: 'button > strong' })
  }

  it('gives a new field an ID and a name that follows its label', async () => {
    let latestValues: Record<string, any> = {}

    render(<Form schema={schema} onValuesChange={(values) => (latestValues = values)} />)

    fireEvent.click(createButton(screen, 'Text'))
    fireEvent.change(editor().getByLabelText(/Field Label/), { target: { value: 'First Name' } })
    await waitFor(() => expect(editor().getByLabelText<HTMLInputElement>(/Field Name/).value).toBe('first_name'))
    save()

    await waitFor(() => expect(latestValues.fields).toHaveLength(1))
    expect(latestValues.fields[0]).toMatchObject({ type: 'text', name: 'first_name', label: 'First Name' })
    expect(latestValues.fields[0].id).toMatch(/^fld_[0-9a-z]{8}$/)
  })

  it('blocks saving a name that would break dotted paths', async () => {
    let latestValues: Record<string, any> = {}

    render(<Form schema={schema} onValuesChange={(values) => (latestValues = values)} />)

    fireEvent.click(createButton(screen, 'Text'))
    fireEvent.change(editor().getByLabelText(/Field Name/), { target: { value: 'address.town' } })
    save()

    expect(editor().getByText('A valid identifier required, e.g. my_page.')).toBeTruthy()
    expect(latestValues.fields).toBeUndefined()

    fireEvent.change(editor().getByLabelText(/Field Name/), { target: { value: 'emailOptIn' } })
    save()
    await waitFor(() => expect(latestValues.fields?.[0].name).toBe('emailOptIn'))
  })

  it('keeps IDs as fields are renamed and moved, nested ones included', async () => {
    let latestValues: Record<string, any> = {}

    render(
      <Form
        schema={schema}
        values={{
          fields: [
            { id: 'fld_title', type: 'text', name: 'title', label: 'Title' },
            {
              id: 'fld_address',
              type: 'group',
              name: 'address',
              label: 'Address',
              options: { fields: [{ id: 'fld_town', type: 'text', name: 'town', label: 'Town' }] },
            },
          ],
        }}
        onValuesChange={(values) => (latestValues = values)}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Title (title)' }))
    fireEvent.change(editor().getByLabelText(/Field Name/), { target: { value: 'headline' } })
    save()

    // Rename the town inside the group, saving its editor and then the group's
    fireEvent.click(screen.getByRole('button', { name: 'Address (address)' }))
    fireEvent.click(editor().getByRole('button', { name: 'Town (town)' }))
    fireEvent.change(editor().getByLabelText(/Field Name/), { target: { value: 'city' } })
    save()
    save()

    fireEvent.click(screen.getAllByRole('button', { name: 'Move up' })[1])

    await waitFor(() => {
      expect(latestValues.fields.map(({ id, name }: FieldSchema) => [id, name])).toEqual([
        ['fld_address', 'address'],
        ['fld_title', 'headline'],
      ])
      expect(latestValues.fields[0].options.fields).toMatchObject([{ id: 'fld_town', name: 'city' }])
    })
  })

  it('keeps and gives IDs to fields in flexible layouts', async () => {
    let latestValues: Record<string, any> = {}

    render(
      <Form
        schema={schema}
        values={{
          fields: [
            {
              id: 'fld_blocks',
              type: 'flexible',
              name: 'blocks',
              label: 'Blocks',
              options: {
                layouts: [
                  {
                    name: 'hero',
                    label: 'Hero',
                    fields: [{ id: 'fld_heading', type: 'text', name: 'heading', label: 'Heading' }],
                  },
                ],
              },
            },
          ],
        }}
        onValuesChange={(values) => (latestValues = values)}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Blocks (blocks)' }))
    fireEvent.click(editor().getByRole('button', { name: 'Heading (heading)' }))
    fireEvent.change(editor().getByLabelText(/Field Name/), { target: { value: 'title' } })
    save()

    fireEvent.click(createButton(editor(), 'Text'))
    fireEvent.change(editor().getByLabelText(/Field Label/), { target: { value: 'Subtitle' } })
    await waitFor(() => expect(editor().getByLabelText<HTMLInputElement>(/Field Name/).value).toBe('subtitle'))
    save()
    save()

    await waitFor(() => expect(latestValues.fields?.[0].options.layouts[0].fields).toHaveLength(2))

    const [title, subtitle] = latestValues.fields[0].options.layouts[0].fields
    expect(latestValues.fields[0].id).toBe('fld_blocks')
    expect(title).toMatchObject({ id: 'fld_heading', name: 'title' })
    expect(subtitle.id).toMatch(/^fld_[0-9a-z]{8}$/)

    // The layout was written without an ID, so saving gives it one
    expect(latestValues.fields[0].options.layouts[0].id).toMatch(/^lay_[0-9a-z]{8}$/)
  })

  it('gives the layouts of a new flexible field their IDs', async () => {
    let latestValues: Record<string, any> = {}

    render(<Form schema={schema} onValuesChange={(values) => (latestValues = values)} />)

    fireEvent.click(createButton(screen, 'Flexible content'))
    fireEvent.change(editor().getByLabelText(/Field Label/), { target: { value: 'Blocks' } })

    // The layouts start with one layout, which needs a label
    fireEvent.change(editor().getByLabelText(/^Label/), { target: { value: 'Hero' } })
    fireEvent.click(createButton(editor(), 'Text'))
    fireEvent.change(editor().getByLabelText(/Field Label/), { target: { value: 'Title' } })
    await waitFor(() => expect(editor().getByLabelText<HTMLInputElement>(/Field Name/).value).toBe('title'))
    save()
    save()

    await waitFor(() => expect(latestValues.fields).toHaveLength(1))

    const [hero] = latestValues.fields[0].options.layouts
    expect(hero).toMatchObject({ name: 'hero', label: 'Hero' })
    expect(hero.id).toMatch(/^lay_[0-9a-z]{8}$/)
    expect(hero.fields[0].id).toMatch(/^fld_[0-9a-z]{8}$/)
  })

  it('keeps layout IDs when another layout is added', async () => {
    let latestValues: Record<string, any> = {}

    render(
      <Form
        schema={schema}
        values={{
          fields: [
            {
              id: 'fld_blocks',
              type: 'flexible',
              name: 'blocks',
              label: 'Blocks',
              options: {
                layouts: [
                  {
                    id: 'lay_hero',
                    name: 'hero',
                    label: 'Hero',
                    fields: [{ id: 'fld_heading', type: 'text', name: 'heading', label: 'Heading' }],
                  },
                ],
              },
            },
          ],
        }}
        onValuesChange={(values) => (latestValues = values)}
      />,
    )

    // Adding a layout rebuilds every layout, the layouts' Add row coming after the conditions'
    fireEvent.click(screen.getByRole('button', { name: 'Blocks (blocks)' }))
    fireEvent.click(editor().getAllByRole('button', { name: 'Add row' }).at(-1)!)
    fireEvent.change(editor().getAllByLabelText(/^Label/)[1], { target: { value: 'Quote' } })

    fireEvent.click(editor().getAllByText('Text', { selector: 'button > strong' })[1])
    fireEvent.change(editor().getByLabelText(/Field Label/), { target: { value: 'Quote text' } })
    await waitFor(() => expect(editor().getByLabelText<HTMLInputElement>(/Field Name/).value).toBe('quote_text'))
    save()
    save()

    await waitFor(() => expect(latestValues.fields?.[0].options.layouts).toHaveLength(2))

    const [hero, quote] = latestValues.fields[0].options.layouts
    expect(hero).toMatchObject({ id: 'lay_hero', name: 'hero', fields: [{ id: 'fld_heading' }] })
    expect(quote.name).toBe('quote')
    expect(quote.id).toMatch(/^lay_[0-9a-z]{8}$/)
  })

  it('keeps schemas without IDs working, giving a field one when it is edited', async () => {
    let latestValues: Record<string, any> = {}

    render(
      <Form
        schema={schema}
        values={{
          fields: [
            { type: 'text', name: 'FirstName', label: 'First name' },
            { type: 'text', name: 'utm_source', label: 'Source' },
          ],
        }}
        onValuesChange={(values) => (latestValues = values)}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'First name (FirstName)' }))
    fireEvent.change(editor().getByLabelText(/Field Label/), { target: { value: 'Given name' } })
    save()

    // The imported name stays rather than following the new label
    await waitFor(() => expect(latestValues.fields?.[0]).toMatchObject({ name: 'FirstName', label: 'Given name' }))
    expect(latestValues.fields[0].id).toMatch(/^fld_[0-9a-z]{8}$/)
    expect(latestValues.fields[1]).not.toHaveProperty('id')
  })

  it('keeps the button that opened an editor, so the browser can return focus to it', () => {
    render(<Form schema={schema} values={{ fields: [{ type: 'text', name: 'title', label: 'Title' }] }} />)

    const edit = screen.getByRole('button', { name: 'Title (title)' })
    fireEvent.click(edit)
    fireEvent.click(editor().getByRole('button', { name: 'Cancel' }))
    expect(screen.getByRole('button', { name: 'Title (title)' })).toBe(edit)

    fireEvent.click(edit)
    save()
    expect(screen.getByRole('button', { name: 'Title (title)' })).toBe(edit)
  })

  it('shows nested fields their own messages when a save is blocked', async () => {
    const ref = createRef<FormHandle>()
    let latestValues: Record<string, any> = {}

    render(<Form ref={ref} schema={schema} onValuesChange={(values) => (latestValues = values)} />)
    act(() => {
      ref.current!.validate()
    })

    // An editor opened after the form validated starts without messages
    fireEvent.click(createButton(screen, 'Boolean (True / False)'))
    fireEvent.change(editor().getByLabelText(/Field Label/), { target: { value: 'Agree' } })
    expect(editor().queryAllByText('This field is required.')).toHaveLength(0)

    // The message is required, and sits inside the options group
    save()
    await waitFor(() => expect(editor().getByText('This field is required.')).toBeTruthy())
    expect(latestValues.fields).toBeUndefined()

    fireEvent.change(editor().getByLabelText(/^Message/), { target: { value: 'I agree' } })
    save()
    await waitFor(() =>
      expect(latestValues.fields?.[0]).toMatchObject({ name: 'agree', options: { message: 'I agree' } }),
    )
  })

  it('keeps the keys its editor does not show when a field is edited', async () => {
    let latestValues: Record<string, any> = {}
    const reference = { id: 'fld_ref', type: 'text', name: 'ref', label: 'Ref', readonly: true, defaultValue: 'REF-1' }

    render(
      <Form schema={schema} values={{ fields: [reference] }} onValuesChange={(values) => (latestValues = values)} />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Ref (ref)' }))
    fireEvent.change(editor().getByLabelText(/Field Label/), { target: { value: 'Reference' } })
    save()

    await waitFor(() => expect(latestValues.fields?.[0]).toEqual({ ...reference, label: 'Reference' }))
  })

  it("keeps a choice's nested choices when another choice is added", async () => {
    let latestValues: Record<string, any> = {}
    const grey = { value: 'grey', label: 'Grey', choices: [{ value: 'black', label: 'Black' }] }

    render(
      <Form
        schema={schema}
        values={{
          fields: [{ id: 'fld_colour', type: 'select', name: 'colour', label: 'Colour', options: { choices: [grey] } }],
        }}
        onValuesChange={(values) => (latestValues = values)}
      />,
    )

    // Adding a choice rebuilds every choice from the choices' fields, the choices' Add row coming after the conditions'
    fireEvent.click(screen.getByRole('button', { name: 'Colour (colour)' }))
    fireEvent.click(editor().getAllByRole('button', { name: 'Add row' }).at(-1)!)
    fireEvent.change(editor().getAllByLabelText(/^Value/)[1], { target: { value: 'red' } })
    save()

    await waitFor(() => expect(latestValues.fields?.[0].options.choices).toEqual([grey, { value: 'red' }]))
  })

  it('saves a new matrix with the limits its editor shows, before it has fields', async () => {
    let latestValues: Record<string, any> = {}

    render(<Form schema={schema} onValuesChange={(values) => (latestValues = values)} />)

    fireEvent.click(createButton(screen, 'Matrix'))
    fireEvent.change(editor().getByLabelText(/Field Label/), { target: { value: 'Grid' } })
    await waitFor(() => expect(editor().getByLabelText<HTMLInputElement>(/Field Name/).value).toBe('grid'))
    save()

    await waitFor(() => expect(latestValues.fields).toHaveLength(1))
    expect(latestValues.fields[0].options).toEqual({ minimumRows: 1, minimumColumns: 1, maximumColumns: 1 })
  })

  it("keeps a new field's edits while the page around it re-renders", () => {
    // The schema is written inline, so each render passes the form a new one
    function Page() {
      const [, setRenders] = useState(0)
      return (
        <>
          <button type='button' onClick={() => setRenders((old) => old + 1)}>
            Re-render
          </button>
          <Form schema={[{ type: 'schemabuilder', name: 'fields', label: 'Fields' }]} />
        </>
      )
    }

    render(<Page />)

    fireEvent.click(createButton(screen, 'Text'))
    fireEvent.change(editor().getByLabelText(/Field Label/), { target: { value: 'Title' } })
    fireEvent.click(screen.getByRole('button', { name: 'Re-render' }))

    expect(editor().getByLabelText<HTMLInputElement>(/Field Label/).value).toBe('Title')
  })
})

describe('read-only and disabled fields', () => {
  const text = (name: string): FieldSchema => ({ type: 'text', name, label: name })

  // A container of every kind inside a group, each holding fields at least two levels down
  const page = (state: 'readonly' | 'disabled'): Array<FieldSchema> => [
    {
      type: 'group',
      name: 'page',
      label: 'Page',
      [state]: true,
      options: {
        fields: [
          text('title'),
          { type: 'group', name: 'seo', label: 'SEO', options: { fields: [text('description')] } },
          {
            type: 'repeater',
            name: 'links',
            label: 'Links',
            options: { fields: [{ type: 'group', name: 'link', label: 'Link', options: { fields: [text('url')] } }] },
          },
          {
            type: 'matrix',
            name: 'grid',
            label: 'Grid',
            options: { fields: [text('cell')], minimumColumns: 1, maximumColumns: 3 },
          },
          {
            type: 'flexible',
            name: 'blocks',
            label: 'Blocks',
            options: {
              layouts: [
                {
                  name: 'quote',
                  label: 'Quote',
                  fields: [text('quote'), { type: 'boolean', name: 'wide', label: 'Wide' }],
                },
              ],
            },
          },
          { type: 'schemabuilder', name: 'fields', label: 'Fields' },
        ],
      },
    },
  ]

  const values = {
    page: {
      title: 'Home',
      seo: { description: 'Welcome' },
      links: [{ link: { url: '/' } }, { link: { url: '/about' } }],
      grid: [[{ cell: 'a' }, { cell: 'b' }]],
      blocks: [
        { _layout: 'quote', quote: 'Hi', wide: false },
        { _layout: 'quote', quote: 'Bye', wide: true },
      ],
      fields: [text('first'), text('second')],
    },
  }

  it.each(['readonly', 'disabled'] as const)('passes %s to every field inside a container', (state) => {
    render(<Form schema={page(state)} values={values} />)

    const textboxes = screen.getAllByRole<HTMLInputElement>('textbox')
    expect(textboxes.map((input) => input.value)).toEqual(['Home', 'Welcome', '/', '/about', 'a', 'b', 'Hi', 'Bye'])
    for (const input of textboxes) expect(input[state === 'readonly' ? 'readOnly' : 'disabled']).toBe(true)

    // Checkboxes have no read-only state, so they show as disabled for both
    for (const checkbox of screen.getAllByRole<HTMLInputElement>('checkbox')) expect(checkbox.disabled).toBe(true)
  })

  it.each(['readonly', 'disabled'] as const)("disables a %s container's buttons", (state) => {
    render(<Form schema={page(state)} values={values} />)

    // Including the buttons in the schema builder's closed editors
    const buttons = screen.getAllByRole<HTMLButtonElement>('button', { hidden: true })
    expect(buttons.map((button) => button.textContent)).toEqual(
      expect.arrayContaining([
        ...['Add row', 'Remove row', 'Add column', 'Remove column'],
        ...['Add Quote', 'Move up', 'Move down', 'Delete'],
        ...['first (first)', 'Save'],
      ]),
    )

    // Only the editors' Cancel buttons stay enabled, as they change nothing
    const enabled = buttons.filter((button) => !button.disabled).map((button) => button.textContent)
    expect(new Set(enabled)).toEqual(new Set(['Cancel']))
  })

  it('keeps a read-only boolean from changing', () => {
    let latestValues: Record<string, any> = {}

    render(
      <Form
        schema={[{ type: 'boolean', name: 'agree', label: 'Agree', readonly: true }]}
        values={{ agree: true }}
        onValuesChange={(values) => (latestValues = values)}
      />,
    )

    const checkbox = screen.getByRole<HTMLInputElement>('checkbox')
    expect(checkbox.disabled).toBe(true)

    // A click, unlike fireEvent's dispatched event, does nothing on a disabled control, as in a browser
    act(() => checkbox.click())
    expect(latestValues.agree).toBeUndefined()
  })
})

import Form from '@/components/Form'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

describe('form rendering', () => {
  it('renders core fields with their values', () => {
    const markup = renderToStaticMarkup(
      <Form
        schema={[
          { type: 'text', name: 'first_name', label: 'First name', options: { placeholder: 'e.g. Bob' } },
          { type: 'email', name: 'email', label: 'Email' },
          { type: 'select', name: 'colour', label: 'Colour', options: { choices: [{ value: 'red', label: 'Red' }] } },
        ]}
        values={{ first_name: 'Bob' }}
      />,
    )

    expect(markup).toContain('e.g. Bob')
    expect(markup).toContain('value="Bob"')
    expect(markup).toContain('Red')
  })

  it('renders a select with no choices without crashing', () => {
    const markup = renderToStaticMarkup(<Form schema={[{ type: 'select', name: 'colour' }]} />)

    expect(markup).toContain('select')
  })

  it('renders unknown field types as a message', () => {
    const markup = renderToStaticMarkup(<Form schema={[{ type: 'nope', name: 'nope' }]} />)

    expect(markup).toContain('Invalid field type.')
  })

  it('renders nested group fields with their values', () => {
    const markup = renderToStaticMarkup(
      <Form
        schema={[
          { type: 'group', name: 'address', options: { fields: [{ type: 'text', name: 'town', label: 'Town' }] } },
        ]}
        values={{ address: { town: 'Bristol' } }}
      />,
    )

    expect(markup).toContain('Town')
    expect(markup).toContain('value="Bristol"')
  })

  it('renders repeater items through the matrix input', () => {
    const markup = renderToStaticMarkup(
      <Form
        schema={[
          {
            type: 'repeater',
            name: 'pets',
            options: { fields: [{ type: 'text', name: 'petname', label: 'Pet name' }] },
          },
        ]}
        values={{ pets: [{ petname: 'Rex' }, { petname: 'Fido' }] }}
      />,
    )

    expect(markup).toContain('value="Rex"')
    expect(markup).toContain('value="Fido"')
  })

  it('renders matrix rows and columns with their values', () => {
    const markup = renderToStaticMarkup(
      <Form
        schema={[
          {
            type: 'matrix',
            name: 'grid',
            options: { fields: [{ type: 'number', name: 'amount', label: 'Amount' }] },
          },
        ]}
        values={{ grid: [[{ amount: 1 }, { amount: 2 }], [{ amount: 3 }]] }}
      />,
    )

    expect(markup).toContain('value="1"')
    expect(markup).toContain('value="2"')
    expect(markup).toContain('value="3"')
  })
})

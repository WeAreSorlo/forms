import * as inputs from '@/inputs'
import { Input, ValidationReport } from '@/types/inputs'
import { pickValues, validateServerValues, validateValues } from '@/utils/inputs'
import { validationError, validationSuccess } from '@/utils/validation'
import { describe, expect, it } from 'vitest'

const report = (schema: Array<any>, values: Record<string, any>): ValidationReport => {
  return validateValues(schema, values, inputs)
}

describe('validateValues', () => {
  it('validates a flat schema', () => {
    const schema = [
      { type: 'text', name: 'first_name', required: true },
      { type: 'text', name: 'last_name' },
    ]

    const result = report(schema, { last_name: 'Ross' })

    expect(result.isValid).toBe(false)
    expect(result.fields.first_name.isValid).toBe(false)
    expect(result.fields.first_name.messages).toEqual(['This field is required.'])
    expect(result.fields.last_name.isValid).toBe(true)
  })

  it('applies default values', () => {
    const schema = [{ type: 'text', name: 'first_name', required: true, defaultValue: 'Bob' }]

    expect(report(schema, {}).isValid).toBe(true)
  })

  it('walks nested groups', () => {
    const schema = [
      {
        type: 'group',
        name: 'address',
        options: { fields: [{ type: 'text', name: 'town', required: true }] },
      },
    ]

    const result = report(schema, { address: {} })
    const children = result.fields.address.children as ValidationReport

    expect(result.isValid).toBe(false)
    expect(result.fields.address.isValid).toBe(false)
    expect(children.fields.town.isValid).toBe(false)
  })

  it('walks repeater items', () => {
    const schema = [
      {
        type: 'repeater',
        name: 'pets',
        options: { fields: [{ type: 'text', name: 'petname', required: true }] },
      },
    ]

    const result = report(schema, { pets: [{ petname: '' }, { petname: 'Rex' }] })
    const children = result.fields.pets.children as Array<ValidationReport>

    expect(result.isValid).toBe(false)
    expect(children[0].fields.petname.isValid).toBe(false)
    expect(children[1].fields.petname.isValid).toBe(true)
  })

  it('walks matrix cells', () => {
    const schema = [
      {
        type: 'matrix',
        name: 'grid',
        options: { fields: [{ type: 'number', name: 'amount', required: true }] },
      },
    ]

    const result = report(schema, { grid: [[{ amount: '' }, { amount: 5 }]] })
    const children = result.fields.grid.children as Array<Array<ValidationReport>>

    expect(result.isValid).toBe(false)
    expect(children[0][0].fields.amount.isValid).toBe(false)
    expect(children[0][1].fields.amount.isValid).toBe(true)
  })

  it('lets custom inputs validate their own children', () => {
    // A custom container that stores its items under value.items
    const bundle: Input = {
      default: () => null,
      validateChildren: (value, schema, validateFields) => {
        const items: Array<Record<string, any>> = Array.isArray(value?.items) ? value.items : []
        return items.map((item) => validateFields(schema.options?.fields || [], item || {}))
      },
    }

    const schema = [
      {
        type: 'bundle',
        name: 'bundle',
        options: { fields: [{ type: 'text', name: 'label', required: true }] },
      },
    ]

    const result = validateValues(
      schema,
      { bundle: { items: [{ label: '' }, { label: 'ok' }] } },
      {
        ...inputs,
        bundle,
      },
    )
    const children = result.fields.bundle.children as Array<ValidationReport>

    expect(result.isValid).toBe(false)
    expect(result.fields.bundle.isValid).toBe(false)
    expect(children[0].fields.label.isValid).toBe(false)
    expect(children[1].fields.label.isValid).toBe(true)
  })

  it('reports container bounds through the field itself', () => {
    const schema = [
      {
        type: 'repeater',
        name: 'pets',
        options: { minimum: 2, fields: [{ type: 'text', name: 'petname' }] },
      },
    ]

    const result = report(schema, { pets: [{ petname: 'Rex' }] })

    expect(result.fields.pets.isValid).toBe(false)
    expect(result.fields.pets.messages).toEqual(['This field requires a minimum of 2 item(s).'])
  })
})

describe('environment validators', () => {
  // A custom input with a different validator for every environment
  const custom: Input = {
    default: () => null,
    validateValue: (value) => validationSuccess(value),
    validateClientValue: (value) => validationError(value, 'Client only.'),
    validateServerValue: (value) => validationError(value, 'Server only.'),
  }

  const schema = [{ type: 'custom', name: 'field' }]

  it('uses validateValue when no environment is given', () => {
    const result = validateValues(schema, { field: 'x' }, { ...inputs, custom })
    expect(result.fields.field.isValid).toBe(true)
  })

  it('prefers the environment specific validator', () => {
    const client = validateValues(schema, { field: 'x' }, { ...inputs, custom }, { environment: 'client' })
    expect(client.fields.field.messages).toEqual(['Client only.'])

    const server = validateValues(schema, { field: 'x' }, { ...inputs, custom }, { environment: 'server' })
    expect(server.fields.field.messages).toEqual(['Server only.'])
  })

  it('falls back to validateValue on the server when only a client validator exists', async () => {
    const clientOnly: Input = {
      default: () => null,
      validateValue: (value) => validationError(value, 'Always.'),
      validateClientValue: (value) => validationSuccess(value),
    }

    const result = await validateServerValues(schema, { field: 'x' }, { ...inputs, custom: clientOnly })
    expect(result.fields.field.messages).toEqual(['Always.'])
  })

  it('throws when an asynchronous validator is used in the synchronous walker', () => {
    const asynchronous: Input = {
      default: () => null,
      validateServerValue: async (value) => validationSuccess(value),
    }

    expect(() => {
      validateValues(schema, { field: 'x' }, { ...inputs, custom: asynchronous }, { environment: 'server' })
    }).toThrow()
  })

  it('awaits asynchronous server validators inside containers', async () => {
    const username: Input = {
      default: () => null,
      validateValue: (value) => validationSuccess(value),
      validateServerValue: async (value) => {
        return value === 'taken' ? validationError(value, 'Already taken.') : validationSuccess(value)
      },
    }

    const nested = [
      {
        type: 'repeater',
        name: 'users',
        options: { fields: [{ type: 'username', name: 'handle' }] },
      },
    ]

    const result = await validateServerValues(
      nested,
      { users: [{ handle: 'taken' }, { handle: 'free' }] },
      {
        ...inputs,
        username,
      },
    )
    const children = result.fields.users.children as Array<ValidationReport>

    expect(result.isValid).toBe(false)
    expect(children[0].fields.handle.messages).toEqual(['Already taken.'])
    expect(children[1].fields.handle.isValid).toBe(true)
  })
})

describe('pickValues', () => {
  it('strips values not defined by the schema', () => {
    const schema = [
      { type: 'text', name: 'first_name' },
      {
        type: 'group',
        name: 'address',
        options: { fields: [{ type: 'text', name: 'town' }] },
      },
      {
        type: 'repeater',
        name: 'pets',
        options: { fields: [{ type: 'text', name: 'petname' }] },
      },
    ]

    const picked = pickValues(
      schema,
      {
        first_name: 'Bob',
        junk: 'nope',
        address: { town: 'Bristol', junk: 'nope' },
        pets: [{ petname: 'Rex', junk: 'nope' }],
      },
      inputs,
    )

    expect(picked).toEqual({
      first_name: 'Bob',
      address: { town: 'Bristol' },
      pets: [{ petname: 'Rex' }],
    })
  })

  it('applies default values and skips unset fields', () => {
    const schema = [
      { type: 'text', name: 'first_name', defaultValue: 'Bob' },
      { type: 'text', name: 'last_name' },
    ]

    expect(pickValues(schema, {}, inputs)).toEqual({ first_name: 'Bob' })
  })

  it("enforces a hidden field's fixed value", () => {
    const schema = [{ type: 'hidden', name: 'source', options: { value: 'demo' } }]

    expect(pickValues(schema, { source: 'tampered' }, inputs)).toEqual({ source: 'demo' })
  })

  it('drops content values and junk shaped containers', () => {
    const schema = [
      { type: 'content', name: 'heading' },
      {
        type: 'repeater',
        name: 'pets',
        options: { fields: [{ type: 'text', name: 'petname' }] },
      },
    ]

    expect(pickValues(schema, { heading: 'junk', pets: 'junk' }, inputs)).toEqual({})
  })
})

import * as inputs from '@/inputs'
import { Input, ValidationReport } from '@/types/inputs'
import { validateValues } from '@/utils/inputs'
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

import * as inputs from '@/inputs'
import { Input, InputSchema, InputTypeFields } from '@/types/inputs'
import { describe, expect, it } from 'vitest'

const byType: Record<string, Input> = inputs

// Stands in for the generator, listing the nested fields' names
const typeFields: InputTypeFields = (fields) => `{${fields.map((field) => field.name).join(',')}}`

const typeOf = (type: string, options?: InputSchema['options']) => {
  return byType[type].typeValue?.({ name: 'field', options }, typeFields)
}

const choices = [{ value: 'red', label: 'Red' }, { value: 1 }]

describe('typeValue', () => {
  it('is implemented by every input', () => {
    for (const [type, input] of Object.entries(byType)) {
      expect(input.typeValue, `typeValue for '${type}'`).toBeTypeOf('function')
    }
  })

  it('types text-like values as strings', () => {
    const types = [
      'text',
      'textarea',
      'email',
      'password',
      'tel',
      'url',
      'identifier',
      'date',
      'time',
      'datetime',
      'color',
    ]
    for (const type of types) {
      expect(typeOf(type), type).toBe('string')
    }
  })

  it('types numbers and booleans', () => {
    expect(typeOf('number')).toBe('number')
    expect(typeOf('range')).toBe('number')
    expect(typeOf('boolean')).toBe('boolean')
  })

  it('types radios and selects as a union of their values as strings', () => {
    expect(typeOf('radio', { choices })).toBe('"red" | "1"')
    expect(typeOf('select', { choices })).toBe('"red" | "1"')
    expect(typeOf('select', { choices, multiple: true })).toBe('Array<"red" | "1">')
  })

  it('types conditions as groups of rules', () => {
    const operator =
      '"equals" | "notEquals" | "contains" | "notContains" | "startsWith" | "greaterThan" | "lessThan" | "empty" | "notEmpty"'
    expect(typeOf('conditions')).toBe(
      `Array<{ rules: Array<{ field: string; operator: ${operator}; value?: unknown }> }>`,
    )
  })

  it('types checkboxes as a list of their values', () => {
    expect(typeOf('checkbox', { choices })).toBe('Array<"red" | 1>')
  })

  it('includes the choices inside select option groups', () => {
    const grouped = [{ label: 'Warm', choices: [{ value: 'red' }, { value: 'orange' }] }, { value: 'blue' }]
    expect(typeOf('select', { choices: grouped })).toBe('"red" | "orange" | "blue"')
  })

  it('types choices without any values as never', () => {
    expect(typeOf('radio')).toBe('never')
    expect(typeOf('checkbox', { choices: [] })).toBe('Array<never>')
  })

  it('types containers from their nested fields', () => {
    const fields = [
      { name: 'title', type: 'text' },
      { name: 'body', type: 'textarea' },
    ]
    expect(typeOf('group', { fields })).toBe('{title,body}')
    expect(typeOf('repeater', { fields })).toBe('Array<{title,body}>')
    expect(typeOf('matrix', { fields })).toBe('Array<Array<{title,body}>>')
    expect(typeOf('group')).toBe('{}')
  })

  it('types flexible blocks as a union keyed on _layout', () => {
    const layouts = [
      { name: 'hero', fields: [{ name: 'heading', type: 'text' }] },
      { name: 'divider' },
      { label: 'Unnamed', fields: [{ name: 'lost', type: 'text' }] },
    ]
    expect(typeOf('flexible', { layouts })).toBe('Array<{ _layout: "hero" } & {heading} | { _layout: "divider" } & {}>')
    expect(typeOf('flexible')).toBe('Array<never>')
  })

  it('types a hidden field as its fixed value', () => {
    expect(typeOf('hidden', { value: 'newsletter' })).toBe('"newsletter"')
    expect(typeOf('hidden', { value: 42 })).toBe('42')
    expect(typeOf('hidden')).toBe('unknown')
  })

  it('leaves content out', () => {
    expect(typeOf('content', { content: 'Read me' })).toBeUndefined()
  })

  it('types a schema builder as a list of field schemas', () => {
    expect(typeOf('schemabuilder')).toBe('Array<Record<string, unknown>>')
  })
})

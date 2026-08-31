import * as boolean from '@/inputs/Boolean'
import * as email from '@/inputs/Email'
import * as number from '@/inputs/Number'
import * as select from '@/inputs/Select'
import * as text from '@/inputs/Text'
import * as textarea from '@/inputs/Textarea'
import { describe, expect, it } from 'vitest'

const schema = (overrides: Record<string, any> = {}) => ({ name: 'field', ...overrides })

describe('text', () => {
  it('accepts an empty optional value', () => {
    expect(text.validateValue('', schema()).isValid).toBe(true)
    expect(text.validateValue(undefined, schema()).isValid).toBe(true)
  })

  it('requires a value when required', () => {
    const validation = text.validateValue('', schema({ required: true }))
    expect(validation.isValid).toBe(false)
    expect(validation.messages).toEqual(['This field is required.'])
  })

  it('skips the length checks when an optional value is empty', () => {
    expect(text.validateValue('', schema({ options: { minLength: 3 } })).isValid).toBe(true)
  })

  it('enforces the minimum and maximum lengths', () => {
    expect(text.validateValue('ab', schema({ options: { minLength: 3 } })).isValid).toBe(false)
    expect(text.validateValue('abcd', schema({ options: { maxLength: 3 } })).isValid).toBe(false)
    expect(text.validateValue('abc', schema({ options: { minLength: 3, maxLength: 3 } })).isValid).toBe(true)
  })

  it('rejects non-string values', () => {
    expect(text.validateValue(123, schema({ required: true })).isValid).toBe(false)
  })
})

describe('textarea', () => {
  it('behaves like the text input', () => {
    expect(textarea.validateValue('', schema()).isValid).toBe(true)
    expect(textarea.validateValue('', schema({ required: true })).isValid).toBe(false)
    expect(textarea.validateValue('ab', schema({ options: { minLength: 3 } })).isValid).toBe(false)
  })
})

describe('number', () => {
  it('accepts 0 as a required value', () => {
    const validation = number.validateValue(0, schema({ required: true }))
    expect(validation.isValid).toBe(true)
    expect(validation.value).toBe(0)
  })

  it('keeps the raw value when a required field is cleared', () => {
    const validation = number.validateValue('', schema({ required: true }))
    expect(validation.isValid).toBe(false)
    expect(validation.value).toBe('')
  })

  it('accepts an empty optional value', () => {
    expect(number.validateValue('', schema()).isValid).toBe(true)
  })

  it('coerces numeric strings', () => {
    const validation = number.validateValue('42', schema())
    expect(validation.isValid).toBe(true)
    expect(validation.value).toBe(42)
  })

  it('rejects values that are not numbers', () => {
    expect(number.validateValue('abc', schema()).isValid).toBe(false)
  })

  it('enforces the minimum and maximum values', () => {
    expect(number.validateValue(1, schema({ options: { min: 2 } })).isValid).toBe(false)
    expect(number.validateValue(3, schema({ options: { max: 2 } })).isValid).toBe(false)
    expect(number.validateValue(0, schema({ options: { min: 0, max: 2 } })).isValid).toBe(true)
  })
})

describe('email', () => {
  it('accepts an empty optional value', () => {
    expect(email.validateValue('', schema()).isValid).toBe(true)
  })

  it('requires a value when required', () => {
    expect(email.validateValue('', schema({ required: true })).isValid).toBe(false)
  })

  it('validates a single address', () => {
    expect(email.validateValue('bob@example.com', schema()).isValid).toBe(true)
    expect(email.validateValue('nope', schema()).isValid).toBe(false)
  })

  it('validates multiple addresses', () => {
    const multiple = schema({ options: { multiple: true } })
    expect(email.validateValue('bob@example.com, ross@example.com', multiple).isValid).toBe(true)
    expect(email.validateValue('bob@example.com, nope', multiple).isValid).toBe(false)
  })
})

describe('select', () => {
  it('accepts an empty optional value', () => {
    expect(select.validateValue('', schema()).isValid).toBe(true)
    expect(select.validateValue([], schema({ options: { multiple: true } })).isValid).toBe(true)
  })

  it('requires a selection when required', () => {
    expect(select.validateValue('', schema({ required: true })).isValid).toBe(false)
  })

  it('requires at least one selection when required and multiple', () => {
    const validation = select.validateValue([], schema({ required: true, options: { multiple: true } }))
    expect(validation.isValid).toBe(false)
    expect(validation.messages).toEqual(['At least one selection is required.'])
  })
})

describe('boolean', () => {
  it('coerces truthy values to true', () => {
    expect(boolean.validateValue(true, schema()).value).toBe(true)
    expect(boolean.validateValue('yes', schema()).value).toBe(true)
    expect(boolean.validateValue('TRUE', schema()).value).toBe(true)
    expect(boolean.validateValue(1, schema()).value).toBe(true)
    expect(boolean.validateValue('no', schema()).value).toBe(false)
  })

  it('must be checked when required', () => {
    expect(boolean.validateValue(false, schema({ required: true })).isValid).toBe(false)
    expect(boolean.validateValue(true, schema({ required: true })).isValid).toBe(true)
  })
})

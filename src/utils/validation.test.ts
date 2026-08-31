import { isEmail, isEmptyValue, validationError, validationReset, validationSuccess } from '@/utils/validation'
import { describe, expect, it } from 'vitest'

describe('validation responses', () => {
  it('builds a success response', () => {
    expect(validationSuccess('abc')).toEqual({ isValid: true, messages: [], value: 'abc' })
  })

  it('builds an error response', () => {
    expect(validationError('abc', 'Nope.')).toEqual({ isValid: false, messages: ['Nope.'], value: 'abc' })
  })

  it('builds a reset response', () => {
    expect(validationReset('abc', [])).toEqual({ isValid: undefined, messages: [], value: 'abc' })
  })

  it('accepts a single message or an array of messages', () => {
    expect(validationError('abc', 'One.').messages).toEqual(['One.'])
    expect(validationError('abc', ['One.', 'Two.']).messages).toEqual(['One.', 'Two.'])
  })
})

describe('isEmptyValue', () => {
  it('treats empty strings, null, undefined and empty arrays as empty', () => {
    expect(isEmptyValue('')).toBe(true)
    expect(isEmptyValue(null)).toBe(true)
    expect(isEmptyValue(undefined)).toBe(true)
    expect(isEmptyValue([])).toBe(true)
  })

  it('does not treat 0 or false as empty', () => {
    expect(isEmptyValue(0)).toBe(false)
    expect(isEmptyValue(false)).toBe(false)
    expect(isEmptyValue('0')).toBe(false)
    expect(isEmptyValue([0])).toBe(false)
  })
})

describe('isEmail', () => {
  it('accepts valid email addresses', () => {
    expect(isEmail('bob@example.com')).toBe(true)
    expect(isEmail('bob.ross+paint@example.co.uk')).toBe(true)
  })

  it('rejects invalid email addresses', () => {
    expect(isEmail('nope')).toBe(false)
    expect(isEmail('nope@')).toBe(false)
    expect(isEmail('@example.com')).toBe(false)
    expect(isEmail('bob@example')).toBe(false)
    expect(isEmail('bob@exa mple.com')).toBe(false)
  })
})

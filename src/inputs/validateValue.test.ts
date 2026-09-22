import * as boolean from '@/inputs/Boolean'
import * as checkbox from '@/inputs/Checkbox'
import * as color from '@/inputs/Color'
import * as date from '@/inputs/Date'
import * as datetime from '@/inputs/Datetime'
import * as email from '@/inputs/Email'
import * as matrix from '@/inputs/Matrix'
import * as number from '@/inputs/Number'
import * as password from '@/inputs/Password'
import * as radio from '@/inputs/Radio'
import * as range from '@/inputs/Range'
import * as repeater from '@/inputs/Repeater'
import * as select from '@/inputs/Select'
import * as tel from '@/inputs/Tel'
import * as text from '@/inputs/Text'
import * as textarea from '@/inputs/Textarea'
import * as time from '@/inputs/Time'
import * as url from '@/inputs/Url'
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

describe('url', () => {
  it('accepts an empty optional value', () => {
    expect(url.validateValue('', schema()).isValid).toBe(true)
  })

  it('validates web addresses', () => {
    expect(url.validateValue('https://example.com', schema()).isValid).toBe(true)
    expect(url.validateValue('http://example.com/path?query=1', schema()).isValid).toBe(true)
    expect(url.validateValue('example.com', schema()).isValid).toBe(false)
    expect(url.validateValue('ftp://example.com', schema()).isValid).toBe(false)
    expect(url.validateValue('nope', schema()).isValid).toBe(false)
  })
})

describe('tel', () => {
  it('accepts an empty optional value', () => {
    expect(tel.validateValue('', schema()).isValid).toBe(true)
  })

  it('validates phone numbers with common formatting', () => {
    expect(tel.validateValue('+44 7700 900123', schema()).isValid).toBe(true)
    expect(tel.validateValue('(01234) 567-890', schema()).isValid).toBe(true)
    expect(tel.validateValue('nope', schema()).isValid).toBe(false)
    expect(tel.validateValue('123', schema()).isValid).toBe(false)
  })
})

describe('password', () => {
  it('behaves like the text input', () => {
    expect(password.validateValue('', schema({ required: true })).isValid).toBe(false)
    expect(password.validateValue('ab', schema({ options: { minLength: 8 } })).isValid).toBe(false)
    expect(password.validateValue('longenough', schema({ options: { minLength: 8 } })).isValid).toBe(true)
  })

  it('never exposes the value when formatting', () => {
    expect(password.formatValue('hunter2', schema())).not.toContain('hunter2')
  })
})

describe('color', () => {
  it('accepts an empty optional value', () => {
    expect(color.validateValue('', schema()).isValid).toBe(true)
  })

  it('validates hex colors', () => {
    expect(color.validateValue('#ff0000', schema()).isValid).toBe(true)
    expect(color.validateValue('#FF0000', schema()).isValid).toBe(true)
    expect(color.validateValue('red', schema()).isValid).toBe(false)
    expect(color.validateValue('#f00', schema()).isValid).toBe(false)
  })
})

describe('range', () => {
  it('behaves like the number input', () => {
    expect(range.validateValue(0, schema({ required: true })).isValid).toBe(true)
    expect(range.validateValue('5', schema()).value).toBe(5)
    expect(range.validateValue(11, schema({ options: { max: 10 } })).isValid).toBe(false)
    expect(range.validateValue(1, schema({ options: { min: 2 } })).isValid).toBe(false)
  })
})

describe('date', () => {
  it('accepts an empty optional value', () => {
    expect(date.validateValue('', schema()).isValid).toBe(true)
  })

  it('validates ISO dates', () => {
    expect(date.validateValue('2026-01-15', schema()).isValid).toBe(true)
    expect(date.validateValue('2026-13-45', schema()).isValid).toBe(false)
    expect(date.validateValue('15/01/2026', schema()).isValid).toBe(false)
  })

  it('enforces the minimum and maximum dates', () => {
    expect(date.validateValue('2026-01-15', schema({ options: { min: '2026-02-01' } })).isValid).toBe(false)
    expect(date.validateValue('2026-01-15', schema({ options: { max: '2026-01-01' } })).isValid).toBe(false)
    expect(
      date.validateValue('2026-01-15', schema({ options: { min: '2026-01-01', max: '2026-02-01' } })).isValid,
    ).toBe(true)
  })
})

describe('time', () => {
  it('validates 24 hour times', () => {
    expect(time.validateValue('13:30', schema()).isValid).toBe(true)
    expect(time.validateValue('13:30:59', schema()).isValid).toBe(true)
    expect(time.validateValue('25:00', schema()).isValid).toBe(false)
    expect(time.validateValue('13:60', schema()).isValid).toBe(false)
    expect(time.validateValue('nope', schema()).isValid).toBe(false)
  })

  it('enforces the minimum and maximum times', () => {
    expect(time.validateValue('08:00', schema({ options: { min: '09:00' } })).isValid).toBe(false)
    expect(time.validateValue('18:00', schema({ options: { max: '17:00' } })).isValid).toBe(false)
  })
})

describe('datetime', () => {
  it('validates local ISO datetimes', () => {
    expect(datetime.validateValue('2026-01-15T13:30', schema()).isValid).toBe(true)
    expect(datetime.validateValue('2026-01-15T13:30:59', schema()).isValid).toBe(true)
    expect(datetime.validateValue('2026-01-15', schema()).isValid).toBe(false)
    expect(datetime.validateValue('nope', schema()).isValid).toBe(false)
  })
})

describe('radio', () => {
  it('accepts an empty optional value', () => {
    expect(radio.validateValue('', schema()).isValid).toBe(true)
  })

  it('requires a selection when required', () => {
    expect(radio.validateValue('', schema({ required: true })).isValid).toBe(false)
    expect(radio.validateValue('red', schema({ required: true })).isValid).toBe(true)
  })
})

describe('checkbox', () => {
  it('accepts an empty optional value', () => {
    expect(checkbox.validateValue([], schema()).isValid).toBe(true)
  })

  it('requires at least one selection when required', () => {
    const validation = checkbox.validateValue([], schema({ required: true }))
    expect(validation.isValid).toBe(false)
    expect(validation.messages).toEqual(['At least one selection is required.'])
  })

  it('rejects values that are not arrays', () => {
    expect(checkbox.validateValue('red', schema()).isValid).toBe(false)
  })
})

describe('message overrides', () => {
  it('prefers per field messages over the built in translations', () => {
    const validation = text.validateValue(
      '',
      schema({ required: true, options: { messages: { required: 'Please enter your work email' } } }),
    )

    expect(validation.messages).toEqual(['Please enter your work email'])
  })

  it('interpolates parameters into overridden messages', () => {
    const validation = number.validateValue(
      1,
      schema({ options: { min: 5, messages: { min: 'Must be at least {{min}}' } } }),
    )

    expect(validation.messages).toEqual(['Must be at least 5'])
  })

  it('falls back to the built in translations for keys without overrides', () => {
    const validation = text.validateValue('', schema({ required: true, options: { messages: { invalid: 'Nope' } } }))

    expect(validation.messages).toEqual(['This field is required.'])
  })
})

describe('repeater', () => {
  it('accepts an empty optional value', () => {
    expect(repeater.validateValue(undefined, schema()).isValid).toBe(true)
    expect(repeater.validateValue([], schema({ options: { minimum: 2 } })).isValid).toBe(true)
  })

  it('requires items when required', () => {
    expect(repeater.validateValue([], schema({ required: true })).isValid).toBe(false)
  })

  it('enforces the minimum and maximum number of items', () => {
    expect(repeater.validateValue([{}], schema({ options: { minimum: 2 } })).isValid).toBe(false)
    expect(repeater.validateValue([{}, {}], schema({ options: { maximum: 1 } })).isValid).toBe(false)
    expect(repeater.validateValue([{}, {}], schema({ options: { minimum: 1, maximum: 2 } })).isValid).toBe(true)
  })
})

describe('matrix', () => {
  it('accepts an empty optional value', () => {
    expect(matrix.validateValue(undefined, schema()).isValid).toBe(true)
    expect(matrix.validateValue([], schema({ options: { minimumRows: 2 } })).isValid).toBe(true)
  })

  it('rejects values that are not a matrix', () => {
    expect(matrix.validateValue('nope', schema()).isValid).toBe(false)
    expect(matrix.validateValue([{ amount: 1 }], schema()).isValid).toBe(false)
  })

  it('enforces the row bounds', () => {
    expect(matrix.validateValue([[{}]], schema({ options: { minimumRows: 2 } })).isValid).toBe(false)
    expect(matrix.validateValue([[{}], [{}]], schema({ options: { maximumRows: 1 } })).isValid).toBe(false)
  })

  it('enforces the column bounds', () => {
    expect(matrix.validateValue([[{}]], schema({ options: { minimumColumns: 2 } })).isValid).toBe(false)
    expect(matrix.validateValue([[{}, {}]], schema({ options: { maximumColumns: 1 } })).isValid).toBe(false)
    expect(matrix.validateValue([[{}, {}]], schema({ options: { maximumColumns: 2 } })).isValid).toBe(true)
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

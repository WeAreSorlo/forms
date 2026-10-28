import * as boolean from '@/inputs/Boolean'
import * as checkbox from '@/inputs/Checkbox'
import * as color from '@/inputs/Color'
import * as date from '@/inputs/Date'
import * as datetime from '@/inputs/Datetime'
import * as email from '@/inputs/Email'
import * as flexible from '@/inputs/Flexible'
import * as identifier from '@/inputs/Identifier'
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

  it('accepts only the choices, including those in option groups, as strings', () => {
    const options = { choices: [{ label: 'Warm', choices: [{ value: 'red' }, { value: 'orange' }] }, { value: 1 }] }
    expect(select.validateValue('orange', schema({ options })).isValid).toBe(true)
    expect(select.validateValue('1', schema({ options })).isValid).toBe(true)
    expect(select.validateValue(1, schema({ options })).isValid).toBe(false)
    expect(select.validateValue('Warm', schema({ options })).isValid).toBe(false)
    expect(select.validateValue(['red'], schema({ options })).isValid).toBe(false)

    const validation = select.validateValue('blue', schema({ options }))
    expect(validation.isValid).toBe(false)
    expect(validation.messages).toEqual(['A valid choice required.'])
  })

  it('checks every selection when multiple', () => {
    const options = { multiple: true, choices: [{ value: 'red' }, { value: 'blue' }] }
    expect(select.validateValue(['red', 'blue'], schema({ options })).isValid).toBe(true)
    expect(select.validateValue(['red', 'green'], schema({ options })).isValid).toBe(false)
    expect(select.validateValue('red', schema({ options })).isValid).toBe(false)
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

describe('identifier', () => {
  const formatted = (format: string, unicode = false) => schema({ options: { format, unicode } })

  it('accepts an empty optional value and requires one when required', () => {
    expect(identifier.validateValue('', schema()).isValid).toBe(true)
    expect(identifier.validateValue('', schema({ required: true })).messages).toEqual(['This field is required.'])
  })

  it('validates kebab case by default, which may start with a digit', () => {
    for (const value of ['my-post', 'post-2', '2024-recap']) {
      expect(identifier.validateValue(value, schema()).isValid, value).toBe(true)
    }
    for (const value of ['My-Post', 'my post', 'café', 'my--post', '-my-post', 'my-post-', 'my_post', 'myPost']) {
      expect(identifier.validateValue(value, schema()).isValid, value).toBe(false)
    }
    expect(identifier.validateValue(123, schema()).isValid).toBe(false)
  })

  it('validates the code styles, which must start with a letter', () => {
    const cases: Array<[string, Array<string>, Array<string>]> = [
      ['snake', ['first_name', 'address_line_2'], ['first-name', 'First_name', 'first__name']],
      ['camel', ['firstName', 'myHTTPServer', 'h1Title'], ['FirstName', 'first_name', 'first name']],
      ['pascal', ['FirstName', 'HTTPServer', 'H1Title'], ['firstName', 'First_Name', 'First Name']],
      [
        'mixed',
        ['FirstName', 'emailOptIn', 'utm_source', 'utm_source__c', 'miscBlankField3TextArea'],
        ['address.town', 'first name', 'first-name', '_layout', 'HtmlText_2026-05-05T09:52:21.022Z'],
      ],
    ]

    for (const [format, valid, invalid] of cases) {
      for (const value of valid) {
        expect(identifier.validateValue(value, formatted(format)).isValid, `${format} ${value}`).toBe(true)
      }
      for (const value of invalid) {
        expect(identifier.validateValue(value, formatted(format)).isValid, `${format} ${value}`).toBe(false)
      }
      expect(identifier.validateValue('2fa', formatted(format)).messages).toEqual([
        'This field must start with a letter.',
      ])
    }
  })

  it('shows an example of the format in its message', () => {
    const messages = (format: string) => identifier.validateValue('My Page!', formatted(format)).messages

    expect(messages('kebab')).toEqual(['A valid identifier required, e.g. my-page.'])
    expect(messages('snake')).toEqual(['A valid identifier required, e.g. my_page.'])
    expect(messages('camel')).toEqual(['A valid identifier required, e.g. myPage.'])
    expect(messages('pascal')).toEqual(['A valid identifier required, e.g. MyPage.'])
    expect(messages('mixed')).toEqual(['A valid identifier required, e.g. my_page.'])
  })

  it('only accepts letters from other scripts when unicode is set', () => {
    expect(identifier.validateValue('東京-タワー', schema()).isValid).toBe(false)
    expect(identifier.validateValue('東京-タワー', formatted('kebab', true)).isValid).toBe(true)
    expect(identifier.validateValue('привет-мир', formatted('kebab', true)).isValid).toBe(true)
    expect(identifier.validateValue('Привет-мир', formatted('kebab', true)).isValid).toBe(false)
    expect(identifier.validateValue('東京タワー', formatted('pascal', true)).isValid).toBe(true)
  })

  it('formats text into each style', () => {
    expect(identifier.formatIdentifier('Hello, World!')).toBe('hello-world')
    expect(identifier.formatIdentifier('Hello, World!', 'snake')).toBe('hello_world')
    expect(identifier.formatIdentifier('Hello, World!', 'camel')).toBe('helloWorld')
    expect(identifier.formatIdentifier('Hello, World!', 'pascal')).toBe('HelloWorld')
    expect(identifier.formatIdentifier('Hello, World!', 'mixed')).toBe('hello_world')
    expect(identifier.formatIdentifier('Version 2.0')).toBe('version-2-0')
    expect(identifier.formatIdentifier('')).toBe('')
  })

  it('removes Latin accents', () => {
    expect(identifier.formatIdentifier('Crème Brûlée à la Straße')).toBe('creme-brulee-a-la-strasse')
    expect(identifier.formatIdentifier('Việt Nam')).toBe('viet-nam')
    expect(identifier.formatIdentifier('Łódź')).toBe('lodz')
  })

  it('keeps the words of existing names in the code styles only', () => {
    expect(identifier.formatIdentifier('emailOptIn', 'snake')).toBe('email_opt_in')
    expect(identifier.formatIdentifier('myHTTPServer', 'camel')).toBe('myHttpServer')
    expect(identifier.formatIdentifier('FirstName', 'camel')).toBe('firstName')
    expect(identifier.formatIdentifier('iPhone 15 Review')).toBe('iphone-15-review')
  })

  it('drops other scripts unless unicode is set, keeping their own marks', () => {
    expect(identifier.formatIdentifier('東京 タワー')).toBe('')
    expect(identifier.formatIdentifier('東京 タワー', 'kebab', true)).toBe('東京-タワー')
    expect(identifier.formatIdentifier('Мой дом', 'kebab', true)).toBe('мой-дом')
    expect(identifier.formatIdentifier('नमस्ते दुनिया', 'kebab', true)).toBe('नमस्ते-दुनिया')
    expect(identifier.formatIdentifier('Привет мир', 'camel', true)).toBe('приветМир')
  })

  it('accepts everything it generates that starts with a letter', () => {
    const samples = [
      'Hello World',
      'a b c',
      'myHTTPServer',
      'emailOptIn',
      'Crème Brûlée',
      'Việt Nam',
      '東京 タワー',
      'Мой дом',
      'नमस्ते दुनिया',
      'Οδός',
      'iPhone 15',
    ]

    for (const format of ['kebab', 'snake', 'camel', 'pascal', 'mixed'] as const) {
      for (const unicode of [false, true]) {
        for (const text of samples) {
          const value = identifier.formatIdentifier(text, format, unicode)
          if (!/^\p{L}/u.test(value)) continue
          expect(identifier.validateValue(value, formatted(format, unicode)).isValid, `${format} ${text}`).toBe(true)
        }
      }
    }
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
    const options = { choices: [{ value: 'red' }] }
    expect(radio.validateValue('', schema({ required: true, options })).isValid).toBe(false)
    expect(radio.validateValue('red', schema({ required: true, options })).isValid).toBe(true)
  })

  it('accepts only the choices, as the strings the browser gives', () => {
    const options = { choices: [{ value: 'red' }, { value: 1 }] }
    expect(radio.validateValue('1', schema({ options })).isValid).toBe(true)
    expect(radio.validateValue(1, schema({ options })).isValid).toBe(false)

    const validation = radio.validateValue('blue', schema({ options }))
    expect(validation.isValid).toBe(false)
    expect(validation.messages).toEqual(['A valid choice required.'])
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

  it('accepts only the choices, keeping their own values', () => {
    const options = { choices: [{ value: 'red' }, { value: 1 }] }
    expect(checkbox.validateValue(['red', 1], schema({ options })).isValid).toBe(true)
    expect(checkbox.validateValue(['1'], schema({ options })).isValid).toBe(false)

    const validation = checkbox.validateValue(['red', 'blue'], schema({ options }))
    expect(validation.isValid).toBe(false)
    expect(validation.messages).toEqual(['A valid choice required.'])
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

describe('flexible', () => {
  const layouts = schema({
    options: {
      layouts: [
        { name: 'hero', fields: [] },
        { name: 'quote', fields: [] },
      ],
    },
  })

  it('accepts an empty optional value and requires a block when required', () => {
    expect(flexible.validateValue(undefined, layouts).isValid).toBe(true)
    expect(flexible.validateValue([], { ...layouts, required: true }).messages).toEqual(['This field is required.'])
  })

  it('accepts blocks that use one of its layouts', () => {
    expect(flexible.validateValue([{ _layout: 'hero' }, { _layout: 'quote' }], layouts).isValid).toBe(true)
  })

  it('rejects anything else', () => {
    for (const value of ['nope', [{ _layout: 'gallery' }], [{ title: 'No layout' }], [null]]) {
      expect(flexible.validateValue(value, layouts).isValid, JSON.stringify(value)).toBe(false)
    }
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

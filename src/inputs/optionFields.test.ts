import * as inputs from '@/inputs'
import { FieldSchema } from '@/types/fields'
import { Input } from '@/types/inputs'
import { describe, expect, it } from 'vitest'

const inputEntries = Object.entries(inputs) as Array<[string, Input]>

const optionFields = (input: Input): Array<FieldSchema> => {
  return input.optionFields ? input.optionFields([]) : []
}

// Collect every nested field so option fields of option fields are checked too
const collectFields = (fields: Array<FieldSchema>): Array<FieldSchema> => {
  return fields.flatMap((field) => {
    return [field, ...collectFields(field.options?.fields || [])]
  })
}

describe('optionFields', () => {
  it('declares every option consumed by each input', () => {
    const expected: Record<string, Array<string>> = {
      text: ['placeholder', 'minLength', 'maxLength'],
      textarea: ['placeholder', 'rows', 'minLength', 'maxLength'],
      number: ['placeholder', 'min', 'max'],
      email: ['placeholder', 'multiple', 'minLength', 'maxLength'],
      url: ['placeholder'],
      tel: ['placeholder'],
      identifier: ['source', 'format', 'unicode'],
      password: ['placeholder', 'minLength', 'maxLength'],
      hidden: ['value'],
      color: [],
      range: ['min', 'max', 'step'],
      date: ['min', 'max'],
      time: ['min', 'max'],
      datetime: ['min', 'max'],
      select: ['choices', 'placeholder', 'multiple'],
      radio: ['choices'],
      checkbox: ['choices'],
      boolean: ['message'],
      group: ['fields'],
      repeater: ['fields', 'minimum', 'maximum', 'direction'],
      matrix: ['fields', 'minimumRows', 'maximumRows', 'minimumColumns', 'maximumColumns'],
      schemabuilder: [],
      content: ['content'],
    }

    for (const [type, input] of inputEntries) {
      const names = optionFields(input).map((field) => field.name)
      expect(names.sort(), `optionFields for '${type}'`).toEqual((expected[type] || []).sort())
    }
  })

  it('gives every option field a unique name', () => {
    for (const [type, input] of inputEntries) {
      const names = optionFields(input).map((field) => field.name)
      expect(new Set(names).size, `optionFields for '${type}'`).toBe(names.length)
    }
  })

  it('only references valid input types', () => {
    const validTypes = Object.keys(inputs)

    for (const [type, input] of inputEntries) {
      for (const field of collectFields(optionFields(input))) {
        expect(validTypes, `optionFields for '${type}'`).toContain(field.type)
        expect(field.name, `optionFields for '${type}'`).toBeTruthy()
      }
    }
  })
})

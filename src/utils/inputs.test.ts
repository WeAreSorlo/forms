import * as inputs from '@/inputs'
import { Input, ValidationReport } from '@/types/inputs'
import {
  baseInputSchemaFields,
  flattenValidationReport,
  pickValues,
  validateSchema,
  validateServerValues,
  validateValues,
} from '@/utils/inputs'
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

  it('walks flexible blocks against their own layouts', async () => {
    const schema = [
      {
        type: 'flexible',
        name: 'blocks',
        options: {
          layouts: [
            { name: 'hero', fields: [{ type: 'text', name: 'title', required: true }] },
            { name: 'quote', fields: [{ type: 'text', name: 'quote', required: true }] },
          ],
        },
      },
    ]
    const values = {
      blocks: [
        { _layout: 'hero', title: '' },
        { _layout: 'quote', quote: 'Hi' },
      ],
    }

    // The client and the server report the block's field under the same path
    const expected = { 'blocks.0.title': ['This field is required.'] }
    expect(flattenValidationReport(report(schema, values)).messages).toEqual(expected)
    expect(flattenValidationReport(await validateServerValues(schema, values, inputs)).messages).toEqual(expected)
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

  it("leaves a list's items unchecked while the list fails its own check", async () => {
    const petname = { type: 'text', name: 'petname', required: true }
    const schema = [
      { type: 'repeater', name: 'most', options: { maximum: 1, fields: [petname] } },
      { type: 'repeater', name: 'least', options: { minimum: 3, fields: [petname] } },
      { type: 'matrix', name: 'grid', options: { maximumRows: 1, fields: [petname] } },
      { type: 'flexible', name: 'blocks', options: { layouts: [{ name: 'hero', fields: [petname] }] } },
      { type: 'repeater', name: 'within', options: { maximum: 2, fields: [petname] } },
    ]
    const values = {
      most: [{}, {}],
      least: [{}, {}],
      grid: [[{}], [{}]],
      blocks: [{ _layout: 'hero' }, { _layout: 'gone' }],
      within: [{}, { petname: 'Rex' }],
    }
    const expected = {
      most: ['This field requires a maximum of 1 item(s).'],
      least: ['This field requires a minimum of 3 item(s).'],
      grid: ['This field requires a maximum of 1 row(s).'],
      blocks: ['Invalid value.'],
      'within.0.petname': ['This field is required.'],
    }

    for (const result of [report(schema, values), await validateServerValues(schema, values, inputs)]) {
      expect(result.isValid).toBe(false)
      expect(flattenValidationReport(result).messages).toEqual(expected)
      for (const name of ['most', 'least', 'grid', 'blocks']) expect(result.fields[name].children).toBeUndefined()
      expect(result.fields.within.children).toHaveLength(2)
    }

    // allowIncomplete drops the minimum, so an unfinished list still checks its items
    const draft = validateValues(
      [{ type: 'repeater', name: 'least', options: { minimum: 3, fields: [{ type: 'email', name: 'email' }] } }],
      { least: [{ email: 'nope' }] },
      inputs,
      { allowIncomplete: true },
    )
    expect(flattenValidationReport(draft).messages).toEqual({ 'least.0.email': ['A valid email address required.'] })
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

describe('incomplete values', () => {
  const incomplete = { allowIncomplete: true }

  it('leave out required fields and minimums, keeping formats, maximums and ranges', async () => {
    const schema = [
      { type: 'text', name: 'title', required: true },
      { type: 'textarea', name: 'summary', options: { minLength: 10 } },
      { type: 'password', name: 'secret', options: { maxLength: 4 } },
      { type: 'email', name: 'email', required: true },
      { type: 'number', name: 'rating', required: true, options: { min: 1, max: 5 } },
      { type: 'checkbox', name: 'tags', required: true, options: { choices: [{ value: 'news', label: 'News' }] } },
      { type: 'boolean', name: 'agree', required: true },
    ]
    const values = { summary: 'Short', secret: 'toolong', email: 'nope', rating: 0 }
    const kept = {
      secret: ['This field requires a maximum of 4 character(s).'],
      email: ['A valid email address required.'],
      rating: ['This field requires a minimum value of 1.'],
    }

    expect(flattenValidationReport(validateValues(schema, values, inputs, incomplete)).messages).toEqual(kept)
    expect(flattenValidationReport(await validateServerValues(schema, values, inputs, incomplete)).messages).toEqual(
      kept,
    )

    // Without the option, the unfinished fields fail too
    expect(Object.keys(flattenValidationReport(report(schema, values)).messages)).toEqual(
      schema.map((field) => field.name),
    )
  })

  it("reach the fields inside every container, keeping a container's other checks", async () => {
    const schema = [
      { type: 'group', name: 'address', options: { fields: [{ type: 'text', name: 'town', required: true }] } },
      {
        type: 'repeater',
        name: 'pets',
        required: true,
        options: { minimum: 2, fields: [{ type: 'text', name: 'petname', required: true }] },
      },
      { type: 'repeater', name: 'links', options: { maximum: 1, fields: [{ type: 'url', name: 'url' }] } },
      {
        type: 'matrix',
        name: 'grid',
        options: { minimumRows: 2, minimumColumns: 2, fields: [{ type: 'number', name: 'amount', required: true }] },
      },
      {
        type: 'flexible',
        name: 'blocks',
        required: true,
        options: {
          layouts: [
            {
              name: 'hero',
              fields: [
                { type: 'text', name: 'title', required: true },
                { type: 'email', name: 'contact' },
              ],
            },
          ],
        },
      },
      { type: 'flexible', name: 'aside', options: { layouts: [{ name: 'hero' }] } },
      { type: 'schemabuilder', name: 'fields', required: true },
    ]
    const values = {
      address: {},
      pets: [{ petname: '' }],
      links: [{ url: 'https://example.com' }, { url: 'https://example.org' }],
      grid: [[{ amount: '' }]],
      blocks: [{ _layout: 'hero', contact: 'nope' }],
      aside: [{ _layout: 'gone' }],
    }
    const kept = {
      links: ['This field requires a maximum of 1 item(s).'],
      'blocks.0.contact': ['A valid email address required.'],
      aside: ['Invalid value.'],
    }

    expect(flattenValidationReport(validateValues(schema, values, inputs, incomplete)).messages).toEqual(kept)
    expect(flattenValidationReport(await validateServerValues(schema, values, inputs, incomplete)).messages).toEqual(
      kept,
    )

    // Without the option, the unfinished ones fail too
    expect(flattenValidationReport(report(schema, values)).messages).toMatchObject({
      'address.town': ['This field is required.'],
      pets: ['This field requires a minimum of 2 item(s).'],
      grid: ['This field requires a minimum of 2 row(s).'],
      'blocks.0.title': ['This field is required.'],
      fields: ['This field is required.'],
    })
  })

  it('give custom inputs the same schema, server validators included', async () => {
    // A count only the server can check, e.g. of records that still exist
    const records: Input = {
      default: () => null,
      validateServerValue: async (value, schema) => {
        const count = Array.isArray(value) ? value.length : 0
        if (schema.required && count === 0) return validationError(value, 'Required.')
        if (count < (schema.options?.minimum ?? 0)) return validationError(value, 'Too few.')
        if (count > (schema.options?.maximum ?? Infinity)) return validationError(value, 'Too many.')
        return validationSuccess(value)
      },
    }

    const schema = [
      { type: 'records', name: 'authors', required: true, options: { minimum: 2 } },
      { type: 'records', name: 'editors', required: true },
      { type: 'records', name: 'tags', options: { maximum: 1 } },
    ]
    const values = { authors: ['a'], editors: [], tags: ['a', 'b'] }
    const result = await validateServerValues(schema, values, { ...inputs, records }, incomplete)

    expect(flattenValidationReport(result).messages).toEqual({ tags: ['Too many.'] })
  })
})

describe('conditional fields', () => {
  const schema = [
    { type: 'boolean', name: 'has_pets' },
    {
      type: 'repeater',
      name: 'pets',
      required: true,
      conditions: [{ field: 'has_pets', operator: 'equals' as const, value: true }],
      options: {
        fields: [
          { type: 'text', name: 'petname', required: true },
          {
            type: 'text',
            name: 'chip_id',
            required: true,
            conditions: [{ field: 'petname', operator: 'notEmpty' as const }],
          },
        ],
      },
    },
  ]

  it('skips hidden fields when validating', () => {
    // The required repeater is hidden, so it is not validated at all
    const hidden = validateValues(schema, { has_pets: false }, inputs)
    expect(hidden.isValid).toBe(true)
    expect(hidden.fields.pets).toBeUndefined()

    const shown = validateValues(schema, { has_pets: true }, inputs)
    expect(shown.isValid).toBe(false)
  })

  it('evaluates nested conditions against the item scope first', () => {
    const result = validateValues(schema, { has_pets: true, pets: [{ petname: '' }, { petname: 'Rex' }] }, inputs)
    const children = result.fields.pets.children as Array<ValidationReport>

    // chip_id is hidden while its sibling petname is empty
    expect(children[0].fields.chip_id).toBeUndefined()
    expect(children[1].fields.chip_id?.isValid).toBe(false)
  })

  it('strips hidden fields when picking', () => {
    const picked = pickValues(schema, { has_pets: false, pets: [{ petname: 'Rex' }] }, inputs)
    expect(picked).toEqual({ has_pets: false })
  })
})

describe('conditions on posted values', () => {
  const schema = [
    { type: 'boolean', name: 'featured' },
    {
      type: 'text',
      name: 'note',
      required: true,
      conditions: [{ field: 'featured', operator: 'equals' as const, value: true }],
    },
  ]

  // A plain HTML post must show, validate and pick the same fields as the typed values it stands for
  const expectSameAsTyped = async (schema: Array<any>, posted: Record<string, any>, typed: Record<string, any>) => {
    expect(pickValues(schema, posted, inputs)).toEqual(typed)
    expect(pickValues(schema, typed, inputs)).toEqual(typed)
    expect(validateValues(schema, posted, inputs)).toEqual(validateValues(schema, typed, inputs))
    expect(await validateServerValues(schema, posted, inputs)).toEqual(
      await validateServerValues(schema, typed, inputs),
    )
  }

  it("matches a checked box posted as 'on' against true", async () => {
    await expectSameAsTyped(schema, { featured: 'on', note: 'hi' }, { featured: true, note: 'hi' })
  })

  it('matches nested values, and dotted paths into them, the same way', async () => {
    const nested = [
      { type: 'repeater', name: 'posts', options: { fields: schema } },
      {
        type: 'text',
        name: 'pinned',
        conditions: [{ field: 'posts.0.featured', operator: 'equals' as const, value: true }],
      },
    ]

    // The second post's box is unchecked, so the browser leaves it out
    await expectSameAsTyped(
      nested,
      { posts: [{ featured: 'on', note: 'hi' }, { note: 'draft' }], pinned: 'yes' },
      { posts: [{ featured: true, note: 'hi' }, { featured: false }], pinned: 'yes' },
    )
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

  it("keeps flexible blocks whose layout exists, with only that layout's fields", () => {
    const schema = [
      {
        type: 'flexible',
        name: 'blocks',
        options: { layouts: [{ name: 'hero', fields: [{ type: 'text', name: 'title' }] }] },
      },
    ]

    const picked = pickValues(
      schema,
      {
        blocks: [
          { _layout: 'hero', title: 'Welcome', junk: 'nope' },
          { _layout: 'gallery', images: [] },
        ],
      },
      inputs,
    )

    expect(picked).toEqual({ blocks: [{ _layout: 'hero', title: 'Welcome' }] })
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

  it('keeps values as their validators return them, at any depth', () => {
    const schema = [
      { type: 'number', name: 'age' },
      { type: 'boolean', name: 'newsletter' },
      { type: 'boolean', name: 'terms' },
      {
        type: 'repeater',
        name: 'pets',
        options: { fields: [{ type: 'range', name: 'legs' }] },
      },
    ]

    // As a plain HTML form posts them, where an unchecked box is left out
    const picked = pickValues(schema, { age: '42', newsletter: 'on', pets: [{ legs: '4' }] }, inputs)

    expect(picked).toEqual({ age: 42, newsletter: true, terms: false, pets: [{ legs: 4 }] })
  })

  it('keeps an invalid number for validation to reject', async () => {
    const schema = [{ type: 'number', name: 'age' }]
    const picked = pickValues(schema, { age: 'abc' }, inputs)

    expect(picked.age).toBeNaN()
    expect((await validateServerValues(schema, picked, inputs)).isValid).toBe(false)
  })
})

describe('conditions', () => {
  const fieldChoices = [
    { value: 'title', label: 'Title', example: 'Hello' },
    { value: 'spam', label: 'Spam', type: 'boolean' },
    { value: 'age', label: 'Age', type: 'number' },
    { value: 'published', label: 'Published', type: 'date' },
    { value: 'category', label: 'Category', choices: [{ value: 'news', label: 'News' }] },
  ]
  const schema = [{ type: 'conditions', name: 'conditions', options: { fieldChoices } }]
  const messagesOf = (rules: Array<Record<string, any>>, options = {}) => {
    return flattenValidationReport(validateValues(schema, { conditions: [{ rules }] }, inputs, options)).messages
  }

  it("checks each rule, keying its messages by the rule's place", () => {
    const report = validateValues(schema, { conditions: [{ rules: [{ field: 'title', operator: 'equals' }] }] }, inputs)

    expect(report.isValid).toBe(false)
    expect(flattenValidationReport(report).messages).toEqual({
      'conditions.0.rules.0.value': ['This field is required.'],
    })
  })

  it('accepts listed fields with operators and values that suit them', () => {
    const rules = [
      { field: 'title', operator: 'startsWith', value: 'Hello' },
      { field: 'spam', operator: 'equals', value: 'false' },
      { field: 'spam', operator: 'notEquals', value: true },
      { field: 'age', operator: 'greaterThan', value: 18 },
      { field: 'published', operator: 'lessThan', value: '2026-10-30' },
      { field: 'category', operator: 'contains', value: 'news' },
      { field: 'title', operator: 'empty' },
    ]
    expect(messagesOf(rules)).toEqual({})
  })

  it("flags a field that isn't listed, an operator that doesn't suit it and a value it can't hold", () => {
    const rules = [
      { field: 'nope', operator: 'equals', value: 'x' },
      { field: 'spam', operator: 'contains', value: 'maybe' },
      { field: 'age', operator: 'equals', value: 'old' },
      { field: 'published', operator: 'equals', value: 'Tuesday' },
      { field: 'category', operator: 'equals', value: 'sport' },
    ]
    expect(messagesOf(rules)).toEqual({
      'conditions.0.rules.0.field': ['A valid choice required.'],
      'conditions.0.rules.1.operator': ['A valid choice required.'],
      'conditions.0.rules.1.value': ['A valid choice required.'],
      'conditions.0.rules.2.value': ['Invalid value.'],
      'conditions.0.rules.3.value': ['A valid date required.'],
      'conditions.0.rules.4.value': ['A valid choice required.'],
    })
  })

  it('asks only for the field of a rule that has none, as its operator and value wait for it', () => {
    expect(messagesOf([{}])).toEqual({ 'conditions.0.rules.0.field': ['This field is required.'] })
  })

  it('takes any dotted path and all nine operators without fieldChoices', () => {
    const free = [{ type: 'conditions', name: 'conditions' }]
    const conditions = [{ rules: [{ field: 'pets.0.petname', operator: 'greaterThan', value: 'R' }, {}] }]

    expect(flattenValidationReport(validateValues(free, { conditions }, inputs)).messages).toEqual({
      'conditions.0.rules.1.field': ['This field is required.'],
      'conditions.0.rules.1.operator': ['This field is required.'],
      'conditions.0.rules.1.value': ['This field is required.'],
    })
  })

  it("leaves out what an unfinished rule is missing, but not what's wrong with it", async () => {
    const rules = [{ field: 'title', operator: 'equals' }, { field: 'nope' }]
    const expected = { 'conditions.0.rules.1.field': ['A valid choice required.'] }

    expect(messagesOf(rules, { allowIncomplete: true })).toEqual(expected)
    const report = await validateServerValues(schema, { conditions: [{ rules }] }, inputs, { allowIncomplete: true })
    expect(flattenValidationReport(report).messages).toEqual(expected)
  })

  it('waits for asynchronous server validators inside rules', async () => {
    const select = { ...inputs.select, validateServerValue: async () => validationError('', 'Not today.') }
    const report = await validateServerValues(
      schema,
      { conditions: [{ rules: [{ field: 'title', operator: 'equals', value: 'x' }] }] },
      { ...inputs, select },
    )

    expect(report.isValid).toBe(false)
    expect(flattenValidationReport(report).messages).toEqual({
      'conditions.0.rules.0.field': ['Not today.'],
      'conditions.0.rules.0.operator': ['Not today.'],
    })
  })

  it("keeps only each rule's field, operator and value", () => {
    const conditions = [{ rules: [{ field: 'title', operator: 'equals', value: 'x', junk: 1 }, { field: 'spam' }] }]
    expect(pickValues(schema, { conditions }, inputs)).toEqual({
      conditions: [{ rules: [{ field: 'title', operator: 'equals', value: 'x' }, { field: 'spam' }] }],
    })
  })
})

describe('field ids', () => {
  it('survive validateSchema, which strips unknown properties', () => {
    const field = { id: 'fld_title', name: 'title', junk: true }

    expect(validateSchema(field)).toEqual({ id: 'fld_title', name: 'title' })
  })

  it('leave values keyed by name', () => {
    const schema = [{ id: 'fld_title', type: 'text', name: 'title', required: true }]

    expect(pickValues(schema, { title: 'Hello', fld_title: 'Nope' }, inputs)).toEqual({ title: 'Hello' })
    expect(Object.keys(report(schema, {}).fields)).toEqual(['title'])
  })
})

describe('field name check', () => {
  const nameIsValid = (name: any) => report(baseInputSchemaFields(), { name }).fields.name.isValid

  it('rejects empty names and names that break dotted paths', () => {
    for (const name of [undefined, '', 'address.town', 'first name', ' title']) {
      expect(nameIsValid(name), String(name)).toBe(false)
    }
  })

  it('accepts the mixed styles imported forms use', () => {
    for (const name of ['FirstName', 'emailOptIn', 'utm_source', 'title']) {
      expect(nameIsValid(name), name).toBe(true)
    }
  })
})

import { evaluateCondition, evaluateConditions, normaliseConditions, resolveConditionValue } from '@/utils/conditions'
import { describe, expect, it } from 'vitest'

describe('resolveConditionValue', () => {
  const root = { has_pets: true, address: { town: 'Bristol' }, pets: [{ petname: 'Rex' }], species: 'root' }
  const item = { species: 'dog' }

  it('resolves against the nearest scope first', () => {
    expect(resolveConditionValue('species', [root, item])).toBe('dog')
    expect(resolveConditionValue('species', [root])).toBe('root')
  })

  it('falls outwards to the root for paths not in the nearest scope', () => {
    expect(resolveConditionValue('has_pets', [root, item])).toBe(true)
    expect(resolveConditionValue('address.town', [root, item])).toBe('Bristol')
  })

  it('resolves dotted paths through arrays', () => {
    expect(resolveConditionValue('pets.0.petname', [root])).toBe('Rex')
  })

  it('returns undefined for unknown paths', () => {
    expect(resolveConditionValue('nope', [root, item])).toBeUndefined()
    expect(resolveConditionValue('address.nope.deeper', [root])).toBeUndefined()
  })
})

describe('evaluateCondition', () => {
  const scopes = [{ age: 21, colours: ['red', 'blue'], bio: 'painter of trees', empty: '' }]

  it('compares loosely so builder entered strings match numbers and booleans', () => {
    expect(evaluateCondition({ field: 'age', operator: 'equals', value: '21' }, scopes)).toBe(true)
    expect(evaluateCondition({ field: 'age', operator: 'equals', value: 21 }, scopes)).toBe(true)
    expect(evaluateCondition({ field: 'age', operator: 'notEquals', value: '22' }, scopes)).toBe(true)
  })

  it('supports contains for strings and arrays', () => {
    expect(evaluateCondition({ field: 'bio', operator: 'contains', value: 'trees' }, scopes)).toBe(true)
    expect(evaluateCondition({ field: 'colours', operator: 'contains', value: 'red' }, scopes)).toBe(true)
    expect(evaluateCondition({ field: 'colours', operator: 'contains', value: 'green' }, scopes)).toBe(false)
  })

  it('supports notContains as the inverse of contains', () => {
    expect(evaluateCondition({ field: 'colours', operator: 'notContains', value: 'green' }, scopes)).toBe(true)
    expect(evaluateCondition({ field: 'colours', operator: 'notContains', value: 'red' }, scopes)).toBe(false)
    expect(evaluateCondition({ field: 'nope', operator: 'notContains', value: 'red' }, scopes)).toBe(true)
  })

  it('supports startsWith for strings', () => {
    expect(evaluateCondition({ field: 'bio', operator: 'startsWith', value: 'painter' }, scopes)).toBe(true)
    expect(evaluateCondition({ field: 'bio', operator: 'startsWith', value: 'trees' }, scopes)).toBe(false)
    expect(evaluateCondition({ field: 'age', operator: 'startsWith', value: '2' }, scopes)).toBe(false)
  })

  it('supports numeric comparisons', () => {
    expect(evaluateCondition({ field: 'age', operator: 'greaterThan', value: 18 }, scopes)).toBe(true)
    expect(evaluateCondition({ field: 'age', operator: 'lessThan', value: 18 }, scopes)).toBe(false)
    expect(evaluateCondition({ field: 'nope', operator: 'greaterThan', value: 18 }, scopes)).toBe(false)
  })

  it('supports empty checks', () => {
    expect(evaluateCondition({ field: 'empty', operator: 'empty' }, scopes)).toBe(true)
    expect(evaluateCondition({ field: 'bio', operator: 'notEmpty' }, scopes)).toBe(true)
  })
})

describe('evaluateConditions', () => {
  const scopes = [{ a: 1, b: 2 }]

  const A = { field: 'a', operator: 'equals' as const, value: 1 }
  const B = { field: 'b', operator: 'equals' as const, value: 2 }
  const NOPE = { field: 'b', operator: 'equals' as const, value: 3 }

  it('shows fields without conditions', () => {
    expect(evaluateConditions({ type: 'text', name: 'x' }, scopes)).toBe(true)
  })

  it('requires every rule of a flat list by default', () => {
    expect(evaluateConditions({ type: 'text', name: 'x', conditions: [A, NOPE] }, scopes)).toBe(false)
    expect(evaluateConditions({ type: 'text', name: 'x', conditions: [A, NOPE], conditionsMode: 'any' }, scopes)).toBe(
      true,
    )
  })

  it('treats nested arrays as groups where any group of all matching rules shows the field', () => {
    // (A && NOPE) || (B) — the second group matches
    expect(evaluateConditions({ type: 'text', name: 'x', conditions: [[A, NOPE], [B]] }, scopes)).toBe(true)

    // (A && NOPE) || (NOPE) — no group matches
    expect(evaluateConditions({ type: 'text', name: 'x', conditions: [[A, NOPE], [NOPE]] }, scopes)).toBe(false)
  })

  it('accepts groups as rules objects, as the schema builder produces them', () => {
    const conditions = [{ rules: [A, NOPE] }, { rules: [B] }]
    expect(evaluateConditions({ type: 'text', name: 'x', conditions }, scopes)).toBe(true)
  })

  it('treats a bare rule alongside groups as a group of one', () => {
    // NOPE || (A && B)
    expect(evaluateConditions({ type: 'text', name: 'x', conditions: [NOPE, [A, B]] }, scopes)).toBe(true)
  })

  it('normalises every shape into groups of rules', () => {
    expect(normaliseConditions({ type: 'text', name: 'x', conditions: [A, B] })).toEqual([[A, B]])
    expect(normaliseConditions({ type: 'text', name: 'x', conditions: [A, B], conditionsMode: 'any' })).toEqual([
      [A],
      [B],
    ])
    expect(normaliseConditions({ type: 'text', name: 'x', conditions: [[A], { rules: [B] }] })).toEqual([[A], [B]])
  })
})

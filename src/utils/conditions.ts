import { FieldCondition, FieldSchema } from '@/types/fields'
import { isEmptyValue } from '@/utils/validation'
import { isEqual } from 'lodash'

// The stack of value scopes a condition can see, from the form's root values
// down to the nearest group, repeater item or matrix cell
export type ConditionScopes = Array<Record<string, any>>

// Compare loosely so values built in the schema builder, which are always
// strings, still match numbers and booleans
const looseEquals = (a: any, b: any): boolean => {
  if (isEqual(a, b)) return true
  if (a == null || b == null) return false
  if (typeof a === 'object' || typeof b === 'object') return false
  return String(a) === String(b)
}

// Resolve a dotted path against the nearest scope containing its first
// segment, falling outwards to the form's root values
export function resolveConditionValue(path: string, scopes: ConditionScopes): any {
  const segments = path.split('.')

  for (let index = scopes.length - 1; index >= 0; index--) {
    const scope = scopes[index]

    if (scope && typeof scope === 'object' && segments[0] in scope) {
      return segments.reduce((value, segment) => (value == null ? undefined : value[segment]), scope)
    }
  }

  return undefined
}

export function evaluateCondition(condition: FieldCondition, scopes: ConditionScopes): boolean {
  const value = resolveConditionValue(condition.field, scopes)

  switch (condition.operator) {
    case 'equals':
      return looseEquals(value, condition.value)
    case 'notEquals':
      return !looseEquals(value, condition.value)
    case 'contains':
      if (Array.isArray(value)) return value.includes(condition.value)
      return typeof value === 'string' && value.includes(String(condition.value))
    case 'notContains':
      if (Array.isArray(value)) return !value.includes(condition.value)
      return !(typeof value === 'string' && value.includes(String(condition.value)))
    case 'startsWith':
      return typeof value === 'string' && value.startsWith(String(condition.value))
    case 'greaterThan':
      return Number(value) > Number(condition.value)
    case 'lessThan':
      return Number(value) < Number(condition.value)
    case 'empty':
      return isEmptyValue(value)
    case 'notEmpty':
      return !isEmptyValue(value)
    default:
      return true
  }
}

const isRule = (item: any): item is FieldCondition => {
  return item !== null && typeof item === 'object' && !Array.isArray(item) && 'operator' in item
}

// Normalise any accepted conditions shape into groups of rules, where the
// field shows when any group has all of its rules matching
export function normaliseConditions(schema: FieldSchema): Array<Array<FieldCondition>> {
  const conditions = schema.conditions

  if (!conditions || conditions.length === 0) return []

  // A flat list of rules keeps its original meaning: one group that must all
  // match, or one group per rule when conditionsMode is 'any'
  if (conditions.every(isRule)) {
    const rules = conditions as Array<FieldCondition>
    return schema.conditionsMode === 'any' ? rules.map((rule) => [rule]) : [rules]
  }

  // Otherwise every item is a group: an array of rules, a { rules } object,
  // or a bare rule acting as a group of one
  return conditions.map((group) => {
    if (Array.isArray(group)) return group
    if (isRule(group)) return [group]
    return group?.rules || []
  })
}

// Check whether a field should be shown for the given value scopes
export function evaluateConditions(schema: FieldSchema, scopes: ConditionScopes): boolean {
  const groups = normaliseConditions(schema)

  if (groups.length === 0) return true

  return groups.some((rules) => rules.every((rule) => evaluateCondition(rule, scopes)))
}

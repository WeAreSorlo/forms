import { InputSchema } from '@/types/inputs'

export type ConditionOperator =
  'equals' | 'notEquals' | 'contains' | 'notContains' | 'startsWith' | 'greaterThan' | 'lessThan' | 'empty' | 'notEmpty'

// A rule that must match for a field to be shown, where the field is a dotted
// path resolved against the nearest value scope first
export interface FieldCondition {
  field: string
  operator: ConditionOperator
  value?: any
}

// A group of rules that must all match, one of several the field shows for
export interface ConditionGroup {
  rules: Array<FieldCondition>
}

// Either a flat list of rules that must all match (or any, per
// conditionsMode), or a list of groups where any matching group shows the
// field — groups written as arrays, { rules } objects, or bare rules
export type FieldConditions = Array<FieldCondition> | Array<FieldCondition | Array<FieldCondition> | ConditionGroup>

export interface FieldSchema extends InputSchema {
  type: string
  conditions?: FieldConditions
  conditionsMode?: 'all' | 'any'
}

export type FieldMessages = Array<string>

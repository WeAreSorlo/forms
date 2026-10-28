import { FieldSchema } from '@/types/fields'
import {
  FieldValidationReport,
  Input,
  InputPickFields,
  InputSchema,
  InputValidateFields,
  InputValidateServerValue,
  InputValidateValue,
  ValidationEnvironment,
  ValidationReport,
  ValidationReportChildren,
} from '@/types/inputs'
import { ConditionScopes, evaluateConditions } from '@/utils/conditions'
import { validationSuccess } from '@/utils/validation'

export interface ValidateValuesOptions {
  environment?: ValidationEnvironment
  scopes?: ConditionScopes
}

// Resolve the validator for an environment, falling back to the shared validateValue
export function resolveValidateValue(input: undefined | Input, environment?: 'client'): InputValidateValue | undefined
export function resolveValidateValue(
  input: undefined | Input,
  environment: 'server',
): InputValidateServerValue | undefined
export function resolveValidateValue(
  input: undefined | Input,
  environment?: ValidationEnvironment,
): InputValidateValue | InputValidateServerValue | undefined
export function resolveValidateValue(input: undefined | Input, environment?: ValidationEnvironment) {
  if (environment === 'client') return input?.validateClientValue || input?.validateValue
  if (environment === 'server') return input?.validateServerValue || input?.validateValue
  return input?.validateValue
}

// Check whether every report in a tree of child reports is valid
const childrenAreValid = (children: ValidationReportChildren): boolean => {
  if (children instanceof Promise) {
    throw new Error('validateChildren returned a promise, use validateServerValues instead')
  }
  if (Array.isArray(children)) return children.every(childrenAreValid)
  return children.isValid
}

// Resolve any promises inside a tree of child reports
const resolveReportChildren = async (children: ValidationReportChildren): Promise<ValidationReportChildren> => {
  const resolved = await children
  if (Array.isArray(resolved)) {
    return Promise.all(resolved.map((child) => resolveReportChildren(child)))
  }
  return resolved
}

// A field's value as pickValues keeps it, letting the input pick its own nested values
const pickFieldValue = (
  field: FieldSchema,
  values: Record<string, any>,
  inputs: Record<string, Input>,
  pickFields: InputPickFields,
): any => {
  const input = inputs?.[field.type]

  // Fall back to the schema default when no value is set
  let value = values?.[field.name]
  if (value === undefined) value = field.defaultValue

  // Keep the value the input's validator returns, as a form does, so a posted '5' for a number becomes 5
  if (input?.validateValue) value = input.validateValue(value, field).value

  return input?.pickValue ? input.pickValue(value, field, pickFields) : value
}

// Conditions see each field's value as pickValues keeps it, shown or not, so a posted 'on' meets a condition on true
export const conditionScope = (
  schema: Array<FieldSchema>,
  values: Record<string, any>,
  inputs: Record<string, Input>,
): Record<string, any> => {
  const scope: Record<string, any> = { ...values }
  const scopeFields: InputPickFields = (childSchema, childValues) => conditionScope(childSchema, childValues, inputs)

  for (const field of schema) {
    const value = pickFieldValue(field, values, inputs, scopeFields)

    // An unset field stays out, so a condition still falls through to an outer field of the same name
    if (value !== undefined) scope[field.name] = value
  }

  return scope
}

// Validate a set of values against a schema, letting each input walk its own nested fields
export function validateValues<Values extends Record<string, any> = Record<string, any>>(
  schema: Array<FieldSchema>,
  values: Values,
  inputs: Record<string, Input>,
  options: ValidateValuesOptions = {},
): ValidationReport {
  const fields: Record<string, FieldValidationReport> = {}
  const scopes = options.scopes || [conditionScope(schema, values, inputs)]

  const validateFields: InputValidateFields = (childSchema, childValues) => {
    const childScopes = [...scopes, conditionScope(childSchema, childValues, inputs)]
    return validateValues(childSchema, childValues, inputs, { ...options, scopes: childScopes })
  }

  for (const field of schema) {
    const input = inputs?.[field.type]

    // Skip fields hidden by their conditions
    if (!evaluateConditions(field, scopes)) continue

    // Fall back to the schema default when no value is set
    let value = values?.[field.name]
    if (value === undefined) value = field.defaultValue

    const validate = resolveValidateValue(input, options.environment)
    const validation = validate ? validate(value, field) : validationSuccess(value)

    if (validation instanceof Promise) {
      throw new Error('The validator returned a promise, use validateServerValues instead')
    }

    const report: FieldValidationReport = {
      isValid: validation.isValid !== false,
      messages: validation.messages,
    }

    // Let the input validate its nested fields
    if (input?.validateChildren) {
      const children = input.validateChildren(value, field, validateFields)
      report.children = children
      if (!childrenAreValid(children)) report.isValid = false
    }

    fields[field.name] = report
  }

  return {
    isValid: Object.values(fields).every((field) => field.isValid),
    fields,
  }
}

// Validate a set of values on the server, where validators may be asynchronous
export async function validateServerValues<Values extends Record<string, any> = Record<string, any>>(
  schema: Array<FieldSchema>,
  values: Values,
  inputs: Record<string, Input>,
  options: ValidateValuesOptions = {},
): Promise<ValidationReport> {
  const fields: Record<string, FieldValidationReport> = {}
  const scopes = options.scopes || [conditionScope(schema, values, inputs)]

  const validateFields: InputValidateFields = (childSchema, childValues) => {
    const childScopes = [...scopes, conditionScope(childSchema, childValues, inputs)]
    return validateServerValues(childSchema, childValues, inputs, { ...options, scopes: childScopes })
  }

  for (const field of schema) {
    const input = inputs?.[field.type]

    // Skip fields hidden by their conditions
    if (!evaluateConditions(field, scopes)) continue

    // Fall back to the schema default when no value is set
    let value = values?.[field.name]
    if (value === undefined) value = field.defaultValue

    const validate = resolveValidateValue(input, 'server')
    const validation = validate ? await validate(value, field) : validationSuccess(value)

    const report: FieldValidationReport = {
      isValid: validation.isValid !== false,
      messages: validation.messages,
    }

    // Let the input validate its nested fields
    if (input?.validateChildren) {
      const children = await resolveReportChildren(input.validateChildren(value, field, validateFields))
      report.children = children
      if (!childrenAreValid(children)) report.isValid = false
    }

    fields[field.name] = report
  }

  return {
    isValid: Object.values(fields).every((field) => field.isValid),
    fields,
  }
}

export interface FlatValidationReport {
  messages: Record<string, Array<string>>
  validity: Record<string, boolean | undefined>
}

// Flatten a nested validation report into path keyed maps matching the form's
// own messages and validity maps, e.g. 'pets.0.petname'
export function flattenValidationReport(report: ValidationReport): FlatValidationReport {
  const flat: FlatValidationReport = { messages: {}, validity: {} }

  const walkReport = (report: ValidationReport, prefix: Array<string | number>) => {
    for (const [name, fieldReport] of Object.entries(report.fields)) {
      const path = [...prefix, name]
      const key = path.join('.')

      if (fieldReport.messages.length >= 1) flat.messages[key] = fieldReport.messages
      flat.validity[key] = fieldReport.isValid

      if (fieldReport.children !== undefined) walkChildren(fieldReport.children, path)
    }
  }

  const walkChildren = (children: ValidationReportChildren, prefix: Array<string | number>) => {
    if (children instanceof Promise) {
      throw new Error('The report contains unresolved children')
    }

    if (Array.isArray(children)) {
      children.forEach((child, index) => walkChildren(child, [...prefix, index]))
      return
    }

    walkReport(children, prefix)
  }

  walkReport(report, [])

  return flat
}

// Reduce a set of values to only the fields defined by a schema, letting each
// input pick its own nested values
export function pickValues<Values extends Record<string, any> = Record<string, any>>(
  schema: Array<FieldSchema>,
  values: Record<string, any>,
  inputs: Record<string, Input>,
  options: { scopes?: ConditionScopes } = {},
): Partial<Values> {
  const picked: Record<string, any> = {}
  const scopes = options.scopes || [conditionScope(schema, values, inputs)]

  const pickFields: InputPickFields = (childSchema, childValues) => {
    const childScopes = [...scopes, conditionScope(childSchema, childValues, inputs)]
    return pickValues(childSchema, childValues, inputs, { scopes: childScopes })
  }

  for (const field of schema) {
    // Skip fields hidden by their conditions
    if (!evaluateConditions(field, scopes)) continue

    const pickedValue = pickFieldValue(field, values, inputs, pickFields)
    if (pickedValue === undefined) continue

    picked[field.name] = pickedValue
  }

  return picked as Partial<Values>
}

// A short random ID for something the schema builder creates, e.g. fld_k3x9q2mz for a field
export const createId = (prefix: string) => {
  const characters = Array.from(crypto.getRandomValues(new Uint8Array(8)), (byte) => (byte % 36).toString(36))
  return `${prefix}_${characters.join('')}`
}

// Strip unknown properties from a field schema
export function validateSchema({
  id,
  name,
  label,
  required,
  instructions,
  defaultValue,
  readonly,
  disabled,
  width,
  options,
}: InputSchema) {
  return {
    id,
    name,
    label,
    required,
    instructions,
    defaultValue,
    readonly,
    disabled,
    width,
    options,
  }
}

export function validateInputSchemaFields(input: Input) {
  const baseFields = baseInputSchemaFields()
  const schema = [...(input?.coreFields ? input.coreFields(baseFields) : baseFields)]

  const optionFields = input?.optionFields ? input?.optionFields([]) : []

  if (optionFields.length >= 1) {
    schema.push({
      name: 'options',
      label: 'Options',
      type: 'group',
      options: {
        fields: optionFields,
      },
    })
  }

  return schema
}

export const baseInputSchemaFields = (): Array<FieldSchema> => {
  return [
    {
      name: 'name',
      label: 'Field Name',
      type: 'identifier',
      required: true,
      width: 50,
      // Names are path segments, e.g. address.town, so they can't hold dots or spaces
      options: {
        source: 'label',
        format: 'mixed',
      },
    },
    {
      name: 'label',
      label: 'Field Label',
      type: 'text',
      required: false,
      width: 50,
    },
    {
      name: 'required',
      label: 'Required',
      type: 'boolean',
      required: false,
      options: {
        message: 'Yes',
      },
    },
    {
      name: 'instructions',
      label: 'Instructions',
      type: 'textarea',
      required: false,
    },
    {
      name: 'width',
      label: 'Width',
      type: 'number',
      required: false,
      options: {
        min: 1,
        max: 100,
      },
    },
    {
      name: 'conditions',
      label: 'Conditional logic',
      type: 'repeater',
      required: false,
      instructions: 'Show this field when any group below has all of its rules matching.',
      options: {
        fields: [
          {
            name: 'rules',
            label: 'Rules',
            type: 'repeater',
            options: {
              minimum: 1,
              fields: [
                {
                  name: 'field',
                  label: 'Field',
                  type: 'text',
                  required: true,
                  width: 33.333,
                },
                {
                  name: 'operator',
                  label: 'Operator',
                  type: 'select',
                  required: true,
                  width: 33.333,
                  options: {
                    choices: [
                      { value: 'equals', label: 'Equals' },
                      { value: 'notEquals', label: 'Not equals' },
                      { value: 'contains', label: 'Contains' },
                      { value: 'notContains', label: 'Not contains' },
                      { value: 'startsWith', label: 'Starts with' },
                      { value: 'greaterThan', label: 'Greater than' },
                      { value: 'lessThan', label: 'Less than' },
                      { value: 'empty', label: 'Is empty' },
                      { value: 'notEmpty', label: 'Is not empty' },
                    ],
                  },
                },
                {
                  name: 'value',
                  label: 'Value',
                  type: 'text',
                  required: false,
                  width: 33.333,
                },
              ],
            },
          },
        ],
      },
    },
  ]
}

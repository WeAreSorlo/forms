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
import { validationSuccess } from '@/utils/validation'

export interface ValidateValuesOptions {
  environment?: ValidationEnvironment
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

// Validate a set of values against a schema, letting each input walk its own nested fields
export function validateValues(
  schema: Array<FieldSchema>,
  values: Record<string, any>,
  inputs: Record<string, Input>,
  options: ValidateValuesOptions = {},
): ValidationReport {
  const fields: Record<string, FieldValidationReport> = {}

  const validateFields: InputValidateFields = (childSchema, childValues) => {
    return validateValues(childSchema, childValues, inputs, options)
  }

  for (const field of schema) {
    const input = inputs?.[field.type]

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
export async function validateServerValues(
  schema: Array<FieldSchema>,
  values: Record<string, any>,
  inputs: Record<string, Input>,
): Promise<ValidationReport> {
  const fields: Record<string, FieldValidationReport> = {}

  const validateFields: InputValidateFields = (childSchema, childValues) => {
    return validateServerValues(childSchema, childValues, inputs)
  }

  for (const field of schema) {
    const input = inputs?.[field.type]

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

// Reduce a set of values to only the fields defined by a schema, letting each
// input pick its own nested values
export function pickValues(
  schema: Array<FieldSchema>,
  values: Record<string, any>,
  inputs: Record<string, Input>,
): Record<string, any> {
  const picked: Record<string, any> = {}

  const pickFields: InputPickFields = (childSchema, childValues) => {
    return pickValues(childSchema, childValues, inputs)
  }

  for (const field of schema) {
    const input = inputs?.[field.type]

    // Fall back to the schema default when no value is set
    let value = values?.[field.name]
    if (value === undefined) value = field.defaultValue

    const pickedValue = input?.pickValue ? input.pickValue(value, field, pickFields) : value
    if (pickedValue === undefined) continue

    picked[field.name] = pickedValue
  }

  return picked
}

// Strip unknown properties from a field schema
export function validateSchema({
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
      type: 'text',
      required: true,
      width: 50,
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
  ]
}

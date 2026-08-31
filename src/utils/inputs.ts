import { FieldSchema } from '@/types/fields'
import { FieldValidationReport, Input, InputSchema, ValidationReport, ValidationReportChildren } from '@/types/inputs'
import { validationSuccess } from '@/utils/validation'

// Check whether every report in a tree of child reports is valid
const childrenAreValid = (children: ValidationReportChildren): boolean => {
  if (Array.isArray(children)) return children.every(childrenAreValid)
  return children.isValid
}

// Validate a set of values against a schema, letting each input walk its own nested fields
export function validateValues(
  schema: Array<FieldSchema>,
  values: Record<string, any>,
  inputs: Record<string, Input>,
): ValidationReport {
  const fields: Record<string, FieldValidationReport> = {}

  const validateFields = (childSchema: Array<FieldSchema>, childValues: Record<string, any>) => {
    return validateValues(childSchema, childValues, inputs)
  }

  for (const field of schema) {
    const input = inputs?.[field.type]

    // Fall back to the schema default when no value is set
    let value = values?.[field.name]
    if (value === undefined) value = field.defaultValue

    const validation = input?.validateValue ? input.validateValue(value, field) : validationSuccess(value)

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

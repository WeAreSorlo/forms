import { FieldSchema } from '@/types/fields'
import { Input, InputSchema } from '@/types/inputs'

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
      type: 'group',
      options: {
        fields: optionFields,
      },
    })
  }

  return schema
}

export const baseInputSchemaFields = (): Array<FieldSchema & { [key: string]: any }> => {
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
      message: 'Yes',
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
      min: 1,
      max: 100,
    },
  ]
}

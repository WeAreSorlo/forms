import { InputSchema, InputSchemaFields } from '@/types/inputs'

export function validateSchema({
  name,
  label,
  required,
  instructions,
  value,
  readonly,
  disabled,
  width,
  options,
  ...additionals
}: InputSchema) {
  return {
    name,
    label,
    required,
    instructions,
    value,
    readonly,
    disabled,
    width,
    options: { ...additionals, ...options },
  }
}

export const baseInputSchemaFields: InputSchemaFields = () => {
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

import { useFieldContext } from '@/components/Field'
import {
  InputCategory,
  InputComponent,
  InputDescription,
  InputFormatValue,
  InputName,
  InputRenderValue,
  InputSchemaFields,
  InputValidateValue,
} from '@/types/inputs'
import { baseInputSchemaFields, validateSchema } from '@/utils/inputs'
import { memo } from 'react'

export const name: InputName = () => 'Text'

export const description: InputDescription = () => 'A basic text input, useful for storing single string values.'

export const category: InputCategory = () => 'Standard'

export const schemaFields: InputSchemaFields = () => {
  return [
    ...baseInputSchemaFields(),
    {
      name: 'placeholder',
      label: 'Placeholder',
      type: 'text',
      required: false,
    },
  ]
}

export const validateValue: InputValidateValue = (value, schema) => {
  schema = validateSchema(schema)

  if (typeof value !== 'string') {
    return 'Invalid value.'
  }

  if (schema.required && !value) {
    return 'This field is required.'
  }

  const min = schema.options.minLength
  const max = schema.options.maxLength

  if (min && value.length < min) {
    return `This field requires a minimum of ${min} character(s).`
  } else if (max && value.length > max) {
    return `This field requires a maximum of ${max} character(s).`
  }

  return true
}

export const formatValue: InputFormatValue = (value, schema) => {
  if (validateValue(value, schema)) {
    return value
  }

  return null
}

export const renderValue: InputRenderValue = (value, schema) => {
  return <>{formatValue(value, schema)}</>
}

const Component: InputComponent = memo(function Component() {
  const { id, schema, required, readonly, disabled, options, value, setValue, handleValidation } = useFieldContext()

  const doValidation = (input: any) => {
    const isValid = handleValidation(validateValue(input, schema))
    setValue(isValid ? input : '')
  }

  return (
    <div className='iight-input__text'>
      <input
        className='iight-input'
        id={id}
        type='text'
        defaultValue={value}
        onChange={(event) => doValidation(event.target.value)}
        required={required}
        readOnly={readonly}
        disabled={disabled}
        minLength={options?.minLength}
        maxLength={options?.maxLength}
        placeholder={options?.placeholder}
      />
    </div>
  )
})

export default Component

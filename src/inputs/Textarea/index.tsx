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

export const name: InputName = () => 'Textarea (Multi-line text)'

export const description: InputDescription = () => 'A basic textarea input for storing paragraphs of text.'

export const category: InputCategory = () => 'Standard'

export const schemaFields: InputSchemaFields = () => {
  return baseInputSchemaFields()
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
    <div className='iight-input__textarea'>
      <textarea
        className='iight-input'
        id={id}
        defaultValue={value}
        onChange={(event) => doValidation(event.target.value)}
        required={required}
        readOnly={readonly}
        disabled={disabled}
        minLength={options?.minLength}
        maxLength={options?.maxLength}
        placeholder={options?.placeholder}
        rows={options?.rows}
      />
    </div>
  )
})

export default Component

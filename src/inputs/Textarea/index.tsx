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
import { validationError, validationSuccess } from '@/utils/validation'
import { memo, useCallback } from 'react'

export const name: InputName = () => 'Textarea (Multi-line text)'

export const description: InputDescription = () => 'A basic textarea input for storing paragraphs of text.'

export const category: InputCategory = () => 'Standard'

export const schemaFields: InputSchemaFields = () => {
  return baseInputSchemaFields()
}

export const validateValue: InputValidateValue = (value, schema) => {
  schema = validateSchema(schema)

  if (typeof value !== 'string') {
    return validationError('Invalid value.')
  }

  if (schema.required && !value) {
    return validationError('This field is required.')
  }

  const min = schema.options.minLength
  const max = schema.options.maxLength

  if (min && value.length < min) {
    return validationError(`This field requires a minimum of ${min} character(s).`)
  } else if (max && value.length > max) {
    return validationError(`This field requires a maximum of ${max} character(s).`)
  }

  return validationSuccess(value)
}

export const formatValue: InputFormatValue = (value, schema) => {
  schema = validateSchema(schema)
  const { isValid, validatedValue } = validateValue(value, schema)
  return isValid ? validatedValue : null
}

export const renderValue: InputRenderValue = (value, schema) => {
  return <>{formatValue(value, schema)}</>
}

const Component: InputComponent = memo(function Component() {
  const { id, schema, required, readonly, disabled, options, value = '', handleValidation } = useFieldContext()

  const doValidation = useCallback(
    (input: any) => {
      handleValidation(validateValue(input, schema))
    },
    [handleValidation, validateValue],
  )

  return (
    <div className='iight-input__textarea'>
      <textarea
        className='iight-input'
        id={id}
        value={value}
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

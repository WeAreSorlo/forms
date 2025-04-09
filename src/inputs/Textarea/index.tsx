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
import { useCallback } from 'react'

export const name: InputName = () => 'Textarea (Multi-line text)'

export const description: InputDescription = () => 'A basic textarea input for storing paragraphs of text.'

export const category: InputCategory = () => 'Standard'

export const schemaFields: InputSchemaFields = () => {
  return baseInputSchemaFields()
}

export const validateValue: InputValidateValue = (value, schema) => {
  schema = validateSchema(schema)

  if (typeof value !== 'string') {
    return validationError(value, 'Invalid value.')
  }

  if (schema.required && !value) {
    return validationError(value, 'This field is required.')
  }

  // Validate the minimum value length
  const min = schema.options.minLength
  if (typeof min === 'number' && value.length < min) {
    return validationError(value, `This field requires a minimum of ${min} character(s).`)
  }

  // Validate the maximum value length
  const max = schema.options.maxLength
  if (typeof max === 'number' && value.length > max) {
    return validationError(value, `This field requires a maximum of ${max} character(s).`)
  }

  return validationSuccess(value)
}

export const formatValue: InputFormatValue = (value, schema) => {
  schema = validateSchema(schema)
  const validation = validateValue(value, schema)
  return validation.isValid ? validation.value : null
}

export const renderValue: InputRenderValue = (value, schema) => {
  return <>{formatValue(value, schema)}</>
}

const Component: InputComponent = function () {
  const { id, schema, required, readonly, disabled, options, value = '', handleValidation } = useFieldContext()

  const doValidation = useCallback(
    (input: any) => {
      handleValidation(validateValue(input, schema))
    },
    [handleValidation, validateValue, schema],
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
}

export default Component

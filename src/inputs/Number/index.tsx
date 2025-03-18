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

export const name: InputName = () => 'Number'

export const description: InputDescription = () => 'An input limited to numerical values.'

export const category: InputCategory = () => 'Standard'

export const schemaFields: InputSchemaFields = () => {
  return baseInputSchemaFields()
}

export const validateValue: InputValidateValue = (value, schema) => {
  schema = validateSchema(schema)

  if (typeof value !== 'number') value = Number(value)

  if (isNaN(value) || !isFinite(value)) {
    return validationError('Invalid value.')
  }

  if (schema.required && !value) {
    return validationError('This field is required.')
  }

  const min = schema.options.min
  const max = schema.options.max

  if (value) {
    if (min && value < min) {
      return validationError(`This field requires a minimum value of ${min}.`)
    } else if (max && value > max) {
      return validationError(`This field requires a maximum value of ${max}.`)
    }
  }

  return validationSuccess(value as number)
}

export const formatValue: InputFormatValue = (value, schema) => {
  schema = validateSchema(schema)
  const { isValid, validatedValue } = validateValue(value, schema)
  return isValid ? Number(validatedValue).toLocaleString() : null
}

export const renderValue: InputRenderValue = (value, schema) => {
  return <>{formatValue(value, schema)}</>
}

const Component: InputComponent = memo(function Component() {
  const { id, schema, required, readonly, disabled, options, value, handleValidation } = useFieldContext()

  const doValidation = useCallback(
    (input: any) => {
      handleValidation(validateValue(input, schema))
    },
    [handleValidation, validateValue],
  )

  return (
    <div className='iight-input__number'>
      <input
        className='iight-input'
        id={id}
        type='number'
        defaultValue={value}
        onChange={(event) => doValidation(event.target.value)}
        required={required}
        readOnly={readonly}
        disabled={disabled}
        min={options?.min}
        max={options?.max}
        placeholder={options?.placeholder}
      />
    </div>
  )
})

export default Component

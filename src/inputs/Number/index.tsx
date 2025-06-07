import { useFieldContext } from '@/components/Field'
import {
  InputCategory,
  InputComponent,
  InputDescription,
  InputFormatValue,
  InputName,
  InputOptionFields,
  InputRenderValue,
  InputValidateValue,
} from '@/types/inputs'
import { validateSchema } from '@/utils/inputs'
import { validationError, validationSuccess } from '@/utils/validation'
import { useCallback } from 'react'

export const name: InputName = () => 'Number'

export const description: InputDescription = () => 'An input limited to numerical values.'

export const category: InputCategory = () => 'Standard'

export const optionFields: InputOptionFields = () => {
  return [
    {
      label: 'Minimum',
      name: 'min',
      type: 'number',
      required: false,
      defaultValue: 1,
      width: 50,
      options: {
        min: 0,
      },
    },
    {
      label: 'Maximum',
      name: 'max',
      type: 'number',
      required: false,
      width: 50,
      options: {
        min: 0,
      },
    },
  ]
}

export const validateValue: InputValidateValue = (value, schema) => {
  schema = validateSchema(schema)

  // Return early if empty value and field is optional
  if (!schema.required && (value === '' || !value)) {
    return validationSuccess(value)
  }

  // Enforce number type
  if (typeof value !== 'number') value = Number(value)

  // Check for empty value
  if (schema.required && !value) {
    return validationError(value, 'This field is required.')
  }

  // Double check it's a valid number
  if (isNaN(value) || !isFinite(value)) {
    return validationError(value, 'Invalid value.')
  }

  // Validate minimum value
  const min = schema.options?.min
  if (typeof min === 'number' && value < min) {
    return validationError(value, `This field requires a minimum value of ${min}.`)
  }

  // Validate maximum value
  const max = schema.options?.max
  if (typeof max === 'number' && value > max) {
    return validationError(value, `This field requires a maximum value of ${max}.`)
  }

  // Return success
  return validationSuccess(value)
}

export const formatValue: InputFormatValue = (value, schema) => {
  schema = validateSchema(schema)
  const validation = validateValue(value, schema)
  return validation.isValid
    ? typeof validation.value === 'number'
      ? validation.value.toLocaleString()
      : validation.value
    : null
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
    <div className='iight-input__number'>
      <input
        className='iight-input'
        id={id}
        type='number'
        value={value?.toString() ?? ''}
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
}

export default Component

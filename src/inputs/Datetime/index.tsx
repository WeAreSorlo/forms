import { useFieldContext } from '@/components/Field'
import i18n from '@/i18n'
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
import { isEmptyValue, validationError, validationSuccess } from '@/utils/validation'
import { useCallback } from 'react'

export const name: InputName = () => 'Date & Time'

export const description: InputDescription = () => 'A picker that stores a local date and time, e.g. 2026-01-15T13:30.'

export const category: InputCategory = () => 'Standard'

export const optionFields: InputOptionFields = () => {
  return [
    {
      label: 'Minimum',
      name: 'min',
      type: 'datetime',
      required: false,
      width: 50,
    },
    {
      label: 'Maximum',
      name: 'max',
      type: 'datetime',
      required: false,
      width: 50,
    },
  ]
}

export const validateValue: InputValidateValue = (value, schema) => {
  schema = validateSchema(schema)

  // Return early if the value is empty and the field is optional
  if (!schema.required && isEmptyValue(value)) {
    return validationSuccess(value)
  }

  // Check for an empty value
  if (schema.required && isEmptyValue(value)) {
    return validationError(value, i18n.t('validation.required'))
  }

  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(value) ||
    isNaN(Date.parse(value))
  ) {
    return validationError(value, i18n.t('validation.datetime'))
  }

  // Local ISO datetimes compare lexicographically, so validate the range as strings
  const min = schema.options?.min
  if (typeof min === 'string' && min && value < min) {
    return validationError(value, i18n.t('validation.min', { min }))
  }

  const max = schema.options?.max
  if (typeof max === 'string' && max && value > max) {
    return validationError(value, i18n.t('validation.max', { max }))
  }

  return validationSuccess(value)
}

export const formatValue: InputFormatValue = (value, schema) => {
  schema = validateSchema(schema)
  const validation = validateValue(value, schema)
  if (!validation.isValid) return null
  return validation.value ? new Date(validation.value).toLocaleString() : validation.value
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
    [handleValidation, schema],
  )

  return (
    <div className='iight-input__datetime'>
      <input
        className='iight-input'
        id={id}
        type='datetime-local'
        value={value}
        onChange={(event) => doValidation(event.target.value)}
        required={required}
        readOnly={readonly}
        disabled={disabled}
        min={options?.min}
        max={options?.max}
      />
    </div>
  )
}

export default Component

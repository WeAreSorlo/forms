import { useFieldContext } from '@/components/Field'
import {
  InputCategory,
  InputComponent,
  InputDescription,
  InputFormatValue,
  InputName,
  InputOptionFields,
  InputRenderValue,
  InputTypeValue,
  InputValidateValue,
} from '@/types/inputs'
import { validateSchema } from '@/utils/inputs'
import { validationMessage } from '@/utils/messages'
import { isEmptyValue, validationError, validationSuccess } from '@/utils/validation'
import { useCallback } from 'react'

export const name: InputName = () => 'Range (Slider)'

export const description: InputDescription = () => 'A slider for picking a numerical value within a range.'

export const category: InputCategory = () => 'Standard'

export const optionFields: InputOptionFields = () => {
  return [
    {
      label: 'Minimum',
      name: 'min',
      type: 'number',
      required: false,
      width: 50,
    },
    {
      label: 'Maximum',
      name: 'max',
      type: 'number',
      required: false,
      width: 50,
    },
    {
      label: 'Step',
      name: 'step',
      type: 'number',
      required: false,
      options: {
        min: 0,
      },
    },
  ]
}

export const validateValue: InputValidateValue = (value, schema) => {
  schema = validateSchema(schema)

  // Return early if the value is empty and the field is optional, note that 0 is not empty
  if (!schema.required && isEmptyValue(value)) {
    return validationSuccess(value)
  }

  // Check for an empty value
  if (schema.required && isEmptyValue(value)) {
    return validationError(value, validationMessage(schema, 'required'))
  }

  // Enforce number type
  if (typeof value !== 'number') value = Number(value)

  // Double check it's a valid number
  if (isNaN(value) || !isFinite(value)) {
    return validationError(value, validationMessage(schema, 'invalid'))
  }

  // Validate minimum value
  const min = schema.options?.min
  if (typeof min === 'number' && value < min) {
    return validationError(value, validationMessage(schema, 'min', { min }))
  }

  // Validate maximum value
  const max = schema.options?.max
  if (typeof max === 'number' && value > max) {
    return validationError(value, validationMessage(schema, 'max', { max }))
  }

  return validationSuccess(value)
}

export const typeValue: InputTypeValue = () => 'number'

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
  const { id, aria, schema, required, readonly, disabled, options, value = '', handleValidation } = useFieldContext()

  const doValidation = useCallback(
    (input: any) => {
      handleValidation(validateValue(input, schema))
    },
    [handleValidation, schema],
  )

  return (
    <div className='iight-input__range'>
      <input
        className='iight-input'
        id={id}
        {...aria}
        type='range'
        value={value?.toString() ?? ''}
        onChange={(event) => doValidation(event.target.value)}
        required={required}
        disabled={disabled || readonly}
        min={options?.min}
        max={options?.max}
        step={options?.step}
      />
      {value !== '' && value !== undefined && <span className='iight-input__range-value'>{value}</span>}
    </div>
  )
}

export default Component

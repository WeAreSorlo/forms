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
import { validationError, validationSuccess } from '@/utils/validation'
import { useCallback } from 'react'

export const name: InputName = () => 'Boolean (True / False)'

export const description: InputDescription = () => 'A toggle that allows you to pick a value of true or false.'

export const category: InputCategory = () => 'Choice'

export const optionFields: InputOptionFields = () => {
  return [
    {
      name: 'message',
      label: 'Message',
      type: 'text',
      required: true,
    },
  ]
}

export const validateValue: InputValidateValue = (value, schema) => {
  schema = validateSchema(schema)

  // 'on' is what a browser posts for a checked box without a value attribute
  value = [true, 1, 'yes', '1', 'true', 'on'].includes(typeof value === 'string' ? value.trim().toLowerCase() : value)

  // A required boolean must be checked
  if (schema.required && !value) {
    return validationError(value, validationMessage(schema, 'required'))
  }

  return validationSuccess(value)
}

export const typeValue: InputTypeValue = () => 'boolean'

export const formatValue: InputFormatValue = (value, schema) => {
  schema = validateSchema(schema)
  const validation = validateValue(value, schema)
  return validation.isValid ? (validation.value ? 'TRUE' : 'FALSE') : null
}

export const renderValue: InputRenderValue = (value, schema) => {
  return <>{formatValue(value, schema)}</>
}

const Component: InputComponent = function () {
  const { id, aria, schema, required, readonly, disabled, options, value = false, handleValidation } = useFieldContext()

  const doValidation = useCallback(
    (input: any) => {
      handleValidation(validateValue(input, schema))
    },
    [handleValidation, schema],
  )

  return (
    <div className='sorlo-input__boolean'>
      <input
        className='sorlo-input'
        id={id}
        {...aria}
        type='checkbox'
        checked={!!value}
        onChange={(event) => doValidation(event.target.checked)}
        required={required}
        disabled={disabled || readonly}
      />
      <label htmlFor={id}>{options?.message}</label>
    </div>
  )
}

export default Component

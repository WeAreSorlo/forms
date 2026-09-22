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
import { validationMessage } from '@/utils/messages'
import { isEmptyValue, validationError, validationSuccess } from '@/utils/validation'
import { useCallback } from 'react'

export const name: InputName = () => 'Color'

export const description: InputDescription = () => 'A color picker that stores a hex value.'

export const category: InputCategory = () => 'Standard'

export const optionFields: InputOptionFields = () => {
  return []
}

export const validateValue: InputValidateValue = (value, schema) => {
  schema = validateSchema(schema)

  // Return early if the value is empty and the field is optional
  if (!schema.required && isEmptyValue(value)) {
    return validationSuccess(value)
  }

  // Check for an empty value
  if (schema.required && isEmptyValue(value)) {
    return validationError(value, validationMessage(schema, 'required'))
  }

  if (typeof value !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(value)) {
    return validationError(value, validationMessage(schema, 'color'))
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
  const { id, aria, schema, required, readonly, disabled, value = '#000000', handleValidation } = useFieldContext()

  const doValidation = useCallback(
    (input: any) => {
      handleValidation(validateValue(input, schema))
    },
    [handleValidation, schema],
  )

  return (
    <div className='iight-input__color'>
      <input
        className='iight-input'
        id={id}
        {...aria}
        type='color'
        value={value}
        onChange={(event) => doValidation(event.target.value)}
        required={required}
        disabled={disabled || readonly}
      />
    </div>
  )
}

export default Component

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
import { isEmail, validationError, validationSuccess } from '@/utils/validation'
import { useCallback } from 'react'

export const name: InputName = () => 'Email'

export const description: InputDescription = () => 'A text input specifically designed for storing email addresses.'

export const category: InputCategory = () => 'Standard'

export const optionFields: InputOptionFields = () => {
  return []
}

export const validateValue: InputValidateValue = (value, schema) => {
  schema = validateSchema(schema)

  if (typeof value !== 'string') {
    return validationError(value, 'Invalid value.')
  }

  if (schema.required && !value) {
    return validationError(value, 'This field is required.')
  }

  if (!schema.options?.multiple && !isEmail(value)) {
    return validationError(value, 'A valid email address required.')
  }

  // If input allows for multiple addresses
  // @link https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/email#multiple
  if (schema.options?.multiple && value.split(/[ ,]+/).filter((item) => !isEmail(item)).length) {
    return validationError(value, 'One or more email address(es) is invalid.')
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
    <div className='iight-input__email'>
      <input
        className='iight-input'
        id={id}
        type='email'
        value={value}
        onChange={(event) => doValidation(event.target.value)}
        required={required}
        readOnly={readonly}
        disabled={disabled}
        minLength={options?.minLength}
        maxLength={options?.maxLength}
        placeholder={options?.placeholder}
        multiple={options?.multiple}
      />
    </div>
  )
}

export default Component

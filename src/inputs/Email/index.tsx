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
import { isEmail, validationError, validationSuccess } from '@/utils/validation'
import { memo, useCallback } from 'react'

export const name: InputName = () => 'Email'

export const description: InputDescription = () => 'A text input specifically designed for storing email addresses.'

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

  if (!schema.options.multiple && !isEmail(value)) {
    return validationError('A valid email address required.')
  }

  // If input allows for multiple addresses
  // @link https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/email#multiple
  if (schema.options.multiple && value.split(/[ ,]+/).filter((item) => !isEmail(item)).length) {
    return validationError('One or more email address(es) is invalid.')
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
})

export default Component

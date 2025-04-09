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

export const name: InputName = () => 'Boolean (True / False)'

export const description: InputDescription = () => 'A toggle that allows you to pick a value of true or false.'

export const category: InputCategory = () => 'Choice'

export const schemaFields: InputSchemaFields = () => {
  return [
    ...baseInputSchemaFields(),
    {
      name: 'message',
      label: 'Message',
      type: 'text',
      required: false,
    },
  ]
}

export const validateValue: InputValidateValue = (value, schema) => {
  schema = validateSchema(schema)

  value = ['yes', '1', 'true'].includes(String(value).trim().toLowerCase())

  if (schema.required && !value) {
    return validationError(value, 'This field is required.')
  }

  return validationSuccess(!!value)
}

export const formatValue: InputFormatValue = (value, schema) => {
  schema = validateSchema(schema)
  const validation = validateValue(value, schema)
  return validation.isValid ? (validation.value ? 'TRUE' : 'FALSE') : null
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
    <div className='iight-input__boolean'>
      <input
        className='iight-input'
        id={id}
        type='checkbox'
        checked={value}
        onChange={(event) => doValidation(event.target.checked)}
        required={required}
        readOnly={readonly}
        disabled={disabled}
      />
      <label htmlFor={id}>{options?.message}</label>
    </div>
  )
}

export default Component

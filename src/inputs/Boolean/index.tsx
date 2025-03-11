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
import { memo } from 'react'

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
    return 'This field is required.'
  }

  return value
}

export const formatValue: InputFormatValue = (value, schema) => {
  if (validateValue(value, schema)) {
    return value
  }

  return null
}

export const renderValue: InputRenderValue = (value, schema) => {
  return <>{formatValue(value, schema)}</>
}

const Component: InputComponent = memo(function Component() {
  const { id, schema, required, readonly, disabled, options, value, setValue, handleValidation } = useFieldContext()

  const doValidation = (input: any) => {
    const isValid = handleValidation(validateValue(input, schema))
    setValue(isValid ? input : !value)
  }

  return (
    <div className='iight-input__boolean'>
      <input
        className='iight-input'
        id={id}
        type='checkbox'
        defaultChecked={value}
        onChange={(event) => doValidation(event.target.value)}
        required={required}
        readOnly={readonly}
        disabled={disabled}
      />
      <label htmlFor={id}>{options?.message}</label>
    </div>
  )
})

export default Component

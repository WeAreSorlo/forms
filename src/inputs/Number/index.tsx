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
    return 'Invalid value.'
  }

  if (schema.required && !value) {
    return 'This field is required.'
  }

  const min = schema.options.min
  const max = schema.options.max

  if (value) {
    if (min && value < min) {
      return `This field requires a minimum value of ${min}.`
    } else if (max && value > max) {
      return `This field requires a maximum value of ${max}.`
    }
  }

  return true
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
    setValue(isValid ? input : '')
  }

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

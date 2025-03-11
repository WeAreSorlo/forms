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
import { validateEmail } from '@/utils/validators'
import { memo } from 'react'

export const name: InputName = () => 'Email'

export const description: InputDescription = () => 'A text input specifically designed for storing email addresses.'

export const category: InputCategory = () => 'Standard'

export const schemaFields: InputSchemaFields = () => {
  return baseInputSchemaFields()
}

export const validateValue: InputValidateValue = (value, schema) => {
  schema = validateSchema(schema)

  if (typeof value !== 'string') {
    return 'Invalid value.'
  }

  if (schema.required && !value) {
    return 'This field is required.'
  }

  if (!schema.options.multiple && !validateEmail(value)) {
    return 'A valid email address required.'
  }

  // If input allows for multiple addresses
  // @link https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/email#multiple
  if (schema.options.multiple && value.split(/[ ,]+/).filter((item) => !validateEmail(item)).length) {
    return 'One or more email address(es) is invalid.'
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
    <div className='iight-input__email'>
      <input
        className='iight-input'
        id={id}
        type='email'
        defaultValue={value}
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

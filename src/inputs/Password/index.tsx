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

export const name: InputName = () => 'Password'

export const description: InputDescription = () => 'A text input that masks its value.'

export const category: InputCategory = () => 'Standard'

export const optionFields: InputOptionFields = () => {
  return [
    {
      name: 'placeholder',
      label: 'Placeholder',
      type: 'text',
      required: false,
    },
    {
      name: 'minLength',
      label: 'Minimum length',
      type: 'number',
      required: false,
      width: 50,
      options: {
        min: 0,
      },
    },
    {
      name: 'maxLength',
      label: 'Maximum length',
      type: 'number',
      required: false,
      width: 50,
      options: {
        min: 1,
      },
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

  if (typeof value !== 'string') {
    return validationError(value, i18n.t('validation.invalid'))
  }

  // Validate the minimum value length
  const min = schema.options?.minLength
  if (typeof min === 'number' && value.length < min) {
    return validationError(value, i18n.t('validation.minLength', { min }))
  }

  // Validate the maximum value length
  const max = schema.options?.maxLength
  if (typeof max === 'number' && value.length > max) {
    return validationError(value, i18n.t('validation.maxLength', { max }))
  }

  return validationSuccess(value)
}

export const formatValue: InputFormatValue = (value, schema) => {
  schema = validateSchema(schema)
  const validation = validateValue(value, schema)

  // Never expose the actual value when formatting
  return validation.isValid ? '••••••••' : null
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
    <div className='iight-input__password'>
      <input
        className='iight-input'
        id={id}
        type='password'
        value={value}
        onChange={(event) => doValidation(event.target.value)}
        required={required}
        readOnly={readonly}
        disabled={disabled}
        minLength={options?.minLength}
        maxLength={options?.maxLength}
        placeholder={options?.placeholder}
      />
    </div>
  )
}

export default Component

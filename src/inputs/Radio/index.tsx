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
import { literalUnion } from '@/utils/typescript'
import { isEmptyValue, validationError, validationSuccess } from '@/utils/validation'
import { useCallback } from 'react'

export const name: InputName = () => 'Radio (Single choice)'

export const description: InputDescription = () =>
  'A list of radio buttons with a selection of choices that you specify.'

export const category: InputCategory = () => 'Choice'

export const optionFields: InputOptionFields = () => {
  return [
    {
      name: 'choices',
      label: 'Choices',
      type: 'repeater',
      required: true,
      options: {
        minimum: 1,
        fields: [
          {
            name: 'value',
            label: 'Value',
            type: 'text',
            required: true,
            width: 50,
          },
          {
            name: 'label',
            label: 'Label',
            type: 'text',
            required: false,
            width: 50,
          },
        ],
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
    return validationError(value, validationMessage(schema, 'required'))
  }

  // The browser gives radio values as strings
  const choices: Array<any> = schema.options?.choices || []
  if (!choices.some((choice) => String(choice.value) === value)) {
    return validationError(value, validationMessage(schema, 'choice'))
  }

  return validationSuccess(value)
}

// The browser gives radio values as strings
export const typeValue: InputTypeValue = (schema) => {
  const choices: Array<any> = schema.options?.choices || []
  return literalUnion(choices.map((choice) => String(choice.value)))
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
  const {
    id,
    labelId,
    aria,
    schema,
    required,
    readonly,
    disabled,
    options,
    value = '',
    handleValidation,
  } = useFieldContext()

  const doValidation = useCallback(
    (input: any) => {
      handleValidation(validateValue(input, schema))
    },
    [handleValidation, schema],
  )

  const choices: Array<any> = options?.choices || []

  return (
    <div className='iight-input__radio' role='radiogroup' aria-labelledby={labelId} {...aria}>
      {choices.map((choice, choiceIndex) => {
        return (
          <div key={choiceIndex}>
            <input
              className='iight-input'
              id={`${id}-${choiceIndex}`}
              type='radio'
              name={id}
              value={choice.value}
              checked={String(value) === String(choice.value)}
              onChange={(event) => doValidation(event.target.value)}
              required={required}
              disabled={disabled || readonly}
            />
            <label htmlFor={`${id}-${choiceIndex}`}>{choice.label ?? choice.value.toString()}</label>
          </div>
        )
      })}
    </div>
  )
}

export default Component

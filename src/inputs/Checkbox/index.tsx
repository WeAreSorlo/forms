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

export const name: InputName = () => 'Checkbox (Multiple choice)'

export const description: InputDescription = () => 'A list of checkboxes with a selection of choices that you specify.'

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

  // Check for an empty selection
  if (schema.required && isEmptyValue(value)) {
    return validationError(value, i18n.t('validation.selection'))
  }

  if (!Array.isArray(value)) {
    return validationError(value, i18n.t('validation.invalid'))
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
  const { id, labelId, aria, schema, readonly, disabled, options, value, handleValidation } = useFieldContext()

  const selected: Array<any> = Array.isArray(value) ? value : []

  const doValidation = useCallback(
    (input: any) => {
      handleValidation(validateValue(input, schema))
    },
    [handleValidation, schema],
  )

  const handleOnChange = useCallback(
    (choiceValue: any, checked: boolean) => {
      doValidation(checked ? [...selected, choiceValue] : selected.filter((item) => item !== choiceValue))
    },
    [doValidation, selected],
  )

  const choices: Array<any> = options?.choices || []

  return (
    <div className='iight-input__checkbox' role='group' aria-labelledby={labelId} {...aria}>
      {choices.map((choice, choiceIndex) => {
        return (
          <div key={choiceIndex}>
            <input
              className='iight-input'
              id={`${id}-${choiceIndex}`}
              type='checkbox'
              value={choice.value}
              checked={selected.includes(choice.value)}
              onChange={(event) => handleOnChange(choice.value, event.target.checked)}
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

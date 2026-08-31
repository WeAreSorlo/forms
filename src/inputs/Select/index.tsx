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
import { Fragment, useCallback } from 'react'

export const name: InputName = () => 'Select (Dropdown)'

export const description: InputDescription = () => 'A dropdown list with a selection of choices that you specify.'

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
    {
      name: 'placeholder',
      label: 'Placeholder',
      type: 'text',
      required: false,
    },
    {
      name: 'multiple',
      label: 'Multiple',
      type: 'boolean',
      required: false,
      options: {
        message: 'Allow multiple selections',
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
    return validationError(
      value,
      schema.options?.multiple ? i18n.t('validation.selection') : i18n.t('validation.required'),
    )
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
  const { id, aria, schema, required, readonly, disabled, options, value = '', handleValidation } = useFieldContext()

  const doValidation = useCallback(
    (input: any) => {
      handleValidation(validateValue(input, schema))
    },
    [handleValidation, schema],
  )

  const handleOnChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const inputValue = schema.options?.multiple
        ? Array.from(event.target.selectedOptions).map((option) => option.value)
        : event.target.value
      doValidation(inputValue)
    },
    [doValidation, schema],
  )

  const choices: Array<any> = options?.choices || []
  const multiple = options?.multiple || false

  return (
    <div className='iight-input__select'>
      <select
        className='iight-input'
        id={id}
        {...aria}
        value={multiple && !Array.isArray(value) ? [value] : value}
        onChange={handleOnChange}
        required={required}
        disabled={disabled || readonly}
        multiple={multiple}
      >
        {/* An empty choice so the select does not appear filled before a value is set */}
        {!multiple && <option value=''>{options?.placeholder ?? ''}</option>}
        {choices.map((choice, choiceIndex) => {
          const hasChildren = choice?.choices?.length > 0
          return (
            <Fragment key={choiceIndex}>
              {hasChildren && (
                <optgroup label={choice.label ?? choice.value.toString()}>
                  {choice.choices.map((childChoice: any, childChoiceIndex: number) => {
                    return (
                      <option value={childChoice.value} key={childChoiceIndex}>
                        {childChoice.label ?? childChoice.value.toString()}
                      </option>
                    )
                  })}
                </optgroup>
              )}
              {!hasChildren && <option value={choice.value}>{choice.label ?? choice.value.toString()}</option>}
            </Fragment>
          )
        })}
      </select>
    </div>
  )
}

export default Component

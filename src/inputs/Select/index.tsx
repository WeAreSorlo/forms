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
import { Fragment, memo, useCallback } from 'react'

export const name: InputName = () => 'Select (Dropdown)'

export const description: InputDescription = () => 'A dropdown list with a selection of choices that you specify.'

export const category: InputCategory = () => 'Choice'

export const schemaFields: InputSchemaFields = () => {
  return baseInputSchemaFields()
}

export const validateValue: InputValidateValue = (value, schema) => {
  schema = validateSchema(schema)

  if (schema.required && !value) {
    return 'This field is required.'
  }

  if (schema.options.multiple && !value?.length) {
    return 'At least one selection is required.'
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

  const handleOnChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const inputValue = schema.options.multiple
        ? Array.from(event.target.selectedOptions).map((option) => option.value)
        : event.target.value
      doValidation(inputValue)
    },
    [setValue],
  )

  return (
    <div className='iight-input__select'>
      <select
        className='iight-input'
        id={id}
        defaultValue={options.multiple && !Array.isArray(value) ? [value] : value}
        onChange={handleOnChange}
        required={required}
        disabled={disabled}
        multiple={options.multiple}
      >
        {options.choices.map((choice, choiceIndex) => {
          const hasChildren = choice?.choices?.length > 0
          return (
            <Fragment key={choiceIndex}>
              {hasChildren && (
                <optgroup label={choice.label ?? choice.value.toString()}>
                  {choice.choices.map((childChoice, childChoiceIndex) => {
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
})

export default Component

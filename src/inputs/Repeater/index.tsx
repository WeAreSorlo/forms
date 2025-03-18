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
import { validationSuccess } from '@/utils/validation'
import { memo, useCallback } from 'react'

export const name: InputName = () => 'Repeater'

export const description: InputDescription = () => 'Allows a set of fields to be repeated vertically or horizontally.'

export const category: InputCategory = () => 'Layout'

export const schemaFields: InputSchemaFields = () => {
  return [...baseInputSchemaFields()]
}

export const validateValue: InputValidateValue = (value, schema) => {
  schema = validateSchema(schema)
  return validationSuccess(value)
}

export const formatValue: InputFormatValue = (value, schema) => {
  schema = validateSchema(schema)
  const { isValid, validatedValue } = validateValue(value, schema)
  return isValid ? JSON.stringify(validatedValue, null, 2) : null
}

export const renderValue: InputRenderValue = (value, schema) => {
  return <>{formatValue(value, schema)}</>
}

const Component: InputComponent = memo(function Component() {
  const { id, schema, required, readonly, disabled, options, value, setValue, handleValidation } = useFieldContext()

  const doValidation = useCallback(
    (input: any) => {
      handleValidation(validateValue(input, schema))
    },
    [handleValidation, validateValue],
  )

  return <div className='iight-input__repeater'></div>
})

export default Component

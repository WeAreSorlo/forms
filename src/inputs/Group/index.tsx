import { useFieldContext } from '@/components/Field'
import Fieldset from '@/components/Fieldset'
import { useFormContext } from '@/context/FormProvider'
import { FieldMessages } from '@/types/fields'
import {
  InputCategory,
  InputComponent,
  InputCoreFields,
  InputDescription,
  InputFormatValue,
  InputName,
  InputOptionFields,
  InputRenderValue,
  InputValidateValue,
} from '@/types/inputs'
import { validateSchema } from '@/utils/inputs'
import { validationSuccess } from '@/utils/validation'
import { useState } from 'react'

type Column = Record<string, any>
type Row = Array<Column>
type Matrix = Array<Row>

export const name: InputName = () => 'Group'

export const description: InputDescription = () => 'Group your fields.'

export const category: InputCategory = () => 'Layout'

export const coreFields: InputCoreFields = (defaultFields) => {
  return defaultFields.filter(({ name }) => name !== 'required')
}

export const optionFields: InputOptionFields = () => {
  return [
    {
      label: 'Fields',
      name: 'fields',
      type: 'schemabuilder',
    },
  ]
}

export const validateValue: InputValidateValue = (value, schema) => {
  schema = validateSchema(schema)
  return validationSuccess(value)
}

export const formatValue: InputFormatValue = (value, schema) => {
  schema = validateSchema(schema)
  const validation = validateValue(value, schema)
  return validation.isValid ? JSON.stringify(validation.value, null, 2) : null
}

export const renderValue: InputRenderValue = (value, schema) => {
  return <>{formatValue(value, schema)}</>
}

const Component: InputComponent = function () {
  const { inputs } = useFormContext()
  const { id, schema, required, readonly, disabled, options, value, setValue, valid, setValid, messages, setMessages } =
    useFieldContext()

  const [tempMessages, setTempMessages] = useState<Record<string, FieldMessages>>({})
  const [tempValidity, setTempValidity] = useState<Record<string, boolean>>({})

  return (
    <>
      <Fieldset
        schema={options?.fields || []}
        inputs={inputs}
        values={value}
        messages={tempMessages}
        validity={tempValidity}
        onValuesChange={(field, value) => {
          setValue((old) => ({ ...old, [field]: value }))
        }}
        onMessagesChange={(field, messages) => {
          setTempMessages((old) => ({ ...old, [field]: messages }))
        }}
        onValidityChange={(field, valid) => {
          setTempValidity((old) => ({ ...old, [field]: valid }))
        }}
      />
    </>
  )
}

export default Component

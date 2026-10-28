import { useFieldContext } from '@/components/Field'
import Fieldset, {
  OnMessagesChangeCallback,
  OnValidityChangeCallback,
  OnValuesChangeCallback,
} from '@/components/Fieldset'
import { FieldScopeContext } from '@/context/FormProvider'
import { FieldMessages } from '@/types/fields'
import {
  InputCategory,
  InputComponent,
  InputCoreFields,
  InputDescription,
  InputFormatValue,
  InputName,
  InputOptionFields,
  InputPickValue,
  InputRenderValue,
  InputTypeValue,
  InputValidateChildren,
  InputValidateValue,
} from '@/types/inputs'
import { validateSchema } from '@/utils/inputs'
import { validationSuccess } from '@/utils/validation'
import { useCallback, useContext, useEffect, useMemo, useState } from 'react'

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

// Validate the nested fields against the group's value
export const validateChildren: InputValidateChildren = (value, schema, validateFields) => {
  return validateFields(schema.options?.fields || [], value || {})
}

// Pick only the nested fields' values
export const pickValue: InputPickValue = (value, schema, pickFields) => {
  if (value === undefined) return undefined
  return pickFields(schema.options?.fields || [], value || {})
}

// Type the nested fields as an object
export const typeValue: InputTypeValue = (schema, typeFields) => typeFields(schema.options?.fields || [])

export const formatValue: InputFormatValue = (value, schema) => {
  schema = validateSchema(schema)
  const validation = validateValue(value, schema)
  return validation.isValid ? JSON.stringify(validation.value, null, 2) : null
}

export const renderValue: InputRenderValue = (value, schema) => {
  return <>{formatValue(value, schema)}</>
}

const Component: InputComponent = function () {
  const { options, value, setValue, setValid } = useFieldContext()

  const [tempMessages, setTempMessages] = useState<Record<string, FieldMessages>>({})
  const [tempValidity, setTempValidity] = useState<Record<string, boolean | undefined>>({})

  // Extend the condition scopes with the group's own values
  const parentScopes = useContext(FieldScopeContext)
  const scopes = useMemo(() => [...(parentScopes || []), value || {}], [parentScopes, value])

  // Mark the group itself invalid when any nested field is invalid
  useEffect(() => {
    const validity = Object.values(tempValidity)
    if (validity.some((valid) => valid === false)) {
      setValid(false)
    } else if (validity.length >= 1 && validity.every((valid) => valid === true)) {
      setValid(true)
    }
  }, [tempValidity, setValid])

  const onValuesChange: OnValuesChangeCallback = useCallback(
    (field, fieldValue) => {
      setValue((old: Record<string, any>) => ({ ...old, [field]: fieldValue }))
    },
    [setValue],
  )

  const onMessagesChange: OnMessagesChangeCallback = useCallback((field, messages) => {
    setTempMessages((old) => ({ ...old, [field]: messages }))
  }, [])

  const onValidityChange: OnValidityChangeCallback = useCallback((field, valid) => {
    setTempValidity((old) => ({ ...old, [field]: valid }))
  }, [])

  return (
    <FieldScopeContext.Provider value={scopes}>
      <Fieldset
        schema={options?.fields || []}
        values={value}
        messages={tempMessages}
        validity={tempValidity}
        onValuesChange={onValuesChange}
        onMessagesChange={onMessagesChange}
        onValidityChange={onValidityChange}
      />
    </FieldScopeContext.Provider>
  )
}

export default Component

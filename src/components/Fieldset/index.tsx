import Field, {
  OnMessagesChangeCallback as OnFieldMessagesChangeCallback,
  OnValidityChangeCallback as OnFieldValidityChangeCallback,
  OnValueChangeCallback as OnFieldValueChangeCallback,
} from '@/components/Field'
import { FieldScopeContext, useFormStaticContext } from '@/context/FormProvider'
import { FieldMessages, FieldSchema } from '@/types/fields'
import { InputComponent, InputValidateValue } from '@/types/inputs'
import { evaluateConditions } from '@/utils/conditions'
import { conditionScope, resolveValidateValue } from '@/utils/inputs'
import { memo, useCallback, useContext } from 'react'
import { useTranslation } from 'react-i18next'

export type OnValuesChangeCallback = (field: string, value: any) => void
export type OnMessagesChangeCallback = (field: string, messages: FieldMessages) => void
export type OnValidityChangeCallback = (field: string, valid: boolean | undefined) => void

export interface FieldsetProps {
  schema: Array<FieldSchema>
  values?: Record<string, any>
  messages?: Record<string, FieldMessages>
  validity?: Record<string, boolean | undefined>
  onValuesChange?: OnValuesChangeCallback
  onMessagesChange?: OnMessagesChangeCallback
  onValidityChange?: OnValidityChangeCallback
}

export default function Fieldset({
  schema,
  values = {},
  messages = {},
  validity = {},
  onValuesChange = () => {},
  onMessagesChange = () => {},
  onValidityChange = () => {},
}: FieldsetProps) {
  const { inputs } = useFormStaticContext()

  // Hide fields whose conditions do not match the surrounding values
  const scopes = useContext(FieldScopeContext) || [conditionScope(schema, values, inputs)]

  return (
    <div className='iight-fieldset'>
      {schema.map((fieldSchema, fieldIndex) => {
        if (!evaluateConditions(fieldSchema, scopes)) return null

        return (
          <FieldsetItem
            key={fieldSchema.name ?? fieldIndex}
            schema={fieldSchema}
            component={inputs?.[fieldSchema.type]?.default}
            validate={resolveValidateValue(inputs?.[fieldSchema.type], 'client')}
            value={values[fieldSchema.name]}
            messages={messages[fieldSchema.name]}
            valid={validity[fieldSchema.name]}
            onValuesChange={onValuesChange}
            onMessagesChange={onMessagesChange}
            onValidityChange={onValidityChange}
          />
        )
      })}
    </div>
  )
}

// Memoised so a field only re-renders when its own schema or state changes
const FieldsetItem = memo(function FieldsetItem({
  schema,
  component: Component,
  validate,
  value,
  messages,
  valid,
  onValuesChange = () => {},
  onMessagesChange = () => {},
  onValidityChange = () => {},
}: {
  schema: FieldSchema
  component?: InputComponent
  validate?: InputValidateValue
  value?: any
  messages?: FieldMessages
  valid?: boolean
  onValuesChange?: OnValuesChangeCallback
  onMessagesChange?: OnMessagesChangeCallback
  onValidityChange?: OnValidityChangeCallback
}) {
  const { t } = useTranslation()
  const { type, ...fieldProps } = schema

  const onValueChangeHandler: OnFieldValueChangeCallback = useCallback(
    (value) => {
      onValuesChange(schema.name, value)
    },
    [onValuesChange, schema.name],
  )

  const onMessagesChangeHandler: OnFieldMessagesChangeCallback = useCallback(
    (messages) => {
      onMessagesChange(schema.name, messages)
    },
    [onMessagesChange, schema.name],
  )

  const onValidityChangeHandler: OnFieldValidityChangeCallback = useCallback(
    (validity) => {
      onValidityChange(schema.name, validity)
    },
    [onValidityChange, schema.name],
  )

  return (
    <Field
      {...fieldProps}
      value={value}
      messages={messages}
      valid={valid}
      validate={validate}
      onValueChange={onValueChangeHandler}
      onMessagesChange={onMessagesChangeHandler}
      onValidityChange={onValidityChangeHandler}
    >
      {Component && <Component />}
      {!Component && t('ui.invalidFieldType')}
    </Field>
  )
})

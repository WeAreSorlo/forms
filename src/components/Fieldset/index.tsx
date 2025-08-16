import Field, {
  OnMessagesChangeCallback as OnFieldMessagesChangeCallback,
  OnValidityChangeCallback as OnFieldValidityChangeCallback,
  OnValueChangeCallback as OnFieldValueChangeCallback,
} from '@/components/Field'
import { useFormContext } from '@/context/FormProvider'
import { FieldMessages, FieldSchema } from '@/types/fields'
import { useCallback } from 'react'

export type OnValuesChangeCallback = (field: string, value: any) => void
export type OnMessagesChangeCallback = (field: string, messages: FieldMessages) => void
export type OnValidityChangeCallback = (field: string, valid: boolean) => void

export interface FieldsetProps {
  schema: Array<FieldSchema>
  values?: Record<string, any>
  messages?: Record<string, FieldMessages>
  validity?: Record<string, boolean>
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
  return (
    <div className='iight-fieldset'>
      {schema.map((fieldSchema, fieldIndex) => {
        return (
          <FieldsetItem
            key={fieldIndex}
            schema={fieldSchema}
            values={values}
            messages={messages}
            validity={validity}
            onValuesChange={onValuesChange}
            onMessagesChange={onMessagesChange}
            onValidityChange={onValidityChange}
          />
        )
      })}
    </div>
  )
}

function FieldsetItem({
  schema,
  values = {},
  messages = {},
  validity = {},
  onValuesChange = () => {},
  onMessagesChange = () => {},
  onValidityChange = () => {},
}: {
  schema: FieldSchema
  values?: Record<string, any>
  messages?: Record<string, FieldMessages>
  validity?: Record<string, boolean>
  onValuesChange?: OnValuesChangeCallback
  onMessagesChange?: OnMessagesChangeCallback
  onValidityChange?: OnValidityChangeCallback
}) {
  const { inputs } = useFormContext()
  const { type, ...fieldProps } = schema
  const input = inputs?.[type]
  const InputCompontent = input?.default

  const onValuesChangeHandler: OnFieldValueChangeCallback = useCallback(
    (value) => {
      onValuesChange(schema.name, value)
    },
    [onValuesChange],
  )

  const onMessagesChangeHandler: OnFieldMessagesChangeCallback = useCallback(
    (messages) => {
      onMessagesChange(schema.name, messages)
    },
    [onMessagesChange],
  )

  const onValidityChangeHandler: OnFieldValidityChangeCallback = useCallback(
    (validity) => {
      onValidityChange(schema.name, validity)
    },
    [onValidityChange],
  )

  return (
    <Field
      value={values[schema.name]}
      messages={messages[schema.name]}
      valid={validity[schema.name]}
      onValueChange={onValuesChangeHandler}
      onMessagesChange={onMessagesChangeHandler}
      onValidityChange={onValidityChangeHandler}
      {...fieldProps}
    >
      {InputCompontent && <InputCompontent />}
      {!InputCompontent && 'Invalid input type.'}
    </Field>
  )
}

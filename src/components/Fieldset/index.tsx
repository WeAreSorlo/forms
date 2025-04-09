import Field from '@/components/Field'
import { FieldMessages, FieldSchema } from '@/types/fields'
import { Input } from '@/types/inputs'

export type OnValuesChangeCallback = (field: string, value: any) => void
export type OnMessagesChangeCallback = (field: string, messages: FieldMessages) => void
export type OnValidityChangeCallback = (field: string, valid: boolean) => void

export interface FieldsetProps {
  schema: Array<FieldSchema>
  inputs: Record<string, Input>
  values?: Record<string, any>
  messages?: Record<string, FieldMessages>
  validity?: Record<string, boolean>
  onValuesChange?: OnValuesChangeCallback
  onMessagesChange?: OnMessagesChangeCallback
  onValidityChange?: OnValidityChangeCallback
}

export default function Fieldset({
  schema,
  inputs,
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
        const { type, ...fieldProps } = fieldSchema
        const input = inputs?.[type]
        const InputCompontent = input?.default
        return (
          <Field
            key={fieldIndex}
            value={values[fieldSchema.name]}
            messages={messages[fieldSchema.name]}
            valid={validity[fieldSchema.name]}
            onValueChange={(value) => {
              onValuesChange(fieldSchema.name, value)
            }}
            onMessagesChange={(messages) => {
              onMessagesChange(fieldSchema.name, messages)
            }}
            onValidityChange={(validity) => {
              onValidityChange(fieldSchema.name, validity)
            }}
            {...fieldProps}
          >
            {InputCompontent && <InputCompontent />}
            {!InputCompontent && 'Invalid input type.'}
          </Field>
        )
      })}
    </div>
  )
}

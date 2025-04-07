import Field from '@/components/Field'
import { FieldErrors, FieldSchema } from '@/types/fields'
import { Input } from '@/types/inputs'
import { Fragment, memo } from 'react'

export type OnValuesChangeCallback = (field: string, value: any) => void
export type OnErrorsChangeCallback = (field: string, errors: FieldErrors) => void
export type OnValidityChangeCallback = (field: string, valid: boolean) => void

export interface FieldsetProps {
  schema: Array<FieldSchema>
  inputs: Record<string, Input>
  values?: Record<string, any>
  errors?: Record<string, Array<string>>
  validity?: Record<string, boolean>
  onValuesChange?: OnValuesChangeCallback
  onErrorsChange?: OnErrorsChangeCallback
  onValidityChange?: OnValidityChangeCallback
}

const Fieldset = memo(function Fieldset({
  schema,
  inputs,
  values = {},
  errors = {},
  validity = {},
  onValuesChange = () => {},
  onErrorsChange = () => {},
  onValidityChange = () => {},
}: FieldsetProps) {
  return (
    <div className='iight-fieldset'>
      {schema.map((fieldSchema, fieldIndex) => {
        const { type, ...fieldProps } = fieldSchema
        const input = inputs?.[type]
        const InputCompontent = input?.default
        return (
          <Fragment key={fieldIndex}>
            <Field
              value={values[fieldSchema.name]}
              errors={errors[fieldSchema.name]}
              valid={validity[fieldSchema.name]}
              onValueChange={(value) => {
                onValuesChange(fieldSchema.name, value)
              }}
              onErrorsChange={(errors) => {
                onErrorsChange(fieldSchema.name, errors)
              }}
              onValidityChange={(validity) => {
                onValidityChange(fieldSchema.name, validity)
              }}
              {...fieldProps}
            >
              {InputCompontent && <InputCompontent />}
              {!InputCompontent && 'Invalid input type.'}
            </Field>
          </Fragment>
        )
      })}
    </div>
  )
})

export default Fieldset

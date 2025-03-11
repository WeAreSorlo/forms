import Field from '@/components/Field'
import { FieldErrors, FieldSchema } from '@/types/fields'
import { Input } from '@/types/inputs'
import { Fragment, memo, useEffect, useState } from 'react'

export type OnValuesChangeCallback = (values: Record<string, any>) => void
export type OnErrorsChangeCallback = (errors: Record<string, FieldErrors>) => void
export type OnValidityChangeCallback = (errors: Record<string, boolean>) => void

export interface FieldsetProps {
  schema: Array<FieldSchema>
  inputs: Record<string, Input>
  onValuesChange?: OnValuesChangeCallback
  onErrorsChange?: OnErrorsChangeCallback
  onValidityChange?: OnValidityChangeCallback
}

const Fieldset = memo(function Fieldset({
  schema,
  inputs,
  onValuesChange = () => {},
  onErrorsChange = () => {},
  onValidityChange = () => {},
}: FieldsetProps) {
  const [fieldsetValues, setFieldsetValues] = useState<Record<string, any>>({})
  const [fieldsetErrors, setFieldsetErrors] = useState<Record<string, FieldErrors>>({})
  const [fieldsetValidity, setFieldsetValidity] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (onValuesChange) onValuesChange(fieldsetValues)
  }, [fieldsetValues])

  useEffect(() => {
    if (onErrorsChange) onErrorsChange(fieldsetErrors)
  }, [fieldsetErrors])

  useEffect(() => {
    if (onValidityChange) onValidityChange(fieldsetValidity)
  }, [fieldsetValidity])

  return (
    <div className='iight-fieldset'>
      {schema.map((fieldSchema, fieldIndex) => {
        const { type, ...fieldProps } = fieldSchema
        const input = inputs?.[type]
        const InputCompontent = input?.default
        return (
          <Fragment key={fieldIndex}>
            <Field
              onValueChange={(value) => {
                setFieldsetValues((old) => ({ ...old, [fieldSchema.name]: value }))
              }}
              onErrorsChange={(errors) => {
                setFieldsetErrors((old) => ({ ...old, [fieldSchema.name]: errors }))
              }}
              onValidityChange={(validity) => {
                setFieldsetValidity((old) => ({ ...old, [fieldSchema.name]: validity }))
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

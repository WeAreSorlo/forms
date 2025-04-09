import Fieldset from '@/components/Fieldset'
import FormProvider, { Context, useFormContext } from '@/context/FormProvider'
import TranslationProvider from '@/context/TranslationProvider'
import * as coreInputs from '@/inputs'
import { Input } from '@/types/inputs'
import { useEffect, useMemo } from 'react'

export interface FormProps {
  schema: Context['schema']
  values?: Context['values']
  messages?: Context['messages']
  inputs?: Record<string, Input>
  onChange?: (values: Record<string, any>) => void
}

function FormInner({ onChange }: { onChange?: (values: Record<string, any>) => void }) {
  const { inputs, schema, values, messages, validity, setValues, setMessages, setValidity } = useFormContext()

  useEffect(() => {
    if (onChange) onChange(values)
  }, [values, onChange])

  return (
    <form className='iight-form'>
      <Fieldset
        inputs={inputs}
        schema={schema}
        values={values}
        messages={messages}
        validity={validity}
        onValuesChange={(field, value) => {
          setValues((old) => ({ ...old, [field]: value }))
        }}
        onMessagesChange={(field, messages) => {
          setMessages((old) => ({ ...old, [field]: messages }))
        }}
        onValidityChange={(field, validity) => {
          setValidity((old) => ({ ...old, [field]: validity }))
        }}
      />
    </form>
  )
}

export default function Form({
  schema: defaultSchema,
  values: defaultValues,
  messages: defaultMessages,
  inputs: defaultInputs,
  onChange,
}: FormProps) {
  // Merge internal inputs with user defined
  const mergedInputs = useMemo(() => {
    return {
      ...coreInputs,
      ...(defaultInputs || {}),
    }
  }, [coreInputs, defaultInputs])

  return (
    <TranslationProvider>
      <FormProvider schema={defaultSchema} values={defaultValues} messages={defaultMessages} inputs={mergedInputs}>
        <FormInner onChange={onChange} />
      </FormProvider>
    </TranslationProvider>
  )
}

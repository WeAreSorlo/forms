import Fieldset, {
  OnMessagesChangeCallback,
  OnValidityChangeCallback,
  OnValuesChangeCallback,
} from '@/components/Fieldset'
import { Context, FormContext } from '@/context/FormProvider'
import * as coreInputs from '@/inputs'
import * as resources from '@/translations'
import { Input } from '@/types/inputs'
import i18n from 'i18next'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { I18nextProvider, initReactI18next } from 'react-i18next'

i18n.use(initReactI18next).init({
  resources: resources,
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
})

export interface FormProps {
  schema: Context['schema']
  values?: Context['values']
  messages?: Context['messages']
  validity?: Context['validity']
  inputs?: Record<string, Input>
  onValuesChange?: (values: Context['values']) => void
  onMessagesChange?: (messages: Context['messages']) => void
  onValidityChange?: (validity: Context['validity']) => void
}

export default function Form({
  schema: defaultSchema,
  values: defaultValues,
  messages: defaultMessages,
  validity: defaultValidity,
  inputs,
  onValuesChange,
  onMessagesChange,
  onValidityChange,
}: FormProps) {
  const [schema, setSchema] = useState<Context['schema']>(defaultSchema || [])
  const [values, setValues] = useState<Context['values']>(defaultValues || {})
  const [messages, setMessages] = useState<Context['messages']>(defaultMessages || {})
  const [validity, setValidity] = useState<Context['validity']>(defaultValidity || {})

  // Sync props with local state
  useEffect(() => {
    setSchema((old) => {
      if (Object.is(defaultSchema, old)) return old
      return defaultSchema
    })
  }, [defaultSchema])

  useEffect(() => {
    setValues((old) => {
      if (Object.is(defaultValues, old)) return old
      return defaultValues
    })
  }, [defaultValues])

  useEffect(() => {
    setMessages((old) => {
      if (Object.is(defaultMessages, old)) return old
      return defaultMessages
    })
  }, [defaultMessages])

  useEffect(() => {
    setValidity((old) => {
      if (Object.is(defaultValidity, old)) return old
      return defaultValidity
    })
  }, [defaultValidity])

  // Merge internal inputs with user defined
  const mergedInputs = useMemo(() => {
    return {
      ...coreInputs,
      ...(inputs || {}),
    }
  }, [coreInputs, inputs])

  const onFieldsetValuesChange: OnValuesChangeCallback = useCallback((field, value) => {
    setValues((old) => {
      if (Object.is(old?.[field], value)) return old
      return { ...old, [field]: value }
    })
  }, [])

  const onFieldsetMessagesChange: OnMessagesChangeCallback = useCallback((field, messages) => {
    setMessages((old) => {
      if (Object.is(old?.[field], messages)) return old
      return { ...old, [field]: messages }
    })
  }, [])

  const onFieldsetValidityChange: OnValidityChangeCallback = useCallback((field, validity) => {
    setValidity((old) => {
      if (Object.is(old?.[field], validity)) return old
      return { ...old, [field]: validity }
    })
  }, [])

  useEffect(() => {
    if (onValuesChange) onValuesChange(values)
  }, [values, onValuesChange])

  useEffect(() => {
    if (onMessagesChange) onMessagesChange(messages)
  }, [messages, onMessagesChange])

  useEffect(() => {
    if (onValidityChange) onValidityChange(validity)
  }, [validity, onValidityChange])

  return (
    <I18nextProvider i18n={i18n}>
      <FormContext.Provider
        value={{
          schema,
          setSchema,
          values,
          setValues,
          messages,
          setMessages,
          validity,
          setValidity,

          // Static
          inputs: mergedInputs,
        }}
      >
        <form className='iight-form'>
          <Fieldset
            schema={schema}
            values={values}
            messages={messages}
            validity={validity}
            onValuesChange={onFieldsetValuesChange}
            onMessagesChange={onFieldsetMessagesChange}
            onValidityChange={onFieldsetValidityChange}
          />
        </form>
      </FormContext.Provider>
    </I18nextProvider>
  )
}

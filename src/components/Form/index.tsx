import Fieldset, {
  OnMessagesChangeCallback,
  OnValidityChangeCallback,
  OnValuesChangeCallback,
} from '@/components/Fieldset'
import { Context, FormContext, FormStaticContext } from '@/context/FormProvider'
import i18n from '@/i18n'
import * as coreInputs from '@/inputs'
import { Input, ValidationReport } from '@/types/inputs'
import { validateValues } from '@/utils/inputs'
import { useCallback, useEffect, useImperativeHandle, useMemo, useState } from 'react'
import { I18nextProvider } from 'react-i18next'

export interface FormHandle {
  validate: () => ValidationReport
}

export interface FormProps {
  schema: Context['schema']
  values?: Context['values']
  messages?: Context['messages']
  validity?: Context['validity']
  inputs?: Record<string, Input>
  onValuesChange?: (values: Context['values']) => void
  onMessagesChange?: (messages: Context['messages']) => void
  onValidityChange?: (validity: Context['validity']) => void
  ref?: React.Ref<FormHandle>
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
  ref,
}: FormProps) {
  const [schema, setSchema] = useState<Context['schema']>(defaultSchema || [])
  const [values, setValues] = useState<Context['values']>(defaultValues || {})
  const [messages, setMessages] = useState<Context['messages']>(defaultMessages || {})
  const [validity, setValidity] = useState<Context['validity']>(defaultValidity || {})
  const [validationCounter, setValidationCounter] = useState(0)

  // Sync props with local state, keeping the local state when a prop is not controlled
  useEffect(() => {
    setSchema((old) => {
      if (defaultSchema === undefined) return old
      if (Object.is(defaultSchema, old)) return old
      return defaultSchema
    })
  }, [defaultSchema])

  useEffect(() => {
    setValues((old) => {
      if (defaultValues === undefined) return old
      if (Object.is(defaultValues, old)) return old
      return defaultValues
    })
  }, [defaultValues])

  useEffect(() => {
    setMessages((old) => {
      if (defaultMessages === undefined) return old
      if (Object.is(defaultMessages, old)) return old
      return defaultMessages
    })
  }, [defaultMessages])

  useEffect(() => {
    setValidity((old) => {
      if (defaultValidity === undefined) return old
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
  }, [inputs])

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

  // Validate the current values against the schema, and ask every rendered
  // field to re-run its own validation so all messages are displayed
  const validate = useCallback(() => {
    setValidationCounter((old) => old + 1)
    return validateValues(schema, values, mergedInputs)
  }, [schema, values, mergedInputs])

  useImperativeHandle(ref, () => ({ validate }), [validate])

  const contextValue = useMemo(() => {
    return {
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
    }
  }, [schema, values, messages, validity, mergedInputs])

  const staticContextValue = useMemo(() => {
    return {
      inputs: mergedInputs,
      validationCounter,
    }
  }, [mergedInputs, validationCounter])

  return (
    <I18nextProvider i18n={i18n}>
      <FormContext.Provider value={contextValue}>
        <FormStaticContext.Provider value={staticContextValue}>
          {/* Prevent implicit submissions from reloading the page */}
          <form className='iight-form' onSubmit={(event) => event.preventDefault()}>
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
        </FormStaticContext.Provider>
      </FormContext.Provider>
    </I18nextProvider>
  )
}

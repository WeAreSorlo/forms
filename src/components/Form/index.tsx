import Fieldset, {
  OnMessagesChangeCallback,
  OnValidityChangeCallback,
  OnValuesChangeCallback,
} from '@/components/Fieldset'
import {
  Context,
  FieldInjectionContext,
  FieldReportContext,
  FieldReportContextValue,
  FieldScopeContext,
  FieldStateReport,
  FormContext,
  FormStaticContext,
} from '@/context/FormProvider'
import i18n from '@/i18n'
import * as coreInputs from '@/inputs'
import { FieldMessages } from '@/types/fields'
import { Input, ValidationReport } from '@/types/inputs'
import { flattenValidationReport, validateValues } from '@/utils/inputs'
import { useCallback, useEffect, useImperativeHandle, useMemo, useState } from 'react'
import { I18nextProvider } from 'react-i18next'

export interface FormHandle {
  validate: () => ValidationReport
  applyReport: (report: ValidationReport) => void
}

export interface FormProps<Values extends Record<string, any> = Record<string, any>> {
  schema: Context['schema']
  values?: Values
  messages?: Context['messages']
  validity?: Context['validity']
  inputs?: Record<string, Input>
  onValuesChange?: (values: Values) => void
  onMessagesChange?: (messages: Context['messages']) => void
  onValidityChange?: (validity: Context['validity']) => void
  className?: string
  ref?: React.Ref<FormHandle>
}

export default function Form<Values extends Record<string, any> = Record<string, any>>({
  schema: defaultSchema,
  values: defaultValues,
  messages: defaultMessages,
  validity: defaultValidity,
  inputs,
  onValuesChange,
  onMessagesChange,
  onValidityChange,
  className,
  ref,
}: FormProps<Values>) {
  const [schema, setSchema] = useState<Context['schema']>(defaultSchema || [])
  const [values, setValues] = useState<Context['values']>(defaultValues || {})
  const [messages, setMessages] = useState<Context['messages']>(defaultMessages || {})
  const [validity, setValidity] = useState<Context['validity']>(defaultValidity || {})
  const [validationCounter, setValidationCounter] = useState(0)
  const [injectedMessages, setInjectedMessages] = useState<Record<string, FieldMessages>>({})
  const [injectedValidity, setInjectedValidity] = useState<Record<string, boolean | undefined>>({})

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

  // Collect every field's messages and validity into path keyed maps, so
  // nested fields appear as e.g. 'address.town' or 'pets.0.petname'
  const onFieldReport: FieldStateReport = useCallback((path, patch) => {
    const key = path.join('.')

    // An undefined patch removes the field's entries entirely
    if (patch === undefined) {
      setMessages((old) => {
        if (!(key in old)) return old
        const { [key]: removed, ...rest } = old
        return rest
      })

      setValidity((old) => {
        if (!(key in old)) return old
        const { [key]: removed, ...rest } = old
        return rest
      })

      return
    }

    if ('messages' in patch) {
      setMessages((old) => {
        if (Object.is(old?.[key], patch.messages)) return old
        return { ...old, [key]: patch.messages }
      })
    }

    if ('valid' in patch) {
      setValidity((old) => {
        if (Object.is(old?.[key], patch.valid)) return old
        return { ...old, [key]: patch.valid }
      })
    }
  }, [])

  useEffect(() => {
    if (onValuesChange) onValuesChange(values as Values)
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
    return validateValues(schema, values, mergedInputs, { environment: 'client' })
  }, [schema, values, mergedInputs])

  // Apply an external validation report, e.g. one returned by a server, and
  // show its messages inline until each field next reports for itself
  const applyReport = useCallback((report: ValidationReport) => {
    const flat = flattenValidationReport(report)

    setMessages(flat.messages)
    setValidity(flat.validity)
    setInjectedMessages(flat.messages)
    setInjectedValidity(flat.validity)
  }, [])

  useImperativeHandle(ref, () => ({ validate, applyReport }), [validate, applyReport])

  const clearInjected = useCallback((key: string) => {
    setInjectedMessages((old) => {
      if (!(key in old)) return old
      const { [key]: removed, ...rest } = old
      return rest
    })

    setInjectedValidity((old) => {
      if (!(key in old)) return old
      const { [key]: removed, ...rest } = old
      return rest
    })
  }, [])

  const injectionContextValue = useMemo(() => {
    return {
      messages: injectedMessages,
      validity: injectedValidity,
      clear: clearInjected,
    }
  }, [injectedMessages, injectedValidity, clearInjected])

  const dataContextValue = useMemo(() => {
    return {
      schema,
      values,
      messages,
      validity,
    }
  }, [schema, values, messages, validity])

  const staticContextValue = useMemo(() => {
    return {
      inputs: mergedInputs,
      validationCounter,

      setSchema,
      setValues,
      setMessages,
      setValidity,
    }
  }, [mergedInputs, validationCounter])

  const reportContextValue = useMemo<FieldReportContextValue>(() => {
    return {
      report: onFieldReport,
      resolve: (path) => path,
    }
  }, [onFieldReport])

  const scopeContextValue = useMemo(() => [values], [values])

  return (
    <I18nextProvider i18n={i18n}>
      <FormContext.Provider value={dataContextValue}>
        <FormStaticContext.Provider value={staticContextValue}>
          <FieldReportContext.Provider value={reportContextValue}>
            <FieldInjectionContext.Provider value={injectionContextValue}>
              <FieldScopeContext.Provider value={scopeContextValue}>
                {/* Prevent implicit submissions from reloading the page */}
                <form
                  className={`iight-form${className ? ` ${className}` : ''}`}
                  onSubmit={(event) => event.preventDefault()}
                >
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
              </FieldScopeContext.Provider>
            </FieldInjectionContext.Provider>
          </FieldReportContext.Provider>
        </FormStaticContext.Provider>
      </FormContext.Provider>
    </I18nextProvider>
  )
}

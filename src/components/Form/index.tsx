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
import { conditionScope, flattenValidationReport, ValidateValuesOptions, validateValues } from '@/utils/inputs'
import { SetStateAction, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { I18nextProvider } from 'react-i18next'

export interface FormHandle {
  validate: (options?: Pick<ValidateValuesOptions, 'allowIncomplete'>) => ValidationReport
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

  // Every write goes through these refs so each change commits exactly one
  // object identity, reads the very latest state, and is emitted exactly once
  // from its write site. Emitting from an effect instead would echo adopted
  // props back to a controlling parent and feed back forever.
  const schemaRef = useRef(schema)
  const valuesRef = useRef(values)
  const messagesRef = useRef(messages)
  const validityRef = useRef(validity)

  const callbacks = useRef({ onValuesChange, onMessagesChange, onValidityChange })
  callbacks.current = { onValuesChange, onMessagesChange, onValidityChange }

  const commitSchema = useCallback((next: Context['schema']) => {
    schemaRef.current = next
    setSchema(next)
  }, [])

  const commitValues = useCallback((next: Context['values'], emit = true) => {
    valuesRef.current = next
    setValues(next)
    if (emit && callbacks.current.onValuesChange) callbacks.current.onValuesChange(next as Values)
  }, [])

  const commitMessages = useCallback((next: Context['messages'], emit = true) => {
    messagesRef.current = next
    setMessages(next)
    if (emit && callbacks.current.onMessagesChange) callbacks.current.onMessagesChange(next)
  }, [])

  const commitValidity = useCallback((next: Context['validity'], emit = true) => {
    validityRef.current = next
    setValidity(next)
    if (emit && callbacks.current.onValidityChange) callbacks.current.onValidityChange(next)
  }, [])

  // Adopt controlled props without emitting them back to the parent. Compare with the state this render shows, as a
  // child's effect may have changed the refs since, and a parent passing that change back only shows it next render
  useEffect(() => {
    if (defaultSchema === undefined) return
    if (Object.is(defaultSchema, schema)) return
    commitSchema(defaultSchema)
  }, [defaultSchema, commitSchema])

  useEffect(() => {
    if (defaultValues === undefined) return
    if (Object.is(defaultValues, values)) return
    commitValues(defaultValues, false)
  }, [defaultValues, commitValues])

  useEffect(() => {
    if (defaultMessages === undefined) return
    if (Object.is(defaultMessages, messages)) return
    commitMessages(defaultMessages, false)
  }, [defaultMessages, commitMessages])

  useEffect(() => {
    if (defaultValidity === undefined) return
    if (Object.is(defaultValidity, validity)) return
    commitValidity(defaultValidity, false)
  }, [defaultValidity, commitValidity])

  // Merge internal inputs with user defined
  const mergedInputs = useMemo(() => {
    return {
      ...coreInputs,
      ...(inputs || {}),
    }
  }, [inputs])

  const onFieldsetValuesChange: OnValuesChangeCallback = useCallback(
    (field, value) => {
      const old = valuesRef.current
      if (Object.is(old?.[field], value)) return
      commitValues({ ...old, [field]: value })
    },
    [commitValues],
  )

  const onFieldsetMessagesChange: OnMessagesChangeCallback = useCallback(
    (field, fieldMessages) => {
      const old = messagesRef.current
      if (Object.is(old?.[field], fieldMessages)) return
      commitMessages({ ...old, [field]: fieldMessages })
    },
    [commitMessages],
  )

  const onFieldsetValidityChange: OnValidityChangeCallback = useCallback(
    (field, fieldValidity) => {
      const old = validityRef.current
      if (Object.is(old?.[field], fieldValidity)) return
      commitValidity({ ...old, [field]: fieldValidity })
    },
    [commitValidity],
  )

  // Collect every field's messages and validity into path keyed maps, so
  // nested fields appear as e.g. 'address.town' or 'pets.0.petname'
  const onFieldReport: FieldStateReport = useCallback(
    (path, patch) => {
      const key = path.join('.')

      // An undefined patch removes the field's entries entirely
      if (patch === undefined) {
        if (key in messagesRef.current) {
          const { [key]: removed, ...rest } = messagesRef.current
          commitMessages(rest)
        }

        if (key in validityRef.current) {
          const { [key]: removed, ...rest } = validityRef.current
          commitValidity(rest)
        }

        return
      }

      if ('messages' in patch && !Object.is(messagesRef.current?.[key], patch.messages)) {
        commitMessages({ ...messagesRef.current, [key]: patch.messages })
      }

      if ('valid' in patch && !Object.is(validityRef.current?.[key], patch.valid)) {
        commitValidity({ ...validityRef.current, [key]: patch.valid })
      }
    },
    [commitMessages, commitValidity],
  )

  // Validate the current values against the schema, and ask every rendered
  // field to re-run its own validation so all messages are displayed, even
  // those allowIncomplete leaves out of the report
  const validate = useCallback(
    (options: Pick<ValidateValuesOptions, 'allowIncomplete'> = {}) => {
      setValidationCounter((old) => old + 1)
      return validateValues(schemaRef.current, valuesRef.current, mergedInputs, {
        environment: 'client',
        allowIncomplete: options.allowIncomplete,
      })
    },
    [mergedInputs],
  )

  // Apply an external validation report, e.g. one returned by a server, and
  // show its messages inline until each field next reports for itself
  const applyReport = useCallback(
    (report: ValidationReport) => {
      const flat = flattenValidationReport(report)

      commitMessages(flat.messages)
      commitValidity(flat.validity)
      setInjectedMessages(flat.messages)
      setInjectedValidity(flat.validity)
    },
    [commitMessages, commitValidity],
  )

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

  // External setters go through the same write path, so state, refs and
  // change callbacks stay coherent
  const setSchemaExternal = useCallback(
    (action: SetStateAction<Context['schema']>) => {
      const next = typeof action === 'function' ? action(schemaRef.current) : action
      if (Object.is(next, schemaRef.current)) return
      commitSchema(next)
    },
    [commitSchema],
  )

  const setValuesExternal = useCallback(
    (action: SetStateAction<Context['values']>) => {
      const next = typeof action === 'function' ? action(valuesRef.current) : action
      if (Object.is(next, valuesRef.current)) return
      commitValues(next)
    },
    [commitValues],
  )

  const setMessagesExternal = useCallback(
    (action: SetStateAction<Context['messages']>) => {
      const next = typeof action === 'function' ? action(messagesRef.current) : action
      if (Object.is(next, messagesRef.current)) return
      commitMessages(next)
    },
    [commitMessages],
  )

  const setValidityExternal = useCallback(
    (action: SetStateAction<Context['validity']>) => {
      const next = typeof action === 'function' ? action(validityRef.current) : action
      if (Object.is(next, validityRef.current)) return
      commitValidity(next)
    },
    [commitValidity],
  )

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

      setSchema: setSchemaExternal,
      setValues: setValuesExternal,
      setMessages: setMessagesExternal,
      setValidity: setValidityExternal,
    }
  }, [mergedInputs, validationCounter, setSchemaExternal, setValuesExternal, setMessagesExternal, setValidityExternal])

  const reportContextValue = useMemo<FieldReportContextValue>(() => {
    return {
      report: onFieldReport,
      resolve: (path) => path,
    }
  }, [onFieldReport])

  const scopeContextValue = useMemo(
    () => [conditionScope(schema, values, mergedInputs)],
    [schema, values, mergedInputs],
  )

  return (
    <I18nextProvider i18n={i18n}>
      <FormContext.Provider value={dataContextValue}>
        <FormStaticContext.Provider value={staticContextValue}>
          <FieldReportContext.Provider value={reportContextValue}>
            <FieldInjectionContext.Provider value={injectionContextValue}>
              <FieldScopeContext.Provider value={scopeContextValue}>
                {/* Prevent implicit submissions from reloading the page */}
                <form
                  className={`sorlo-form${className ? ` ${className}` : ''}`}
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

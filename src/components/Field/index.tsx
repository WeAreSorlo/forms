import {
  FieldInjectionContext,
  FieldReportContext,
  FieldReportContextValue,
  FormStaticContext,
} from '@/context/FormProvider'
import { FieldMessages } from '@/types/fields'
import { InputSchema, InputValidateValue, InputValidationResponse } from '@/types/inputs'
import { validateSchema } from '@/utils/inputs'
import { isEqual } from 'lodash'
import { SetStateAction, createContext, useCallback, useContext, useEffect, useId, useMemo, useRef } from 'react'

interface Context {
  id: string
  labelId: string
  aria: {
    'aria-describedby'?: string
    'aria-invalid'?: boolean
  }
  schema: InputSchema
  name: InputSchema['name']
  label: InputSchema['label']
  required: InputSchema['required']
  instructions: InputSchema['instructions']
  defaultValue: InputSchema['defaultValue']
  readonly: InputSchema['readonly']
  disabled: InputSchema['disabled']
  width: InputSchema['width']
  options: InputSchema['options']

  value: any
  messages: FieldMessages
  valid: boolean | undefined

  setValue: (value: SetStateAction<Context['value']>) => void
  setMessages: (messages: SetStateAction<Context['messages']>) => void
  setValid: (valid: SetStateAction<Context['valid']>) => void

  handleValidation: (response: InputValidationResponse) => void
}

// Create Field Context
const FieldContext = createContext<undefined | Context>(undefined)

// Hook for consuming field context
export const useFieldContext = () => {
  const context = useContext(FieldContext)
  if (!context) {
    throw new Error('useFieldContext must be used within a <Field>')
  }
  return context
}

export type OnValueChangeCallback = (value: Context['value']) => void
export type OnMessagesChangeCallback = (messages: Context['messages']) => void
export type OnValidityChangeCallback = (validity: Context['valid']) => void

export interface FieldProps extends InputSchema {
  children: React.ReactNode
  value?: any
  messages?: FieldMessages
  valid?: boolean
  validate?: InputValidateValue
  onValueChange: OnValueChangeCallback
  onMessagesChange: OnMessagesChangeCallback
  onValidityChange: OnValidityChangeCallback
}

const defaultMessages: FieldMessages = []

// Field Provider Component
export default function Field({
  value,
  messages = defaultMessages,
  valid,
  validate,
  onValueChange,
  onMessagesChange,
  onValidityChange,
  children,
  ...rawSchema
}: FieldProps) {
  const { name, label, required, instructions, defaultValue, readonly, disabled, width, options } = rawSchema

  // Strip unknown properties from the schema
  const schema = useMemo(() => {
    return validateSchema(rawSchema)
  }, [name, label, required, instructions, defaultValue, readonly, disabled, width, options])

  // Fall back to the schema default when no value is set
  if (value === undefined) value = defaultValue

  const id = useId()

  // Report state changes to the form's path keyed maps
  const parentReport = useContext(FieldReportContext)

  // State injected from outside, e.g. a server validation report, shown for
  // this field until it next reports its own state
  const injection = useContext(FieldInjectionContext)
  const injectionKey = useMemo(() => {
    return (parentReport ? parentReport.resolve([name]) : [name]).join('.')
  }, [parentReport, name])

  const setValue = useCallback(
    (newValue: SetStateAction<Context['value']>) => {
      if (typeof newValue === 'function') newValue = newValue(value)
      if (onValueChange && !isEqual(value, newValue)) {
        onValueChange(newValue)
      }
    },
    [value, onValueChange],
  )

  const setMessages = useCallback(
    (newMessages: SetStateAction<Context['messages']>) => {
      if (typeof newMessages === 'function') newMessages = newMessages(messages)
      if (!isEqual(messages, newMessages)) {
        if (onMessagesChange) onMessagesChange(newMessages)
        if (parentReport) parentReport.report([name], { messages: newMessages })
        if (injection) injection.clear(injectionKey)
      }
    },
    [messages, onMessagesChange, parentReport, name, injection, injectionKey],
  )

  const setValid = useCallback(
    (newValid: SetStateAction<Context['valid']>) => {
      if (typeof newValid === 'function') newValid = newValid(valid)
      if (!isEqual(valid, newValid)) {
        if (onValidityChange) onValidityChange(newValid)
        if (parentReport) parentReport.report([name], { valid: newValid })
        if (injection) injection.clear(injectionKey)
      }
    },
    [valid, onValidityChange, parentReport, name, injection, injectionKey],
  )

  const handleValidation = useCallback(
    ({ isValid, value, messages }: InputValidationResponse) => {
      setValid(isValid)
      setMessages(messages)
      setValue(value)
    },
    [setValue, setMessages, setValid],
  )

  // Re-validate exactly once per form wide validation pass, reading the
  // latest state from a ref so container inputs that aggregate their own
  // validity afterwards are not overwritten
  const staticContext = useContext(FormStaticContext)
  const validationCounter = staticContext?.validationCounter || 0

  const latest = useRef({ value, schema, validate, handleValidation })
  latest.current = { value, schema, validate, handleValidation }

  useEffect(() => {
    const { value, schema, validate, handleValidation } = latest.current
    if (validationCounter >= 1 && validate) {
      handleValidation(validate(value, schema))
    }
  }, [validationCounter])

  // Remove the field's entries from the form's path keyed maps when it
  // unmounts or its path changes
  useEffect(() => {
    if (!parentReport) return
    return () => parentReport.report([name], undefined)
  }, [parentReport, name])

  // Nest children's reports and path resolution under this field's name
  const childReport = useMemo<FieldReportContextValue | undefined>(() => {
    if (!parentReport) return undefined
    return {
      report: (path, patch) => parentReport.report([name, ...path], patch),
      resolve: (path) => parentReport.resolve([name, ...path]),
    }
  }, [parentReport, name])

  // Injected state wins until the field reports for itself
  const displayMessages = injection && injectionKey in injection.messages ? injection.messages[injectionKey] : messages
  const displayValid = injection && injectionKey in injection.validity ? injection.validity[injectionKey] : valid

  // Accessibility wiring for the input itself
  const labelId = `${id}-label`
  const messagesId = `${id}-messages`
  const instructionsId = `${id}-instructions`

  const aria = useMemo(() => {
    const describedBy = [displayMessages.length > 0 ? messagesId : null, instructions ? instructionsId : null]
      .filter(Boolean)
      .join(' ')

    return {
      'aria-describedby': describedBy || undefined,
      'aria-invalid': displayValid === false || undefined,
    }
  }, [displayMessages, messagesId, instructions, instructionsId, displayValid])

  const contextValue = useMemo(() => {
    return {
      id,
      labelId,
      aria,
      schema,
      name,
      label,
      required,
      instructions,
      defaultValue,
      readonly,
      disabled,
      width,
      options: options || {},

      value,
      messages,
      valid,

      setValue,
      setMessages,
      setValid,

      handleValidation,
    }
  }, [id, labelId, aria, schema, value, messages, valid, setValue, setMessages, setValid, handleValidation])

  const isValid = displayValid === true
  const isInvalid = displayValid === false

  return (
    <FieldContext.Provider value={contextValue}>
      <FieldReportContext.Provider value={childReport}>
        <div style={{ width: width ? `${width}%` : '100%' }}>
          <div className={`iight-field${isValid ? ' iight-valid' : ''}${isInvalid ? ' iight-invalid' : ''}`}>
            <div className='iight-meta'>
              {label && (
                <label className='iight-label' id={labelId} htmlFor={id}>
                  {label}
                  {required && <span aria-hidden='true'>*</span>}
                </label>
              )}
              {instructions && (
                <div className='iight-instructions' id={instructionsId}>
                  {instructions}
                </div>
              )}
            </div>
            {displayMessages.length > 0 && (
              <ul className='iight-messages' id={messagesId} role='alert'>
                {displayMessages.map((message, messageIndex) => {
                  return <li key={messageIndex}>{message}</li>
                })}
              </ul>
            )}
            {children}
          </div>
        </div>
      </FieldReportContext.Provider>
    </FieldContext.Provider>
  )
}

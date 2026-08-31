import { FormStaticContext } from '@/context/FormProvider'
import { FieldMessages } from '@/types/fields'
import { InputSchema, InputValidateValue, InputValidationResponse } from '@/types/inputs'
import { validateSchema } from '@/utils/inputs'
import { isEqual } from 'lodash'
import { SetStateAction, createContext, useCallback, useContext, useEffect, useId, useMemo } from 'react'

interface Context {
  id: string
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
      if (onMessagesChange && !isEqual(messages, newMessages)) {
        onMessagesChange(newMessages)
      }
    },
    [messages, onMessagesChange],
  )

  const setValid = useCallback(
    (newValid: SetStateAction<Context['valid']>) => {
      if (typeof newValid === 'function') newValid = newValid(valid)
      if (onValidityChange && !isEqual(valid, newValid)) {
        onValidityChange(newValid)
      }
    },
    [valid, onValidityChange],
  )

  const handleValidation = useCallback(
    ({ isValid, value, messages }: InputValidationResponse) => {
      setValid(isValid)
      setMessages(messages)
      setValue(value)
    },
    [setValue, setMessages, setValid],
  )

  // Re-validate whenever a form wide validation pass is requested, and eagerly
  // on any change after the first pass
  const staticContext = useContext(FormStaticContext)
  const validationCounter = staticContext?.validationCounter || 0

  useEffect(() => {
    if (validationCounter >= 1 && validate) {
      handleValidation(validate(value, schema))
    }
  }, [validationCounter, validate, value, schema, handleValidation])

  const contextValue = useMemo(() => {
    return {
      id,
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
  }, [id, schema, value, messages, valid, setValue, setMessages, setValid, handleValidation])

  const isValid = valid === true
  const isInvalid = valid === false

  return (
    <FieldContext.Provider value={contextValue}>
      <div style={{ width: width ? `${width}%` : '100%' }}>
        <div className={`iight-field${isValid ? ' iight-valid' : ''}${isInvalid ? ' iight-invalid' : ''}`}>
          <div className='iight-meta'>
            {label && (
              <label className='iight-label' htmlFor={id}>
                {label}
                {required && <span>*</span>}
              </label>
            )}
            {instructions && <div className='iight-instructions'>{instructions}</div>}
          </div>
          {messages.length > 0 && (
            <ul className='iight-messages'>
              {messages.map((message, messageIndex) => {
                return <li key={messageIndex}>{message}</li>
              })}
            </ul>
          )}
          {children}
        </div>
      </div>
    </FieldContext.Provider>
  )
}

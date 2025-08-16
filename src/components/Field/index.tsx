import { FieldMessages } from '@/types/fields'
import { InputSchema, InputValidationResponse } from '@/types/inputs'
import { validateSchema } from '@/utils/inputs'
import { isEqual } from 'lodash'
import { createContext, Dispatch, SetStateAction, useContext, useId } from 'react'

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

  setValue: Dispatch<SetStateAction<Context['value']>>
  setMessages: Dispatch<SetStateAction<Context['messages']>>
  setValid: Dispatch<SetStateAction<Context['valid']>>

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
  onValueChange: OnValueChangeCallback
  onMessagesChange: OnMessagesChangeCallback
  onValidityChange: OnValidityChangeCallback
}

// Field Provider Component
export default function Field({
  value,
  messages = [],
  valid,
  onValueChange,
  onMessagesChange,
  onValidityChange,
  children,
  ...schema
}: FieldProps) {
  schema = validateSchema(schema)

  const { name, label, required, instructions, defaultValue, readonly, disabled, width, options = {} } = schema

  const id = useId()

  const setValue = (newValue: SetStateAction<Context['value']>) => {
    if (onValueChange && !isEqual(value, newValue)) {
      onValueChange(typeof newValue === 'function' ? newValue(value) : newValue)
    }
  }

  const setMessages = (newMessages: SetStateAction<Context['messages']>) => {
    if (onMessagesChange && !isEqual(messages, newMessages)) {
      onMessagesChange(typeof newMessages === 'function' ? newMessages(messages) : newMessages)
    }
  }

  const setValid = (newValid: SetStateAction<Context['valid']>) => {
    if (onValidityChange && !isEqual(valid, newValid)) {
      onValidityChange(typeof newValid === 'function' ? newValid(valid) : newValid)
    }
  }

  const handleValidation = ({ isValid, value, messages }: InputValidationResponse) => {
    setValid(isValid)
    setMessages(messages)
    setValue(value)
  }

  const contextValue = {
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
    options,

    value,
    messages,
    valid,

    setValue,
    setMessages,
    setValid,

    handleValidation,
  }

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

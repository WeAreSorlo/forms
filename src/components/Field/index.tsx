import { FieldErrors } from '@/types/fields'
import { InputSchema, InputValidationResponse } from '@/types/inputs'
import { validateSchema } from '@/utils/inputs'
import {
  createContext,
  Dispatch,
  memo,
  SetStateAction,
  useCallback,
  useContext,
  useEffect,
  useId,
  useState,
} from 'react'

interface Context extends InputSchema {
  id: string
  schema: InputSchema
  valid: boolean | null
  errors: FieldErrors

  setValue: Dispatch<SetStateAction<Context['value']>>
  setValid: Dispatch<SetStateAction<Context['valid']>>
  setErrors: Dispatch<SetStateAction<Context['errors']>>

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
export type OnErrorsChangeCallback = (errors: Context['errors']) => void
export type OnValidityChangeCallback = (validity: Context['valid']) => void
export type OnSchemaChangeCallback = (schema: Omit<InputSchema, 'value'>) => void

export interface FieldProps extends InputSchema {
  children: React.ReactNode
  onValueChange?: OnValueChangeCallback
  onErrorsChange?: OnErrorsChangeCallback
  onValidityChange?: OnValidityChangeCallback
  onSchemaChange?: OnSchemaChangeCallback
  debug?: boolean
}

// Field Provider Component
const Field = memo(function Field({
  onValueChange,
  onErrorsChange,
  onValidityChange,
  onSchemaChange,
  children,
  debug = false,
  ...schema
}: FieldProps) {
  schema = validateSchema(schema)

  const { name, label, required, instructions, value: defaultValue, readonly, disabled, width, options } = schema

  const id = useId()
  const [value, setValue] = useState<Context['value']>(defaultValue)

  const [valid, setValid] = useState<Context['valid']>(null)
  const [errors, setErrors] = useState<Context['errors']>([])

  useEffect(() => {
    if (onValueChange) onValueChange(value)
  }, [value])

  useEffect(() => {
    if (onErrorsChange) onErrorsChange(errors)
  }, [errors])

  useEffect(() => {
    if (onValidityChange) onValidityChange(valid)
  }, [valid])

  useEffect(() => {
    if (onSchemaChange) onSchemaChange({ name, label, required, instructions, readonly, disabled, width, options })
  }, [name, label, required, instructions, readonly, disabled, width, options])

  const handleValidation = useCallback(
    ({ isValid, validatedValue, messages }: InputValidationResponse) => {
      setValid(isValid)
      setErrors(messages || [])
      setValue(validatedValue || null)
    },
    [setValid, setErrors, setValue],
  )

  return (
    <FieldContext.Provider
      value={{
        id,
        schema,
        name,
        label,
        required,
        value,
        instructions,
        readonly,
        disabled,
        width,
        options,
        valid,
        errors,

        setValue,
        setValid,
        setErrors,

        handleValidation,
      }}
    >
      <div style={{ width: width ? `${width}%` : '100%' }}>
        <div className='iight-field'>
          <div className='iight-meta'>
            {label && (
              <label className='iight-label' htmlFor={id}>
                {label}
                {required && <span>*</span>}
              </label>
            )}
            {instructions && <div className='iight-instructions'>{instructions}</div>}
          </div>
          {errors.length > 0 && (
            <ul className='iight-errors'>
              {errors.map((error, errorIndex) => {
                return <li key={errorIndex}>{error}</li>
              })}
            </ul>
          )}
          {children}
        </div>
      </div>
    </FieldContext.Provider>
  )
})

export default Field

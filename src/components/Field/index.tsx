import { FieldErrors } from '@/types/fields'
import { InputSchema, InputValidationResponse } from '@/types/inputs'
import { validateSchema } from '@/utils/inputs'
import { createContext, Dispatch, memo, SetStateAction, useCallback, useContext, useId, useMemo } from 'react'

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

export interface FieldProps extends InputSchema {
  children: React.ReactNode
  value?: any
  errors?: FieldErrors
  valid?: boolean
  onValueChange?: OnValueChangeCallback
  onErrorsChange?: OnErrorsChangeCallback
  onValidityChange?: OnValidityChangeCallback
}

// Field Provider Component
const Field = memo(function Field({
  value,
  errors = [],
  valid,
  onValueChange,
  onErrorsChange,
  onValidityChange,
  children,
  ...schema
}: FieldProps) {
  schema = validateSchema(schema)

  const { name, label, required, instructions, value: defaultValue, readonly, disabled, width, options } = schema

  const id = useId()

  const setValue = useCallback(
    (newValue: SetStateAction<Context['value']>) => {
      if (onValueChange) onValueChange(typeof newValue === 'function' ? newValue(value) : newValue)
    },
    [onValueChange, value],
  )

  const setErrors = useCallback(
    (newErrors: SetStateAction<Context['errors']>) => {
      if (onErrorsChange) onErrorsChange(typeof newErrors === 'function' ? newErrors(errors) : newErrors)
    },
    [onErrorsChange, errors],
  )

  const setValid = useCallback(
    (newValid: SetStateAction<Context['valid']>) => {
      if (onValidityChange) onValidityChange(typeof newValid === 'function' ? newValid(valid) : newValid)
    },
    [onValidityChange, valid],
  )

  const handleValidation = useCallback(
    ({ isValid, validatedValue, messages }: InputValidationResponse) => {
      setValid(isValid)
      setErrors(messages || [])
      setValue(validatedValue || null)
    },
    [setValid, setErrors, setValue],
  )

  const contextValue = useMemo(() => {
    return {
      id,
      schema,
      name,
      label,
      required,
      defaultValue,
      instructions,
      readonly,
      disabled,
      width,
      options,

      value,
      errors,
      valid,

      setValue,
      setErrors,
      setValid,

      handleValidation,
    }
  }, [
    id,
    schema,
    name,
    label,
    required,
    defaultValue,
    instructions,
    readonly,
    disabled,
    width,
    options,

    value,
    errors,
    valid,

    setValue,
    setErrors,
    setValid,

    handleValidation,
  ])

  return (
    <FieldContext.Provider value={contextValue}>
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

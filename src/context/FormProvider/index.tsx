import { FieldMessages, FieldSchema } from '@/types/fields'
import { Input } from '@/types/inputs'
import { Dispatch, SetStateAction, createContext, useContext, useMemo } from 'react'

// Data that changes as the form is used
export interface DataContext {
  schema: Array<FieldSchema>
  values: Record<string, any>
  messages: Record<string, any>
  validity: Record<string, boolean | undefined>
}

// Values with stable identities, so consumers that only need these are not
// re-rendered by every value change
export interface StaticContext {
  inputs: Record<string, Input>
  validationCounter: number

  setSchema: Dispatch<SetStateAction<DataContext['schema']>>
  setValues: Dispatch<SetStateAction<DataContext['values']>>
  setMessages: Dispatch<SetStateAction<DataContext['messages']>>
  setValidity: Dispatch<SetStateAction<DataContext['validity']>>
}

export type Context = DataContext & StaticContext

// The path of a field relative to the form's root, e.g. ['pets', 0, 'petname']
export type FieldPath = Array<string | number>

// A partial update of a field's state, where an undefined patch removes the
// field's entries entirely
export type FieldStatePatch = undefined | { messages?: FieldMessages; valid?: boolean | undefined }

// Report a field's messages and validity to the form's path keyed maps
export type FieldStateReport = (path: FieldPath, patch: FieldStatePatch) => void

// Create form Context
export const FormContext = createContext<undefined | DataContext>(undefined)
export const FormStaticContext = createContext<undefined | StaticContext>(undefined)
export const FieldReportContext = createContext<undefined | FieldStateReport>(undefined)

// Hook for consuming form context
export const useFormContext = (): Context => {
  const context = useContext(FormContext)
  const staticContext = useContext(FormStaticContext)

  const merged = useMemo(() => {
    if (!context || !staticContext) return undefined
    return { ...context, ...staticContext }
  }, [context, staticContext])

  if (!merged) {
    throw new Error('useFormContext must be used within a <FormProvider>')
  }

  return merged
}

// Hook for consuming static form context
export const useFormStaticContext = () => {
  const context = useContext(FormStaticContext)
  if (!context) {
    throw new Error('useFormStaticContext must be used within a <FormProvider>')
  }
  return context
}

import { FieldSchema } from '@/types/fields'
import { Input } from '@/types/inputs'
import { Dispatch, SetStateAction, createContext, useContext } from 'react'

export interface Context {
  schema: Array<FieldSchema>
  setSchema: Dispatch<SetStateAction<Context['schema']>>
  values: Record<string, any>
  setValues: Dispatch<SetStateAction<Context['values']>>
  messages: Record<string, any>
  setMessages: Dispatch<SetStateAction<Context['messages']>>
  validity: Record<string, boolean | undefined>
  setValidity: Dispatch<SetStateAction<Context['validity']>>

  // Static
  inputs: Record<string, Input>
}

// Context for values that rarely change, so consumers that only need these
// are not re-rendered by every value change
export interface StaticContext {
  inputs: Record<string, Input>
  validationCounter: number
}

// Create form Context
export const FormContext = createContext<undefined | Context>(undefined)
export const FormStaticContext = createContext<undefined | StaticContext>(undefined)

// Hook for consuming form context
export const useFormContext = () => {
  const context = useContext(FormContext)
  if (!context) {
    throw new Error('useFormContext must be used within a <FormProvider>')
  }
  return context
}

// Hook for consuming static form context
export const useFormStaticContext = () => {
  const context = useContext(FormStaticContext)
  if (!context) {
    throw new Error('useFormStaticContext must be used within a <FormProvider>')
  }
  return context
}

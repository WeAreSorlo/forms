import { FieldSchema } from '@/types/fields'
import { Input } from '@/types/inputs'
import { createContext, Dispatch, SetStateAction, useContext } from 'react'

export interface Context {
  schema: Array<FieldSchema>
  setSchema: Dispatch<SetStateAction<Context['schema']>>
  values: Record<string, any>
  setValues: Dispatch<SetStateAction<Context['values']>>
  messages: Record<string, any>
  setMessages: Dispatch<SetStateAction<Context['messages']>>
  validity: Record<string, boolean>
  setValidity: Dispatch<SetStateAction<Context['validity']>>

  // Static
  inputs: Record<string, Input>
}

// Create form Context
export const FormContext = createContext<undefined | Context>(undefined)

// Hook for consuming form context
export const useFormContext = () => {
  const context = useContext(FormContext)
  if (!context) {
    throw new Error('useFormContext must be used within a <FormProvider>')
  }
  return context
}

import { FieldSchema } from '@/types/fields'
import { Input } from '@/types/inputs'
import { createContext, Dispatch, SetStateAction, useContext, useEffect, useState } from 'react'

export interface Context {
  schema: Array<FieldSchema>
  setSchema: Dispatch<SetStateAction<Context['schema']>>
  values: Record<string, any>
  setValues: Dispatch<SetStateAction<Context['values']>>
  messages: Record<string, any>
  setMessages: Dispatch<SetStateAction<Context['messages']>>
  validity: Record<string, boolean>
  setValidity: Dispatch<SetStateAction<Context['validity']>>
  inputs: Record<string, Input>
  setInputs: Dispatch<SetStateAction<Context['inputs']>>
}

// Create form Context
const FormContext = createContext<undefined | Context>(undefined)

// Hook for consuming form context
export const useFormContext = () => {
  const context = useContext(FormContext)
  if (!context) {
    throw new Error('useFormContext must be used within a <FormProvider>')
  }
  return context
}

export interface FormProviderProps {
  schema: Context['schema']
  values?: Context['values']
  messages?: Context['messages']
  validity?: Context['validity']
  inputs?: Record<string, Input>
  children: React.ReactNode
}

export default function FormProvider({
  schema: defaultSchema,
  values: defaultValues,
  messages: defaultMessages,
  validity: defaultValidity,
  inputs: defaultInputs,
  children,
}: FormProviderProps) {
  const [schema, setSchema] = useState<Context['schema']>(defaultSchema || [])
  const [values, setValues] = useState<Context['values']>(defaultValues || {})
  const [messages, setMessages] = useState<Context['messages']>(defaultMessages || {})
  const [validity, setValidity] = useState<Context['validity']>(defaultValidity || {})
  const [inputs, setInputs] = useState<Context['inputs']>(defaultInputs || {})

  // Sync schema prop with local state
  useEffect(() => {
    setSchema(defaultSchema || [])
  }, [defaultSchema])

  // Sync values prop with local state
  useEffect(() => {
    setValues(defaultValues || {})
  }, [defaultValues])

  // Sync messages prop with local state
  useEffect(() => {
    setMessages(defaultMessages || {})
  }, [defaultMessages])

  // Sync validity prop with local state
  useEffect(() => {
    setValidity(defaultValidity || {})
  }, [defaultValidity])

  // Sync inputs prop with local state
  useEffect(() => {
    setInputs(defaultInputs || {})
  }, [defaultInputs])

  return (
    <FormContext.Provider
      value={{
        schema,
        setSchema,
        values,
        setValues,
        messages,
        setMessages,
        validity,
        setValidity,
        inputs,
        setInputs,
      }}
    >
      {children}
    </FormContext.Provider>
  )
}

import Fieldset from '@/components/Fieldset'
import FormProvider, { Context, useFormContext } from '@/context/FormProvider'
import TranslationProvider from '@/context/TranslationProvider'
import * as coreInputs from '@/inputs'
import { Input } from '@/types/inputs'
import { useEffect, useMemo } from 'react'

export interface FormProps {
  schema: Context['schema']
  values?: Context['values']
  errors?: Context['errors']
  inputs?: Record<string, Input>
  onChange?: (values: Record<string, any>) => void
}

function FormInner({ onChange }: { onChange?: (values: Record<string, any>) => void }) {
  const { schema, values, inputs, setValues, setErrors } = useFormContext()

  useEffect(() => {
    if (onChange) onChange(values)
  }, [values, onChange])

  return (
    <form className='iight-form'>
      <Fieldset schema={schema} inputs={inputs} onValuesChange={setValues} onErrorsChange={setErrors} />
    </form>
  )
}

export default function Form({
  schema: defaultSchema,
  values: defaultValues,
  errors: defaultErrors,
  inputs: defaultInputs,
  onChange,
}: FormProps) {
  // Merge internal inputs with user defined
  const mergedInputs = useMemo(() => {
    return {
      ...coreInputs,
      ...(defaultInputs || {}),
    }
  }, [coreInputs, defaultInputs])

  return (
    <TranslationProvider>
      <FormProvider schema={defaultSchema} values={defaultValues} errors={defaultErrors} inputs={mergedInputs}>
        <FormInner onChange={onChange} />
      </FormProvider>
    </TranslationProvider>
  )
}

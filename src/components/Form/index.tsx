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
  const { inputs, schema, values, errors, validity, setValues, setErrors, setValidity } = useFormContext()

  useEffect(() => {
    if (onChange) onChange(values)
  }, [values, onChange])

  return (
    <form className='iight-form'>
      <Fieldset
        inputs={inputs}
        schema={schema}
        values={values}
        errors={errors}
        validity={validity}
        onValuesChange={(field, value) => {
          setValues((old) => ({ ...old, [field]: value }))
        }}
        onErrorsChange={(field, errors) => {
          setErrors((old) => ({ ...old, [field]: errors }))
        }}
        onValidityChange={(field, validity) => {
          setValidity((old) => ({ ...old, [field]: validity }))
        }}
      />
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

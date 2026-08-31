import { useFieldContext } from '@/components/Field'
import {
  InputCategory,
  InputComponent,
  InputCoreFields,
  InputDescription,
  InputFormatValue,
  InputName,
  InputOptionFields,
  InputPickValue,
  InputRenderValue,
} from '@/types/inputs'
import { useEffect } from 'react'

export const name: InputName = () => 'Hidden'

export const description: InputDescription = () => 'An invisible field that carries a fixed value into the form.'

export const category: InputCategory = () => 'Standard'

export const coreFields: InputCoreFields = (defaultFields) => {
  return defaultFields.filter(({ name }) => ['name', 'conditions'].includes(name))
}

export const optionFields: InputOptionFields = () => {
  return [
    {
      name: 'value',
      label: 'Value',
      type: 'text',
      required: false,
    },
  ]
}

// The schema's fixed value always wins over a posted value
export const pickValue: InputPickValue = (value, schema) => {
  return schema.options?.value ?? value
}

export const formatValue: InputFormatValue = (value) => {
  return value === undefined || value === null ? null : String(value)
}

export const renderValue: InputRenderValue = (value, schema) => {
  return <>{formatValue(value, schema)}</>
}

const Component: InputComponent = function () {
  const { id, options, value, setValue } = useFieldContext()

  // The schema's value option wins when nothing has been committed yet
  const fixedValue = value !== undefined ? value : options?.value

  // Commit the fixed value so it is included in the form's values
  useEffect(() => {
    if (fixedValue !== undefined) setValue(fixedValue)
  }, [fixedValue, setValue])

  return <input className='iight-input' id={id} type='hidden' value={fixedValue ?? ''} readOnly />
}

export default Component

import { useFieldContext } from '@/components/Field'
import Fieldset, { OnValuesChangeCallback } from '@/components/Fieldset'
import { FieldSchema } from '@/types/fields'
import {
  InputCategory,
  InputComponent,
  InputDescription,
  InputFormatValue,
  InputName,
  InputOptionFields,
  InputRenderValue,
  InputValidateValue,
} from '@/types/inputs'
import { validateSchema } from '@/utils/inputs'
import { validationSuccess } from '@/utils/validation'
import { useCallback, useMemo } from 'react'

type Column = Record<string, any>
type Row = Array<Column>
type Matrix = Array<Row>

export const name: InputName = () => 'Repeater'

export const description: InputDescription = () => 'Allows a set of fields to be repeated vertically OR horizontally.'

export const category: InputCategory = () => 'Layout'

export const optionFields: InputOptionFields = () => {
  return [
    {
      label: 'Fields',
      name: 'fields',
      type: 'schemabuilder',
    },
    {
      label: 'Minimum',
      name: 'minimum',
      type: 'number',
      required: false,
      defaultValue: 1,
      width: 50,
      options: {
        min: 0,
      },
    },
    {
      label: 'Maximum',
      name: 'maximum',
      type: 'number',
      required: false,
      width: 50,
      options: {
        min: 0,
      },
    },
    {
      label: 'Repeat direction',
      name: 'direction',
      type: 'select',
      options: {
        choices: [
          {
            value: 'y',
            label: 'Vertically',
          },
          {
            value: 'x',
            label: 'Horizontally',
          },
        ],
      },
    },
  ]
}

export const validateValue: InputValidateValue = (value, schema) => {
  schema = validateSchema(schema)
  return validationSuccess(value)
}

export const formatValue: InputFormatValue = (value, schema) => {
  schema = validateSchema(schema)
  const validation = validateValue(value, schema)
  return validation.isValid ? JSON.stringify(validation.value, null, 2) : null
}

export const renderValue: InputRenderValue = (value, schema) => {
  return <>{formatValue(value, schema)}</>
}

const Component: InputComponent = function () {
  const { options, value, setValue } = useFieldContext()

  const isHorizontal = options?.direction === 'x'

  // A repeater is a matrix locked to a single column or a single row
  const matrixSchema: Array<FieldSchema> = useMemo(() => {
    const minimum = options?.minimum ?? 0
    const maximum = options?.maximum ?? null

    return [
      {
        name: 'value',
        type: 'matrix',
        options: {
          fields: options?.fields || [],
          minimumRows: isHorizontal ? 1 : minimum,
          maximumRows: isHorizontal ? 1 : maximum,
          minimumColumns: isHorizontal ? minimum : 1,
          maximumColumns: isHorizontal ? maximum : 1,
        },
      },
    ]
  }, [options?.fields, options?.minimum, options?.maximum, isHorizontal])

  // Convert the repeated items to and from the matrix format
  const matrixValues = useMemo(() => {
    const items: Row = Array.isArray(value) ? value : []
    const matrixValue: Matrix = isHorizontal ? [items] : items.map((item) => [item])
    return { value: matrixValue }
  }, [value, isHorizontal])

  const onValuesChange: OnValuesChangeCallback = useCallback(
    (field, matrixValue: Matrix) => {
      setValue(isHorizontal ? matrixValue[0] || [] : matrixValue.map((row) => row[0]))
    },
    [setValue, isHorizontal],
  )

  return <Fieldset schema={matrixSchema} values={matrixValues} onValuesChange={onValuesChange} />
}

export default Component

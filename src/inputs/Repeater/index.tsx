import { useFieldContext } from '@/components/Field'
import Fieldset from '@/components/Fieldset'
import { useFormContext } from '@/context/FormProvider'
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
import { useMemo } from 'react'

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
  const { inputs } = useFormContext()
  const { id, schema, required, readonly, disabled, options, value, setValue, handleValidation } = useFieldContext()

  const { minimumRows, maximumRows, minimumCols, maximumCols } = useMemo(() => {
    const isHorizontal = options?.direction === 'x'
    return {
      minimumRows: isHorizontal ? 1 : 0,
      maximumRows: isHorizontal ? 1 : null,
      minimumCols: isHorizontal ? 0 : 1,
      maximumCols: isHorizontal ? null : 1,
    }
  }, [options?.direction])

  const matrixSchema: Array<FieldSchema> = useMemo(() => {
    return [
      {
        name: 'value',
        type: 'matrix',
        fields: options?.fields || [],
        value: value ? [value] : [],
        options: { minimumRows, maximumRows, minimumCols, maximumCols },
      },
    ]
  }, [schema, options?.fields, value, minimumRows, maximumRows, minimumCols, maximumCols])

  return (
    <>
      <pre>
        <code>{JSON.stringify({ minimumRows, maximumRows, minimumCols, maximumCols }, null, 2)}</code>
      </pre>
      <Fieldset
        schema={matrixSchema}
        inputs={inputs}
        onValuesChange={(columnFieldName, columnFieldValue) => {
          setValue(columnFieldValue[0])
        }}
      />
    </>
  )
}

export default Component

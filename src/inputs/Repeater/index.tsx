import { useFieldContext } from '@/components/Field'
import Fieldset, { OnValidityChangeCallback, OnValuesChangeCallback } from '@/components/Fieldset'
import { FieldReportContext, FieldStateReport } from '@/context/FormProvider'
import i18n from '@/i18n'
import { FieldSchema } from '@/types/fields'
import {
  InputCategory,
  InputComponent,
  InputDescription,
  InputFormatValue,
  InputName,
  InputOptionFields,
  InputRenderValue,
  InputValidateChildren,
  InputValidateValue,
} from '@/types/inputs'
import { validateSchema } from '@/utils/inputs'
import { isEmptyValue, validationError, validationSuccess } from '@/utils/validation'
import { useCallback, useContext, useEffect, useMemo, useState } from 'react'

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

  // Return early if the value is empty and the field is optional
  if (!schema.required && isEmptyValue(value)) {
    return validationSuccess(value)
  }

  // Check for an empty value
  if (schema.required && isEmptyValue(value)) {
    return validationError(value, i18n.t('validation.required'))
  }

  if (!Array.isArray(value)) {
    return validationError(value, i18n.t('validation.invalid'))
  }

  // Validate the minimum number of items
  const min = schema.options?.minimum
  if (typeof min === 'number' && value.length < min) {
    return validationError(value, i18n.t('validation.minItems', { min }))
  }

  // Validate the maximum number of items
  const max = schema.options?.maximum
  if (typeof max === 'number' && value.length > max) {
    return validationError(value, i18n.t('validation.maxItems', { max }))
  }

  return validationSuccess(value)
}

// Validate the nested fields against every repeated item
export const validateChildren: InputValidateChildren = (value, schema, validateFields) => {
  const items: Row = Array.isArray(value) ? value : []
  return items.map((item) => validateFields(schema.options?.fields || [], item || {}))
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
  const { schema, options, value, setValue, setMessages, setValid } = useFieldContext()

  const [childValid, setChildValid] = useState<boolean | undefined>(undefined)

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

  // Convert the repeated items to and from the matrix format, leaving an
  // unset value unset so the matrix can seed its own minimum rows
  const matrixValues = useMemo(() => {
    if (value === undefined) return {}
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

  const onValidityChange: OnValidityChangeCallback = useCallback((field, valid) => {
    setChildValid(valid)
  }, [])

  // Rewrite the internal matrix's report paths so nested fields appear as
  // e.g. 'pets.0.petname' rather than 'pets.value.0.0.petname'
  const parentReport = useContext(FieldReportContext)

  const childReport = useMemo<FieldStateReport | undefined>(() => {
    if (!parentReport) return undefined

    const report: FieldStateReport = (path, patch) => {
      const [name, row, column, ...rest] = path

      // Anything not from the internal matrix passes through untouched
      if (name !== 'value') return parentReport(path, patch)

      // The matrix's own state is already reported by the repeater itself
      if (rest.length === 0) return

      const index = isHorizontal ? column : row
      parentReport([index, ...rest], patch)
    }

    return report
  }, [parentReport, isHorizontal])

  // Validate the item bounds and aggregate the nested matrix's validity
  const validation = useMemo(() => (value !== undefined ? validateValue(value, schema) : null), [value, schema])

  useEffect(() => {
    if (!validation) return

    setMessages(validation.messages)

    if (validation.isValid === false || childValid === false) {
      setValid(false)
    } else if (validation.isValid === true) {
      setValid(true)
    }
  }, [validation, childValid, setMessages, setValid])

  return (
    <FieldReportContext.Provider value={childReport}>
      <Fieldset
        schema={matrixSchema}
        values={matrixValues}
        onValuesChange={onValuesChange}
        onValidityChange={onValidityChange}
      />
    </FieldReportContext.Provider>
  )
}

export default Component

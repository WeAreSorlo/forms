import { useFieldContext } from '@/components/Field'
import Fieldset from '@/components/Fieldset'
import { useFormContext } from '@/context/FormProvider'
import {
  InputCategory,
  InputComponent,
  InputDescription,
  InputFormatValue,
  InputName,
  InputRenderValue,
  InputSchemaFields,
  InputValidateValue,
} from '@/types/inputs'
import { baseInputSchemaFields, validateSchema } from '@/utils/inputs'
import { validationSuccess } from '@/utils/validation'
import { useCallback, useMemo } from 'react'

type Column = Record<string, any>
type Row = Array<Column>
type Matrix = Array<Row>

export const name: InputName = () => 'Repeater'

export const description: InputDescription = () => 'Allows a set of fields to be repeated vertically or horizontally.'

export const category: InputCategory = () => 'Layout'

export const schemaFields: InputSchemaFields = () => {
  return [
    ...baseInputSchemaFields(),
    {
      label: 'Fields',
      name: 'fields',
      type: 'schemabuilder',
    },
    {
      label: 'Minimum rows',
      name: 'minimumRows',
      type: 'number',
      required: false,
      defaultValue: 1,
      min: 1,
      width: 50,
    },
    {
      label: 'Maximum rows',
      name: 'maximumRows',
      type: 'number',
      required: false,
      min: 1,
      width: 50,
    },
    {
      label: 'Minimum columns',
      name: 'minimumColumns',
      type: 'number',
      required: false,
      defaultValue: 1,
      min: 1,
      width: 50,
    },
    {
      label: 'Maximum columns',
      name: 'maximumColumns',
      type: 'number',
      required: false,
      defaultValue: 1,
      min: 1,
      width: 50,
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

  const fields = useMemo(() => {
    return options.fields || []
  }, [options.fields])

  const maxRows = useMemo(() => {
    const value = options?.maximumRows ? Number(options?.maximumRows) : null
    if (value !== null && !isNaN(value) && isFinite(value)) {
      return value
    }

    return Number.MAX_SAFE_INTEGER
  }, [options])

  const maxColumns = useMemo(() => {
    const value = options?.maximumColumns ? Number(options?.maximumColumns) : null
    if (value !== null && !isNaN(value) && isFinite(value)) {
      return value
    }

    return Number.MAX_SAFE_INTEGER
  }, [options])

  const minRows = useMemo(() => {
    const value = options?.minimumRows ? Number(options?.minimumRows) : null
    if (value !== null && !isNaN(value) && isFinite(value) && value > 0) {
      return value
    }

    return 0
  }, [options])

  const minColumns = useMemo(() => {
    const value = options?.minimumColumns ? Number(options?.minimumColumns) : null
    if (value !== null && !isNaN(value) && isFinite(value) && value > 0) {
      return value
    }

    return 0
  }, [options])

  const totalRows = useMemo(() => value?.length || 0, [value])
  const totalColumns = useMemo(() => value?.[0]?.length || 0, [value])

  const canAddRow = totalRows < maxRows
  const canAddColumn = totalColumns < maxColumns
  const canRemoveRow = totalRows > minRows
  const canRemoveColumn = totalColumns > minColumns

  const validateMatrix = useCallback(
    (matrix: Matrix) => {
      let newMatrix = matrix

      // Enforce minimum rows
      while (newMatrix.length < minRows) {
        newMatrix.push([])
      }

      // Enforce maximum rows
      if (newMatrix.length > maxRows) {
        newMatrix.splice(0, maxRows)
      }

      return newMatrix.map((row, rowIndex, rows) => {
        let lastColumnCount = rows[rowIndex - 1]?.length

        let newRow = row

        // Enforce minimum columns
        while (newRow.length < minColumns || (lastColumnCount !== undefined && newRow.length < lastColumnCount)) {
          newRow.push([])
        }

        // Enforce maximum columns
        if (newRow.length > maxColumns) {
          newRow.splice(0, maxColumns)
        }

        return newRow.map((column, columnIndex, columns) => {
          const newColumn = fields.map((field) => {
            let value = field.value ?? null
            if (typeof column === 'object' && column.hasOwnProperty(field.name)) {
              value = column[field.name]
            }

            return [field.name, value]
          })

          return Object.fromEntries(newColumn)
        })
      })
    },
    [fields, minRows, maxRows, minColumns, maxColumns],
  )

  const addRow = useCallback(
    (row: Row = []) => {
      setValue((oldValue) => {
        let newValue = oldValue

        // Ensure the old value was an array
        if (!Array.isArray(newValue)) {
          newValue = []
        }

        return validateMatrix([...newValue, row])
      })
    },
    [setValue],
  )
  const addColumn = useCallback(
    (columns: Array<Column> = []) => {
      setValue((oldValue: Matrix) => {
        let newValue = oldValue

        // Ensure the old value is an array
        if (!Array.isArray(newValue)) {
          newValue = []
        }

        newValue = newValue.map((row, rowIndex) => {
          let newRow = row

          // Ensure the old row is an array
          if (!Array.isArray(newRow)) {
            newRow = []
          }

          // Add new column
          return [...newRow, columns[rowIndex] || []]
        })

        return validateMatrix(newValue)
      })
    },
    [setValue],
  )

  const removeRow = useCallback(
    (index: number) => {
      setValue((oldValue) => {
        let newValue = [...oldValue]

        // Ensure the old value is an array
        if (!Array.isArray(newValue)) {
          newValue = []
        }

        return newValue.toSpliced(index, 1)
      })
    },
    [setValue],
  )

  const removeColumn = useCallback(
    (index: number) => {
      setValue((oldValue) => {
        let newValue = [...oldValue]

        // Ensure the old value is an array
        if (!Array.isArray(newValue)) {
          newValue = []
        }

        return newValue.map((row) => {
          return row.toSpliced(index, 1)
        })
      })
    },
    [setValue],
  )

  const doValidation = useCallback(
    (input: any) => {
      handleValidation(validateValue(input, schema))
    },
    [handleValidation, validateValue],
  )

  const setColumnValue = useCallback(
    (row: number, column: number, columnFieldName: string, columnFieldValue: any) => {
      setValue((oldValue) => {
        let newValue = [...oldValue]

        if (typeof newValue[row][column][columnFieldName] !== undefined) {
          newValue[row][column][columnFieldName] = columnFieldValue
        }

        return newValue
      })
    },
    [setValue],
  )

  const generateColumnSchema = useCallback(
    (columnValue: Column) => {
      return fields.map((field) => {
        const newField = structuredClone(field)
        newField.value = columnValue?.[newField.name] ?? newField.value
        return newField
      })
    },
    [fields, value],
  )

  return (
    <div className='iight-input__repeater'>
      <table>
        <thead>
          <tr>
            <td></td>
            {(value?.[0] || []).map((column, columnIndex) => {
              return (
                <th key={columnIndex}>
                  <span>{columnIndex + 1}</span>
                  <button
                    type='button'
                    onClick={(event) => {
                      event.preventDefault()
                      removeColumn(columnIndex)
                    }}
                  >
                    Remove column
                  </button>
                </th>
              )
            })}
            <td></td>
          </tr>
        </thead>
        <tbody>
          {canAddColumn && (
            <tr>
              <td></td>
              {(value?.[0] || []).map((column, columnIndex) => {
                return <td key={columnIndex}></td>
              })}
              <td rowSpan={totalRows + 1}>
                <button
                  type='button'
                  onClick={(event) => {
                    event.preventDefault()
                    addColumn()
                  }}
                >
                  Add column
                </button>
              </td>
            </tr>
          )}
          {(value || []).map((row, rowIndex) => {
            return (
              <tr key={rowIndex}>
                <th>
                  {rowIndex + 1}
                  <button
                    type='button'
                    onClick={(event) => {
                      event.preventDefault()
                      removeRow(rowIndex)
                    }}
                  >
                    Remove row
                  </button>
                </th>
                {row.map((column, columnIndex) => {
                  return (
                    <td key={columnIndex}>
                      <Fieldset
                        schema={generateColumnSchema(column)}
                        inputs={inputs}
                        onValuesChange={(columnFieldName, columnFieldValue) => {
                          setColumnValue(rowIndex, columnIndex, columnFieldName, columnFieldValue)
                        }}
                      />
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
        <tfoot>
          {canAddRow && (
            <tr>
              <td colSpan={totalColumns + 2}>
                <button
                  type='button'
                  onClick={(event) => {
                    event.preventDefault()
                    addRow()
                  }}
                >
                  Add row
                </button>
              </td>
            </tr>
          )}
        </tfoot>
      </table>
      <pre>{JSON.stringify(options, null, 2)}</pre>
    </div>
  )
}

export default Component

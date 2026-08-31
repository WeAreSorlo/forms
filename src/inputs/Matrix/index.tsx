import { useFieldContext } from '@/components/Field'
import Fieldset from '@/components/Fieldset'
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
import { useTranslation } from 'react-i18next'

type Column = Record<string, any>
type Row = Array<Column>
type Matrix = Array<Row>

export const name: InputName = () => 'Matrix'

export const description: InputDescription = () =>
  'Allows a set of fields to be repeated vertically AND horizontally like a table.'

export const category: InputCategory = () => 'Layout'

export const optionFields: InputOptionFields = () => {
  return [
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
      width: 50,
      options: {
        min: 0,
      },
    },
    {
      label: 'Maximum rows',
      name: 'maximumRows',
      type: 'number',
      required: false,
      width: 50,
      options: {
        min: 0,
      },
    },
    {
      label: 'Minimum columns',
      name: 'minimumColumns',
      type: 'number',
      required: false,
      defaultValue: 1,
      width: 50,
      options: {
        min: 0,
      },
    },
    {
      label: 'Maximum columns',
      name: 'maximumColumns',
      type: 'number',
      required: false,
      defaultValue: 1,
      width: 50,
      options: {
        min: 0,
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
  const { t } = useTranslation()
  const { options, value, setValue } = useFieldContext()

  const fields = useMemo(() => {
    return options?.fields || []
  }, [options?.fields])

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

  const totalRows = useMemo(() => Number(value?.length) || 0, [value])
  const totalColumns = useMemo(() => Number(value?.[0]?.length) || 0, [value])

  const canAddRow = totalRows < maxRows
  const canAddColumn = totalColumns < maxColumns
  const canRemoveRow = totalRows > minRows
  const canRemoveColumn = totalColumns > minColumns

  // Normalise a matrix without mutating the old value, enforcing the row and
  // column limits and filling each column with the fields' default values
  const validateMatrix = useCallback(
    (matrix: Matrix): Matrix => {
      let newMatrix = [...matrix]

      // Enforce minimum rows
      while (newMatrix.length < minRows) {
        newMatrix.push([])
      }

      // Enforce maximum rows, dropping the rows beyond the limit
      if (newMatrix.length > maxRows) {
        newMatrix = newMatrix.slice(0, maxRows)
      }

      // Keep the matrix rectangular by matching each row's column count to the previous row
      let lastColumnCount: undefined | number = undefined

      return newMatrix.map((row) => {
        let newRow: Row = Array.isArray(row) ? [...row] : []

        // Enforce minimum columns
        while (newRow.length < minColumns || (lastColumnCount !== undefined && newRow.length < lastColumnCount)) {
          newRow.push({})
        }

        // Enforce maximum columns, dropping the columns beyond the limit
        if (newRow.length > maxColumns) {
          newRow = newRow.slice(0, maxColumns)
        }

        lastColumnCount = newRow.length

        return newRow.map((column) => {
          const newColumn = fields.map((field: Column) => {
            let value = field.defaultValue ?? null
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
      setValue((oldValue: Matrix) => {
        // Ensure the old value was an array
        if (!Array.isArray(oldValue)) {
          oldValue = []
        }

        return validateMatrix([...oldValue, row])
      })
    },
    [setValue, validateMatrix],
  )

  const addColumn = useCallback(
    (columns: Array<Column> = []) => {
      setValue((oldValue: Matrix) => {
        // Ensure the old value was an array
        if (!Array.isArray(oldValue)) {
          oldValue = []
        }

        const newValue = oldValue.map((row, rowIndex) => {
          // Ensure the old row was an array
          const newRow = Array.isArray(row) ? row : []

          // Add new column
          return [...newRow, columns[rowIndex] || {}]
        })

        return validateMatrix(newValue)
      })
    },
    [setValue, validateMatrix],
  )

  const removeRow = useCallback(
    (index: number) => {
      setValue((oldValue: Matrix) => {
        // Ensure the old value was an array
        if (!Array.isArray(oldValue)) {
          return []
        }

        return oldValue.toSpliced(index, 1)
      })
    },
    [setValue],
  )

  const removeColumn = useCallback(
    (index: number) => {
      setValue((oldValue: Matrix) => {
        // Ensure the old value was an array
        if (!Array.isArray(oldValue)) {
          return []
        }

        return oldValue.map((row) => {
          return Array.isArray(row) ? row.toSpliced(index, 1) : row
        })
      })
    },
    [setValue],
  )

  const setColumnValue = useCallback(
    (row: number, column: number, columnFieldName: string, columnFieldValue: any) => {
      setValue((oldValue: Matrix) => {
        // Ensure the old value was an array
        if (!Array.isArray(oldValue)) {
          return oldValue
        }

        return oldValue.map((oldRow, rowIndex) => {
          if (rowIndex !== row) return oldRow

          return oldRow.map((oldColumn, columnIndex) => {
            if (columnIndex !== column) return oldColumn

            return { ...oldColumn, [columnFieldName]: columnFieldValue }
          })
        })
      })
    },
    [setValue],
  )

  return (
    <div className='iight-input__matrix'>
      <table>
        <thead>
          <tr>
            <td></td>
            {(value?.[0] || []).map((column: Column, columnIndex: number) => {
              return (
                <th key={columnIndex}>
                  <span>{columnIndex + 1}</span>
                  {canRemoveColumn && (
                    <button
                      type='button'
                      onClick={(event) => {
                        event.preventDefault()
                        removeColumn(columnIndex)
                      }}
                    >
                      {t('ui.removeColumn')}
                    </button>
                  )}
                </th>
              )
            })}
            <td></td>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td></td>
            {(value?.[0] || []).map((column: Column, columnIndex: number) => {
              return <td key={columnIndex}></td>
            })}
            <td rowSpan={totalRows + 1}>
              {canAddColumn && totalRows > 0 && (
                <button
                  type='button'
                  onClick={(event) => {
                    event.preventDefault()
                    addColumn()
                  }}
                >
                  {t('ui.addColumn')}
                </button>
              )}
            </td>
          </tr>
          {(value || []).map((row: Row, rowIndex: number) => {
            return (
              <tr key={rowIndex}>
                <th>
                  {rowIndex + 1}
                  {canRemoveRow && (
                    <button
                      type='button'
                      onClick={(event) => {
                        event.preventDefault()
                        removeRow(rowIndex)
                      }}
                    >
                      {t('ui.removeRow')}
                    </button>
                  )}
                </th>
                {row.map((column, columnIndex) => {
                  return (
                    <td key={columnIndex}>
                      <Fieldset
                        schema={fields}
                        values={column}
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
                  {t('ui.addRow')}
                </button>
              </td>
            </tr>
          )}
        </tfoot>
      </table>
    </div>
  )
}

export default Component

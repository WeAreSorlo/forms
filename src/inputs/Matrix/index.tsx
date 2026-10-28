import { useFieldContext } from '@/components/Field'
import Fieldset, {
  OnMessagesChangeCallback,
  OnValidityChangeCallback,
  OnValuesChangeCallback,
} from '@/components/Fieldset'
import {
  FieldReportContext,
  FieldReportContextValue,
  FieldScopeContext,
  useFormStaticContext,
} from '@/context/FormProvider'
import { FieldMessages, FieldSchema } from '@/types/fields'
import {
  InputCategory,
  InputComponent,
  InputDescription,
  InputFormatValue,
  InputName,
  InputOptionFields,
  InputPickValue,
  InputRenderValue,
  InputTypeValue,
  InputValidateChildren,
  InputValidateValue,
} from '@/types/inputs'
import { conditionScope, validateSchema } from '@/utils/inputs'
import { validationMessage } from '@/utils/messages'
import { isEmptyValue, validationError, validationSuccess } from '@/utils/validation'
import { useCallback, useContext, useEffect, useMemo, useState } from 'react'
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

  // Return early if the value is empty and the field is optional
  if (!schema.required && isEmptyValue(value)) {
    return validationSuccess(value)
  }

  // Check for an empty value
  if (schema.required && isEmptyValue(value)) {
    return validationError(value, validationMessage(schema, 'required'))
  }

  if (!Array.isArray(value) || value.some((row) => !Array.isArray(row))) {
    return validationError(value, validationMessage(schema, 'invalid'))
  }

  // Validate the minimum and maximum number of rows
  const minRows = schema.options?.minimumRows
  if (typeof minRows === 'number' && value.length < minRows) {
    return validationError(value, validationMessage(schema, 'minRows', { min: minRows }))
  }

  const maxRows = schema.options?.maximumRows
  if (typeof maxRows === 'number' && value.length > maxRows) {
    return validationError(value, validationMessage(schema, 'maxRows', { max: maxRows }))
  }

  // Validate the minimum and maximum number of columns
  const columns = value[0]?.length || 0

  const minColumns = schema.options?.minimumColumns
  if (typeof minColumns === 'number' && value.length >= 1 && columns < minColumns) {
    return validationError(value, validationMessage(schema, 'minColumns', { min: minColumns }))
  }

  const maxColumns = schema.options?.maximumColumns
  if (typeof maxColumns === 'number' && columns > maxColumns) {
    return validationError(value, validationMessage(schema, 'maxColumns', { max: maxColumns }))
  }

  return validationSuccess(value)
}

// Validate the nested fields against every column of every row
export const validateChildren: InputValidateChildren = (value, schema, validateFields) => {
  const rows: Matrix = Array.isArray(value) ? value : []
  return rows.map((row) => {
    return (Array.isArray(row) ? row : []).map((column) => validateFields(schema.options?.fields || [], column || {}))
  })
}

// Pick only the nested fields' values for every column of every row
export const pickValue: InputPickValue = (value, schema, pickFields) => {
  if (!Array.isArray(value)) return undefined
  return value.map((row) => {
    return (Array.isArray(row) ? row : []).map((column) => pickFields(schema.options?.fields || [], column || {}))
  })
}

// Type every column of every row as an object of the nested fields
export const typeValue: InputTypeValue = (schema, typeFields) => {
  return `Array<Array<${typeFields(schema.options?.fields || [])}>>`
}

export const formatValue: InputFormatValue = (value, schema) => {
  schema = validateSchema(schema)
  const validation = validateValue(value, schema)
  return validation.isValid ? JSON.stringify(validation.value, null, 2) : null
}

export const renderValue: InputRenderValue = (value, schema) => {
  return <>{formatValue(value, schema)}</>
}

// A single cell of the matrix, nesting its fields' reports under the cell's
// row and column indexes
function MatrixCell({
  rowIndex,
  columnIndex,
  fields,
  column,
  messages,
  validity,
  setColumnValue,
  setColumnMessages,
  setColumnValidity,
}: {
  rowIndex: number
  columnIndex: number
  fields: Array<FieldSchema>
  column: Column
  messages?: Record<string, FieldMessages>
  validity?: Record<string, boolean | undefined>
  setColumnValue: (row: number, column: number, field: string, value: any) => void
  setColumnMessages: (row: number, column: number, field: string, messages: FieldMessages) => void
  setColumnValidity: (row: number, column: number, field: string, valid: boolean | undefined) => void
}) {
  const parentReport = useContext(FieldReportContext)

  const cellReport = useMemo<FieldReportContextValue | undefined>(() => {
    if (!parentReport) return undefined
    return {
      report: (path, patch) => parentReport.report([rowIndex, columnIndex, ...path], patch),
      resolve: (path) => parentReport.resolve([rowIndex, columnIndex, ...path]),
    }
  }, [parentReport, rowIndex, columnIndex])

  // Extend the condition scopes with the cell's own values
  const { inputs } = useFormStaticContext()
  const parentScopes = useContext(FieldScopeContext)
  const scopes = useMemo(() => {
    return [...(parentScopes || []), conditionScope(fields, column || {}, inputs)]
  }, [parentScopes, fields, column, inputs])

  const onValuesChange: OnValuesChangeCallback = useCallback(
    (field, fieldValue) => {
      setColumnValue(rowIndex, columnIndex, field, fieldValue)
    },
    [setColumnValue, rowIndex, columnIndex],
  )

  const onMessagesChange: OnMessagesChangeCallback = useCallback(
    (field, fieldMessages) => {
      setColumnMessages(rowIndex, columnIndex, field, fieldMessages)
    },
    [setColumnMessages, rowIndex, columnIndex],
  )

  const onValidityChange: OnValidityChangeCallback = useCallback(
    (field, fieldValid) => {
      setColumnValidity(rowIndex, columnIndex, field, fieldValid)
    },
    [setColumnValidity, rowIndex, columnIndex],
  )

  return (
    <FieldReportContext.Provider value={cellReport}>
      <FieldScopeContext.Provider value={scopes}>
        <Fieldset
          schema={fields}
          values={column}
          messages={messages}
          validity={validity}
          onValuesChange={onValuesChange}
          onMessagesChange={onMessagesChange}
          onValidityChange={onValidityChange}
        />
      </FieldScopeContext.Provider>
    </FieldReportContext.Provider>
  )
}

const Component: InputComponent = function () {
  const { t } = useTranslation()
  const { schema, options, value, setValue, setMessages, setValid } = useFieldContext()

  const [cellMessages, setCellMessages] = useState<Record<string, Record<string, FieldMessages>>>({})
  const [cellValidity, setCellValidity] = useState<Record<string, Record<string, boolean | undefined>>>({})

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
            // Leave fields without a default unset, as a new flexible block does, so inputs fall back to empty
            let value = field.defaultValue
            if (typeof column === 'object' && column.hasOwnProperty(field.name)) {
              value = column[field.name]
            }

            return [field.name, value]
          })

          // Keep the cell's other values, such as a choice's nested choices, which no field here shows
          return { ...(typeof column === 'object' ? column : {}), ...Object.fromEntries(newColumn) }
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
      // Positions shift when a row is removed, so reset the cell feedback
      setCellMessages({})
      setCellValidity({})

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
      // Positions shift when a column is removed, so reset the cell feedback
      setCellMessages({})
      setCellValidity({})

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

  const setColumnMessages = useCallback((row: number, column: number, field: string, messages: FieldMessages) => {
    setCellMessages((old) => {
      const key = `${row}-${column}`
      return { ...old, [key]: { ...old[key], [field]: messages } }
    })
  }, [])

  const setColumnValidity = useCallback((row: number, column: number, field: string, valid: boolean | undefined) => {
    setCellValidity((old) => {
      const key = `${row}-${column}`
      return { ...old, [key]: { ...old[key], [field]: valid } }
    })
  }, [])

  // Seed the minimum number of rows when there is no value yet
  useEffect(() => {
    if (value === undefined && minRows >= 1) {
      setValue(validateMatrix([]))
    }
  }, [value, minRows, setValue, validateMatrix])

  // Validate the matrix bounds and aggregate the validity of every cell
  const validation = useMemo(() => (value !== undefined ? validateValue(value, schema) : null), [value, schema])

  useEffect(() => {
    if (!validation) return

    setMessages(validation.messages)

    const cells = Object.values(cellValidity).flatMap((cell) => Object.values(cell))
    if (validation.isValid === false || cells.some((valid) => valid === false)) {
      setValid(false)
    } else if (validation.isValid === true) {
      setValid(true)
    }
  }, [validation, cellValidity, setMessages, setValid])

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
                      className='iight-button'
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
                  className='iight-button'
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
                      className='iight-button'
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
                      <MatrixCell
                        rowIndex={rowIndex}
                        columnIndex={columnIndex}
                        fields={fields}
                        column={column}
                        messages={cellMessages[`${rowIndex}-${columnIndex}`]}
                        validity={cellValidity[`${rowIndex}-${columnIndex}`]}
                        setColumnValue={setColumnValue}
                        setColumnMessages={setColumnMessages}
                        setColumnValidity={setColumnValidity}
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
                  className='iight-button'
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

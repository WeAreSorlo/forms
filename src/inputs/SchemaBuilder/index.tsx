import { useFieldContext } from '@/components/Field'
import Fieldset, {
  OnMessagesChangeCallback,
  OnValidityChangeCallback,
  OnValuesChangeCallback,
} from '@/components/Fieldset'
import Modal from '@/components/Modal'
import { FieldReportContext, FieldScopeContext, FormStaticContext, useFormStaticContext } from '@/context/FormProvider'
import { FieldMessages, FieldSchema } from '@/types/fields'
import {
  Input,
  InputCategory,
  InputComponent,
  InputCoreFields,
  InputDescription,
  InputFormatValue,
  InputName,
  InputRenderValue,
  InputTypeValue,
  InputValidateValue,
} from '@/types/inputs'
import { conditionScope, createId, validateInputSchemaFields, validateSchema, validateValues } from '@/utils/inputs'
import { validationMessage } from '@/utils/messages'
import { isEmptyValue, validationError, validationSuccess } from '@/utils/validation'
import { Dispatch, Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

export const name: InputName = () => 'Schema Builder'

export const description: InputDescription = () => 'An intuitive interface for building form schemas.'

export const category: InputCategory = () => 'Layout'

export const coreFields: InputCoreFields = () => {
  return [] // Prevent's its self from appearing in fields list
}

export const validateValue: InputValidateValue = (value, schema) => {
  schema = validateSchema(schema)

  // Return early if the value is empty and the field is optional, e.g. a group with no fields yet
  if (!schema.required && isEmptyValue(value)) {
    return validationSuccess(value)
  }

  // Check for an empty value
  if (schema.required && isEmptyValue(value)) {
    return validationError(value, validationMessage(schema, 'required'))
  }

  if (!Array.isArray(value)) {
    return validationError(value, validationMessage(schema, 'invalid'))
  }

  return validationSuccess(value)
}

// A list of field schemas
export const typeValue: InputTypeValue = () => 'Array<Record<string, unknown>>'

export const formatValue: InputFormatValue = (value, schema) => {
  schema = validateSchema(schema)
  const validation = validateValue(value, schema)
  return validation.isValid ? JSON.stringify(validation.value, null, 2) : null
}

export const renderValue: InputRenderValue = (value, schema) => {
  return <>{formatValue(value, schema)}</>
}

// Let the field's input finish its schema, e.g. giving new flexible layouts their IDs
const prepareSchema = (input: Input, schema: FieldSchema) => {
  return input.prepareSchema ? input.prepareSchema(schema) : schema
}

// Fill unset fields with their defaults, including those in groups such as options, e.g. a matrix's minimum rows,
// so the editor saves the values it shows
const withDefaults = (schema: Array<FieldSchema>, values: Record<string, any>): Record<string, any> => {
  const merged = { ...values }

  for (const field of schema) {
    if (field.type === 'group') {
      const group = withDefaults(field.options?.fields || [], merged[field.name] || {})
      if (Object.keys(group).length >= 1) merged[field.name] = group
    } else if (merged[field.name] === undefined && field.defaultValue !== undefined) {
      merged[field.name] = field.defaultValue
    }
  }

  return merged
}

const Component: InputComponent = function () {
  const { inputs } = useFormStaticContext()
  const { t } = useTranslation()
  const { value = [], setValue } = useFieldContext()

  const inputEntries = useMemo(() => {
    return Object.entries(inputs).filter(([type, input]) => {
      return validateInputSchemaFields(input).length >= 1
    })
  }, [inputs])

  return (
    <div className='iight-input__schemabuilder'>
      {/* Edit */}
      {Array.isArray(value) && value.length > 0 && (
        <div className='iight-fieldset'>
          {value.map((valueSchema: FieldSchema, valueIndex) => {
            const isValidType = valueSchema.type in inputs
            const valueInput = inputs[valueSchema.type]

            return (
              <Fragment key={valueIndex}>
                <div style={{ width: valueSchema.width ? `${valueSchema.width}%` : '100%' }}>
                  {!isValidType && <div>{t('ui.invalidFieldType')}</div>}
                  {isValidType && (
                    <EditValueItem
                      index={valueIndex}
                      total={value.length}
                      input={valueInput}
                      value={valueSchema}
                      setValue={setValue}
                    />
                  )}
                </div>
              </Fragment>
            )
          })}
        </div>
      )}

      {/* Add new */}
      <div>
        {inputEntries.map(([type, input], inputIndex) => {
          return <CreateValueItem key={inputIndex} type={type} input={input} setValue={setValue} />
        })}
      </div>
    </div>
  )
}

function CreateValueItem({ type, input, setValue }: { type: string; input: Input; setValue: Dispatch<any> }) {
  // Memoised, as a new schema would reset an open editor
  const schema = useMemo(() => validateInputSchemaFields(input), [input])

  const onSave = useCallback(
    (editorValues: Record<string, any>) => {
      const field = { id: createId('fld'), type, ...editorValues } as FieldSchema
      setValue((old: Array<FieldSchema>) => [...(old || []), prepareSchema(input, field)])
    },
    [setValue, type, input],
  )

  return (
    <SchemaEditor
      schema={schema}
      onSave={onSave}
      label={
        <>
          <strong>{input?.name?.() || type}</strong>
          <br />
          <span>{input?.description?.()}</span>
        </>
      }
    />
  )
}

function EditValueItem({
  index,
  total,
  value,
  input,
  setValue,
}: {
  index: number
  total: number
  value: FieldSchema
  input: Input
  setValue: Dispatch<any>
}) {
  const { t } = useTranslation()
  const { readonly, disabled } = useFieldContext()
  const locked = readonly || disabled
  const schema = useMemo(() => validateInputSchemaFields(input), [input])

  const values = useMemo(() => {
    const valueRecord: Record<string, any> = value
    return Object.fromEntries(
      schema.map((item) => {
        return [item.name, valueRecord[item.name] ?? item.defaultValue]
      }),
    )
  }, [schema, value])

  const label = useMemo(() => {
    if (value.name && value.label) {
      return `${value.label} (${value.name})`
    } else if (!value.name && value.label) {
      return value.label
    } else if (value.name && !value.label) {
      return value.name
    }

    return value.type
  }, [value.name, value.label, value.type])

  const onSave = useCallback(
    (editorValues: Record<string, any>) => {
      // Keep the field's ID and the keys the editor doesn't show, such as readonly, giving an ID to fields from
      // schemas written without them
      const field = { id: value.id ?? createId('fld'), ...value, ...editorValues } as FieldSchema
      setValue((old: Array<FieldSchema>) => {
        const newValue = [...(old || [])]
        newValue[index] = prepareSchema(input, field)
        return newValue
      })
    },
    [setValue, index, input, value],
  )

  const onDelete = useCallback(
    (event: React.MouseEvent<HTMLElement, MouseEvent>) => {
      event.preventDefault()
      setValue((old: Array<FieldSchema>) => (old || []).toSpliced(index, 1))
    },
    [setValue, index],
  )

  const onMove = useCallback(
    (offset: number) => {
      setValue((old: Array<FieldSchema>) => {
        const newValue = [...(old || [])]
        const target = index + offset

        // Keep the field within the bounds of the list
        if (target < 0 || target >= newValue.length) return old

        const [moved] = newValue.splice(index, 1)
        newValue.splice(target, 0, moved)
        return newValue
      })
    },
    [setValue, index],
  )

  return (
    <>
      <SchemaEditor schema={schema} values={values} onSave={onSave} label={label} />
      <button
        className='iight-button'
        type='button'
        disabled={locked || index === 0}
        onClick={(event) => {
          event.preventDefault()
          onMove(-1)
        }}
      >
        {t('ui.moveUp')}
      </button>
      <button
        className='iight-button'
        type='button'
        disabled={locked || index === total - 1}
        onClick={(event) => {
          event.preventDefault()
          onMove(1)
        }}
      >
        {t('ui.moveDown')}
      </button>
      <button className='iight-button iight-button--danger' type='button' disabled={locked} onClick={onDelete}>
        {t('ui.delete')}
      </button>
    </>
  )
}

function SchemaEditor({
  label,
  cancelLabel,
  saveLabel,
  schema,
  values,
  onSave,
  onCancel,
}: {
  label: string | React.ReactNode
  saveLabel?: string | React.ReactNode
  cancelLabel?: string | React.ReactNode
  schema: Array<FieldSchema>
  values?: Record<string, any>
  onSave: (value: Record<string, any>) => void
  onCancel?: () => void
}) {
  const staticContext = useFormStaticContext()
  const { inputs } = staticContext
  const { t } = useTranslation()
  const { readonly, disabled } = useFieldContext()
  const locked = readonly || disabled

  const mergedValues = useMemo(() => withDefaults(schema, values || {}), [schema, values])

  const [open, setOpen] = useState(false)
  const [tempValue, setTempValue] = useState<Record<string, any>>(mergedValues)
  const [tempMessages, setTempMessages] = useState<Record<string, FieldMessages>>({})
  const [tempValidity, setTempValidity] = useState<Record<string, boolean | undefined>>({})
  const [validationCounter, setValidationCounter] = useState(0)

  const closeModal = () => {
    setTempMessages({})
    setTempValidity({})
    setValidationCounter(0)
    setOpen(false)
    setTempValue(mergedValues)
  }

  useEffect(() => {
    setTempValue((old) => {
      if (Object.is(mergedValues, old)) return old
      return mergedValues
    })
  }, [mergedValues])

  const handleCancel = (event?: React.MouseEvent<HTMLElement, MouseEvent>) => {
    if (event) event.preventDefault()
    closeModal()
    if (onCancel) onCancel()
  }

  const handleSave = (event?: React.MouseEvent<HTMLElement, MouseEvent>) => {
    if (event) event.preventDefault()

    // Validate every field, including nested fields, and block the save while any are invalid, asking every field
    // in the editor to show its own messages as a form's validate does
    if (!validateValues(schema, tempValue, inputs, { environment: 'client' }).isValid) {
      setValidationCounter((old) => old + 1)
      return
    }

    onSave({ ...tempValue })
    closeModal()
  }

  // The editor counts its own validation passes, so fields in an editor opened after the form validated start clean
  const editorContext = useMemo(() => ({ ...staticContext, validationCounter }), [staticContext, validationCounter])

  const editorScopes = useMemo(() => [conditionScope(schema, tempValue || {}, inputs)], [schema, tempValue, inputs])

  const handleValuesChange: OnValuesChangeCallback = useCallback((field, value) => {
    setTempValue((old) => {
      if (Object.is(old?.[field], value)) return old
      return { ...old, [field]: value }
    })
  }, [])

  const handleMessagesChange: OnMessagesChangeCallback = useCallback((field, messages) => {
    setTempMessages((old) => {
      if (Object.is(old?.[field], messages)) return old
      return { ...old, [field]: messages }
    })
  }, [])

  const handleValidityChange: OnValidityChangeCallback = useCallback((field, valid) => {
    setTempValidity((old) => {
      if (Object.is(old?.[field], valid)) return old
      return { ...old, [field]: valid }
    })
  }, [])

  // The button stays mounted when the editor closes, so the browser can return focus to it
  return (
    <>
      <button
        className='iight-button'
        type='button'
        disabled={locked}
        onClick={(event) => {
          event.preventDefault()
          setOpen((old) => !old)
        }}
      >
        {label}
      </button>
      <Modal open={open} onClose={handleCancel} header={label}>
        {/* This condition prevents infinite rendering */}
        {open && (
          /* The editor's state is temporary, so keep its reports out of the
             form's messages and evaluate its conditions against its own values */
          <FormStaticContext.Provider value={editorContext}>
            <FieldReportContext.Provider value={undefined}>
              <FieldScopeContext.Provider value={editorScopes}>
                <Fieldset
                  schema={schema}
                  values={tempValue}
                  messages={tempMessages}
                  validity={tempValidity}
                  onValuesChange={handleValuesChange}
                  onMessagesChange={handleMessagesChange}
                  onValidityChange={handleValidityChange}
                />
              </FieldScopeContext.Provider>
            </FieldReportContext.Provider>
          </FormStaticContext.Provider>
        )}
        <button className='iight-button' type='button' onClick={handleCancel}>
          {cancelLabel || t('ui.cancel')}
        </button>
        <button className='iight-button iight-button--primary' type='button' disabled={locked} onClick={handleSave}>
          {saveLabel || t('ui.save')}
        </button>
      </Modal>
    </>
  )
}

export default Component

import { useFieldContext } from '@/components/Field'
import Fieldset, {
  OnMessagesChangeCallback,
  OnValidityChangeCallback,
  OnValuesChangeCallback,
} from '@/components/Fieldset'
import Modal from '@/components/Modal'
import { FieldReportContext, FieldScopeContext, useFormStaticContext } from '@/context/FormProvider'
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
  InputValidateValue,
} from '@/types/inputs'
import { createId, validateInputSchemaFields, validateSchema, validateValues } from '@/utils/inputs'
import { validationMessage } from '@/utils/messages'
import { validationError, validationSuccess } from '@/utils/validation'
import { Dispatch, Fragment, useCallback, useEffect, useId, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

export const name: InputName = () => 'Schema Builder'

export const description: InputDescription = () => 'An intuitive interface for building form schemas.'

export const category: InputCategory = () => 'Layout'

export const coreFields: InputCoreFields = () => {
  return [] // Prevent's its self from appearing in fields list
}

export const validateValue: InputValidateValue = (value, schema) => {
  schema = validateSchema(schema)

  if (!Array.isArray(value)) {
    return validationError(value, validationMessage(schema, 'invalid'))
  }

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

// Let the field's input finish its schema, e.g. giving new flexible layouts their IDs
const prepareSchema = (input: Input, schema: FieldSchema) => {
  return input.prepareSchema ? input.prepareSchema(schema) : schema
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
  const schema = validateInputSchemaFields(input)

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
      // Keep the field's ID, giving one to fields from schemas written without them
      const field = { id: value.id ?? createId('fld'), type: value.type, ...editorValues } as FieldSchema
      setValue((old: Array<FieldSchema>) => {
        const newValue = [...(old || [])]
        newValue[index] = prepareSchema(input, field)
        return newValue
      })
    },
    [setValue, index, input, value.id, value.type],
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
        disabled={index === 0}
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
        disabled={index === total - 1}
        onClick={(event) => {
          event.preventDefault()
          onMove(1)
        }}
      >
        {t('ui.moveDown')}
      </button>
      <button className='iight-button' type='button' onClick={onDelete}>
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
  const { inputs } = useFormStaticContext()
  const { t } = useTranslation()
  const id = useId()

  // Merge the schema's default values with the current values
  const mergedValues = useMemo(() => {
    const defaultValues = schema.filter((field) => field.defaultValue !== undefined)
    const defaultEntries = Object.fromEntries(defaultValues.map((field) => [field.name, field.defaultValue]))
    return { ...defaultEntries, ...(values || {}) }
  }, [schema, values])

  const [resetCounter, setResetCounter] = useState(0)
  const [open, setOpen] = useState(false)
  const [tempValue, setTempValue] = useState<Record<string, any>>(mergedValues)
  const [tempMessages, setTempMessages] = useState<Record<string, FieldMessages>>({})
  const [tempValidity, setTempValidity] = useState<Record<string, boolean | undefined>>({})

  const closeModal = () => {
    setResetCounter((old) => old + 1)
    setTempMessages({})
    setTempValidity({})
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

    // Validate every field, including nested fields, and block the save while any are invalid
    const report = validateValues(schema, tempValue, inputs, { environment: 'client' })

    if (!report.isValid) {
      const newMessages: Record<string, FieldMessages> = {}
      const newValidity: Record<string, boolean | undefined> = {}

      for (const [field, fieldReport] of Object.entries(report.fields)) {
        newValidity[field] = fieldReport.isValid
        newMessages[field] =
          !fieldReport.isValid && fieldReport.messages.length === 0 ? [t('validation.children')] : fieldReport.messages
      }

      setTempMessages(newMessages)
      setTempValidity(newValidity)
      return
    }

    onSave({ ...tempValue })
    closeModal()
  }

  const editorScopes = useMemo(() => [tempValue || {}], [tempValue])

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

  return (
    <Fragment key={`${id}-${resetCounter}`}>
      <button
        className='iight-button'
        type='button'
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
        )}
        <button className='iight-button' type='button' onClick={handleCancel}>
          {cancelLabel || t('ui.cancel')}
        </button>
        <button className='iight-button' type='button' onClick={handleSave}>
          {saveLabel || t('ui.save')}
        </button>
      </Modal>
    </Fragment>
  )
}

export default Component

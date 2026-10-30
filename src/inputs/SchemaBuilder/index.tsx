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
import { normaliseConditions } from '@/utils/conditions'
import { conditionScope, createId, validateInputSchemaFields, validateSchema, validateValues } from '@/utils/inputs'
import { validationMessage } from '@/utils/messages'
import { isEmptyValue, validationError, validationSuccess } from '@/utils/validation'
import isEqual from 'lodash/isEqual.js'
import { Dispatch, Fragment, createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
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

// The fields at each level around a field being edited, outermost first, which its conditions can test. An editor
// adds the fields beside its own, so a builder inside it, such as a group's, reaches those as well as its own.
const LevelsContext = createContext<Array<Array<FieldSchema>>>([])

// A rule's type for a field, by its input. Choice fields give their choices instead, and other fields are text.
const ruleTypes: Record<string, string> = {
  boolean: 'boolean',
  number: 'number',
  range: 'number',
  date: 'date',
  datetime: 'date',
}

// What a field's conditions can test, nearest first, the way conditions resolve a path: the fields beside it, then
// those of each level around it. A group's fields are tested through it, e.g. address.town. Fields without a value,
// such as content, are left out.
const conditionChoices = (levels: Array<Array<FieldSchema>>, inputs: Record<string, Input>) => {
  const choices = new Map<string, Record<string, any>>()

  const add = (fields: Array<FieldSchema>, path: string, label: string) => {
    for (const field of fields) {
      const input = inputs[field?.type]
      if (!field?.name || choices.has(path + field.name)) continue

      if (field.type === 'group') {
        add(field.options?.fields || [], `${path}${field.name}.`, `${label}${field.label || field.name} › `)
      } else if (!input?.typeValue || input.typeValue(field, () => '') !== undefined) {
        const listed: Array<any> = field.options?.choices || []
        const optionChoices = listed.flatMap((choice) => (choice?.choices?.length ? choice.choices : [choice]))
        choices.set(path + field.name, {
          value: path + field.name,
          label: label + (field.label || field.name),
          ...(['select', 'radio', 'checkbox'].includes(field.type)
            ? { choices: optionChoices.map((choice) => ({ value: choice?.value, label: choice?.label })) }
            : { type: ruleTypes[field.type] || 'text' }),
        })
      }
    }
  }

  for (const fields of [...levels].reverse()) add(fields, '', '')
  return [...choices.values()]
}

// The schema of a field's editor, listing what its conditional logic can test. Keyed by the list's contents, so an
// equal list never resets an open editor.
const useEditorSchema = (input: Input, levels: Array<Array<FieldSchema>>) => {
  const { inputs } = useFormStaticContext()
  const fieldChoices = conditionChoices(levels, inputs)
  const key = JSON.stringify(fieldChoices)

  return useMemo(() => {
    return validateInputSchemaFields(input).map((field) => {
      if (field.name !== 'conditions' || field.type !== 'conditions') return field
      return { ...field, options: { ...field.options, fieldChoices } }
    })
  }, [input, key])
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
                      fields={value}
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
          return (
            <CreateValueItem
              key={inputIndex}
              type={type}
              input={input}
              fields={Array.isArray(value) ? value : []}
              setValue={setValue}
            />
          )
        })}
      </div>
    </div>
  )
}

function CreateValueItem({
  type,
  input,
  fields,
  setValue,
}: {
  type: string
  input: Input
  fields: Array<FieldSchema>
  setValue: Dispatch<any>
}) {
  // A new field's conditions can test every field in the builder
  const outer = useContext(LevelsContext)
  const levels = useMemo(() => [...outer, fields], [outer, fields])
  const schema = useEditorSchema(input, levels)

  const onSave = useCallback(
    (editorValues: Record<string, any>) => {
      const field = { id: createId('fld'), type, ...editorValues } as FieldSchema
      setValue((old: Array<FieldSchema>) => [...(old || []), prepareSchema(input, field)])
    },
    [setValue, type, input],
  )

  return (
    <LevelsContext.Provider value={levels}>
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
    </LevelsContext.Provider>
  )
}

function EditValueItem({
  index,
  fields,
  total,
  value,
  input,
  setValue,
}: {
  index: number
  fields: Array<FieldSchema>
  total: number
  value: FieldSchema
  input: Input
  setValue: Dispatch<any>
}) {
  const { t } = useTranslation()
  const { readonly, disabled } = useFieldContext()
  const locked = readonly || disabled

  // Its conditions can test the fields beside it, but not itself
  const outer = useContext(LevelsContext)
  const levels = useMemo(() => [...outer, fields.toSpliced(index, 1)], [outer, fields, index])
  const schema = useEditorSchema(input, levels)

  // Conditions show as groups whatever shape they were written in, such as a flat list with conditionsMode
  const conditions = useMemo(() => value.conditions && normaliseConditions(value).map((rules) => ({ rules })), [value])

  const values = useMemo(() => {
    const valueRecord: Record<string, any> = { ...value, conditions }
    return Object.fromEntries(
      schema.map((item) => {
        return [item.name, valueRecord[item.name] ?? item.defaultValue]
      }),
    )
  }, [schema, value, conditions])

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
      // schemas written without them. Conditions stay as they were written unless they're edited, which saves them
      // as groups that need no conditionsMode.
      const { conditionsMode, ...rest } = value
      const field = (
        isEqual(editorValues.conditions ?? [], conditions ?? [])
          ? { id: value.id ?? createId('fld'), ...value, ...editorValues, conditions: value.conditions }
          : { id: value.id ?? createId('fld'), ...rest, ...editorValues }
      ) as FieldSchema
      setValue((old: Array<FieldSchema>) => {
        const newValue = [...(old || [])]
        newValue[index] = prepareSchema(input, field)
        return newValue
      })
    },
    [setValue, index, input, value, conditions],
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
    <LevelsContext.Provider value={levels}>
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
    </LevelsContext.Provider>
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

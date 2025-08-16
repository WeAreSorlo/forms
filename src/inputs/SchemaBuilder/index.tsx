import { useFieldContext } from '@/components/Field'
import Fieldset, {
  OnMessagesChangeCallback,
  OnValidityChangeCallback,
  OnValuesChangeCallback,
} from '@/components/Fieldset'
import Modal from '@/components/Modal'
import { useFormContext } from '@/context/FormProvider'
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
import { validateInputSchemaFields, validateSchema } from '@/utils/inputs'
import { validationError, validationSuccess } from '@/utils/validation'
import { Dispatch, Fragment, useCallback, useEffect, useId, useMemo, useState } from 'react'

export const name: InputName = () => 'Schema Builder'

export const description: InputDescription = () => 'An intuative interface for building form schemas.'

export const category: InputCategory = () => 'Layout'

export const coreFields: InputCoreFields = () => {
  return [] // Prevent's its self from appearing in fields list
}

export const validateValue: InputValidateValue = (value, schema) => {
  schema = validateSchema(schema)

  if (!Array.isArray(value)) {
    return validationError(value, 'Invalid value.')
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

const Component: InputComponent = function () {
  const { inputs } = useFormContext()
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
                  {!isValidType && <div>Invalid field type</div>}
                  {isValidType && (
                    <EditValueItem index={valueIndex} input={valueInput} value={valueSchema} setValue={setValue} />
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
    (editorValues: Record<string, Input>) => {
      setValue((old) => [...(old || []), { type, ...editorValues }])
    },
    [setValue],
  )

  return (
    <SchemaEditor
      schema={schema}
      onSave={onSave}
      label={
        <>
          <strong>{input?.name() || type}</strong>
          <br />
          <span>{input?.description()}</span>
        </>
      }
    />
  )
}

function EditValueItem({
  index,
  value,
  input,
  setValue,
}: {
  index: number
  value: FieldSchema
  input: Input
  setValue: Dispatch<any>
}) {
  const schema = validateInputSchemaFields(input)

  const values = Object.fromEntries(
    schema.map((item) => {
      return [item.name, value[item.name] ?? item.defaultValue]
    }),
  )

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
    (editorValues: Record<string, Input>) => {
      setValue((old) => {
        const newValue = [...(old || [])]
        newValue[index] = { type: value.type, ...editorValues }
        if (Object.is(newValue, old)) return old
        return newValue
      })
    },
    [setValue, index],
  )

  return <SchemaEditor schema={schema} values={values} onSave={onSave} label={label} />
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
  onSave: (value: Record<string, Input>) => void
  onCancel?: () => void
}) {
  const id = useId()

  const [resetCounter, setResetCounter] = useState(0)
  const [open, setOpen] = useState(false)
  const [tempValue, setTempValue] = useState<Record<string, any>>(values || {})
  const [tempMessages, setTempMessages] = useState<Record<string, FieldMessages>>({})
  const [tempValidity, setTempValidity] = useState<Record<string, boolean>>({})

  const closeModal = () => {
    setResetCounter((old) => old + 1)
    setTempMessages({})
    setOpen(false)
    setTempValue(values)
  }

  useEffect(() => {
    setTempValue((old) => {
      if (Object.is(values, old)) return old
      return values
    })
  }, [values])

  const handleCancel = (event?: React.MouseEvent<HTMLElement, MouseEvent>) => {
    if (event) event.preventDefault()
    closeModal()
    if (onCancel) onCancel()
  }

  const handleSave = (event?: React.MouseEvent<HTMLElement, MouseEvent>) => {
    if (event) event.preventDefault()
    onSave({ ...tempValue })
    closeModal()
  }

  const handleValuesChange: OnValuesChangeCallback = useCallback((field, value) => {
    setTempValue((old) => {
      if (Object.is(value, old)) return old
      return { ...old, [field]: value }
    })
  }, [])

  const handleMessagesChange: OnMessagesChangeCallback = useCallback((field, messages) => {
    setTempMessages((old) => {
      if (Object.is(messages, old)) return old
      return { ...old, [field]: messages }
    })
  }, [])

  const handleValidityChange: OnValidityChangeCallback = useCallback((field, valid) => {
    setTempValidity((old) => {
      if (Object.is(valid, old)) return old
      return { ...old, [field]: valid }
    })
  }, [])

  return (
    <Fragment key={`${id}-${resetCounter}`}>
      <button
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
          <Fieldset
            schema={schema}
            values={tempValue}
            messages={tempMessages}
            validity={tempValidity}
            onValuesChange={handleValuesChange}
            onMessagesChange={handleMessagesChange}
            onValidityChange={handleValidityChange}
          />
        )}
        <button onClick={handleCancel}>{cancelLabel || 'Cancel'}</button>
        <button onClick={handleSave}>{saveLabel || 'Save'}</button>
      </Modal>
    </Fragment>
  )
}

export default Component

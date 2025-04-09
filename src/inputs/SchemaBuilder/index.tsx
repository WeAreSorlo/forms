import { useFieldContext } from '@/components/Field'
import Fieldset from '@/components/Fieldset'
import Modal from '@/components/Modal'
import { useFormContext } from '@/context/FormProvider'
import { FieldMessages, FieldSchema } from '@/types/fields'
import {
  Input,
  InputCategory,
  InputComponent,
  InputDescription,
  InputFormatValue,
  InputName,
  InputRenderValue,
  InputValidateValue,
} from '@/types/inputs'
import { validateSchema } from '@/utils/inputs'
import { validationError, validationSuccess } from '@/utils/validation'
import { Fragment, useId, useMemo, useState } from 'react'

export const name: InputName = () => 'Schema Builder'

export const description: InputDescription = () => 'An intuative interface for building form schemas.'

export const category: InputCategory = () => 'Layout'

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

const SchemaEditor = function ({
  label,
  cancelLabel,
  saveLabel,
  schema,
  inputs,
  values = {},
  onSave,
  onCancel,
}: {
  label: string | React.ReactNode
  saveLabel?: string | React.ReactNode
  cancelLabel?: string | React.ReactNode
  schema: Array<FieldSchema>
  inputs: Record<string, Input>
  values?: Record<string, any>
  onSave: (value: Record<string, Input>) => void
  onCancel?: () => void
}) {
  const id = useId()

  const [resetFlag, setResetFlag] = useState(false)
  const [open, setOpen] = useState(false)
  const [tempValue, setTempValue] = useState<Record<string, any>>(values)
  const [tempMessages, setTempMessages] = useState<Record<string, FieldMessages>>({})
  const [tempValidity, setTempValidity] = useState<Record<string, boolean>>({})

  const closeModal = () => {
    setResetFlag((old) => !old)
    setTempValue(values)
    setTempMessages({})
    setOpen(false)
  }

  return (
    <Fragment key={`${id}-${String(resetFlag)}`}>
      <button
        onClick={(event) => {
          event.preventDefault()
          setOpen((old) => !old)
        }}
      >
        {label}
      </button>
      <Modal
        open={open}
        onClose={() => {
          closeModal()
          if (onCancel) onCancel()
        }}
        header={label}
      >
        {/* This condition prevents infinite rendering */}
        {open && (
          <Fieldset
            schema={schema}
            inputs={inputs}
            values={tempValue}
            messages={tempMessages}
            validity={tempValidity}
            onValuesChange={(field, value) => {
              setTempValue((old) => ({ ...old, [field]: value }))
            }}
            onMessagesChange={(field, messages) => {
              setTempMessages((old) => ({ ...old, [field]: messages }))
            }}
            onValidityChange={(field, valid) => {
              setTempValidity((old) => ({ ...old, [field]: valid }))
            }}
          />
        )}
        <button
          onClick={(event) => {
            event.preventDefault()
            closeModal()
            if (onCancel) onCancel()
          }}
        >
          {cancelLabel || 'Cancel'}
        </button>
        <button
          onClick={(event) => {
            event.preventDefault()
            onSave({ ...tempValue })
            closeModal()
          }}
        >
          {saveLabel || 'Save'}
        </button>
      </Modal>
    </Fragment>
  )
}

const Component: InputComponent = function () {
  const { inputs } = useFormContext()
  const { value = [], setValue } = useFieldContext()

  const inputEntries = useMemo(() => {
    return Object.entries(inputs).filter(([type, input]) => !!input.schemaFields)
  }, [inputs])

  return (
    <div className='iight-input__schemabuilder'>
      {/* Edit */}
      {Array.isArray(value) && value.length > 0 && (
        <div className='iight-fieldset'>
          {value.map((valueSchema: FieldSchema, valueIndex) => {
            const isValidType = valueSchema.type in inputs
            const valueInput = inputs[valueSchema.type]

            const values = Object.fromEntries(
              (valueInput && valueInput.schemaFields ? valueInput.schemaFields() : []).map((item) => {
                return [item.name, valueSchema[item.name] ?? item.value]
              }),
            )

            let label = valueSchema.type

            if (valueSchema.name && valueSchema.label) {
              label = `${valueSchema.label} (${valueSchema.name})`
            } else if (!valueSchema.name && valueSchema.label) {
              label = `${valueSchema.label}`
            } else if (valueSchema.name && !valueSchema.label) {
              label = `${valueSchema.name}`
            }

            return (
              <Fragment key={valueIndex}>
                <div style={{ width: valueSchema.width ? `${valueSchema.width}%` : '100%' }}>
                  {!isValidType && <div>Invalid field type</div>}
                  {isValidType && (
                    <SchemaEditor
                      schema={valueInput.schemaFields()}
                      inputs={inputs}
                      values={values}
                      onSave={(editorValues) => {
                        setValue((old = []) => {
                          const newValue = [...old]
                          newValue[valueIndex] = { ...editorValues, type: valueSchema.type }
                          return newValue
                        })
                      }}
                      label={label}
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
            <Fragment key={inputIndex}>
              <SchemaEditor
                schema={input.schemaFields()}
                inputs={inputs}
                onSave={(editorValues) => {
                  setValue((old = []) => {
                    const newValue = [...old]
                    newValue.push({ ...editorValues, type })
                    return newValue
                  })
                }}
                label={
                  <>
                    <strong>{input?.name() || type}</strong>
                    <br />
                    <span>{input?.description()}</span>
                  </>
                }
              />
            </Fragment>
          )
        })}
      </div>
    </div>
  )
}

export default Component

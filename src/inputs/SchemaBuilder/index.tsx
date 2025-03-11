import { useFieldContext } from '@/components/Field'
import Fieldset, { OnValuesChangeCallback } from '@/components/Fieldset'
import { useFormContext } from '@/context/FormProvider'
import { FieldSchema } from '@/types/fields'
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
import { memo, useMemo, useState } from 'react'

export const name: InputName = () => 'Schema Builder'

export const description: InputDescription = () => 'An intuative interface for building form schemas.'

export const category: InputCategory = () => 'Layout'

export const validateValue: InputValidateValue = (value, schema) => {
  schema = validateSchema(schema)
  return Array.isArray(value)
}

export const formatValue: InputFormatValue = (value, schema) => {
  if (validateValue(value, schema)) {
    return value
  }

  return []
}

export const renderValue: InputRenderValue = (value, schema) => {
  return <>{formatValue(value, schema)}</>
}

const ValueComponent = memo(function ValueComponent({
  input,
  fields,
  inputs,
  onChange,
}: {
  input: Input
  fields: Array<FieldSchema>
  inputs: Record<string, Input>
  onChange: OnValuesChangeCallback
}) {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <button
        onClick={(event) => {
          event.preventDefault()
          setOpen((old) => !old)
        }}
      >
        {input.name()}
      </button>
      <div style={{ display: open ? 'block' : 'none' }}>
        <Fieldset schema={fields} inputs={inputs} onValuesChange={onChange} />
      </div>
    </div>
  )
})

const Component: InputComponent = memo(function Component() {
  const { inputs } = useFormContext()
  const { id, schema, required, readonly, disabled, options, value, setValue, handleValidation } = useFieldContext()

  const [addTypeKey, setAddTypeKey] = useState<string | null>(null)
  const [addTypeInput, setAddTypeInput] = useState<Input | null>(null)
  const [tempFieldSchema, setTempFieldSchema] = useState<null | Partial<FieldSchema>>(null)
  const [tempFieldValidity, setTempFieldValidity] = useState<Record<string, boolean>>({})

  const tempFieldIsValid = useMemo(() => {
    return Object.values(tempFieldValidity).filter((validity) => !validity).length === 0
  }, [tempFieldValidity])

  const inputEntries = useMemo(() => {
    return Object.entries(inputs).filter(([type, input]) => !!input.schemaFields)
  }, [inputs])

  return (
    <div className='iight-input__schemabuilder'>
      {/* Values */}
      {Array.isArray(value) && (
        <div>
          {value.map((valueSchema: FieldSchema, valueIndex) => {
            const isValidType = valueSchema.type in inputs
            const valueInput = inputs[valueSchema.type]
            const valueFields = (valueInput && valueInput.schemaFields ? valueInput.schemaFields() : []).map((item) => {
              item.value = valueSchema[item.name]
              return item
            })
            return (
              <div key={valueIndex}>
                {!isValidType && 'Invalid field type'}
                {isValidType && (
                  <ValueComponent
                    inputs={inputs}
                    input={valueInput}
                    fields={valueFields}
                    onChange={(values) => {
                      setValue((old) => {
                        const newValue = [...old]
                        newValue[valueIndex] = { ...values, type: valueSchema.type }
                        return newValue
                      })
                    }}
                  />
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Selector */}
      <div>
        {inputEntries.map(([type, input], inputIndex) => {
          const {
            name: inputName,
            description: inputDescription,
            category: inputCategory,
            icon: inputIcon,
            schemaFields: inputSchemaFields,
          } = input
          return (
            <div key={inputIndex}>
              <button
                onClick={(event) => {
                  event.preventDefault()
                  setAddTypeKey(type)
                  setAddTypeInput(input)
                }}
              >
                <strong>{inputName ? inputName() : type}</strong>
                <br />
                <span>{inputDescription ? inputDescription() : null}</span>
              </button>
            </div>
          )
        })}
      </div>

      {/* Modal */}
      {addTypeKey && addTypeInput && (
        <div>
          <h3>Add new {addTypeInput.name ? addTypeInput.name() : ''}</h3>
          <Fieldset
            schema={addTypeInput.schemaFields ? addTypeInput.schemaFields() : []}
            inputs={inputs}
            onValuesChange={(values) => {
              setTempFieldSchema({ ...values, type: addTypeKey })
            }}
            onValidityChange={setTempFieldValidity}
          />
          <button
            onClick={(event) => {
              event.preventDefault()
              setAddTypeKey(null)
              setAddTypeInput(null)
              setTempFieldSchema(null)
            }}
          >
            Cancel
          </button>
          <button
            onClick={(event) => {
              event.preventDefault()
              setValue((old) => {
                const newValue = old || []
                newValue.push(tempFieldSchema)
                return newValue
              })
              setAddTypeKey(null)
              setAddTypeInput(null)
              setTempFieldSchema(null)
            }}
          >
            Add
          </button>
        </div>
      )}
    </div>
  )
})

export default Component

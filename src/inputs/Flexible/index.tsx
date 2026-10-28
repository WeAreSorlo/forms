import { useFieldContext } from '@/components/Field'
import Fieldset, { OnValidityChangeCallback, OnValuesChangeCallback } from '@/components/Fieldset'
import { FieldSchema } from '@/types/fields'
import {
  InputCategory,
  InputComponent,
  InputDescription,
  InputFormatValue,
  InputName,
  InputOptionFields,
  InputPickValue,
  InputPrepareSchema,
  InputRenderValue,
  InputTypeValue,
  InputValidateChildren,
  InputValidateValue,
} from '@/types/inputs'
import { createId, validateSchema } from '@/utils/inputs'
import { validationMessage } from '@/utils/messages'
import { isEmptyValue, validationError, validationSuccess } from '@/utils/validation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

// A block holds its layout's field values plus _layout, the name of that layout
type Block = Record<string, any>

interface Layout {
  // A stable ID like a field's, e.g. lay_k3x9q2mz, while blocks keep naming their layout in _layout
  id?: string
  name: string
  label?: string
  fields?: Array<FieldSchema>
}

export const name: InputName = () => 'Flexible content'

export const description: InputDescription = () =>
  'Lets editors build content from blocks, each using one of a set of layouts with its own fields.'

export const category: InputCategory = () => 'Layout'

export const optionFields: InputOptionFields = () => {
  return [
    {
      label: 'Layouts',
      name: 'layouts',
      type: 'repeater',
      required: true,
      options: {
        minimum: 1,
        fields: [
          {
            label: 'Label',
            name: 'label',
            type: 'text',
            required: true,
            width: 50,
          },
          {
            label: 'Name',
            name: 'name',
            type: 'identifier',
            required: true,
            width: 50,
            options: {
              source: 'label',
              format: 'snake',
            },
          },
          {
            label: 'Fields',
            name: 'fields',
            type: 'schemabuilder',
          },
        ],
      },
    },
  ]
}

// Give layouts added in the schema builder their IDs, keeping the IDs of existing ones
export const prepareSchema: InputPrepareSchema = (schema) => {
  const layouts: Array<Layout> = schema.options?.layouts
  if (!Array.isArray(layouts)) return schema

  const withIds = layouts.map((layout) => ({ ...layout, id: layout?.id || createId('lay') }))
  return { ...schema, options: { ...schema.options, layouts: withIds } }
}

// The field's layouts by name, skipping any without one
const layoutsOf = (options?: Record<string, any>): Map<string, Layout> => {
  const layouts: Array<Layout> = Array.isArray(options?.layouts) ? options.layouts : []
  return new Map(layouts.filter((layout) => layout?.name).map((layout) => [layout.name, layout] as const))
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

  // Every block must use one of the field's layouts
  const layouts = layoutsOf(schema.options)
  if (!Array.isArray(value) || value.some((block) => !layouts.has(block?._layout))) {
    return validationError(value, validationMessage(schema, 'invalid'))
  }

  return validationSuccess(value)
}

// Validate every block's fields against its own layout
export const validateChildren: InputValidateChildren = (value, schema, validateFields) => {
  const layouts = layoutsOf(schema.options)
  const blocks: Array<Block> = Array.isArray(value) ? value : []
  return blocks.map((block) => validateFields(layouts.get(block?._layout)?.fields || [], block || {}))
}

// Keep the blocks whose layout still exists, with only that layout's fields
export const pickValue: InputPickValue = (value, schema, pickFields) => {
  if (!Array.isArray(value)) return undefined
  const layouts = layoutsOf(schema.options)
  return value
    .filter((block) => layouts.has(block?._layout))
    .map((block) => ({ ...pickFields(layouts.get(block._layout)?.fields || [], block), _layout: block._layout }))
}

// A union of every layout's blocks, so checking _layout narrows a block to its layout's fields
export const typeValue: InputTypeValue = (schema, typeFields) => {
  const blocks = [...layoutsOf(schema.options).values()].map((layout) => {
    return `{ _layout: ${JSON.stringify(layout.name)} } & ${typeFields(layout.fields || [])}`
  })
  return `Array<${blocks.join(' | ') || 'never'}>`
}

export const formatValue: InputFormatValue = (value, schema) => {
  schema = validateSchema(schema)
  const validation = validateValue(value, schema)
  return validation.isValid ? JSON.stringify(validation.value, null, 2) : null
}

export const renderValue: InputRenderValue = (value, schema) => {
  return <>{formatValue(value, schema)}</>
}

// A single block, rendered as a group of its layout's fields named by the
// block's index so nested reports land under paths like 'blocks.0.title'
function FlexibleBlock({
  index,
  layout,
  block,
  valid,
  setBlock,
  setBlockValid,
}: {
  index: number
  layout: Layout
  block: Block
  valid?: boolean
  setBlock: OnValuesChangeCallback
  setBlockValid: OnValidityChangeCallback
}) {
  const schema = useMemo<Array<FieldSchema>>(() => {
    return [
      {
        type: 'group',
        name: String(index),
        label: layout.label || layout.name,
        options: { fields: layout.fields || [] },
      },
    ]
  }, [index, layout])

  return (
    <Fieldset
      schema={schema}
      values={{ [index]: block }}
      validity={{ [index]: valid }}
      onValuesChange={setBlock}
      onValidityChange={setBlockValid}
    />
  )
}

const Component: InputComponent = function () {
  const { t } = useTranslation()
  const { schema, options, readonly, disabled, value, setValue, setMessages, setValid } = useFieldContext()
  const locked = readonly || disabled

  const [blockValidity, setBlockValidity] = useState<Record<string, boolean | undefined>>({})

  // Bumped whenever blocks change position, remounting them so no block keeps another's messages
  const [version, setVersion] = useState(0)

  const layouts = useMemo(() => layoutsOf(options), [options])
  const blocks: Array<Block> = Array.isArray(value) ? value : []

  const setBlock: OnValuesChangeCallback = useCallback(
    (field, block) => {
      setValue((oldValue: Array<Block>) => {
        if (!Array.isArray(oldValue)) return oldValue
        return oldValue.map((oldBlock, index) => (index === Number(field) ? block : oldBlock))
      })
    },
    [setValue],
  )

  const setBlockValid: OnValidityChangeCallback = useCallback((field, valid) => {
    setBlockValidity((old) => ({ ...old, [field]: valid }))
  }, [])

  const addBlock = (layout: Layout) => {
    // Seed every field so conditions inside the block resolve against the block first
    const fields = Object.fromEntries((layout.fields || []).map((field) => [field.name, field.defaultValue]))

    setValue((oldValue: Array<Block>) => [
      ...(Array.isArray(oldValue) ? oldValue : []),
      { ...fields, _layout: layout.name },
    ])
  }

  const removeBlock = (index: number) => {
    setBlockValidity({})
    setVersion((old) => old + 1)
    setValue((oldValue: Array<Block>) => (Array.isArray(oldValue) ? oldValue.toSpliced(index, 1) : []))
  }

  const moveBlock = (index: number, offset: number) => {
    setBlockValidity({})
    setVersion((old) => old + 1)
    setValue((oldValue: Array<Block>) => {
      const newValue = [...(Array.isArray(oldValue) ? oldValue : [])]
      const target = index + offset

      // Keep the block within the bounds of the list
      if (target < 0 || target >= newValue.length) return oldValue

      const [moved] = newValue.splice(index, 1)
      newValue.splice(target, 0, moved)
      return newValue
    })
  }

  // Validate the blocks' layouts and aggregate the validity of every block
  const validation = useMemo(() => (value !== undefined ? validateValue(value, schema) : null), [value, schema])

  useEffect(() => {
    if (!validation) return

    setMessages(validation.messages)

    if (validation.isValid === false || Object.values(blockValidity).some((valid) => valid === false)) {
      setValid(false)
    } else if (validation.isValid === true) {
      setValid(true)
    }
  }, [validation, blockValidity, setMessages, setValid])

  return (
    <div className='iight-input__flexible'>
      {blocks.map((block, index) => {
        const layout = layouts.get(block?._layout)

        return (
          <div key={`${version}-${index}`}>
            {layout && (
              <FlexibleBlock
                index={index}
                layout={layout}
                block={block}
                valid={blockValidity[index]}
                setBlock={setBlock}
                setBlockValid={setBlockValid}
              />
            )}
            {!layout && <div>{t('ui.invalidFieldType')}</div>}
            <button
              className='iight-button'
              type='button'
              disabled={locked || index === 0}
              onClick={(event) => {
                event.preventDefault()
                moveBlock(index, -1)
              }}
            >
              {t('ui.moveUp')}
            </button>
            <button
              className='iight-button'
              type='button'
              disabled={locked || index === blocks.length - 1}
              onClick={(event) => {
                event.preventDefault()
                moveBlock(index, 1)
              }}
            >
              {t('ui.moveDown')}
            </button>
            <button
              className='iight-button'
              type='button'
              disabled={locked}
              onClick={(event) => {
                event.preventDefault()
                removeBlock(index)
              }}
            >
              {t('ui.delete')}
            </button>
          </div>
        )
      })}
      <div>
        {[...layouts.values()].map((layout) => {
          return (
            <button
              key={layout.name}
              className='iight-button'
              type='button'
              disabled={locked}
              onClick={(event) => {
                event.preventDefault()
                addBlock(layout)
              }}
            >
              {t('ui.addBlock', { layout: layout.label || layout.name })}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default Component

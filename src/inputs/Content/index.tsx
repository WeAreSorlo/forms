import { useFieldContext } from '@/components/Field'
import {
  InputCategory,
  InputComponent,
  InputCoreFields,
  InputDescription,
  InputName,
  InputOptionFields,
  InputPickValue,
  InputTypeValue,
} from '@/types/inputs'

export const name: InputName = () => 'Content'

export const description: InputDescription = () => 'A block of read only content, useful for headings and instructions.'

export const category: InputCategory = () => 'Layout'

export const coreFields: InputCoreFields = (defaultFields) => {
  return defaultFields.filter(({ name }) => ['name', 'label', 'width', 'conditions'].includes(name))
}

export const optionFields: InputOptionFields = () => {
  return [
    {
      name: 'content',
      label: 'Content',
      type: 'textarea',
      required: false,
    },
  ]
}

// Content has no value, so there is nothing to validate, format or render,
// any posted value is dropped when picking, and it's left out of generated types
export const pickValue: InputPickValue = () => undefined
export const typeValue: InputTypeValue = () => undefined

const Component: InputComponent = function () {
  const { options } = useFieldContext()

  return <div className='iight-input__content'>{options?.content}</div>
}

export default Component

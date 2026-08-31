import { useFieldContext } from '@/components/Field'
import {
  InputCategory,
  InputComponent,
  InputCoreFields,
  InputDescription,
  InputName,
  InputOptionFields,
  InputPickValue,
} from '@/types/inputs'

export const name: InputName = () => 'Content'

export const description: InputDescription = () => 'A block of read only content, useful for headings and instructions.'

export const category: InputCategory = () => 'Layout'

export const coreFields: InputCoreFields = (defaultFields) => {
  return defaultFields.filter(({ name }) => ['name', 'label', 'width'].includes(name))
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
// and any posted value is dropped when picking
export const pickValue: InputPickValue = () => undefined

const Component: InputComponent = function () {
  const { options } = useFieldContext()

  return <div className='iight-input__content'>{options?.content}</div>
}

export default Component

import { FieldSchema } from '@/types/fields'
import { ValidationResponse } from '@/utils/validation'

export interface InputSchema {
  name: string
  label?: string
  required?: boolean
  instructions?: string
  defaultValue?: any
  readonly?: boolean
  disabled?: boolean
  width?: number
  options?: Record<string, any>
}

export type InputValidationResponse = ValidationResponse

export type InputComponent = React.ComponentType<any>

export type InputName = () => string
export type InputDescription = () => string
export type InputCategory = () => string
export type InputIcon = () => React.ReactNode
export type InputCoreFields = (defaultFields: Array<FieldSchema>) => Array<FieldSchema>
export type InputOptionFields = (defaultFields: Array<FieldSchema>) => Array<FieldSchema>

export type InputValidateValue = (value: any, schema: InputSchema) => InputValidationResponse
export type InputFormatValue = (value: any, schema: InputSchema) => string | null
export type InputRenderValue = (value: any, schema: InputSchema) => React.ReactNode

export interface Input {
  default: InputComponent
  name?: InputName
  description?: InputDescription
  category?: InputCategory
  icon?: InputIcon
  coreFields?: InputCoreFields
  optionFields?: InputOptionFields
  validateValue?: InputValidateValue
  formatValue?: InputFormatValue
  renderValue?: InputRenderValue
}

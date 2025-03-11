import { FieldSchema } from '@/types/fields'

export interface InputSchema {
  name: string
  label?: string
  required?: boolean
  instructions?: string
  value?: any
  readonly?: boolean
  disabled?: boolean
  width?: number
  options?: Record<string, any>
  [key: string]: any
}

export type InputValidationResponse = string | Array<string> | boolean

export type InputComponent = React.ComponentType<any>

export type InputName = () => string
export type InputDescription = () => string
export type InputCategory = () => string
export type InputIcon = () => React.ReactNode
export type InputSchemaFields = () => Array<FieldSchema>

export type InputValidateValue = (value: any, schema: InputSchema) => InputValidationResponse
export type InputFormatValue = (value: any, schema: InputSchema) => any
export type InputRenderValue = (value: any, schema: InputSchema) => React.ReactNode

export interface Input {
  default: InputComponent
  name?: InputName
  description?: InputDescription
  category?: InputCategory
  icon?: InputIcon
  schemaFields?: InputSchemaFields
  validateValue?: InputValidateValue
  formatValue?: InputFormatValue
  renderValue?: InputRenderValue
}

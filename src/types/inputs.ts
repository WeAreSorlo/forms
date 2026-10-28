import { FieldSchema } from '@/types/fields'
import { ValidationResponse } from '@/utils/validation'

export interface InputSchema {
  // A stable ID that never changes when the field is edited, renamed or moved,
  // so schema diffs can tell a rename from a removal plus an addition
  id?: string
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

export interface FieldValidationReport {
  isValid: boolean
  messages: Array<string>
  children?: ValidationReportChildren
}

export type ValidationReportChildren = ValidationReport | Promise<ValidationReport> | Array<ValidationReportChildren>

export interface ValidationReport {
  isValid: boolean
  fields: Record<string, FieldValidationReport>
}

export type InputComponent = React.ComponentType<any>

export type InputName = () => string
export type InputDescription = () => string
export type InputCategory = () => string
export type InputIcon = () => React.ReactNode
export type InputCoreFields = (defaultFields: Array<FieldSchema>) => Array<FieldSchema>
export type InputOptionFields = (defaultFields: Array<FieldSchema>) => Array<FieldSchema>

// Called by the schema builder with a field it is saving, so the input can finish its own options
export type InputPrepareSchema = (schema: FieldSchema) => FieldSchema

export type ValidationEnvironment = 'client' | 'server'

export type InputValidateValue = (value: any, schema: InputSchema) => InputValidationResponse
export type InputValidateClientValue = InputValidateValue
export type InputValidateServerValue = (
  value: any,
  schema: InputSchema,
) => InputValidationResponse | Promise<InputValidationResponse>
export type InputFormatValue = (value: any, schema: InputSchema) => string | null
export type InputRenderValue = (value: any, schema: InputSchema) => React.ReactNode

// On the server validateFields may return a promise, so implementations must
// return its results without inspecting them
export type InputValidateFields = (
  schema: Array<FieldSchema>,
  values: Record<string, any>,
) => ValidationReport | Promise<ValidationReport>
export type InputValidateChildren = (
  value: any,
  schema: InputSchema,
  validateFields: InputValidateFields,
) => ValidationReportChildren

export type InputPickFields = (schema: Array<FieldSchema>, values: Record<string, any>) => Record<string, any>
export type InputPickValue = (value: any, schema: InputSchema, pickFields: InputPickFields) => any

// Types a list of nested fields as an object type, e.g. '{ title: string }'
export type InputTypeFields = (schema: Array<FieldSchema>) => string
// The TypeScript type of the value pickValues keeps, e.g. 'string', or undefined for an input without a value
export type InputTypeValue = (schema: InputSchema, typeFields: InputTypeFields) => string | undefined

export interface Input {
  default: InputComponent
  name?: InputName
  description?: InputDescription
  category?: InputCategory
  icon?: InputIcon
  coreFields?: InputCoreFields
  optionFields?: InputOptionFields
  prepareSchema?: InputPrepareSchema
  validateValue?: InputValidateValue
  validateClientValue?: InputValidateClientValue
  validateServerValue?: InputValidateServerValue
  validateChildren?: InputValidateChildren
  pickValue?: InputPickValue
  typeValue?: InputTypeValue
  formatValue?: InputFormatValue
  renderValue?: InputRenderValue
}

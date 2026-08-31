import Form from '@/components/Form'

export { default as Field, useFieldContext } from '@/components/Field'
export { default as Fieldset } from '@/components/Fieldset'
export { default as Modal } from '@/components/Modal'
export {
  FieldReportContext,
  FormContext,
  FormStaticContext,
  useFormContext,
  useFormStaticContext,
} from '@/context/FormProvider'
export * as inputs from '@/inputs'
export {
  baseInputSchemaFields,
  pickValues,
  resolveValidateValue,
  validateInputSchemaFields,
  validateSchema,
  validateServerValues,
  validateValues,
} from '@/utils/inputs'
export { isEmail, isEmptyValue, validationError, validationReset, validationSuccess } from '@/utils/validation'

export type { FieldProps, OnValueChangeCallback } from '@/components/Field'
export type {
  FieldsetProps,
  OnMessagesChangeCallback,
  OnValidityChangeCallback,
  OnValuesChangeCallback,
} from '@/components/Fieldset'
export type { FormHandle, FormProps } from '@/components/Form'
export type { ModalProps } from '@/components/Modal'
export type {
  Context,
  DataContext,
  FieldPath,
  FieldStatePatch,
  FieldStateReport,
  StaticContext,
} from '@/context/FormProvider'
export type { FieldMessages, FieldSchema } from '@/types/fields'
export type { ValidateValuesOptions } from '@/utils/inputs'
export type {
  FieldValidationReport,
  Input,
  InputCategory,
  InputComponent,
  InputCoreFields,
  InputDescription,
  InputFormatValue,
  InputName,
  InputOptionFields,
  InputPickFields,
  InputPickValue,
  InputRenderValue,
  InputSchema,
  InputValidateChildren,
  InputValidateClientValue,
  InputValidateFields,
  InputValidateServerValue,
  InputValidateValue,
  InputValidationResponse,
  ValidationEnvironment,
  ValidationReport,
  ValidationReportChildren,
} from '@/types/inputs'
export type {
  ValidationResponse,
  ValidationResponseError,
  ValidationResponseReset,
  ValidationResponseSuccess,
} from '@/utils/validation'

export { Form }
export default Form

import Form from '@/components/Form'

export { default as Field, useFieldContext } from '@/components/Field'
export { default as Fieldset } from '@/components/Fieldset'
export { default as Modal } from '@/components/Modal'
export { FormContext, FormStaticContext, useFormContext, useFormStaticContext } from '@/context/FormProvider'
export * as inputs from '@/inputs'
export { baseInputSchemaFields, validateInputSchemaFields, validateSchema, validateValues } from '@/utils/inputs'
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
export type { Context, StaticContext } from '@/context/FormProvider'
export type { FieldMessages, FieldSchema } from '@/types/fields'
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
  InputRenderValue,
  InputSchema,
  InputValidateChildren,
  InputValidateFields,
  InputValidateValue,
  InputValidationResponse,
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

import Form from '@/components/Form'

export { default as Field, useFieldContext } from '@/components/Field'
export { default as Fieldset } from '@/components/Fieldset'
export { default as Modal } from '@/components/Modal'
export { FormContext, useFormContext } from '@/context/FormProvider'
export * as inputs from '@/inputs'
export { baseInputSchemaFields, validateInputSchemaFields, validateSchema } from '@/utils/inputs'
export { isEmail, isEmptyValue, validationError, validationReset, validationSuccess } from '@/utils/validation'

export type { FieldProps, OnValueChangeCallback } from '@/components/Field'
export type {
  FieldsetProps,
  OnMessagesChangeCallback,
  OnValidityChangeCallback,
  OnValuesChangeCallback,
} from '@/components/Fieldset'
export type { FormProps } from '@/components/Form'
export type { ModalProps } from '@/components/Modal'
export type { Context } from '@/context/FormProvider'
export type { FieldMessages, FieldSchema } from '@/types/fields'
export type {
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
  InputValidateValue,
  InputValidationResponse,
} from '@/types/inputs'
export type {
  ValidationResponse,
  ValidationResponseError,
  ValidationResponseReset,
  ValidationResponseSuccess,
} from '@/utils/validation'

export { Form }
export default Form

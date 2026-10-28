import Form from '@/components/Form'

export { default as Field, useFieldContext } from '@/components/Field'
export { default as Fieldset } from '@/components/Fieldset'
export { default as Modal } from '@/components/Modal'
export {
  FieldInjectionContext,
  FieldReportContext,
  FormContext,
  FormStaticContext,
  useFormContext,
  useFormStaticContext,
} from '@/context/FormProvider'
export * as inputs from '@/inputs'
export {
  baseInputSchemaFields,
  flattenValidationReport,
  pickValues,
  resolveValidateValue,
  validateInputSchemaFields,
  validateSchema,
  validateServerValues,
  validateValues,
} from '@/utils/inputs'
export { evaluateCondition, evaluateConditions, normaliseConditions, resolveConditionValue } from '@/utils/conditions'
export { validationMessage } from '@/utils/messages'
export { schemaToTypeScript } from '@/utils/typescript'
export {
  isEmail,
  isEmptyValue,
  isTel,
  isUrl,
  validationError,
  validationReset,
  validationSuccess,
} from '@/utils/validation'

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
  FieldInjectionContextValue,
  FieldPath,
  FieldReportContextValue,
  FieldStatePatch,
  FieldStateReport,
  StaticContext,
} from '@/context/FormProvider'
export type {
  ConditionGroup,
  ConditionOperator,
  FieldCondition,
  FieldConditions,
  FieldMessages,
  FieldSchema,
} from '@/types/fields'
export type { ConditionScopes } from '@/utils/conditions'
export type { FlatValidationReport, ValidateValuesOptions } from '@/utils/inputs'
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
  InputPrepareSchema,
  InputRenderValue,
  InputSchema,
  InputTypeFields,
  InputTypeValue,
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

import i18n from '@/i18n'
import { InputSchema } from '@/types/inputs'

// Resolve a validation message, preferring a per field override from the
// schema's options.messages over the built in translations, e.g.
// options: { messages: { required: 'Please enter your work email' } }
export function validationMessage(schema: InputSchema, key: string, params?: Record<string, any>): string {
  const override = schema.options?.messages?.[key]

  if (typeof override === 'string') {
    return Object.entries(params || {}).reduce((message, [name, value]) => {
      return message.replaceAll(`{{${name}}}`, String(value))
    }, override)
  }

  return i18n.t(`validation.${key}`, params)
}

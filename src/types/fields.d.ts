import { InputSchema } from '@/types/inputs'

export interface FieldSchema extends InputSchema {
  type: string
}

export type FieldErrors = Array<string>

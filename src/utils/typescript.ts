import { formatIdentifier } from '@/inputs/Identifier'
import { FieldSchema } from '@/types/fields'
import { Input, InputTypeFields } from '@/types/inputs'
import { normaliseConditions } from '@/utils/conditions'

// A union of literal types, e.g. '"red" | "blue"', or never when there are no values
export const literalUnion = (values: Array<any>) => values.map((value) => JSON.stringify(value)).join(' | ') || 'never'

// Quote names that aren't plain identifiers, e.g. "0-1/firstname"
const propertyName = (name: string) => (/^[A-Za-z_$][\w$]*$/.test(name) ? name : JSON.stringify(name))

// Write a TypeScript declaration for a schema's values, letting each input type its own value
export function schemaToTypeScript(
  schema: Array<FieldSchema>,
  inputs: Record<string, Input>,
  options: { name: string },
) {
  const typeName = formatIdentifier(options.name, 'pascal')
  if (!/^[A-Za-z]/.test(typeName)) throw new Error(`'${options.name}' does not make a valid type name`)

  const typeFields: InputTypeFields = (fields) => {
    const properties = fields.flatMap((field) => {
      const input = inputs?.[field.type]
      const type = input?.typeValue ? input.typeValue(field, typeFields) : 'unknown'

      // Inputs without a value, such as content, have no property
      if (type === undefined) return []

      // Fields that conditions can hide may be missing, like optional ones
      const optional = !field.required || normaliseConditions(field).length > 0
      return [`  ${propertyName(field.name)}${optional ? '?' : ''}: ${type.replace(/\n/g, '\n  ')}`]
    })

    return properties.length ? `{\n${properties.join('\n')}\n}` : '{}'
  }

  return `export type ${typeName} = ${typeFields(schema)}`
}

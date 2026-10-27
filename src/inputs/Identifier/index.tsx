import { useFieldContext } from '@/components/Field'
import { FieldScopeContext } from '@/context/FormProvider'
import {
  InputCategory,
  InputComponent,
  InputDescription,
  InputFormatValue,
  InputName,
  InputOptionFields,
  InputRenderValue,
  InputValidateValue,
} from '@/types/inputs'
import { resolveConditionValue } from '@/utils/conditions'
import { validateSchema } from '@/utils/inputs'
import { validationMessage } from '@/utils/messages'
import { isEmptyValue, validationError, validationSuccess } from '@/utils/validation'
import deburr from 'lodash/deburr'
import upperFirst from 'lodash/upperFirst'
import { useCallback, useContext, useEffect, useRef } from 'react'

export const name: InputName = () => 'Identifier'

export const description: InputDescription = () =>
  'A URL or code friendly name, such as a slug or API key, optionally generated from another field until it is edited.'

export const category: InputCategory = () => 'Standard'

export const optionFields: InputOptionFields = () => {
  return [
    {
      name: 'source',
      label: 'Generate from field',
      type: 'text',
      required: false,
      options: {
        placeholder: 'e.g. title',
      },
    },
    {
      name: 'format',
      label: 'Format',
      type: 'select',
      required: false,
      width: 50,
      options: {
        choices: [
          {
            value: 'kebab',
            label: 'Kebab case (my-page)',
          },
          {
            value: 'snake',
            label: 'Snake case (my_page)',
          },
          {
            value: 'camel',
            label: 'Camel case (myPage)',
          },
          {
            value: 'pascal',
            label: 'Pascal case (MyPage)',
          },
        ],
      },
    },
    {
      name: 'unicode',
      label: 'Non-Latin letters',
      type: 'boolean',
      required: false,
      width: 50,
      options: {
        message: 'Keep letters from other scripts, e.g. 東京',
      },
    },
  ]
}

const formats = ['kebab', 'snake', 'camel', 'pascal'] as const

type Format = (typeof formats)[number]

const separators: Record<Format, string> = { kebab: '-', snake: '_', camel: '', pascal: '' }

const formatOf = (options?: Record<string, any>): Format =>
  formats.includes(options?.format) ? options?.format : 'kebab'

// Words of letters and numbers, cased and joined for the format, e.g. 'Crème brûlée!' becomes 'creme-brulee'
// shortcut: other scripts are kept or dropped but never romanised, add a transliteration option when a site needs romanised identifiers
export function formatIdentifier(text: string, format: Format = 'kebab', unicode = false) {
  // Strip accents from Latin letters only, so letters such as the Cyrillic й keep their marks
  let plain = deburr(
    text
      .normalize('NFD')
      .replace(/(\p{Script=Latin})\p{M}+/gu, '$1')
      .normalize('NFC'),
  )

  // The code styles keep the words of an existing camel or Pascal case name, e.g. emailOptIn
  if (format !== 'kebab') {
    plain = plain.replace(/(\p{Lu}\p{Ll})/gu, ' $1').replace(/(\p{Ll})(\p{Lu})/gu, '$1 $2')
  }

  const words = plain
    .split(unicode ? /[^\p{L}\p{M}\p{N}]+/u : /[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((word) => word.toLowerCase())

  if (format === 'camel') return words.map((word, index) => (index ? upperFirst(word) : word)).join('')
  if (format === 'pascal') return words.map(upperFirst).join('')
  return words.join(separators[format])
}

// Whether a value is shaped like the formatter's output: allowed words, joined and cased for the format
function matchesFormat(value: string, format: Format, unicode: boolean) {
  const word = unicode ? '[\\p{L}\\p{M}\\p{N}]+' : '[a-zA-Z0-9]+'
  const separator = separators[format]
  const pattern = separator ? `^${word}(?:${separator}${word})*$` : `^${word}$`
  if (!new RegExp(pattern, 'u').test(value)) return false

  // Compare with the case the formatter gives, so letters without case suit every format
  const [first] = value
  if (format === 'camel') return first === first.toLowerCase()
  if (format === 'pascal') return first === first.toUpperCase()
  return value === value.toLowerCase()
}

export const validateValue: InputValidateValue = (value, schema) => {
  schema = validateSchema(schema)

  // Return early if the value is empty and the field is optional
  if (!schema.required && isEmptyValue(value)) {
    return validationSuccess(value)
  }

  // Check for an empty value
  if (schema.required && isEmptyValue(value)) {
    return validationError(value, validationMessage(schema, 'required'))
  }

  if (typeof value !== 'string') {
    return validationError(value, validationMessage(schema, 'invalid'))
  }

  const format = formatOf(schema.options)
  if (!matchesFormat(value, format, schema.options?.unicode === true)) {
    const example = formatIdentifier('my page', format)
    return validationError(value, validationMessage(schema, 'identifier', { example }))
  }

  // Only kebab, the URL style, may start with a digit
  if (format !== 'kebab' && !/^\p{L}/u.test(value)) {
    return validationError(value, validationMessage(schema, 'identifierStart'))
  }

  return validationSuccess(value)
}

export const formatValue: InputFormatValue = (value, schema) => {
  schema = validateSchema(schema)
  const validation = validateValue(value, schema)
  return validation.isValid ? validation.value : null
}

export const renderValue: InputRenderValue = (value, schema) => {
  return <>{formatValue(value, schema)}</>
}

const Component: InputComponent = function () {
  const { id, aria, schema, required, readonly, disabled, options, value = '', handleValidation } = useFieldContext()
  const format = formatOf(options)
  const unicode = options?.unicode === true

  // Resolve the source like a condition's field, nearest value scope first
  const scopes = useContext(FieldScopeContext)
  const source = options?.source ? resolveConditionValue(String(options.source), scopes || []) : undefined
  const sourceText = typeof source === 'string' || typeof source === 'number' ? String(source) : ''
  const sourceValue = formatIdentifier(sourceText, format, unicode)

  // The value last generated from the source, the field stops following once it holds anything else
  const generated = useRef<string | undefined>(undefined)

  const doValidation = useCallback(
    (input: any) => {
      handleValidation(validateValue(input, schema))
    },
    [handleValidation, schema],
  )

  const update = (next: string, fromSource = false) => {
    if (fromSource) generated.current = next
    if (next !== value) doValidation(next)
  }

  // Runs only when the source changes, following it while the field is empty or still generated
  useEffect(() => {
    if (isEmptyValue(value) || value === generated.current) update(sourceValue, true)
  }, [sourceValue])

  // An emptied field picks the source back up, and an invalid value is tidied into the format
  const onBlur = () => {
    if (isEmptyValue(value)) update(sourceValue, true)
    else if (!validateValue(value, schema).isValid) update(formatIdentifier(String(value), format, unicode))
  }

  return (
    <div className='iight-input__identifier'>
      <input
        className='iight-input'
        id={id}
        {...aria}
        type='text'
        value={value}
        onChange={(event) => doValidation(event.target.value)}
        onBlur={onBlur}
        required={required}
        readOnly={readonly}
        disabled={disabled}
      />
    </div>
  )
}

export default Component

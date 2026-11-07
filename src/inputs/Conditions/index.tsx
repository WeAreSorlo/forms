import { useFieldContext } from '@/components/Field'
import { FieldInjectionContext, FieldPath, FieldReportContext, useFormStaticContext } from '@/context/FormProvider'
import i18n from '@/i18n'
import { ConditionOperator, FieldSchema } from '@/types/fields'
import {
  InputCategory,
  InputComponent,
  InputDescription,
  InputFormatValue,
  InputName,
  InputOptionFields,
  InputPickValue,
  InputRenderValue,
  InputTypeValue,
  InputValidateChildren,
  InputValidateValue,
  ValidationReport,
} from '@/types/inputs'
import { normaliseConditions } from '@/utils/conditions'
import { validateSchema, validateValues } from '@/utils/inputs'
import { validationMessage } from '@/utils/messages'
import { literalUnion } from '@/utils/typescript'
import { isEmptyValue, validationError, validationSuccess } from '@/utils/validation'
import isEqual from 'lodash/isEqual.js'
import { Fragment, useContext, useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'

type Rule = Record<string, any>

// A value rules can test, listed in the fieldChoices option. Its type picks the operators and the value's control,
// and choices make the value a select.
interface FieldChoice {
  value: string
  label?: string
  type?: 'text' | 'number' | 'date' | 'boolean'
  choices?: Array<{ value: any; label?: string }>
  example?: string
}

export const name: InputName = () => 'Conditions'

export const description: InputDescription = () =>
  'Rules joined by AND and OR, in the shape conditional logic takes, such as for when to show something.'

export const category: InputCategory = () => 'Choice'

export const optionFields: InputOptionFields = () => {
  return [
    {
      name: 'fieldChoices',
      label: 'Fields',
      type: 'repeater',
      required: false,
      instructions: 'What rules can test, each a dotted path such as address.town. Without any, rules type their own.',
      options: {
        fields: [
          { name: 'value', label: 'Path', type: 'text', required: true, width: 25 },
          { name: 'label', label: 'Label', type: 'text', required: false, width: 25 },
          {
            name: 'type',
            label: 'Type',
            type: 'select',
            required: false,
            width: 25,
            options: {
              placeholder: 'Text',
              choices: [
                { value: 'number', label: 'Number' },
                { value: 'date', label: 'Date' },
                { value: 'boolean', label: 'Yes or no' },
              ],
            },
          },
          { name: 'example', label: 'Example', type: 'text', required: false, width: 25 },
        ],
      },
    },
  ]
}

const operators: Array<ConditionOperator> = [
  'equals',
  'notEquals',
  'contains',
  'notContains',
  'startsWith',
  'greaterThan',
  'lessThan',
  'empty',
  'notEmpty',
]

// The operators that suit each type of value
const operatorsByType: Record<string, Array<ConditionOperator>> = {
  text: ['equals', 'notEquals', 'contains', 'notContains', 'startsWith', 'empty', 'notEmpty'],
  number: ['equals', 'notEquals', 'greaterThan', 'lessThan', 'empty', 'notEmpty'],
  date: ['equals', 'notEquals', 'greaterThan', 'lessThan', 'empty', 'notEmpty'],
  boolean: ['equals', 'notEquals'],
  // Contains finds one of a checkbox's choices
  choices: ['equals', 'notEquals', 'contains', 'notContains', 'empty', 'notEmpty'],
}

// empty and notEmpty test the field alone
const takesValue = (operator: unknown) => operator !== 'empty' && operator !== 'notEmpty'

const fieldChoicesOf = (options?: Record<string, any>): undefined | Array<FieldChoice> => {
  return options?.fieldChoices?.length ? options.fieldChoices : undefined
}

// A listed field's operators, or all nine for a field that isn't listed
const operatorsFor = (choice?: FieldChoice) => {
  if (!choice) return operators
  if (choice.choices?.length) return operatorsByType.choices
  return operatorsByType[choice.type || 'text'] || operatorsByType.text
}

// An operator's words, which read "is after" and "is before" for dates
const operatorLabel = (operator: string, choice?: FieldChoice) => {
  const dated = choice?.type === 'date' && !choice.choices?.length
  if (dated && operator === 'greaterThan') return i18n.t('ui.operators.after')
  if (dated && operator === 'lessThan') return i18n.t('ui.operators.before')
  return operators.includes(operator as ConditionOperator) ? i18n.t(`ui.operators.${operator}`) : String(operator)
}

// Values compare as text, which the schema builder always saved them as, so a saved true or 18 shows as 'true' or '18'
const asText = (value: any): string => {
  if (value == null) return ''
  return typeof value === 'object' ? JSON.stringify(value) : String(value)
}

// The rules of each group. Conditions written in another shape core accepts, such as a flat list, show as groups too.
const groupsOf = (value: any): Array<Array<Rule>> => {
  if (!Array.isArray(value)) return []
  return normaliseConditions({ type: 'conditions', name: 'conditions', conditions: value }).map((rules) =>
    rules.map((rule) => (rule !== null && typeof rule === 'object' ? rule : {})),
  )
}

// A rule's value checked as a core field, which also picks the control it's shown in
const valueField = (choice?: FieldChoice): Omit<FieldSchema, 'name'> => {
  if (choice?.choices?.length) return { type: 'select', options: { choices: choice.choices } }
  if (choice?.type === 'boolean') {
    const yesNo = [
      { value: 'true', label: i18n.t('ui.conditions.yes') },
      { value: 'false', label: i18n.t('ui.conditions.no') },
    ]
    return { type: 'select', options: { choices: yesNo } }
  }
  if (choice?.type === 'number' || choice?.type === 'date') return { type: choice.type }
  return { type: 'text' }
}

// A rule's field, operator and value as core fields: a field from fieldChoices, an operator that suits it, and a
// value it can hold. From a list, the operator and value wait for the field.
const ruleFields = (rule: Rule, options?: Record<string, any>): Array<FieldSchema> => {
  const fieldChoices = fieldChoicesOf(options)
  const choice = fieldChoices?.find((item) => item.value === rule.field)
  const waiting = !!fieldChoices && isEmptyValue(rule.field)

  return [
    fieldChoices
      ? {
          name: 'field',
          type: 'select',
          required: true,
          options: { choices: fieldChoices.map((item) => ({ value: item.value, label: item.label })) },
        }
      : { name: 'field', type: 'text', required: true },
    {
      name: 'operator',
      type: 'select',
      required: !waiting,
      disabled: waiting,
      options: { choices: operatorsFor(choice).map((value) => ({ value, label: operatorLabel(value, choice) })) },
    },
    ...(takesValue(rule.operator)
      ? [{ name: 'value', ...valueField(choice), required: !waiting, disabled: waiting }]
      : []),
  ]
}

export const validateValue: InputValidateValue = (value, schema) => {
  schema = validateSchema(schema)

  // Return early if the value is empty and the field is optional, as no conditions match everything
  if (!schema.required && isEmptyValue(value)) {
    return validationSuccess(value)
  }

  // Check for an empty value
  if (schema.required && isEmptyValue(value)) {
    return validationError(value, validationMessage(schema, 'required'))
  }

  // Every group holds rules, as a group of none would always match
  const isRule = (rule: any) => rule !== null && typeof rule === 'object' && !Array.isArray(rule)
  const isGroup = (group: any) => Array.isArray(group?.rules) && group.rules.length >= 1 && group.rules.every(isRule)
  if (!Array.isArray(value) || !value.every(isGroup)) {
    return validationError(value, validationMessage(schema, 'invalid'))
  }

  // validateChildren checks each rule, so its messages sit under its controls
  return validationSuccess(value)
}

// A group's rules nest under rules, as a repeater's items would, so their messages are keyed like
// conditions.0.rules.1.value
const groupReport = (reports: Array<ValidationReport>): ValidationReport => {
  const isValid = reports.every((report) => report.isValid)
  return { isValid, fields: { rules: { isValid, messages: [], children: reports } } }
}

export const validateChildren: InputValidateChildren = (value, schema, validateFields) => {
  return groupsOf(value).map((rules) => {
    const reports = rules.map((rule) =>
      validateFields(ruleFields(rule, schema.options), { ...rule, value: asText(rule.value) }),
    )

    // On the server validateFields may return promises, so the group's report waits for them
    return reports.some((report) => report instanceof Promise)
      ? Promise.all(reports).then(groupReport)
      : groupReport(reports as Array<ValidationReport>)
  })
}

// Keep only each rule's field, operator and value
export const pickValue: InputPickValue = (value) => {
  if (!Array.isArray(value)) return undefined
  return value.map((group) => ({
    rules: (Array.isArray(group?.rules) ? group.rules : []).map((rule: Rule) => ({
      field: rule?.field,
      operator: rule?.operator,
      ...(rule?.value !== undefined && { value: rule.value }),
    })),
  }))
}

export const typeValue: InputTypeValue = () => {
  return `Array<{ rules: Array<{ field: string; operator: ${literalUnion(operators)}; value?: unknown }> }>`
}

// Reads as a sentence, e.g. "Category equals News and Featured equals Yes, or Spam equals No"
export const formatValue: InputFormatValue = (value, schema) => {
  schema = validateSchema(schema)
  const validation = validateValue(value, schema)
  if (!validation.isValid) return null

  const describe = (rule: Rule) => {
    const choice = fieldChoicesOf(schema.options)?.find((item) => item.value === rule.field)
    const valuePart = ruleFields(rule, schema.options).find((field) => field.name === 'value')
    const chosen = valuePart?.options?.choices?.find((item: any) => String(item.value) === asText(rule.value))
    const words = [choice?.label || rule.field, operatorLabel(rule.operator, choice)]
    return [...words, valuePart && (chosen?.label ?? asText(rule.value))].filter(Boolean).join(' ')
  }

  return groupsOf(value)
    .map((rules) => rules.map(describe).join(i18n.t('ui.conditions.joinRules')))
    .join(i18n.t('ui.conditions.joinGroups'))
}

export const renderValue: InputRenderValue = (value, schema) => {
  return <>{formatValue(value, schema)}</>
}

// One of a rule's controls, with its label, the hint under a value, and its messages under it
function RuleControl({
  id,
  column,
  context,
  field,
  value,
  messages,
  valid,
  hint,
  readonly,
  disabled,
  onChange,
}: {
  id: string
  column: string
  context: string
  field: FieldSchema
  value: string
  messages: Array<string>
  valid?: boolean
  hint?: string
  readonly?: boolean
  disabled?: boolean
  onChange: (value: string) => void
}) {
  const { t } = useTranslation()
  const choices: undefined | Array<{ value: any; label?: string }> = field.options?.choices
  const describedBy = [messages.length >= 1 && `${id}-messages`, hint && `${id}-hint`].filter(Boolean).join(' ')
  const control = {
    id,
    className: 'sorlo-input',
    value,
    'aria-describedby': describedBy || undefined,
    'aria-invalid': valid === false || undefined,
  }

  return (
    <div className={`sorlo-field ${valid === false ? 'sorlo-invalid' : 'sorlo-valid'}`}>
      <label className='sorlo-label' htmlFor={id}>
        {/* The space sits outside the hidden text, as some browsers trim the text inside it from the name */}
        {column} <span className='sorlo-visually-hidden'>{context}</span>
      </label>
      {choices ? (
        <select {...control} disabled={readonly || disabled} onChange={(event) => onChange(event.target.value)}>
          <option value=''>{t('ui.conditions.select')}</option>
          {/* A saved value that isn't one of the choices shows as it is, beside the message about it */}
          {value !== '' && !choices.some((choice) => String(choice.value) === value) && (
            <option value={value}>{value}</option>
          )}
          {choices.map((choice, choiceIndex) => (
            <option key={choiceIndex} value={String(choice.value)}>
              {choice.label ?? String(choice.value)}
            </option>
          ))}
        </select>
      ) : (
        <input
          {...control}
          // A date that isn't a plain one shows as text, as a date picker would hide it
          type={field.type === 'date' && (value === '' || /^\d{4}-\d{2}-\d{2}$/.test(value)) ? 'date' : 'text'}
          inputMode={field.type === 'number' ? 'decimal' : undefined}
          readOnly={readonly}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
      {hint && (
        <div className='sorlo-instructions' id={`${id}-hint`}>
          {hint}
        </div>
      )}
      {messages.length >= 1 && (
        <ul className='sorlo-messages' id={`${id}-messages`} role='alert'>
          {messages.map((message, messageIndex) => (
            <li key={messageIndex}>{message}</li>
          ))}
        </ul>
      )}
    </div>
  )
}

const columns = ['field', 'operator', 'value'] as const

const Component: InputComponent = function () {
  const { t } = useTranslation()
  const { id, labelId, label, aria, schema, options, readonly, disabled, value, setValue, setMessages, setValid } =
    useFieldContext()
  const { inputs, validationCounter } = useFormStaticContext()
  const report = useContext(FieldReportContext)
  const injection = useContext(FieldInjectionContext)
  const locked = readonly || disabled
  const root = useRef<HTMLDivElement>(null)

  const groups = useMemo(() => groupsOf(value), [value])
  const fieldChoices = fieldChoicesOf(options)

  // A control's path in the form, e.g. conditions.0.rules.1.value, which a server report keys its messages by
  const pathOf = (path: FieldPath) => report?.resolve(path).join('.')

  // Each control's field and what it says. Until the form validates, a rule shows what's wrong with it but not what
  // it's missing, as fields that haven't been filled in say nothing until then. A server report's messages show until
  // the rule changes.
  const shown = useMemo(() => {
    return groups.map((rules, groupIndex) =>
      rules.map((rule, ruleIndex) => {
        const fields = ruleFields(rule, options)
        const checked = validateValues(fields, { ...rule, value: asText(rule.value) }, inputs, {
          environment: 'client',
          allowIncomplete: validationCounter < 1,
        })

        return fields.map((field) => {
          const own = checked.fields[field.name]
          const key = report?.resolve([groupIndex, 'rules', ruleIndex, field.name]).join('.')
          const injected = key !== undefined && injection && key in injection.validity
          return injected
            ? { field, messages: injection.messages[key] || [], valid: injection.validity[key] }
            : { field, messages: own.messages, valid: own.isValid }
        })
      }),
    )
  }, [groups, options, inputs, validationCounter, report, injection])

  // Report every control's messages under its path, as nested fields do, removing the paths of rules that went
  const reportedPaths = useRef<Array<FieldPath>>([])
  useEffect(() => {
    if (!report) return
    const paths: Array<FieldPath> = []
    shown.forEach((rules, groupIndex) =>
      rules.forEach((parts, ruleIndex) => {
        for (const { field, messages, valid } of parts) {
          const path = [groupIndex, 'rules', ruleIndex, field.name]
          report.report(path, { messages, valid })
          paths.push(path)
        }
      }),
    )
    for (const path of reportedPaths.current) {
      if (!paths.some((other) => isEqual(other, path))) report.report(path, undefined)
    }
    reportedPaths.current = paths
  }, [report, shown])

  // And remove them all when the field goes, e.g. when its own conditions hide it
  useEffect(() => () => reportedPaths.current.forEach((path) => report?.report(path, undefined)), [report])

  // The field is invalid while any control is
  const validation = useMemo(() => (value !== undefined ? validateValue(value, schema) : null), [value, schema])
  const rulesValid = shown.every((rules) => rules.every((parts) => parts.every((part) => part.valid !== false)))

  useEffect(() => {
    if (!validation) return

    setMessages(validation.messages)

    if (validation.isValid === false || !rulesValid) {
      setValid(false)
    } else if (validation.isValid === true) {
      setValid(true)
    }
  }, [validation, rulesValid, setMessages, setValid])

  // Clear what a server report said under a path, e.g. a rule's, once it changes or moves
  const clearReported = (path: FieldPath) => {
    const prefix = pathOf(path)
    if (!injection || prefix === undefined) return
    for (const key of new Set([...Object.keys(injection.messages), ...Object.keys(injection.validity)])) {
      if (key.startsWith(`${prefix}.`)) injection.clear(key)
    }
  }

  // Groups are saved as { rules }, and a group goes with its last rule
  const write = (next: Array<Array<Rule>>) => {
    setValue(next.filter((rules) => rules.length >= 1).map((rules) => ({ rules })))
  }

  const changeRule = (groupIndex: number, ruleIndex: number, rule: Rule) => {
    clearReported([groupIndex, 'rules', ruleIndex])
    write(groups.map((rules, index) => (index === groupIndex ? rules.toSpliced(ruleIndex, 1, rule) : rules)))
  }

  // A field picked from the list keeps an operator that suits it, or starts at equals, and starts without a value
  const changePart = (groupIndex: number, ruleIndex: number, part: string, partValue: string) => {
    const rule = groups[groupIndex][ruleIndex]
    if (part !== 'field' || !fieldChoices) return changeRule(groupIndex, ruleIndex, { ...rule, [part]: partValue })

    const suits = operatorsFor(fieldChoices.find((choice) => choice.value === partValue)).includes(rule.operator)
    const operator = suits ? rule.operator : 'equals'
    changeRule(groupIndex, ruleIndex, partValue ? { field: partValue, operator } : { field: partValue })
  }

  // The control that takes focus once the rules change, by its rule's place among them all
  const focus = useRef<{ index: number; control: 'field' | 'remove' }>(undefined)

  useEffect(() => {
    const target = focus.current
    if (!target || !root.current) return
    focus.current = undefined

    const rules = root.current.querySelectorAll('.sorlo-input__conditions-rule')
    const rule = rules[Math.min(target.index, rules.length - 1)]
    const selector = target.control === 'field' ? '.sorlo-input' : '.sorlo-input__conditions-remove'

    // With no rules left, the button that adds one
    ;(rule?.querySelector<HTMLElement>(selector) ?? root.current.querySelector<HTMLElement>('button'))?.focus()
  }, [groups])

  const placeOf = (groupIndex: number, ruleIndex: number) => {
    return groups.slice(0, groupIndex).reduce((total, rules) => total + rules.length, 0) + ruleIndex
  }

  // Adding or removing a rule moves the rules after it, so what a server report said about them is cleared
  const restructure = (next: Array<Array<Rule>>, target: { index: number; control: 'field' | 'remove' }) => {
    clearReported([])
    focus.current = target
    write(next)
  }

  const addRule = (groupIndex: number, ruleIndex: number) => {
    restructure(
      groups.map((rules, index) => (index === groupIndex ? rules.toSpliced(ruleIndex + 1, 0, {}) : rules)),
      { index: placeOf(groupIndex, ruleIndex) + 1, control: 'field' },
    )
  }

  const addGroup = () => restructure([...groups, [{}]], { index: placeOf(groups.length, 0), control: 'field' })

  const removeRule = (groupIndex: number, ruleIndex: number) => {
    restructure(
      groups.map((rules, index) => (index === groupIndex ? rules.toSpliced(ruleIndex, 1) : rules)),
      { index: placeOf(groupIndex, ruleIndex), control: 'remove' },
    )
  }

  return (
    <div
      className='sorlo-input__conditions'
      ref={root}
      role='group'
      aria-labelledby={label ? labelId : undefined}
      aria-describedby={aria['aria-describedby']}
    >
      {groups.length === 0 && (
        <button
          className='sorlo-button'
          type='button'
          disabled={locked}
          onClick={(event) => {
            event.preventDefault()
            addGroup()
          }}
        >
          {t('ui.conditions.addRule')}
        </button>
      )}
      {groups.length >= 1 && (
        // Each control's label names its column too, so screen readers skip these
        <div className='sorlo-input__conditions-head' aria-hidden='true'>
          {columns.map((column) => (
            <span className='sorlo-label' key={column}>
              {t(`ui.conditions.${column}`)}
            </span>
          ))}
        </div>
      )}
      {groups.map((rules, groupIndex) => (
        <Fragment key={groupIndex}>
          {groupIndex >= 1 && (
            <div className='sorlo-input__conditions-or'>
              <span>{t('ui.conditions.or')}</span>
            </div>
          )}
          <div
            className='sorlo-input__conditions-group'
            role='group'
            aria-label={t('ui.conditions.group', { group: groupIndex + 1 })}
          >
            {rules.map((rule, ruleIndex) => {
              const place = { rule: ruleIndex + 1, group: groupIndex + 1 }
              const choice = fieldChoices?.find((item) => item.value === rule.field)
              const last = groupIndex === groups.length - 1 && ruleIndex === rules.length - 1

              return (
                <Fragment key={ruleIndex}>
                  {ruleIndex >= 1 && (
                    <div className='sorlo-input__conditions-and'>
                      <span>{t('ui.conditions.and')}</span>
                    </div>
                  )}
                  <div className='sorlo-input__conditions-rule'>
                    {columns.map((column) => {
                      const part = shown[groupIndex][ruleIndex].find(({ field }) => field.name === column)

                      // Without a value to compare, its column stays empty
                      if (!part) return <div key={column} />

                      return (
                        <RuleControl
                          key={column}
                          id={`${id}-${groupIndex}-${ruleIndex}-${column}`}
                          column={t(`ui.conditions.${column}`)}
                          context={t('ui.conditions.ofRule', place)}
                          field={part.field}
                          value={asText(rule[column])}
                          messages={part.messages}
                          valid={part.valid}
                          hint={
                            column === 'value' && choice?.example
                              ? t('ui.conditions.example', { example: choice.example })
                              : undefined
                          }
                          readonly={readonly}
                          disabled={disabled || part.field.disabled}
                          onChange={(partValue) => changePart(groupIndex, ruleIndex, column, partValue)}
                        />
                      )
                    })}
                    <div className='sorlo-input__conditions-actions'>
                      <button
                        className='sorlo-button'
                        type='button'
                        disabled={locked}
                        aria-label={t('ui.conditions.addRuleAfter', place)}
                        onClick={(event) => {
                          event.preventDefault()
                          addRule(groupIndex, ruleIndex)
                        }}
                      >
                        {t('ui.conditions.and')}
                      </button>
                      {last && (
                        <button
                          className='sorlo-button'
                          type='button'
                          disabled={locked}
                          aria-label={t('ui.conditions.addGroup')}
                          onClick={(event) => {
                            event.preventDefault()
                            addGroup()
                          }}
                        >
                          {t('ui.conditions.or')}
                        </button>
                      )}
                      <button
                        className='sorlo-button sorlo-input__conditions-remove'
                        type='button'
                        disabled={locked}
                        aria-label={t('ui.conditions.removeRule', place)}
                        onClick={(event) => {
                          event.preventDefault()
                          removeRule(groupIndex, ruleIndex)
                        }}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                </Fragment>
              )
            })}
          </div>
        </Fragment>
      ))}
    </div>
  )
}

export default Component

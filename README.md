# iight

An advanced, schema-driven form builder library for React. Forms are described as plain data, rendered from a set of pluggable inputs, and can include infinitely repeatable and nestable groups of fields. A built-in schema builder input lets end users construct form schemas from a UI — including the options of each field, which are themselves rendered as an iight form.

> **Status:** work in progress, not yet published to npm.

## Getting started

```sh
npm install
npm run dev        # start the demo at the vite dev server address
npm run test       # run the vitest suite
npm run typecheck  # strict TypeScript check
npm run build      # build dist/ with tsup
```

## Usage

```tsx
import Form, { FormHandle, ValidationReport } from 'iight'
import { useRef, useState } from 'react'

const schema = [
  { type: 'text', name: 'first_name', label: 'First name', required: true, width: 50 },
  { type: 'text', name: 'last_name', label: 'Last name', required: true, width: 50 },
  { type: 'email', name: 'email', label: 'Your email', required: true },
  {
    type: 'repeater',
    name: 'pets',
    label: 'Pets',
    options: {
      minimum: 1,
      fields: [{ type: 'text', name: 'petname', label: 'Pet name', required: true }],
    },
  },
]

export default function Example() {
  const formRef = useRef<FormHandle>(null)
  const [values, setValues] = useState<Record<string, any>>({})

  const onSubmit = () => {
    const report: ValidationReport = formRef.current!.validate()
    if (report.isValid) {
      // send values somewhere
    }
  }

  return (
    <>
      <Form ref={formRef} schema={schema} values={values} onValuesChange={setValues} />
      <button onClick={onSubmit}>Submit</button>
    </>
  )
}
```

`values`, `messages` and `validity` props are optional; the form manages them internally and reports changes through `onValuesChange`, `onMessagesChange` and `onValidityChange`. Passing a prop makes that piece controlled.

## Field schema

Every field supports `name` (required), `label`, `required`, `instructions`, `defaultValue`, `readonly`, `disabled`, `width` (percentage), `options`, and `conditions`/`conditionsMode` for conditional logic. The `type` selects the input, and `options` carries input-specific settings:

| Type            | Options                                                                     |
| --------------- | --------------------------------------------------------------------------- |
| `text`          | `placeholder`, `minLength`, `maxLength`                                      |
| `textarea`      | `placeholder`, `rows`, `minLength`, `maxLength`                              |
| `password`      | `placeholder`, `minLength`, `maxLength` — formatting masks the value         |
| `number`        | `placeholder`, `min`, `max`                                                  |
| `range`         | `min`, `max`, `step`                                                         |
| `email`         | `placeholder`, `multiple`, `minLength`, `maxLength`                          |
| `url`           | `placeholder` — http(s) addresses only                                       |
| `tel`           | `placeholder` — loose phone number validation                                |
| `date`          | `min`, `max` — value is an ISO date, e.g. `2026-01-15`                       |
| `time`          | `min`, `max` — value is a 24 hour time, e.g. `13:30`                         |
| `datetime`      | `min`, `max` — value is a local ISO datetime, e.g. `2026-01-15T13:30`        |
| `color`         | none — value is a hex color, e.g. `#ff0000`                                  |
| `hidden`        | `value` — carried into the form's values without any visible UI              |
| `boolean`       | `message` (the checkbox label)                                               |
| `select`        | `choices` (`{ value, label }` items), `placeholder`, `multiple`              |
| `radio`         | `choices` — single choice without a dropdown                                 |
| `checkbox`      | `choices` — multiple choice, value is an array                               |
| `group`         | `fields` (nested field schemas)                                              |
| `repeater`      | `fields`, `minimum`, `maximum`, `direction` (`y` vertical / `x` horizontal)  |
| `matrix`        | `fields`, `minimumRows`, `maximumRows`, `minimumColumns`, `maximumColumns`   |
| `content`       | `content` — a read only block with no value, for headings and instructions   |
| `schemabuilder` | none — its value is an array of field schemas                                |

Groups nest their values under the group's name, repeaters produce an array of objects, and matrices an array of rows of objects. All three can be nested inside each other without limit.

## Validation

Inputs validate on change. Calling `validate()` on the form ref validates everything at once — untouched fields included — displays the messages, and returns a `ValidationReport` with a nested breakdown per field. The same walk is available as a pure function, useful on a server:

```ts
import { inputs, validateValues } from 'iight'

const report = validateValues(schema, values, inputs)
```

Container fields aggregate: a group, repeater or matrix is marked invalid while any nested field is invalid, and repeaters/matrices also validate their own item, row and column bounds.

Validation messages can be overridden per field through `options.messages`, keyed by the built in message names (`required`, `invalid`, `minLength`, `min`, `email`, and so on), with `{{min}}`-style parameters interpolated:

```ts
{
  type: 'email',
  name: 'email',
  required: true,
  options: { messages: { required: 'Please enter your work email' } },
}
```

The form's `messages` and `validity` maps are keyed by path, so nested fields report alongside top-level ones — `address.town`, `pets.0.petname`, `grid.0.1.amount` — which makes error summaries a simple iteration. Entries are removed when a field unmounts, for example when a repeater row is deleted. A custom container input can join in by consuming `FieldReportContext` and providing a wrapped report to its children that prefixes their position, exactly as the matrix does for its cells; the schema builder instead provides `undefined` to keep its temporary editor state out of the maps.

## Conditional logic

Any field can declare `conditions` — rules that must match for it to be shown. Hidden fields keep their values but are skipped by rendering, validation and `pickValues`, on the client and the server alike:

```ts
{
  type: 'repeater',
  name: 'pets',
  conditions: [{ field: 'has_pets', operator: 'equals', value: true }],
  conditionsMode: 'all', // or 'any'
  options: { ... },
}
```

For and/or logic, conditions can be grouped: the field shows when **any** group has **all** of its rules matching. Groups are written as nested arrays, `{ rules }` objects (which is what the schema builder produces), or bare rules acting as a group of one:

```ts
// (country equals 'UK' AND age greaterThan 18) OR (role equals 'admin')
conditions: [
  [
    { field: 'country', operator: 'equals', value: 'UK' },
    { field: 'age', operator: 'greaterThan', value: 18 },
  ],
  [{ field: 'role', operator: 'equals', value: 'admin' }],
]
```

Operators: `equals`, `notEquals`, `contains`, `notContains`, `startsWith`, `greaterThan`, `lessThan`, `empty`, `notEmpty`. Equality compares loosely (`'18'` matches `18`), since values written in the schema builder are strings.

A condition's `field` is a dotted path resolved against the nearest value scope first, then outwards to the form's root — so inside a repeater item, `species` finds the sibling field in the same item, while `address.town` falls through to the root values, and `pets.0.petname` works from the root. The closest scope wins when names collide. The schema builder exposes conditions on every field under "Conditional logic".

## TypeScript

`Form`, `validateValues`, `validateServerValues` and `pickValues` accept a values type parameter, so a form whose shape you know gets typed values in and out:

```tsx
interface Profile {
  first_name: string
  pets: Array<{ petname: string }>
}

<Form<Profile> schema={schema} onValuesChange={(values) => values.pets} />
```

Deliberately, there is no compile time typing of individual field paths: schemas are runtime data — often built at runtime by the schema builder itself — so the type system cannot know what fields exist. The generics type the container, not the schema.

## Server side validation

The same schema validates a request body on a server. `pickValues` reduces the posted values to only the fields the schema defines (nested fields included, with hidden fields forced back to their fixed values), and `validateServerValues` returns the same `ValidationReport` shape as the client:

```ts
import { inputs, pickValues, validateServerValues } from 'iight'

app.post('/submit', async (request, response) => {
  const values = pickValues(schema, request.body, inputs)
  const report = await validateServerValues(schema, values, inputs)

  if (!report.isValid) {
    return response.status(422).json(report)
  }

  // The values are validated and contain only schema defined fields
})
```

An input's `validateValue` is the shared source of truth, and the optional `validateClientValue` and `validateServerValue` take priority in their own environment — the client resolves `validateClientValue ?? validateValue` and the server resolves `validateServerValue ?? validateValue`, so a client only validator can never weaken the server's checks. Server validators may be asynchronous (for example a database uniqueness check), which is why `validateServerValues` returns a promise; the synchronous `validateValues` accepts an `{ environment }` option for fully synchronous setups and throws if a validator returns a promise.

## Custom inputs

An input is a module implementing the `Input` interface: a default React component plus optional metadata (`name`, `description`, `category`), `validateValue` (with optional `validateClientValue`/`validateServerValue` overrides), `pickValue`, `formatValue`, `renderValue`, and `coreFields`/`optionFields` describing how the schema builder should configure it. The component reads everything it needs from `useFieldContext()`:

```tsx
import { useFieldContext, validationSuccess } from 'iight'

export const name = () => 'Shout'
export const validateValue = (value: any) => validationSuccess(value)

export default function Component() {
  const { id, value = '', handleValidation } = useFieldContext()
  return <input id={id} value={value} onChange={(e) => handleValidation(validateValue(e.target.value.toUpperCase()))} />
}
```

Register it per form: `<Form inputs={{ shout: shoutModule }} ... />`. Custom types are then available to schemas and appear in the schema builder.

A custom input that nests other fields can also export `validateChildren(value, schema, validateFields)` — this is how `validateValues` and `validate()` walk into it, and it is exactly what the core group, repeater and matrix inputs do; nothing about containers is special-cased. Return the results of `validateFields` without inspecting them, as they may be promises during server validation. The matching `pickValue(value, schema, pickFields)` lets a container recurse for `pickValues` in the same way.

## Styling and theming

Styles ship in three layers so the library is unstyled scaffolding by default, with themes as an opt-in:

```ts
import 'iight/styles/layout.scss' // scaffolding: layout and structure only
import 'iight/styles/base.scss' // the skin: maps --iight-* tokens onto class names
import 'iight/styles/themes/default.scss' // a theme: defines the tokens
```

`layout.scss` is structural (flex grids, widths, table layout) and leaves the browser's default styles intact, so an unthemed form looks like a native form that lays out correctly. `base.scss` maps every `--iight-*` token onto the library's class names, with every rule scoped to an active theme — any class starting with `iight-theme-` — so importing it without a theme changes nothing at all; the token contract lives there. Themes define the tokens under their scoping class (`.iight-theme-default`, `.iight-theme-dark`), which you attach via the `className` prop or any ancestor element:

```tsx
<Form className='iight-theme-default' schema={schema} />
```

A custom theme is a copy of `themes/default.scss` with a new class name (keeping the `iight-theme-` prefix so the skin activates) and different token values — no selectors, just tokens, so plain CSS works too. Because themes are class-scoped, different forms on one page can use different themes, and single tokens can be overridden inline or in state scopes (for example `.iight-invalid` remaps `--iight-messages-color` to `--iight-color-error`).

## i18n

All user-facing strings run through an isolated i18next instance (`src/i18n.ts`) with translations in `src/translations`, so the host application's own i18next setup is never touched.

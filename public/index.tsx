import Form from '../src'
import '../src/styles/base.scss'
import '../src/styles/layout.scss'
import '../src/styles/variables.scss'
import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'

const App = () => {
  const [rightFormValues, setRightFormValues] = useState<Record<string, any>>({})
  const [leftFormValues, setLeftFormValues] = useState<Record<string, any>>({
    builder: [
      {
        type: 'text',
        name: 'first_name',
        label: 'First name',
        required: true,
        width: 50,
        options: {
          placeholder: 'e.g. Bob',
        },
      },
      {
        type: 'text',
        name: 'last_name',
        label: 'Last name',
        required: true,
        width: 50,
        options: {
          placeholder: 'e.g. Ross',
        },
      },
      {
        type: 'email',
        name: 'email',
        label: 'Your email',
        required: true,
      },
      {
        type: 'group',
        name: 'address',
        label: 'Home address',
        options: {
          fields: [
            {
              type: 'text',
              name: 'line_1',
              label: 'Address line 1',
              required: true,
            },
            {
              type: 'text',
              name: 'line_2',
              label: 'Address line 2',
              required: false,
            },
            {
              type: 'text',
              name: 'town',
              label: 'Town',
              required: true,
            },
            {
              type: 'text',
              name: 'country',
              label: 'Country',
              required: true,
            },
          ],
        },
      },
      {
        type: 'boolean',
        name: 'marketing',
        label: 'Marketing opt-in',
        options: {
          message: 'Yes, I agree to recieve marketing emails',
        },
      },
      {
        type: 'group',
        name: 'dob',
        label: 'Date of birth',
        options: {
          fields: [
            {
              type: 'number',
              name: 'day',
              label: 'DD',
              required: true,
              width: 33.333,
            },
            {
              type: 'number',
              name: 'day',
              label: 'MM',
              required: true,
              width: 33.333,
            },
            {
              type: 'number',
              name: 'year',
              label: 'YYYY',
              required: true,
              width: 33.333,
            },
          ],
        },
      },
    ],
  })

  const buiderSchema = [
    {
      name: 'builder',
      label: 'Form Builder',
      type: 'schemabuilder',
    },
  ]

  const onLeftFormChange = (values: Record<string, any>) => {
    setLeftFormValues(values)
  }

  const onRightFormChange = (values: Record<string, any>) => {
    setRightFormValues(values)
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'space-evenly' }}>
      <div style={{ maxWidth: 600, width: '100%' }}>
        <Form onValuesChange={onLeftFormChange} values={leftFormValues} schema={buiderSchema} />
        <pre>{JSON.stringify(leftFormValues, null, 2)}</pre>
      </div>
      <div style={{ maxWidth: 600, width: '100%' }}>
        <Form schema={leftFormValues?.builder} onChange={onRightFormChange} />
        <pre>{JSON.stringify(rightFormValues, null, 2)}</pre>
      </div>
    </div>
  )
}

const root = createRoot(document.getElementById('root'))
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

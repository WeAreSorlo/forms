import Form, { FormHandle, ValidationReport } from '../src'
import '../src/styles/base.scss'
import '../src/styles/layout.scss'
import '../src/styles/themes/dark.scss'
import '../src/styles/themes/default.scss'
import React, { useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'

const App = () => {
  const [theme, setTheme] = useState('iight-theme-default')
  const rightFormRef = useRef<FormHandle>(null)
  const [rightFormReport, setRightFormReport] = useState<null | ValidationReport>(null)
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
        type: 'identifier',
        name: 'username',
        label: 'Username',
        instructions: 'Generated from your first name until you edit it.',
        required: true,
        options: {
          source: 'first_name',
          format: 'snake',
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
          message: 'Yes, I agree to receive marketing emails',
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
              name: 'month',
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
      {
        type: 'textarea',
        name: 'bio',
        label: 'Bio',
        instructions: 'A few sentences about yourself.',
        options: {
          placeholder: 'e.g. Painter of happy little trees',
          rows: 4,
          maxLength: 500,
        },
      },
      {
        type: 'number',
        name: 'age',
        label: 'Age',
        required: true,
        width: 50,
        options: {
          min: 18,
          max: 120,
          placeholder: 'e.g. 42',
        },
      },
      {
        type: 'select',
        name: 'favourite_colour',
        label: 'Favourite colour',
        width: 50,
        options: {
          placeholder: 'Pick a colour',
          choices: [
            {
              value: 'red',
              label: 'Red',
            },
            {
              value: 'green',
              label: 'Green',
            },
            {
              value: 'blue',
              label: 'Blue',
            },
            {
              value: 'greyscale',
              label: 'Greyscale',
              choices: [
                {
                  value: 'black',
                  label: 'Black',
                },
                {
                  value: 'white',
                  label: 'White',
                },
              ],
            },
          ],
        },
      },
      {
        type: 'select',
        name: 'interests',
        label: 'Interests',
        required: true,
        instructions: 'Select one or more.',
        options: {
          multiple: true,
          choices: [
            {
              value: 'painting',
              label: 'Painting',
            },
            {
              value: 'hiking',
              label: 'Hiking',
            },
            {
              value: 'cooking',
              label: 'Cooking',
            },
            {
              value: 'music',
              label: 'Music',
            },
          ],
        },
      },
      {
        type: 'repeater',
        name: 'pets',
        label: 'Pets',
        instructions: 'Repeats a set of fields vertically, seeded with one item.',
        options: {
          minimum: 1,
          maximum: 5,
          fields: [
            {
              type: 'text',
              name: 'petname',
              label: 'Name',
              required: true,
              width: 50,
            },
            {
              type: 'select',
              name: 'species',
              label: 'Species',
              required: true,
              width: 50,
              options: {
                placeholder: 'Pick a species',
                choices: [
                  {
                    value: 'dog',
                    label: 'Dog',
                  },
                  {
                    value: 'cat',
                    label: 'Cat',
                  },
                  {
                    value: 'other',
                    label: 'Other',
                  },
                ],
              },
            },
            {
              type: 'boolean',
              name: 'vaccinated',
              label: 'Vaccinated',
              options: {
                message: 'Yes',
              },
            },
          ],
        },
      },
      {
        type: 'repeater',
        name: 'nicknames',
        label: 'Nicknames',
        instructions: 'Repeats a single field horizontally, up to three times.',
        options: {
          direction: 'x',
          maximum: 3,
          fields: [
            {
              type: 'text',
              name: 'nickname',
              label: 'Nickname',
            },
          ],
        },
      },
      {
        type: 'matrix',
        name: 'scores',
        label: 'Scores',
        instructions: 'A table of numbers, repeatable in both directions.',
        options: {
          minimumRows: 1,
          maximumRows: 4,
          minimumColumns: 1,
          maximumColumns: 4,
          fields: [
            {
              type: 'number',
              name: 'score',
              label: 'Score',
              options: {
                min: 0,
                max: 10,
              },
            },
          ],
        },
      },
      {
        type: 'flexible',
        name: 'profile_page',
        label: 'Profile page',
        instructions: 'Built from text and link blocks, in any order.',
        options: {
          layouts: [
            {
              name: 'text',
              label: 'Text',
              fields: [
                {
                  type: 'text',
                  name: 'heading',
                  label: 'Heading',
                  required: true,
                },
                {
                  type: 'textarea',
                  name: 'body',
                  label: 'Body',
                  options: {
                    rows: 3,
                  },
                },
              ],
            },
            {
              name: 'links',
              label: 'Links',
              fields: [
                {
                  type: 'repeater',
                  name: 'links',
                  label: 'Links',
                  options: {
                    minimum: 1,
                    fields: [
                      {
                        type: 'text',
                        name: 'label',
                        label: 'Label',
                        required: true,
                        width: 50,
                      },
                      {
                        type: 'url',
                        name: 'url',
                        label: 'URL',
                        required: true,
                        width: 50,
                      },
                    ],
                  },
                },
              ],
            },
          ],
        },
      },
      {
        type: 'content',
        name: 'contact_section',
        label: 'Getting in touch',
        options: {
          content: 'A read only content block, useful for splitting long forms into sections.',
        },
      },
      {
        type: 'url',
        name: 'website',
        label: 'Website',
        width: 50,
        options: {
          placeholder: 'e.g. https://example.com',
        },
      },
      {
        type: 'tel',
        name: 'phone',
        label: 'Phone number',
        width: 50,
        // A flat list of rules, which the builder's conditional logic shows as a group
        conditions: [{ field: 'contact_method', operator: 'equals', value: 'phone' }],
        options: {
          placeholder: 'e.g. +44 7700 900123',
        },
      },
      {
        type: 'date',
        name: 'start_date',
        label: 'Start date',
        required: true,
        width: 50,
        options: {
          min: '2026-01-01',
        },
      },
      {
        type: 'time',
        name: 'best_time',
        label: 'Best time to call',
        width: 50,
        options: {
          min: '09:00',
          max: '17:00',
        },
      },
      {
        type: 'radio',
        name: 'contact_method',
        label: 'Preferred contact method',
        required: true,
        width: 50,
        options: {
          choices: [
            {
              value: 'email',
              label: 'Email',
            },
            {
              value: 'phone',
              label: 'Phone',
            },
            {
              value: 'post',
              label: 'Post',
            },
          ],
        },
      },
      {
        type: 'checkbox',
        name: 'newsletter_topics',
        label: 'Newsletter topics',
        width: 50,
        options: {
          choices: [
            {
              value: 'releases',
              label: 'New releases',
            },
            {
              value: 'tutorials',
              label: 'Tutorials',
            },
            {
              value: 'events',
              label: 'Events',
            },
          ],
        },
      },
      {
        type: 'range',
        name: 'satisfaction',
        label: 'Satisfaction',
        width: 50,
        options: {
          min: 0,
          max: 10,
          step: 1,
        },
      },
      {
        type: 'color',
        name: 'theme_color',
        label: 'Theme color',
        width: 50,
      },
      {
        type: 'conditions',
        name: 'banner_audience',
        label: 'Show the banner to visitors',
        instructions: 'Any group can match, and every rule in it must.',
        options: {
          fieldChoices: [
            { value: 'visitor.country', label: 'Country', example: 'United Kingdom' },
            { value: 'visitor.age', label: 'Age', type: 'number', example: '18' },
            { value: 'visitor.member', label: 'Member', type: 'boolean' },
            { value: 'visitor.joined', label: 'Joined', type: 'date' },
            {
              value: 'visitor.plan',
              label: 'Plan',
              choices: [
                { value: 'free', label: 'Free' },
                { value: 'pro', label: 'Pro' },
              ],
            },
          ],
        },
      },
      {
        type: 'text',
        name: 'reference',
        label: 'Reference code',
        instructions: 'Read only, populated from the schema default value.',
        readonly: true,
        defaultValue: 'IIGHT-0001',
      },
      {
        type: 'hidden',
        name: 'source',
        options: {
          value: 'demo',
        },
      },
    ],
  })

  const builderSchema = [
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
    <div style={{ display: 'flex', justifyContent: 'space-evenly', flexWrap: 'wrap' }}>
      <div style={{ width: '100%', padding: '1rem' }}>
        <label>
          Theme{' '}
          <select value={theme} onChange={(event) => setTheme(event.target.value)}>
            <option value=''>Scaffolding only</option>
            <option value='iight-theme-default'>Default</option>
            <option value='iight-theme-dark'>Dark</option>
          </select>
        </label>
      </div>
      <div style={{ maxWidth: 600, width: '100%' }}>
        <Form className={theme} onValuesChange={onLeftFormChange} values={leftFormValues} schema={builderSchema} />
        <pre>{JSON.stringify(leftFormValues, null, 2)}</pre>
      </div>
      <div style={{ maxWidth: 600, width: '100%' }}>
        <Form
          className={theme}
          ref={rightFormRef}
          schema={leftFormValues?.builder || []}
          onValuesChange={onRightFormChange}
        />
        <button type='button' onClick={() => setRightFormReport(rightFormRef.current?.validate() || null)}>
          Validate
        </button>
        {rightFormReport && <pre>{JSON.stringify(rightFormReport, null, 2)}</pre>}
        <pre>{JSON.stringify(rightFormValues, null, 2)}</pre>
      </div>
    </div>
  )
}

const root = createRoot(document.getElementById('root')!)
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

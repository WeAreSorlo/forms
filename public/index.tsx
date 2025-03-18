import Form from '../src'
import '../src/styles/base.scss'
import React, { useCallback, useState } from 'react'
import { createRoot } from 'react-dom/client'

const App = () => {
  const [dynamicSchema, setDynamicSchema] = useState([])
  const [dynamicValues, setDynamicValues] = useState<Record<string, any>>({})

  const onDynamicSchemaChange = useCallback(
    (values: Record<string, any>) => {
      values?.builder ? setDynamicSchema([...values.builder]) : undefined
    },
    [setDynamicSchema],
  )

  return (
    <div style={{ display: 'flex', justifyContent: 'space-evenly' }}>
      <div style={{ maxWidth: 600, width: '100%' }}>
        <Form
          onChange={onDynamicSchemaChange}
          schema={[
            {
              name: 'builder',
              label: 'Form Builder',
              type: 'schemabuilder',
            },
          ]}
        />
        <pre>{JSON.stringify(dynamicSchema, null, 2)}</pre>
      </div>
      <div style={{ maxWidth: 600, width: '100%' }}>
        <pre>{JSON.stringify(dynamicValues, null, 2)}</pre>
        <Form schema={dynamicSchema} onChange={setDynamicValues} />
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

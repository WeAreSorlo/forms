// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import i18next from 'i18next'
import { getI18n, initReactI18next, useTranslation } from 'react-i18next'
import { afterEach, expect, it } from 'vitest'

afterEach(cleanup)

function Greeting() {
  const { t } = useTranslation()
  return <p>{t('greeting')}</p>
}

it("leaves a host's react-i18next instance and defaults alone", async () => {
  // A host's own setup, with a global default that reaches every hook reading react-i18next's defaults
  const host = i18next.createInstance()
  await host.use(initReactI18next).init({
    lng: 'en',
    resources: { en: { translation: { app: { greeting: 'Hello from the host' } } } },
    react: { keyPrefix: 'app' },
  })

  // Imported after the host's setup, which importing it must not replace
  const { Form } = await import('@/index')
  render(
    <>
      <Greeting />
      <Form
        schema={[
          { type: 'greeting', name: 'greeting' },
          { type: 'matrix', name: 'grid', options: { fields: [{ type: 'number', name: 'amount', label: 'Amount' }] } },
        ]}
        inputs={{ greeting: { default: Greeting } }}
      />
    </>,
  )

  expect(getI18n()).toBe(host)
  // Once beside the form and once inside it, as a custom input
  expect(screen.getAllByText('Hello from the host')).toHaveLength(2)
  expect(screen.getByRole('button', { name: 'Add row' })).toBeTruthy()
})

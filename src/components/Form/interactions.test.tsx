// @vitest-environment jsdom
import Form, { FormHandle } from '@/components/Form'
import { ValidationReport } from '@/types/inputs'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createRef } from 'react'
import { afterEach, describe, expect, it } from 'vitest'

;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true

afterEach(cleanup)

describe('form interactions', () => {
  it('reports messages under path keys as fields are validated', async () => {
    const ref = createRef<FormHandle>()
    let latestMessages: Record<string, any> = {}
    let latestValidity: Record<string, boolean | undefined> = {}

    render(
      <Form
        ref={ref}
        schema={[
          { type: 'text', name: 'first_name', label: 'First name', required: true },
          {
            type: 'group',
            name: 'address',
            label: 'Address',
            options: { fields: [{ type: 'text', name: 'town', label: 'Town', required: true }] },
          },
          {
            type: 'repeater',
            name: 'pets',
            label: 'Pets',
            options: { fields: [{ type: 'text', name: 'petname', label: 'Pet name', required: true }] },
          },
        ]}
        values={{ pets: [{ petname: '' }] }}
        onMessagesChange={(messages) => (latestMessages = messages)}
        onValidityChange={(validity) => (latestValidity = validity)}
      />,
    )

    let report: undefined | ValidationReport
    act(() => {
      report = ref.current?.validate()
    })

    // The report is available synchronously
    expect(report?.isValid).toBe(false)

    // Every field's messages arrive under its path
    await waitFor(() => {
      expect(latestMessages['first_name']).toEqual(['This field is required.'])
      expect(latestMessages['address.town']).toEqual(['This field is required.'])
      expect(latestMessages['pets.0.petname']).toEqual(['This field is required.'])
    })

    // Containers aggregate their nested fields validity
    await waitFor(() => {
      expect(latestValidity['address']).toBe(false)
      expect(latestValidity['pets']).toBe(false)
      expect(latestValidity['address.town']).toBe(false)
      expect(latestValidity['pets.0.petname']).toBe(false)
    })
  })

  it('reports and clears messages as a user types', async () => {
    let latestMessages: Record<string, any> = {}

    render(
      <Form
        schema={[{ type: 'text', name: 'first_name', label: 'First name', options: { minLength: 3 } }]}
        onMessagesChange={(messages) => (latestMessages = messages)}
      />,
    )

    const input = screen.getByLabelText(/First name/)

    fireEvent.change(input, { target: { value: 'ab' } })

    await waitFor(() => {
      expect(latestMessages['first_name']).toEqual(['This field requires a minimum of 3 character(s).'])
    })

    fireEvent.change(input, { target: { value: 'abc' } })

    await waitFor(() => {
      expect(latestMessages['first_name']).toEqual([])
    })
  })

  it('shows an applied server report inline until fields report for themselves', async () => {
    const ref = createRef<FormHandle>()

    render(
      <Form
        ref={ref}
        schema={[
          { type: 'text', name: 'username', label: 'Username' },
          {
            type: 'repeater',
            name: 'pets',
            label: 'Pets',
            options: { fields: [{ type: 'text', name: 'petname', label: 'Pet name', required: true }] },
          },
        ]}
        values={{ username: 'taken', pets: [{ petname: '' }] }}
      />,
    )

    // A report as a server would produce it, including a server only error
    act(() => {
      ref.current?.applyReport({
        isValid: false,
        fields: {
          username: { isValid: false, messages: ['Already taken.'] },
          pets: {
            isValid: false,
            messages: [],
            children: [
              { isValid: false, fields: { petname: { isValid: false, messages: ['This field is required.'] } } },
            ],
          },
        },
      })
    })

    // Both the top level and the nested message display inline
    await waitFor(() => {
      expect(screen.getByText('Already taken.')).toBeTruthy()
      expect(screen.getByText('This field is required.')).toBeTruthy()
    })

    // Editing the nested field clears its injected message through live validation
    fireEvent.change(screen.getByLabelText(/Pet name/), { target: { value: 'Rex' } })

    await waitFor(() => {
      expect(screen.queryByText('This field is required.')).toBeNull()
      expect(screen.getByText('Already taken.')).toBeTruthy()
    })
  })

  it('shows and hides fields as their conditions change', async () => {
    render(
      <Form
        schema={[
          { type: 'boolean', name: 'has_pets', label: 'Has pets', options: { message: 'Yes' } },
          {
            type: 'repeater',
            name: 'pets',
            label: 'Pets',
            conditions: [{ field: 'has_pets', operator: 'equals', value: true }],
            options: {
              fields: [
                { type: 'text', name: 'petname', label: 'Pet name' },
                {
                  type: 'text',
                  name: 'chip_id',
                  label: 'Chip ID',
                  conditions: [{ field: 'petname', operator: 'notEmpty' }],
                },
              ],
            },
          },
        ]}
        values={{ pets: [{ petname: '' }] }}
      />,
    )

    // The repeater is hidden until the boolean is checked
    expect(screen.queryByText('Pets')).toBeNull()

    fireEvent.click(screen.getByLabelText(/Yes/))

    await waitFor(() => {
      expect(screen.getByText('Pets')).toBeTruthy()
      expect(screen.getByLabelText(/Pet name/)).toBeTruthy()
    })

    // The nested field is hidden until its sibling has a value
    expect(screen.queryByLabelText(/Chip ID/)).toBeNull()

    fireEvent.change(screen.getByLabelText(/Pet name/), { target: { value: 'Rex' } })

    await waitFor(() => {
      expect(screen.getByLabelText(/Chip ID/)).toBeTruthy()
    })
  })

  it('removes path entries when fields unmount', async () => {
    const ref = createRef<FormHandle>()
    let latestMessages: Record<string, any> = {}

    render(
      <Form
        ref={ref}
        schema={[
          {
            type: 'repeater',
            name: 'pets',
            label: 'Pets',
            options: { fields: [{ type: 'text', name: 'petname', label: 'Pet name', required: true }] },
          },
        ]}
        values={{ pets: [{ petname: '' }] }}
        onMessagesChange={(messages) => (latestMessages = messages)}
      />,
    )

    act(() => {
      ref.current?.validate()
    })

    await waitFor(() => {
      expect(latestMessages['pets.0.petname']).toEqual(['This field is required.'])
    })

    fireEvent.click(screen.getByText('Remove row'))

    await waitFor(() => {
      expect(latestMessages['pets.0.petname']).toBeUndefined()
    })
  })
})

/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import dayjs from 'dayjs'
import { Table } from '../../Table'

describe('Table/items', () => {
  it('should work', () => {
    render(<Table
      items={ [{ id: 'test' }] }
      dataSource={ [
        {
          id: 1,
          test: 'value'
        }
      ] }
    />)

    expect(screen.getByText('Test')).toBeInTheDocument()
    expect(screen.getByText('value')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'filter' })).toBeInTheDocument()
  })

  describe('options', () => {
    it('string', () => {
      render(<Table
        items={ [
          {
            id: 'test',
            options: [
              {
                label: 'label',
                value: 'value'
              }
            ]
          }
        ] }
        dataSource={ [
          {
            id: 1,
            test: 'value'
          }
        ] }
      />)

      expect(screen.getByText('Test')).toBeInTheDocument()
      expect(screen.getByText('label')).toBeInTheDocument()
    })

    it('string[]', async () => {
      const user = userEvent.setup()

      render(<Table
        items={ [
          {
            id: 'test',
            type: 'string[]',
            options: [
              {
                label: 'label',
                value: 'value'
              },
              {
                label: 'label2',
                value: 'value2'
              }
            ]
          }
        ] }
        dataSource={ [
          {
            id: 1,
            test: ['value', 'value']
          }
        ] }
      />)

      expect(screen.getByText('Test')).toBeInTheDocument()
      expect(screen.getByText('label, label')).toBeInTheDocument()

      await user.click(screen.getByRole('img', { name: 'filter' }))

      expect(screen.getByText('label2')).toBeInTheDocument()
    })

    it('optionsType is auto', async () => {
      const user = userEvent.setup()

      render(<Table
        items={ [
          {
            id: 'test',
            optionsType: 'auto',
          }
        ] }
        dataSource={ [
          {
            id: 'id',
            test: 'value'
          }
        ] }
      />)

      await user.click(screen.getByRole('img', { name: 'filter' }))

      expect(screen.getAllByText('value').length).toEqual(2)
    })
  })

  describe('boolean', () => {
    it('filter', async () => {
      const user = userEvent.setup({ pointerEventsCheck: 0 })

      render(<Table
        items={ [
          { id: 'id', },
          {
            id: 'test',
            type: 'boolean',
          }
        ] }
        dataSource={ [
          {
            id: 'undefined',
            test: undefined
          },
          {
            id: 'true',
            test: true
          },
          {
            id: 'false',
            test: false
          }
        ] }
      />)

      expect(screen.getAllByRole('cell').length).toBe(6)

      await user.click(screen.getAllByRole('img', { name: 'filter' })[1])
      await user.click(screen.getByRole('radio', { name: 'check' }))

      expect(screen.getAllByRole('cell').length).toBe(2)
      expect(screen.getByText('true')).toBeInTheDocument()

      await user.click(screen.getAllByRole('img', { name: 'filter' })[1])
      await user.click(screen.getByRole('radio', { name: 'close' }))

      expect(screen.getAllByRole('cell').length).toBe(2)
      expect(screen.getByText('false')).toBeInTheDocument()

      await user.click(screen.getAllByRole('img', { name: 'filter' })[1])
      await user.click(screen.getByRole('radio', { name: 'Empty' }))

      expect(screen.getAllByRole('cell').length).toBe(2)
      expect(screen.getByText('undefined')).toBeInTheDocument()

      await user.click(screen.getAllByRole('img', { name: 'filter' })[1])
      await user.click(screen.getByRole('radio', { name: 'All' }))

      expect(screen.getAllByRole('cell').length).toBe(6)
    })
  })

  describe('time', () => {
    it('undefined', async () => {
      render(<Table
        items={ [
          {
            id: 'test',
            type: 'time',
          }
        ] }
        dataSource={ [
          {
            id: 'undefined',
            test: undefined,
          },
        ] }
      />)
      expect(screen.getByText('Test')).toBeInTheDocument()
    })

    it('number', async () => {
      const now = dayjs()
      render(<Table
        items={ [
          {
            id: 'test',
            type: 'time',
          }
        ] }
        dataSource={ [
          {
            id: 'number',
            test: now.unix(),
          }
        ] }
      />)
      expect(screen.getByText('Test')).toBeInTheDocument()
      expect(screen.getByText(now.format('YYYY-MM-DD HH:mm:ss'))).toBeInTheDocument()
    })

    it('dayjs', () => {
      const now = dayjs()
      render(<Table
        items={ [
          {
            id: 'test',
            type: 'time',
          }
        ] }
        dataSource={ [
          {
            id: 'dayjs',
            test: now,
          }
        ] }
      />)
      expect(screen.getByText('Test')).toBeInTheDocument()
      expect(screen.getByText(now.format('YYYY-MM-DD HH:mm:ss'))).toBeInTheDocument()
    })

    it('string', () => {
      const now = dayjs()
      render(<Table
        items={ [
          {
            id: 'test',
            type: 'time',
          }
        ] }
        dataSource={ [
          {
            id: 'string',
            test: now.format()
          }
        ] }
      />)
      expect(screen.getByText('Test')).toBeInTheDocument()
      expect(screen.getByText(now.format('YYYY-MM-DD HH:mm:ss'))).toBeInTheDocument()
    })
  })

  describe('date', () => {
    it('undefined', async () => {
      render(<Table
        items={ [
          {
            id: 'test',
            type: 'date',
          }
        ] }
        dataSource={ [
          {
            id: 'undefined',
            test: undefined,
          },
        ] }
      />)
      expect(screen.getByText('Test')).toBeInTheDocument()
    })

    it('number', async () => {
      const now = dayjs()
      render(<Table
        items={ [
          {
            id: 'test',
            type: 'date',
          }
        ] }
        dataSource={ [
          {
            id: 'number',
            test: now.unix(),
          }
        ] }
      />)
      expect(screen.getByText('Test')).toBeInTheDocument()
      expect(screen.getByText(now.format('YYYY-MM-DD'))).toBeInTheDocument()
    })

    it('dayjs', () => {
      const now = dayjs()
      render(<Table
        items={ [
          {
            id: 'test',
            type: 'date',
          }
        ] }
        dataSource={ [
          {
            id: 'dayjs',
            test: now,
          }
        ] }
      />)
      expect(screen.getByText('Test')).toBeInTheDocument()
      expect(screen.getByText(now.format('YYYY-MM-DD'))).toBeInTheDocument()
    })

    it('string', () => {
      const now = dayjs()
      render(<Table
        items={ [
          {
            id: 'test',
            type: 'date',
          }
        ] }
        dataSource={ [
          {
            id: 'string',
            test: now.format()
          }
        ] }
      />)
      expect(screen.getByText('Test')).toBeInTheDocument()
      expect(screen.getByText(now.format('YYYY-MM-DD'))).toBeInTheDocument()
    })
  })
})

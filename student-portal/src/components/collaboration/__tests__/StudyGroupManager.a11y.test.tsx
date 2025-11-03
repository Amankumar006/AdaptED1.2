import { render, screen, fireEvent } from '../../../test/utils'
import { StudyGroupManager } from '../StudyGroupManager'
import { axe, toHaveNoViolations } from 'vitest-axe'

expect.extend(toHaveNoViolations)

const mockProps = {
  userId: 'user-1',
  onGroupJoin: vi.fn(),
  onGroupLeave: vi.fn(),
  onGroupCreate: vi.fn(),
}

describe('StudyGroupManager Accessibility', () => {
  beforeEach(() => {
    global.fetch = vi.fn()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should not have accessibility violations', async () => {
    const { container } = render(<StudyGroupManager {...mockProps} />)

    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('should have proper heading structure', () => {
    render(<StudyGroupManager {...mockProps} />)

    const heading = screen.getByRole('heading', { level: 2 })
    expect(heading).toBeInTheDocument()
    expect(heading).toHaveTextContent(/study groups/i)
  })

  it('should have accessible group list', () => {
    render(<StudyGroupManager {...mockProps} />)

    const groupList = screen.getByRole('list')
    expect(groupList).toBeInTheDocument()
    expect(groupList).toHaveAttribute('aria-label', 'Study groups')

    const groupItems = screen.getAllByRole('listitem')
    groupItems.forEach(item => {
      expect(item).toBeInTheDocument()
    })
  })

  it('should have accessible join/leave buttons', () => {
    render(<StudyGroupManager {...mockProps} />)

    const joinButtons = screen.getAllByRole('button', { name: /join/i })
    joinButtons.forEach(button => {
      expect(button).toHaveAttribute('aria-label')
    })
  })

  it('should support keyboard navigation', () => {
    render(<StudyGroupManager {...mockProps} />)

    const firstButton = screen.getAllByRole('button')[0]
    firstButton.focus()
    expect(firstButton).toHaveFocus()

    fireEvent.keyDown(firstButton, { key: 'Tab' })
    const nextButton = screen.getAllByRole('button')[1]
    expect(nextButton).toHaveFocus()
  })

  it('should announce group status changes', async () => {
    render(<StudyGroupManager {...mockProps} />)

    const joinButton = screen.getByRole('button', { name: /join/i })
    fireEvent.click(joinButton)

    const statusRegion = await screen.findByRole('status')
    expect(statusRegion).toBeInTheDocument()
    expect(statusRegion).toHaveTextContent(/joined/i)
  })

  it('should have accessible create group form', () => {
    render(<StudyGroupManager {...mockProps} />)

    const createButton = screen.getByRole('button', { name: /create group/i })
    fireEvent.click(createButton)

    const form = screen.getByRole('form')
    expect(form).toBeInTheDocument()

    const nameInput = screen.getByRole('textbox', { name: /group name/i })
    expect(nameInput).toBeInTheDocument()
    expect(nameInput).toHaveAttribute('required')

    const descriptionInput = screen.getByRole('textbox', { name: /description/i })
    expect(descriptionInput).toBeInTheDocument()
  })

  it('should handle form validation accessibly', async () => {
    render(<StudyGroupManager {...mockProps} />)

    const createButton = screen.getByRole('button', { name: /create group/i })
    fireEvent.click(createButton)

    const submitButton = screen.getByRole('button', { name: /create/i })
    fireEvent.click(submitButton)

    const errorMessage = await screen.findByRole('alert')
    expect(errorMessage).toBeInTheDocument()
    expect(errorMessage).toHaveTextContent(/required/i)
  })
})
/**
 * EmployeeCard behaviour tests.
 *
 * The card is a leaf presentational component with two pieces of real
 * behaviour worth protecting: navigation to the edit route, and the
 * confirm-then-delete guard. Everything else is field rendering, which is
 * asserted against the actual employee data.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import EmployeeCard from './EmployeeCard';
import { formatDate } from '../utils/validation';

const employee = {
  id: 'emp-1',
  name: 'Ada Lovelace',
  role: 'Principal Engineer',
  department: 'Engineering',
  email: 'ada@example.com',
  phone: '+1 (555) 123-4567',
  joiningDate: '2021-03-15',
};

/**
 * Render the card inside a router that also exposes a stand-in edit page, so a
 * real navigation can be observed instead of mocking useNavigate.
 */
const renderCard = (props = {}) =>
  render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route
          path="/"
          element={<EmployeeCard employee={employee} onDelete={vi.fn()} {...props} />}
        />
        <Route path="/edit/:id" element={<div>Edit page for employee</div>} />
      </Routes>
    </MemoryRouter>
  );

describe('EmployeeCard', () => {
  it('renders the employee name, role and department', () => {
    renderCard();

    expect(screen.getByRole('heading', { name: 'Ada Lovelace' })).toBeInTheDocument();
    expect(screen.getByText('Principal Engineer')).toBeInTheDocument();
    expect(screen.getByText('Engineering')).toBeInTheDocument();
  });

  it('renders the email as a mailto link and phone as a tel link', () => {
    renderCard();

    const emailLink = screen.getByRole('link', { name: /ada@example\.com/i });
    expect(emailLink).toHaveAttribute('href', 'mailto:ada@example.com');

    const phoneLink = screen.getByRole('link', { name: /\+1 \(555\) 123-4567/i });
    expect(phoneLink).toHaveAttribute('href', 'tel:+1 (555) 123-4567');
  });

  it('renders the joining date using the shared formatter', () => {
    renderCard();

    // Assert against the same formatter the component uses, avoiding timezone-
    // fragile hardcoded strings.
    expect(screen.getByText(`Joined: ${formatDate(employee.joiningDate)}`)).toBeInTheDocument();
  });

  it('exposes an accessible article label naming the employee', () => {
    renderCard();

    expect(screen.getByRole('article', { name: 'Employee: Ada Lovelace' })).toBeInTheDocument();
  });

  it('navigates to the edit route when Edit is clicked', async () => {
    const user = userEvent.setup();
    renderCard();

    await user.click(screen.getByRole('button', { name: /edit ada lovelace/i }));

    expect(screen.getByText('Edit page for employee')).toBeInTheDocument();
  });

  describe('delete', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('calls onDelete with the employee id after the user confirms', async () => {
      const user = userEvent.setup();
      const onDelete = vi.fn();
      vi.spyOn(window, 'confirm').mockReturnValue(true);

      renderCard({ onDelete });

      await user.click(screen.getByRole('button', { name: /delete ada lovelace/i }));

      expect(window.confirm).toHaveBeenCalledWith(
        'Are you sure you want to delete Ada Lovelace?'
      );
      expect(onDelete).toHaveBeenCalledWith('emp-1');
    });

    it('does not call onDelete when the user cancels the confirm dialog', async () => {
      const user = userEvent.setup();
      const onDelete = vi.fn();
      vi.spyOn(window, 'confirm').mockReturnValue(false);

      renderCard({ onDelete });

      await user.click(screen.getByRole('button', { name: /delete ada lovelace/i }));

      expect(onDelete).not.toHaveBeenCalled();
    });
  });

  it('falls back to _id when the record has no id (raw Mongo document)', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(
      <MemoryRouter>
        <EmployeeCard
          employee={{ ...employee, id: undefined, _id: 'mongo-id-9' }}
          onDelete={onDelete}
        />
      </MemoryRouter>
    );

    await user.click(screen.getByRole('button', { name: /delete ada lovelace/i }));

    expect(onDelete).toHaveBeenCalledWith('mongo-id-9');
    vi.restoreAllMocks();
  });
});

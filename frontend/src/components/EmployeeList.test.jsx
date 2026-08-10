/**
 * EmployeeList behaviour tests.
 *
 * The list is responsible for choosing between three mutually exclusive
 * renderings — loading, empty, and populated — and for wiring each card's
 * delete handler back to the parent. All three branches plus the passthrough
 * are covered here.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import EmployeeList from './EmployeeList';

const employees = [
  {
    id: '1',
    name: 'Grace Hopper',
    role: 'Rear Admiral',
    department: 'Navy',
    email: 'grace@example.com',
    phone: '+1 555 000 1111',
    joiningDate: '1944-01-01',
  },
  {
    id: '2',
    name: 'Alan Turing',
    role: 'Cryptanalyst',
    department: 'Research',
    email: 'alan@example.com',
    phone: '+1 555 000 2222',
    joiningDate: '1939-01-01',
  },
];

const renderList = (props) =>
  render(
    <MemoryRouter>
      <EmployeeList employees={employees} onDelete={vi.fn()} loading={false} {...props} />
    </MemoryRouter>
  );

describe('EmployeeList', () => {
  describe('loading state', () => {
    it('shows a loading indicator and hides the employee grid', () => {
      renderList({ loading: true });

      expect(screen.getByText('Loading employees...')).toBeInTheDocument();
      // A live region announces the state to assistive technology
      const status = screen.getByRole('status');
      expect(status).toHaveAttribute('aria-live', 'polite');
      expect(screen.queryByRole('list')).not.toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('shows the empty message for an empty array', () => {
      renderList({ employees: [] });

      expect(screen.getByText('No employees found')).toBeInTheDocument();
      expect(screen.queryByRole('list')).not.toBeInTheDocument();
    });

    it('shows the empty message when employees is null', () => {
      renderList({ employees: null });

      expect(screen.getByText('No employees found')).toBeInTheDocument();
    });
  });

  describe('populated state', () => {
    it('renders one card per employee inside a list landmark', () => {
      renderList();

      expect(screen.getByRole('list', { name: /employee directory/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Grace Hopper' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Alan Turing' })).toBeInTheDocument();
      expect(screen.getAllByRole('article')).toHaveLength(2);
    });

    it('forwards a card delete up to the onDelete handler with the right id', async () => {
      const user = userEvent.setup();
      const onDelete = vi.fn();
      vi.spyOn(window, 'confirm').mockReturnValue(true);

      renderList({ onDelete });

      await user.click(screen.getByRole('button', { name: /delete alan turing/i }));

      expect(onDelete).toHaveBeenCalledWith('2');
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });
  });
});

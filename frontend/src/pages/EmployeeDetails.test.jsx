/**
 * EmployeeDetails page tests.
 *
 * Verifies: all fields rendered for experienced, experience fields hidden for
 * fresher, edit/delete actions, loading/error states, and navigation by ID.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

vi.mock('../services/employeeService', () => ({
  getEmployees: vi.fn(),
  getEmployee: vi.fn(),
  createEmployee: vi.fn(),
  updateEmployee: vi.fn(),
  deleteEmployee: vi.fn(),
  getDepartments: vi.fn(),
  getDepartmentsWithCounts: vi.fn(),
}));

vi.mock('react-hot-toast', () => ({
  default: {
    loading: vi.fn(() => 'toast-id'),
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { getEmployee, deleteEmployee } from '../services/employeeService';
import toast from 'react-hot-toast';
import { EmployeeProvider } from '../context/EmployeeContext';
import EmployeeDetails from './EmployeeDetails';

const experienced = {
  id: 'emp-99',
  name: 'Michael Chen',
  role: 'Solution Architect',
  department: 'Engineering',
  email: 'michael@example.com',
  phone: '+1 555 100 0002',
  joiningDate: '2021-03-20T00:00:00.000Z',
  employmentType: 'Experienced',
  yearsOfExperience: 11,
  previousOrganization: 'Northwind Systems',
  previousRole: 'Principal Engineer',
  previousExperienceDescription: 'Designed distributed cloud platforms.',
};

const fresher = {
  id: 'emp-77',
  name: 'Arjun Mehta',
  role: 'Software Development Intern',
  department: 'Engineering',
  email: 'arjun@example.com',
  phone: '+1 555 100 0017',
  joiningDate: '2024-06-03T00:00:00.000Z',
  employmentType: 'Fresher',
};

const renderDetails = (id = 'emp-99') =>
  render(
    <MemoryRouter initialEntries={[`/employees/${id}`]}>
      <EmployeeProvider>
        <Routes>
          <Route path="/employees/:id" element={<EmployeeDetails />} />
          <Route path="/" element={<div>Home page</div>} />
          <Route path="/edit/:id" element={<div>Edit page</div>} />
        </Routes>
      </EmployeeProvider>
    </MemoryRouter>
  );

describe('EmployeeDetails page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('experienced employee', () => {
    it('renders all employee fields for an experienced employee', async () => {
      getEmployee.mockResolvedValue(experienced);
      renderDetails('emp-99');

      expect(await screen.findByRole('heading', { name: 'Michael Chen' })).toBeInTheDocument();
      expect(screen.getByText('Solution Architect')).toBeInTheDocument();
      expect(screen.getByText('Engineering')).toBeInTheDocument();
      expect(screen.getByText('michael@example.com')).toBeInTheDocument();
      expect(screen.getByText('+1 555 100 0002')).toBeInTheDocument();
      expect(screen.getByText('Experienced')).toBeInTheDocument();
    });

    it('shows previous experience section for experienced employees', async () => {
      getEmployee.mockResolvedValue(experienced);
      renderDetails('emp-99');

      await screen.findByRole('heading', { name: 'Michael Chen' });

      expect(screen.getByText('Previous Experience')).toBeInTheDocument();
      expect(screen.getByText('11 years')).toBeInTheDocument();
      expect(screen.getByText('Northwind Systems')).toBeInTheDocument();
      expect(screen.getByText('Principal Engineer')).toBeInTheDocument();
      expect(screen.getByText('Designed distributed cloud platforms.')).toBeInTheDocument();
    });
  });

  describe('fresher employee', () => {
    it('does NOT show previous experience fields', async () => {
      getEmployee.mockResolvedValue(fresher);
      renderDetails('emp-77');

      await screen.findByRole('heading', { name: 'Arjun Mehta' });

      expect(screen.getByText('Fresher')).toBeInTheDocument();
      expect(screen.queryByText('Previous Experience')).not.toBeInTheDocument();
      expect(screen.queryByText('Previous Organization')).not.toBeInTheDocument();
      expect(screen.queryByText('Total Experience')).not.toBeInTheDocument();
    });
  });

  describe('actions', () => {
    it('provides an Edit Employee link using the employee ID', async () => {
      getEmployee.mockResolvedValue(experienced);
      renderDetails('emp-99');

      await screen.findByRole('heading', { name: 'Michael Chen' });

      const editLink = screen.getByRole('link', { name: /edit employee/i });
      expect(editLink).toHaveAttribute('href', '/edit/emp-99');
    });

    it('deletes the employee and navigates home on confirmation', async () => {
      const user = userEvent.setup();
      getEmployee.mockResolvedValue(experienced);
      deleteEmployee.mockResolvedValue(undefined);
      vi.spyOn(window, 'confirm').mockReturnValue(true);

      renderDetails('emp-99');
      await screen.findByRole('heading', { name: 'Michael Chen' });

      await user.click(screen.getByRole('button', { name: /delete employee/i }));

      await waitFor(() => expect(deleteEmployee).toHaveBeenCalledWith('emp-99'));
      expect(toast.success).toHaveBeenCalled();
      expect(await screen.findByText('Home page')).toBeInTheDocument();
    });

    it('does nothing when the user cancels the delete confirmation', async () => {
      const user = userEvent.setup();
      getEmployee.mockResolvedValue(experienced);
      vi.spyOn(window, 'confirm').mockReturnValue(false);

      renderDetails('emp-99');
      await screen.findByRole('heading', { name: 'Michael Chen' });

      await user.click(screen.getByRole('button', { name: /delete employee/i }));

      expect(deleteEmployee).not.toHaveBeenCalled();
    });
  });

  describe('states', () => {
    it('shows a loading indicator while the employee is fetched', () => {
      getEmployee.mockReturnValue(new Promise(() => {}));
      renderDetails('emp-99');

      expect(screen.getByText(/loading employee details/i)).toBeInTheDocument();
    });

    it('shows an error state when the employee cannot be loaded', async () => {
      getEmployee.mockRejectedValue(new Error('Employee not found'));
      renderDetails('emp-99');

      // The heading in the error state says "Employee not found"
      expect(await screen.findByRole('heading', { name: /employee not found/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /back to directory/i })).toBeInTheDocument();
    });

    it('fetches the employee by the ID from the route', async () => {
      getEmployee.mockResolvedValue(fresher);
      renderDetails('emp-77');

      await screen.findByRole('heading', { name: 'Arjun Mehta' });
      expect(getEmployee).toHaveBeenCalledWith('emp-77');
    });
  });
});

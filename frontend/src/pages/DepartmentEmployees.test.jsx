/**
 * Department employees page tests.
 *
 * Verifies the core promise of this view: only employees of the selected
 * department are shown, the in-department search matches on name and role, and
 * the loading / empty / error states behave. Only the network layer and toasts
 * are mocked.
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

import { getEmployees, deleteEmployee } from '../services/employeeService';
import { EmployeeProvider } from '../context/EmployeeContext';
import DepartmentEmployees from './DepartmentEmployees';

const makeEmployee = (overrides) => ({
  id: '1',
  name: 'John Doe',
  role: 'React JS Developer',
  department: 'Engineering',
  email: 'john@example.com',
  phone: '+1 555 000 1111',
  joiningDate: '2022-01-01',
  employmentType: 'Fresher',
  ...overrides,
});

const engineeringTeam = [
  makeEmployee({ id: '1', name: 'John', role: 'React JS Developer' }),
  makeEmployee({ id: '2', name: 'Rahul', role: 'Microsoft 365 Developer Associate' }),
  makeEmployee({ id: '3', name: 'Emily', role: 'Solution Architect' }),
];

const renderPage = (department = 'Engineering') =>
  render(
    <MemoryRouter initialEntries={[`/departments/${encodeURIComponent(department)}`]}>
      <EmployeeProvider>
        <Routes>
          <Route
            path="/departments/:departmentName"
            element={<DepartmentEmployees />}
          />
          <Route path="/" element={<div>Departments page</div>} />
          <Route path="/add" element={<div>Add page</div>} />
        </Routes>
      </EmployeeProvider>
    </MemoryRouter>
  );

// Queried by role because the surrounding search landmark shares the same
// accessible name as the input's label.
const searchBox = () =>
  screen.getByRole('searchbox', { name: /search employees in engineering/i });

describe('Department employees page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('department scoping', () => {
    it('requests employees filtered by the department in the route', async () => {
      getEmployees.mockResolvedValue(engineeringTeam);

      renderPage('Engineering');

      await waitFor(() =>
        expect(getEmployees).toHaveBeenCalledWith({ department: 'Engineering' })
      );
    });

    it('decodes a department name containing spaces', async () => {
      getEmployees.mockResolvedValue([]);

      renderPage('Digital Marketing');

      await waitFor(() =>
        expect(getEmployees).toHaveBeenCalledWith({ department: 'Digital Marketing' })
      );
      expect(
        screen.getByRole('heading', { level: 1, name: 'Digital Marketing' })
      ).toBeInTheDocument();
    });

    it('shows the department name and headcount', async () => {
      getEmployees.mockResolvedValue(engineeringTeam);

      renderPage();

      expect(
        await screen.findByRole('heading', { level: 1, name: 'Engineering' })
      ).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('Employees')).toBeInTheDocument();
    });

    it('renders only employees of the selected department', async () => {
      // The API result deliberately includes an out-of-department record to
      // prove the page re-asserts the filter client-side.
      getEmployees.mockResolvedValue([
        ...engineeringTeam,
        makeEmployee({ id: '9', name: 'Outsider', department: 'Sales' }),
      ]);

      renderPage('Engineering');

      await screen.findByRole('heading', { name: 'John' });
      expect(screen.queryByRole('heading', { name: 'Outsider' })).not.toBeInTheDocument();
      expect(screen.getAllByRole('article')).toHaveLength(3);
    });
  });

  describe('search within the department', () => {
    it('matches on employee role', async () => {
      const user = userEvent.setup();
      getEmployees.mockResolvedValue(engineeringTeam);

      renderPage();
      await screen.findByRole('heading', { name: 'John' });

      await user.type(searchBox(), 'react');

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'John' })).toBeInTheDocument();
        expect(screen.queryByRole('heading', { name: 'Emily' })).not.toBeInTheDocument();
        expect(screen.queryByRole('heading', { name: 'Rahul' })).not.toBeInTheDocument();
      });
    });

    it('matches a different role term', async () => {
      const user = userEvent.setup();
      getEmployees.mockResolvedValue(engineeringTeam);

      renderPage();
      await screen.findByRole('heading', { name: 'John' });

      await user.type(searchBox(), 'architect');

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Emily' })).toBeInTheDocument();
        expect(screen.queryByRole('heading', { name: 'John' })).not.toBeInTheDocument();
      });
    });

    it('matches on employee name', async () => {
      const user = userEvent.setup();
      getEmployees.mockResolvedValue(engineeringTeam);

      renderPage();
      await screen.findByRole('heading', { name: 'John' });

      await user.type(searchBox(), 'rahul');

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Rahul' })).toBeInTheDocument();
        expect(screen.queryByRole('heading', { name: 'John' })).not.toBeInTheDocument();
      });
    });

    it('is case insensitive', async () => {
      const user = userEvent.setup();
      getEmployees.mockResolvedValue(engineeringTeam);

      renderPage();
      await screen.findByRole('heading', { name: 'John' });

      await user.type(searchBox(), 'ARCHITECT');

      await waitFor(() =>
        expect(screen.getByRole('heading', { name: 'Emily' })).toBeInTheDocument()
      );
    });

    it('shows "No employees match your search." when nothing matches', async () => {
      const user = userEvent.setup();
      getEmployees.mockResolvedValue(engineeringTeam);

      renderPage();
      await screen.findByRole('heading', { name: 'John' });

      await user.type(searchBox(), 'zzzznomatch');

      expect(
        await screen.findByText('No employees match your search.')
      ).toBeInTheDocument();
    });

    it('reports the filtered count', async () => {
      const user = userEvent.setup();
      getEmployees.mockResolvedValue(engineeringTeam);

      renderPage();
      await screen.findByRole('heading', { name: 'John' });

      await user.type(searchBox(), 'react');

      expect(await screen.findByText(/Showing/)).toHaveTextContent(
        'Showing 1 of 3 employees'
      );
    });
  });

  describe('states', () => {
    it('shows a loading indicator while employees load', async () => {
      getEmployees.mockReturnValue(new Promise(() => {}));

      renderPage();

      expect(await screen.findByText('Loading employees...')).toBeInTheDocument();
    });

    it('shows the empty-department message when it has no employees', async () => {
      getEmployees.mockResolvedValue([]);

      renderPage();

      expect(
        await screen.findByText('No employees found in this department.')
      ).toBeInTheDocument();
    });

    it('shows a friendly retryable error when loading fails', async () => {
      const user = userEvent.setup();
      getEmployees.mockRejectedValueOnce(new Error('Network Error'));

      renderPage();

      expect(
        await screen.findByText('Unable to load employees. Please try again.')
      ).toBeInTheDocument();

      getEmployees.mockResolvedValueOnce(engineeringTeam);
      await user.click(screen.getByRole('button', { name: /try again/i }));

      expect(await screen.findByRole('heading', { name: 'John' })).toBeInTheDocument();
    });
  });

  describe('navigation and actions', () => {
    it('links back to the departments overview', async () => {
      const user = userEvent.setup();
      getEmployees.mockResolvedValue(engineeringTeam);

      renderPage();
      await screen.findByRole('heading', { name: 'John' });

      await user.click(screen.getByRole('link', { name: /back to departments/i }));

      expect(await screen.findByText('Departments page')).toBeInTheDocument();
    });

    it('deletes an employee after confirmation', async () => {
      const user = userEvent.setup();
      getEmployees.mockResolvedValue(engineeringTeam);
      deleteEmployee.mockResolvedValue(undefined);
      vi.spyOn(window, 'confirm').mockReturnValue(true);

      renderPage();
      await screen.findByRole('heading', { name: 'John' });

      await user.click(screen.getByRole('button', { name: /delete john/i }));

      await waitFor(() => expect(deleteEmployee).toHaveBeenCalledWith('1'));
      // Removed from the visible list without a refetch
      await waitFor(() =>
        expect(screen.queryByRole('heading', { name: 'John' })).not.toBeInTheDocument()
      );
    });
  });

  describe('experienced employee details', () => {
    it('shows experience details for an experienced employee only', async () => {
      getEmployees.mockResolvedValue([
        makeEmployee({
          id: '1',
          name: 'Senior Dev',
          employmentType: 'Experienced',
          yearsOfExperience: 7,
          previousOrganization: 'Globex',
          previousRole: 'Lead Engineer',
        }),
        makeEmployee({ id: '2', name: 'New Grad', employmentType: 'Fresher' }),
      ]);

      renderPage();
      await screen.findByRole('heading', { name: 'Senior Dev' });

      expect(screen.getByText('Experienced')).toBeInTheDocument();
      expect(screen.getByText('7 years')).toBeInTheDocument();
      expect(screen.getByText('Globex')).toBeInTheDocument();
      expect(screen.getByText('Lead Engineer')).toBeInTheDocument();

      // The fresher's card shows the badge but no experience rows
      expect(screen.getByText('Fresher')).toBeInTheDocument();
      expect(screen.queryAllByText('Previous:')).toHaveLength(1);
    });
  });
});

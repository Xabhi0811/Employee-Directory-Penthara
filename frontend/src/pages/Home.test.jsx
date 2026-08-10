/**
 * Home page tests: department cards, department search, and the loading /
 * empty / error states.
 *
 * Home is the department-first entry point, so these tests assert that
 * departments and their counts come from the API (never hard-coded), that the
 * search filters them, and that each data state renders correctly. Only the
 * network layer and toasts are mocked; context, router and components are real.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
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

import { getDepartmentsWithCounts, getEmployees } from '../services/employeeService';
import { EmployeeProvider } from '../context/EmployeeContext';
import Home from './Home';

const departments = [
  { name: 'Engineering', employeeCount: 12 },
  { name: 'Digital Marketing', employeeCount: 8 },
  { name: 'Human Resources', employeeCount: 5 },
];

const renderHome = () =>
  render(
    <MemoryRouter initialEntries={['/']}>
      <EmployeeProvider>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route
            path="/departments/:departmentName"
            element={<div>Department employees page</div>}
          />
          <Route path="/add" element={<div>Add page</div>} />
        </Routes>
      </EmployeeProvider>
    </MemoryRouter>
  );

// Queried by role because the surrounding search landmark shares the same
// accessible name as the input's label.
const searchBox = () =>
  screen.getByRole('searchbox', { name: /filter departments/i });

describe('Home page (departments)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('department rendering', () => {
    it('renders a card per department with its employee count from the API', async () => {
      getDepartmentsWithCounts.mockResolvedValue(departments);

      renderHome();

      expect(await screen.findByText('Engineering')).toBeInTheDocument();
      expect(screen.getByText('Digital Marketing')).toBeInTheDocument();
      expect(screen.getByText('Human Resources')).toBeInTheDocument();

      // Counts come from the service response, not from hard-coded values
      expect(screen.getByText('12')).toBeInTheDocument();
      expect(screen.getByText('8')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(getDepartmentsWithCounts).toHaveBeenCalledTimes(1);
    });

    it('does not list individual employees on the home page', async () => {
      getDepartmentsWithCounts.mockResolvedValue(departments);

      renderHome();
      await screen.findByText('Engineering');

      // Employee cards are rendered as articles; none should be present here
      expect(screen.queryAllByRole('article')).toHaveLength(0);
    });

    it('uses singular wording for a department with one employee', async () => {
      getDepartmentsWithCounts.mockResolvedValue([
        { name: 'Sales', employeeCount: 1 },
      ]);

      renderHome();

      expect(await screen.findByText('Employee')).toBeInTheDocument();
    });

    it('renders each department as an accessible link to its employees', async () => {
      getDepartmentsWithCounts.mockResolvedValue(departments);

      renderHome();

      const link = await screen.findByRole('link', {
        name: /engineering, 12 employees\. view employees/i,
      });
      expect(link).toHaveAttribute('href', '/departments/Engineering');
    });

    it('shows a summary of department and employee totals', async () => {
      getDepartmentsWithCounts.mockResolvedValue(departments);

      renderHome();

      // 3 departments, 12 + 8 + 5 = 25 employees
      expect(await screen.findByText(/3 departments · 25 employees/)).toBeInTheDocument();
    });
  });

  describe('clicking a department', () => {
    it('navigates to that department\'s employee page', async () => {
      const user = userEvent.setup();
      getDepartmentsWithCounts.mockResolvedValue(departments);

      renderHome();
      await screen.findByText('Engineering');

      await user.click(screen.getByRole('link', { name: /engineering, 12 employees/i }));

      expect(await screen.findByText('Department employees page')).toBeInTheDocument();
    });

    it('encodes department names containing spaces in the link', async () => {
      getDepartmentsWithCounts.mockResolvedValue(departments);

      renderHome();
      const link = await screen.findByRole('link', { name: /digital marketing, 8/i });

      expect(link).toHaveAttribute('href', '/departments/Digital%20Marketing');
    });
  });

  describe('department search', () => {
    it('shows only departments matching the search term', async () => {
      const user = userEvent.setup();
      getDepartmentsWithCounts.mockResolvedValue(departments);

      renderHome();
      await screen.findByText('Engineering');

      await user.type(searchBox(), 'marketing');

      await waitFor(() => {
        expect(screen.getByText('Digital Marketing')).toBeInTheDocument();
        expect(screen.queryByText('Engineering')).not.toBeInTheDocument();
        expect(screen.queryByText('Human Resources')).not.toBeInTheDocument();
      });
    });

    it('matches case-insensitively', async () => {
      const user = userEvent.setup();
      getDepartmentsWithCounts.mockResolvedValue(departments);

      renderHome();
      await screen.findByText('Engineering');

      await user.type(searchBox(), 'ENGINEERING');

      await waitFor(() => {
        expect(screen.getByText('Engineering')).toBeInTheDocument();
        expect(screen.queryByText('Digital Marketing')).not.toBeInTheDocument();
      });
    });

    it('ignores surrounding whitespace', async () => {
      const user = userEvent.setup();
      getDepartmentsWithCounts.mockResolvedValue(departments);

      renderHome();
      await screen.findByText('Engineering');

      await user.type(searchBox(), '   human   ');

      await waitFor(() => {
        expect(screen.getByText('Human Resources')).toBeInTheDocument();
        expect(screen.queryByText('Engineering')).not.toBeInTheDocument();
      });
    });

    it('reports how many departments matched', async () => {
      const user = userEvent.setup();
      getDepartmentsWithCounts.mockResolvedValue(departments);

      renderHome();
      await screen.findByText('Engineering');

      await user.type(searchBox(), 'marketing');

      expect(await screen.findByText('1 of 3 departments')).toBeInTheDocument();
    });

    it('shows "No departments found." when nothing matches', async () => {
      const user = userEvent.setup();
      getDepartmentsWithCounts.mockResolvedValue(departments);

      renderHome();
      await screen.findByText('Engineering');

      await user.type(searchBox(), 'nonexistent department');

      expect(await screen.findByText('No departments found.')).toBeInTheDocument();
    });

    it('restores the full list when the search is cleared', async () => {
      const user = userEvent.setup();
      getDepartmentsWithCounts.mockResolvedValue(departments);

      renderHome();
      await screen.findByText('Engineering');

      await user.type(searchBox(), 'marketing');
      await waitFor(() =>
        expect(screen.queryByText('Engineering')).not.toBeInTheDocument()
      );

      await user.clear(searchBox());

      await waitFor(() => {
        expect(screen.getByText('Engineering')).toBeInTheDocument();
        expect(screen.getByText('Human Resources')).toBeInTheDocument();
      });
    });
  });

  describe('loading state', () => {
    it('shows a loading state until departments resolve', async () => {
      let resolveDepartments;
      getDepartmentsWithCounts.mockReturnValue(
        new Promise((resolve) => {
          resolveDepartments = resolve;
        })
      );

      renderHome();

      expect(
        screen.getByRole('status', { name: /loading departments/i })
      ).toBeInTheDocument();

      resolveDepartments(departments);

      expect(await screen.findByText('Engineering')).toBeInTheDocument();
      expect(
        screen.queryByRole('status', { name: /loading departments/i })
      ).not.toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('shows "No departments available." when there are none', async () => {
      getDepartmentsWithCounts.mockResolvedValue([]);

      renderHome();

      expect(await screen.findByText('No departments available.')).toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('shows a friendly error message when the request fails', async () => {
      getDepartmentsWithCounts.mockRejectedValue(new Error('Network Error'));

      renderHome();

      expect(
        await screen.findByText('Unable to load departments. Please try again.')
      ).toBeInTheDocument();
      // Technical detail is not shown to the user
      expect(screen.queryByText(/Network Error/)).not.toBeInTheDocument();
    });

    it('retries the request when Try Again is clicked', async () => {
      const user = userEvent.setup();
      getDepartmentsWithCounts.mockRejectedValueOnce(new Error('Network Error'));

      renderHome();
      await screen.findByText('Unable to load departments. Please try again.');

      getDepartmentsWithCounts.mockResolvedValueOnce(departments);
      await user.click(screen.getByRole('button', { name: /try again/i }));

      expect(await screen.findByText('Engineering')).toBeInTheDocument();
      expect(getDepartmentsWithCounts).toHaveBeenCalledTimes(2);
    });
  });
});


describe('Home page — global employee search', () => {
  const departments = [
    { name: 'Engineering', employeeCount: 3 },
    { name: 'Digital Marketing', employeeCount: 2 },
  ];

  const allEmployees = [
    { id: '1', name: 'Emily Rodriguez', role: 'React JS Developer', department: 'Engineering' },
    { id: '2', name: 'Emily Rodriguez', role: 'Digital Marketing Specialist', department: 'Digital Marketing' },
    { id: '3', name: 'John Chen', role: 'Solution Architect', department: 'Engineering' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    getDepartmentsWithCounts.mockResolvedValue(departments);
    getEmployees.mockResolvedValue(allEmployees);
  });

  const globalSearch = () =>
    screen.getByRole('searchbox', { name: /search employees/i });

  it('shows department cards when no search is active', async () => {
    renderHome();
    expect(await screen.findByText('Engineering')).toBeInTheDocument();
    expect(screen.getByText('Digital Marketing')).toBeInTheDocument();
  });

  it('shows employee results when a global search term is entered', async () => {
    const user = userEvent.setup();
    renderHome();
    await screen.findByText('Engineering');

    await user.type(globalSearch(), 'Emily');

    // Should switch to search results view
    await waitFor(() => {
      expect(screen.getByText('React JS Developer')).toBeInTheDocument();
    });
    // getEmployees called with the search term
    expect(getEmployees).toHaveBeenCalledWith({ search: 'Emily' });
  });

  it('shows duplicate names with role and department to distinguish them', async () => {
    const user = userEvent.setup();
    renderHome();
    await screen.findByText('Engineering');

    await user.type(globalSearch(), 'Emily');

    await waitFor(() => {
      expect(screen.getByText('React JS Developer')).toBeInTheDocument();
      expect(screen.getByText('Digital Marketing Specialist')).toBeInTheDocument();
    });
  });

  it('each result links to /employees/:id by unique ID', async () => {
    const user = userEvent.setup();
    renderHome();
    await screen.findByText('Engineering');

    await user.type(globalSearch(), 'Emily');

    await waitFor(() => {
      const links = screen.getAllByRole('link', { name: /emily rodriguez/i });
      expect(links).toHaveLength(2);
      expect(links[0]).toHaveAttribute('href', '/employees/1');
      expect(links[1]).toHaveAttribute('href', '/employees/2');
    });
  });

  it('searches by role across departments', async () => {
    const user = userEvent.setup();
    renderHome();
    await screen.findByText('Engineering');

    await user.type(globalSearch(), 'architect');

    await waitFor(() => {
      expect(screen.getByText('John Chen')).toBeInTheDocument();
      expect(screen.getByText('Solution Architect')).toBeInTheDocument();
    });
  });

  it('searches by department name', async () => {
    const user = userEvent.setup();
    renderHome();
    await screen.findByText('Engineering');

    await user.type(globalSearch(), 'Marketing');

    await waitFor(() => {
      expect(screen.getByText('Digital Marketing Specialist')).toBeInTheDocument();
    });
  });

  it('shows "No employees match" when nothing matches', async () => {
    getEmployees.mockResolvedValue([]);
    const user = userEvent.setup();
    renderHome();
    await screen.findByText('Engineering');

    await user.type(globalSearch(), 'zzzzzzzzzzz');

    expect(await screen.findByText(/no employees match your search/i)).toBeInTheDocument();
  });

  it('returns to departments view when search is cleared', async () => {
    const user = userEvent.setup();
    renderHome();
    await screen.findByText('Engineering');

    await user.type(globalSearch(), 'Emily');
    // Wait for search results to appear
    await waitFor(() => expect(screen.getByText('React JS Developer')).toBeInTheDocument());

    await user.clear(globalSearch());

    // Department cards return
    await waitFor(() => {
      expect(screen.getByRole('searchbox', { name: /filter departments/i })).toBeInTheDocument();
    });
  });
});

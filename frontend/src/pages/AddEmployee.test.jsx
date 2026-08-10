/**
 * Add Employee flow test.
 *
 * Exercises the create path end to end through the real EmployeeProvider,
 * router and form: choose an employment type, fill the conditional fields,
 * submit, and confirm the service call and navigation. Only the network layer
 * and toasts are mocked.
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

import { createEmployee } from '../services/employeeService';
import toast from 'react-hot-toast';
import { EmployeeProvider } from '../context/EmployeeContext';
import AddEmployee from './AddEmployee';
import {
  fillEmployeeDetails,
  fillExperienceFields,
  selectEmploymentType,
} from '../test/formHelpers';

const renderAddFlow = () =>
  render(
    <MemoryRouter initialEntries={['/add']}>
      <EmployeeProvider>
        <Routes>
          <Route path="/add" element={<AddEmployee />} />
          <Route path="/" element={<div>Departments page</div>} />
        </Routes>
      </EmployeeProvider>
    </MemoryRouter>
  );

const submit = (user) =>
  user.click(screen.getByRole('button', { name: /add employee/i }));

describe('Add Employee flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the add form', () => {
    renderAddFlow();

    expect(screen.getByRole('heading', { name: /add new employee/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add employee/i })).toBeInTheDocument();
  });

  it('creates a fresher and navigates back to the departments page', async () => {
    const user = userEvent.setup();
    createEmployee.mockResolvedValue({ id: 'new-1', name: 'Katherine Johnson' });

    renderAddFlow();
    await fillEmployeeDetails(user);
    await selectEmploymentType(user, 'Fresher');
    await submit(user);

    await waitFor(() => expect(createEmployee).toHaveBeenCalledTimes(1));

    const payload = createEmployee.mock.calls[0][0];
    expect(payload).toMatchObject({
      name: 'Katherine Johnson',
      role: 'React JS Developer',
      department: 'Engineering',
      employmentType: 'Fresher',
    });
    // No experience data is sent for a fresher
    expect(payload).not.toHaveProperty('previousOrganization');

    expect(await screen.findByText('Departments page')).toBeInTheDocument();
    expect(toast.success).toHaveBeenCalled();
  });

  it('creates an experienced employee with the experience details', async () => {
    const user = userEvent.setup();
    createEmployee.mockResolvedValue({ id: 'new-2', name: 'Katherine Johnson' });

    renderAddFlow();
    await fillEmployeeDetails(user);
    await selectEmploymentType(user, 'Experienced');
    await fillExperienceFields(user);
    await submit(user);

    await waitFor(() => expect(createEmployee).toHaveBeenCalledTimes(1));

    expect(createEmployee.mock.calls[0][0]).toMatchObject({
      employmentType: 'Experienced',
      yearsOfExperience: '3',
      previousOrganization: 'ABC Technologies',
      previousRole: 'Senior React Developer',
    });

    expect(await screen.findByText('Departments page')).toBeInTheDocument();
  });

  it('surfaces an error and stays on the form when the API rejects', async () => {
    const user = userEvent.setup();
    createEmployee.mockRejectedValue(new Error('Employee with this email already exists'));

    renderAddFlow();
    await fillEmployeeDetails(user);
    await selectEmploymentType(user, 'Fresher');
    await submit(user);

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        'Employee with this email already exists',
        expect.any(Object)
      )
    );

    expect(screen.getByRole('heading', { name: /add new employee/i })).toBeInTheDocument();
    expect(screen.queryByText('Departments page')).not.toBeInTheDocument();
  });

  it('does not call the API when the form is invalid', async () => {
    const user = userEvent.setup();

    renderAddFlow();
    await submit(user);

    expect(await screen.findByText('Name must be at least 2 characters')).toBeInTheDocument();
    expect(createEmployee).not.toHaveBeenCalled();
  });

  it('does not call the API when experience details are missing', async () => {
    const user = userEvent.setup();

    renderAddFlow();
    await fillEmployeeDetails(user);
    await selectEmploymentType(user, 'Experienced');
    await submit(user);

    expect(
      await screen.findByText('Years of experience is required for experienced employees')
    ).toBeInTheDocument();
    expect(createEmployee).not.toHaveBeenCalled();
  });
});

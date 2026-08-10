/**
 * Edit Employee flow test.
 *
 * Covers loading an existing record into the form and the two employment-type
 * transitions that matter: Experienced to Fresher (experience data must be
 * dropped) and Fresher to Experienced (experience data must be required and
 * then sent).
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

import { getEmployee, updateEmployee } from '../services/employeeService';
import toast from 'react-hot-toast';
import { EmployeeProvider } from '../context/EmployeeContext';
import EditEmployee from './EditEmployee';
import {
  LABELS,
  fillExperienceFields,
  selectEmploymentType,
} from '../test/formHelpers';

const fresher = {
  id: 'emp-42',
  name: 'Barbara Liskov',
  role: 'Software Development Intern',
  department: 'Engineering',
  email: 'barbara@example.com',
  phone: '+1 555 444 3333',
  joiningDate: '2015-09-01T00:00:00.000Z',
  employmentType: 'Fresher',
};

const experienced = {
  ...fresher,
  employmentType: 'Experienced',
  yearsOfExperience: 12,
  previousOrganization: 'Harborview Group',
  previousRole: 'Principal Researcher',
  previousExperienceDescription: 'Researched distributed systems for twelve years.',
};

const renderEditFlow = () =>
  render(
    <MemoryRouter initialEntries={['/edit/emp-42']}>
      <EmployeeProvider>
        <Routes>
          <Route path="/edit/:id" element={<EditEmployee />} />
          <Route path="/" element={<div>Departments page</div>} />
        </Routes>
      </EmployeeProvider>
    </MemoryRouter>
  );

const submit = (user) =>
  user.click(screen.getByRole('button', { name: /update employee/i }));

describe('Edit Employee flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads the existing employee into the form', async () => {
    getEmployee.mockResolvedValue(fresher);

    renderEditFlow();

    expect(await screen.findByDisplayValue('Barbara Liskov')).toBeInTheDocument();
    expect(getEmployee).toHaveBeenCalledWith('emp-42');
    expect(screen.getByLabelText(LABELS.email)).toHaveValue('barbara@example.com');
    expect(screen.getByLabelText(LABELS.joiningDate)).toHaveValue('2015-09-01');
    expect(screen.getByLabelText(LABELS.employmentType)).toHaveValue('Fresher');
  });

  it('prefills experience details for an experienced employee', async () => {
    getEmployee.mockResolvedValue(experienced);

    renderEditFlow();

    await screen.findByDisplayValue('Barbara Liskov');
    expect(screen.getByLabelText(LABELS.yearsOfExperience)).toHaveValue(12);
    expect(screen.getByLabelText(LABELS.previousOrganization)).toHaveValue(
      'Harborview Group'
    );
    expect(screen.getByLabelText(LABELS.previousRole)).toHaveValue(
      'Principal Researcher'
    );
  });

  it('submits an update with the route id and navigates back', async () => {
    const user = userEvent.setup();
    getEmployee.mockResolvedValue(fresher);
    updateEmployee.mockResolvedValue({ ...fresher, name: 'Barbara J. Liskov' });

    renderEditFlow();
    await screen.findByDisplayValue('Barbara Liskov');

    const nameInput = screen.getByLabelText(LABELS.name);
    await user.clear(nameInput);
    await user.type(nameInput, 'Barbara J. Liskov');
    await submit(user);

    await waitFor(() =>
      expect(updateEmployee).toHaveBeenCalledWith(
        'emp-42',
        expect.objectContaining({
          name: 'Barbara J. Liskov',
          employmentType: 'Fresher',
        })
      )
    );

    expect(await screen.findByText('Departments page')).toBeInTheDocument();
    expect(toast.success).toHaveBeenCalled();
  });

  describe('employment type transitions', () => {
    it('switches Fresher to Experienced and sends the experience details', async () => {
      const user = userEvent.setup();
      getEmployee.mockResolvedValue(fresher);
      updateEmployee.mockResolvedValue(experienced);

      renderEditFlow();
      await screen.findByDisplayValue('Barbara Liskov');

      // Experience fields are absent until the type changes
      expect(screen.queryByLabelText(LABELS.yearsOfExperience)).not.toBeInTheDocument();

      await selectEmploymentType(user, 'Experienced');
      await fillExperienceFields(user);
      await submit(user);

      await waitFor(() =>
        expect(updateEmployee).toHaveBeenCalledWith(
          'emp-42',
          expect.objectContaining({
            employmentType: 'Experienced',
            yearsOfExperience: '3',
            previousOrganization: 'ABC Technologies',
          })
        )
      );
    });

    it('blocks the switch to Experienced until the details are provided', async () => {
      const user = userEvent.setup();
      getEmployee.mockResolvedValue(fresher);

      renderEditFlow();
      await screen.findByDisplayValue('Barbara Liskov');

      await selectEmploymentType(user, 'Experienced');
      await submit(user);

      expect(
        await screen.findByText('Years of experience is required for experienced employees')
      ).toBeInTheDocument();
      expect(updateEmployee).not.toHaveBeenCalled();
    });

    it('switches Experienced to Fresher and drops the experience data', async () => {
      const user = userEvent.setup();
      getEmployee.mockResolvedValue(experienced);
      updateEmployee.mockResolvedValue(fresher);

      renderEditFlow();
      await screen.findByDisplayValue('Barbara Liskov');
      expect(screen.getByLabelText(LABELS.previousOrganization)).toHaveValue(
        'Harborview Group'
      );

      await selectEmploymentType(user, 'Fresher');

      // The fields disappear from the form immediately
      expect(screen.queryByLabelText(LABELS.previousOrganization)).not.toBeInTheDocument();

      await submit(user);

      await waitFor(() => expect(updateEmployee).toHaveBeenCalledTimes(1));

      const [, payload] = updateEmployee.mock.calls[0];
      expect(payload.employmentType).toBe('Fresher');
      // Stale experience values must not be submitted
      expect(payload).not.toHaveProperty('previousOrganization');
      expect(payload).not.toHaveProperty('yearsOfExperience');
    });
  });

  it('redirects to the departments page when the employee cannot be fetched', async () => {
    getEmployee.mockRejectedValue(new Error('Employee not found'));

    renderEditFlow();

    expect(await screen.findByText('Departments page')).toBeInTheDocument();
  });

  it('shows a loading indicator while the employee is being fetched', () => {
    getEmployee.mockReturnValue(new Promise(() => {}));

    renderEditFlow();

    expect(screen.getByText(/loading employee data/i)).toBeInTheDocument();
  });
});

/**
 * EmployeeForm behaviour and validation tests.
 *
 * The form's real logic is: driving fields from the shared Zod schema,
 * conditionally showing and requiring previous-experience fields based on
 * Employment Type, preserving legacy role/department values when editing, and
 * reflecting state through ARIA attributes.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EmployeeForm from './EmployeeForm';
import {
  LABELS,
  fillEmployeeDetails,
  fillExperienceFields,
  selectEmploymentType,
} from '../test/formHelpers';

const experiencedEmployee = {
  name: 'Existing Person',
  role: 'Solution Architect',
  department: 'Engineering',
  email: 'existing@example.com',
  phone: '+1 555 111 2222',
  joiningDate: '2019-08-20T00:00:00.000Z',
  employmentType: 'Experienced',
  yearsOfExperience: 7,
  previousOrganization: 'Globex',
  previousRole: 'Lead Engineer',
  previousExperienceDescription: 'Led a platform team for seven years.',
};

describe('EmployeeForm', () => {
  describe('rendering', () => {
    it('renders all core fields and an Add button in create mode', () => {
      render(<EmployeeForm onSubmit={vi.fn()} />);

      Object.entries(LABELS)
        .filter(([key]) => !key.startsWith('previous') && key !== 'yearsOfExperience')
        .forEach(([, label]) => {
          expect(screen.getByLabelText(label)).toBeInTheDocument();
        });

      expect(screen.getByRole('button', { name: /add employee/i })).toBeInTheDocument();
    });

    it('offers the canonical roles and departments as options', () => {
      render(<EmployeeForm onSubmit={vi.fn()} />);

      expect(
        screen.getByRole('option', { name: 'React JS Developer' })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('option', { name: 'Software Development Intern' })
      ).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Engineering' })).toBeInTheDocument();
      expect(
        screen.getByRole('option', { name: 'Digital Marketing' })
      ).toBeInTheDocument();
    });

    it('hides previous-experience fields until Experienced is selected', () => {
      render(<EmployeeForm onSubmit={vi.fn()} />);

      expect(screen.queryByLabelText(LABELS.yearsOfExperience)).not.toBeInTheDocument();
      expect(
        screen.queryByLabelText(LABELS.previousOrganization)
      ).not.toBeInTheDocument();
      expect(screen.queryByLabelText(LABELS.previousRole)).not.toBeInTheDocument();
    });

    it('prefills fields and shows an Update button in edit mode', () => {
      render(<EmployeeForm onSubmit={vi.fn()} initialData={experiencedEmployee} />);

      expect(screen.getByLabelText(LABELS.name)).toHaveValue('Existing Person');
      expect(screen.getByLabelText(LABELS.role)).toHaveValue('Solution Architect');
      expect(screen.getByLabelText(LABELS.email)).toHaveValue('existing@example.com');
      // ISO timestamp normalised for the date input
      expect(screen.getByLabelText(LABELS.joiningDate)).toHaveValue('2019-08-20');
      expect(screen.getByRole('button', { name: /update employee/i })).toBeInTheDocument();
    });

    it('preserves a legacy role that is not in the canonical list', () => {
      render(
        <EmployeeForm
          onSubmit={vi.fn()}
          initialData={{ ...experiencedEmployee, role: 'Chief Wizard' }}
        />
      );

      // The existing value is offered so editing cannot silently change it
      expect(screen.getByRole('option', { name: 'Chief Wizard' })).toBeInTheDocument();
      expect(screen.getByLabelText(LABELS.role)).toHaveValue('Chief Wizard');
    });
  });

  describe('conditional experience fields', () => {
    it('reveals previous-experience fields when Experienced is selected', async () => {
      const user = userEvent.setup();
      render(<EmployeeForm onSubmit={vi.fn()} />);

      await selectEmploymentType(user, 'Experienced');

      expect(screen.getByLabelText(LABELS.yearsOfExperience)).toBeInTheDocument();
      expect(screen.getByLabelText(LABELS.previousOrganization)).toBeInTheDocument();
      expect(screen.getByLabelText(LABELS.previousRole)).toBeInTheDocument();
      expect(
        screen.getByLabelText(LABELS.previousExperienceDescription)
      ).toBeInTheDocument();
    });

    it('keeps previous-experience fields hidden for a Fresher', async () => {
      const user = userEvent.setup();
      render(<EmployeeForm onSubmit={vi.fn()} />);

      await selectEmploymentType(user, 'Fresher');

      expect(screen.queryByLabelText(LABELS.yearsOfExperience)).not.toBeInTheDocument();
      expect(
        screen.queryByLabelText(LABELS.previousExperienceDescription)
      ).not.toBeInTheDocument();
    });

    it('discards entered experience data when switching back to Fresher', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      render(<EmployeeForm onSubmit={onSubmit} />);

      await fillEmployeeDetails(user);
      await selectEmploymentType(user, 'Experienced');
      await fillExperienceFields(user);

      // Switch to Fresher, then back to Experienced
      await selectEmploymentType(user, 'Fresher');
      await selectEmploymentType(user, 'Experienced');

      // Previously typed values must not be retained
      expect(screen.getByLabelText(LABELS.previousOrganization)).toHaveValue('');
      expect(screen.getByLabelText(LABELS.yearsOfExperience)).toHaveValue(null);
    });
  });

  describe('validation', () => {
    it('blocks submission and reports missing required fields', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      render(<EmployeeForm onSubmit={onSubmit} />);

      await user.click(screen.getByRole('button', { name: /add employee/i }));

      expect(onSubmit).not.toHaveBeenCalled();
      expect(await screen.findByText('Name must be at least 2 characters')).toBeInTheDocument();
      expect(screen.getByText('Please provide a valid email address')).toBeInTheDocument();
      expect(screen.getByText('Please select an employment type')).toBeInTheDocument();
    });

    it('requires an employment type even when every other field is valid', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      render(<EmployeeForm onSubmit={onSubmit} />);

      await fillEmployeeDetails(user);
      await user.click(screen.getByRole('button', { name: /add employee/i }));

      expect(await screen.findByText('Please select an employment type')).toBeInTheDocument();
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('requires every experience field when Experienced is selected', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      render(<EmployeeForm onSubmit={onSubmit} />);

      await fillEmployeeDetails(user);
      await selectEmploymentType(user, 'Experienced');
      await user.click(screen.getByRole('button', { name: /add employee/i }));

      expect(
        await screen.findByText('Years of experience is required for experienced employees')
      ).toBeInTheDocument();
      expect(
        screen.getByText('Previous organization is required for experienced employees')
      ).toBeInTheDocument();
      expect(
        screen.getByText('Last role is required for experienced employees')
      ).toBeInTheDocument();
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('rejects a negative years of experience', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      render(<EmployeeForm onSubmit={onSubmit} />);

      await fillEmployeeDetails(user);
      await selectEmploymentType(user, 'Experienced');
      await fillExperienceFields(user, { yearsOfExperience: '-4' });
      await user.click(screen.getByRole('button', { name: /add employee/i }));

      expect(
        await screen.findByText('Years of experience cannot be negative')
      ).toBeInTheDocument();
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('rejects an unreasonably large years of experience', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      render(<EmployeeForm onSubmit={onSubmit} />);

      await fillEmployeeDetails(user);
      await selectEmploymentType(user, 'Experienced');
      await fillExperienceFields(user, { yearsOfExperience: '80' });
      await user.click(screen.getByRole('button', { name: /add employee/i }));

      expect(
        await screen.findByText('Years of experience cannot exceed 50')
      ).toBeInTheDocument();
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('rejects a too-short experience description', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      render(<EmployeeForm onSubmit={onSubmit} />);

      await fillEmployeeDetails(user);
      await selectEmploymentType(user, 'Experienced');
      await fillExperienceFields(user, { previousExperienceDescription: 'short' });
      await user.click(screen.getByRole('button', { name: /add employee/i }));

      expect(
        await screen.findByText(
          'Please describe the previous experience (at least 10 characters)'
        )
      ).toBeInTheDocument();
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('rejects an invalid email format', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      render(<EmployeeForm onSubmit={onSubmit} />);

      await fillEmployeeDetails(user, { email: 'not-an-email' });
      await selectEmploymentType(user, 'Fresher');
      await user.click(screen.getByRole('button', { name: /add employee/i }));

      expect(await screen.findByText('Please provide a valid email address')).toBeInTheDocument();
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('marks an invalid field with aria-invalid and links its error', async () => {
      const user = userEvent.setup();
      render(<EmployeeForm onSubmit={vi.fn()} />);

      await user.click(screen.getByRole('button', { name: /add employee/i }));

      const nameInput = await screen.findByLabelText(LABELS.name);
      expect(nameInput).toHaveAttribute('aria-invalid', 'true');
      expect(nameInput).toHaveAttribute('aria-describedby', 'name-error');
      expect(screen.getAllByRole('alert').length).toBeGreaterThan(0);
    });

    it('clears a field error once the user corrects the input', async () => {
      const user = userEvent.setup();
      render(<EmployeeForm onSubmit={vi.fn()} />);

      await user.click(screen.getByRole('button', { name: /add employee/i }));
      expect(await screen.findByText('Name must be at least 2 characters')).toBeInTheDocument();

      await user.type(screen.getByLabelText(LABELS.name), 'Valid Name');

      await waitFor(() => {
        expect(screen.queryByText('Name must be at least 2 characters')).not.toBeInTheDocument();
      });
    });
  });

  describe('submission', () => {
    it('submits a fresher without any experience fields', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      render(<EmployeeForm onSubmit={onSubmit} />);

      await fillEmployeeDetails(user);
      await selectEmploymentType(user, 'Fresher');
      await user.click(screen.getByRole('button', { name: /add employee/i }));

      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));

      const payload = onSubmit.mock.calls[0][0];
      expect(payload).toMatchObject({
        name: 'Katherine Johnson',
        role: 'React JS Developer',
        department: 'Engineering',
        email: 'katherine@example.com',
        employmentType: 'Fresher',
      });
      // Experience keys are omitted entirely for a fresher
      expect(payload).not.toHaveProperty('yearsOfExperience');
      expect(payload).not.toHaveProperty('previousOrganization');
    });

    it('submits an experienced employee with all experience fields', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      render(<EmployeeForm onSubmit={onSubmit} />);

      await fillEmployeeDetails(user);
      await selectEmploymentType(user, 'Experienced');
      await fillExperienceFields(user);
      await user.click(screen.getByRole('button', { name: /add employee/i }));

      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));

      expect(onSubmit.mock.calls[0][0]).toMatchObject({
        employmentType: 'Experienced',
        yearsOfExperience: '3',
        previousOrganization: 'ABC Technologies',
        previousRole: 'Senior React Developer',
      });
    });

    it('submits Fresher without experience data when switching from Experienced', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      render(<EmployeeForm onSubmit={onSubmit} initialData={experiencedEmployee} />);

      // Existing experience is prefilled, then the employee becomes a fresher
      expect(screen.getByLabelText(LABELS.previousOrganization)).toHaveValue('Globex');
      await selectEmploymentType(user, 'Fresher');
      await user.click(screen.getByRole('button', { name: /update employee/i }));

      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));

      const payload = onSubmit.mock.calls[0][0];
      expect(payload.employmentType).toBe('Fresher');
      expect(payload).not.toHaveProperty('previousOrganization');
      expect(payload).not.toHaveProperty('yearsOfExperience');
    });

    it('disables the submit button and shows progress while loading', () => {
      render(<EmployeeForm onSubmit={vi.fn()} loading />);

      const button = screen.getByRole('button', { name: /creating/i });
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('aria-busy', 'true');
    });

    it('shows "Updating..." while loading in edit mode', () => {
      render(
        <EmployeeForm onSubmit={vi.fn()} loading initialData={experiencedEmployee} />
      );

      expect(screen.getByRole('button', { name: /updating/i })).toBeDisabled();
    });
  });
});

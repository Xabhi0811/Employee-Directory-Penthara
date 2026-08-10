/**
 * Shared helpers for driving the employee form in tests.
 *
 * Labels are matched with anchored regexes because several field labels are
 * prefixes of others ("Role" vs "Last Role", "Previous Organization" vs
 * "Organization"), which would otherwise make queries ambiguous.
 */

import { screen } from '@testing-library/react';

export const LABELS = {
  name: /^Name \*$/,
  role: /^Role \*$/,
  department: /^Department \*$/,
  email: /^Email \*$/,
  phone: /^Phone \*$/,
  joiningDate: /^Joining Date \*$/,
  employmentType: /^Employment Type \*$/,
  yearsOfExperience: /^Years of Experience \*$/,
  previousOrganization: /^Previous Organization \*$/,
  previousRole: /^Last Role \*$/,
  previousExperienceDescription: /^Previous Experience Description \*$/,
};

/** Values that satisfy validation for the shared employee detail fields. */
export const VALID_DETAILS = {
  name: 'Katherine Johnson',
  role: 'React JS Developer',
  department: 'Engineering',
  email: 'katherine@example.com',
  phone: '+1 555 987 6543',
  joiningDate: '2020-05-01',
};

/** Values that satisfy validation for the previous-experience fields. */
export const VALID_EXPERIENCE = {
  yearsOfExperience: '3',
  previousOrganization: 'ABC Technologies',
  previousRole: 'Senior React Developer',
  previousExperienceDescription: 'Worked on scalable React applications for three years.',
};

/**
 * Fill every always-visible employee detail field with valid values.
 * Employment type is deliberately left unset so callers control it.
 */
export const fillEmployeeDetails = async (user, overrides = {}) => {
  const values = { ...VALID_DETAILS, ...overrides };

  await user.type(screen.getByLabelText(LABELS.name), values.name);
  await user.selectOptions(screen.getByLabelText(LABELS.role), values.role);
  await user.selectOptions(screen.getByLabelText(LABELS.department), values.department);
  await user.type(screen.getByLabelText(LABELS.email), values.email);
  await user.type(screen.getByLabelText(LABELS.phone), values.phone);

  const dateInput = screen.getByLabelText(LABELS.joiningDate);
  await user.clear(dateInput);
  await user.type(dateInput, values.joiningDate);
};

/** Fill the previous-experience fields (only present when Experienced). */
export const fillExperienceFields = async (user, overrides = {}) => {
  const values = { ...VALID_EXPERIENCE, ...overrides };

  await user.type(
    screen.getByLabelText(LABELS.yearsOfExperience),
    values.yearsOfExperience
  );
  await user.type(
    screen.getByLabelText(LABELS.previousOrganization),
    values.previousOrganization
  );
  await user.type(screen.getByLabelText(LABELS.previousRole), values.previousRole);
  await user.type(
    screen.getByLabelText(LABELS.previousExperienceDescription),
    values.previousExperienceDescription
  );
};

/** Choose an employment type from the select. */
export const selectEmploymentType = async (user, type) => {
  await user.selectOptions(screen.getByLabelText(LABELS.employmentType), type);
};

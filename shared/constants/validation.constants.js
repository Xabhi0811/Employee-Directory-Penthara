/**
 * Validation Constants
 * Shared validation rules and constraints
 */

export const VALIDATION_RULES = {
  NAME: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 100,
  },
  ROLE: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 100,
  },
  DEPARTMENT: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 100,
  },
  PHONE: {
    PATTERN: /^\+?[\d\s\-\(\)]{10,20}$/,
    MESSAGE: 'Please provide a valid phone number',
  },
  EMAIL: {
    MESSAGE: 'Please provide a valid email address',
  },
  JOINING_DATE: {
    MESSAGE: 'Joining date cannot be in the future',
  },
  EMPLOYMENT_TYPE: {
    MESSAGE: 'Please select an employment type',
  },
  YEARS_OF_EXPERIENCE: {
    MIN: 0,
    MAX: 50,
    REQUIRED_MESSAGE: 'Years of experience is required for experienced employees',
    INVALID_MESSAGE: 'Years of experience must be a valid number',
    NEGATIVE_MESSAGE: 'Years of experience cannot be negative',
    MAX_MESSAGE: 'Years of experience cannot exceed 50',
  },
  PREVIOUS_ORGANIZATION: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 100,
    REQUIRED_MESSAGE: 'Previous organization is required for experienced employees',
  },
  PREVIOUS_ROLE: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 100,
    REQUIRED_MESSAGE: 'Last role is required for experienced employees',
  },
  PREVIOUS_EXPERIENCE_DESCRIPTION: {
    MIN_LENGTH: 10,
    MAX_LENGTH: 1000,
    REQUIRED_MESSAGE: 'Please describe the previous experience (at least 10 characters)',
  },
};

export const VALIDATION_MESSAGES = {
  REQUIRED: (field) => `${field} is required`,
  MIN_LENGTH: (field, min) => `${field} must be at least ${min} characters`,
  MAX_LENGTH: (field, max) => `${field} cannot exceed ${max} characters`,
  INVALID_FORMAT: (field) => `Invalid ${field} format`,
  FUTURE_DATE: 'Date cannot be in the future',
};

/**
 * Employment types.
 * `Experienced` unlocks the previous-experience fields; `Fresher` does not.
 */
export const EMPLOYMENT_TYPES = ['Fresher', 'Experienced'];

/**
 * Fields that only apply to an experienced employee. Used to clear stale data
 * when an employee is switched back to `Fresher`.
 */
export const EXPERIENCE_FIELDS = [
  'yearsOfExperience',
  'previousOrganization',
  'previousRole',
  'previousExperienceDescription',
];

/**
 * Canonical job roles offered by the organisation.
 * Roles are job titles and are deliberately kept separate from departments.
 */
export const EMPLOYEE_ROLES = [
  'Digital Marketing Associate',
  'Content Writer (Contractual)',
  'Solution Architect',
  'Commission Sales Executive (Remote – USA)',
  'Microsoft 365 Developer Associate',
  'SharePoint Developer',
  'Azure Migration Engineer',
  'Technical Project Manager',
  'Digital Marketing Intern',
  'Senior Business Development Executive',
  'Business Analyst',
  'Microsoft 365 Technical Lead',
  'Digital Marketing Specialist',
  'React JS Developer',
  'Human Resource Intern',
  'Software Development Intern',
];

/**
 * Canonical departments. A department is an organisational unit and is stored
 * as its own field — it is never derived from the employee's role.
 */
export const DEPARTMENTS = [
  'Engineering',
  'Digital Marketing',
  'Human Resources',
  'Sales',
  'Business Development',
];

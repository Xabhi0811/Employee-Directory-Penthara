import { memo, useState, useEffect, useCallback, useMemo } from 'react';
import { validateEmployee } from '../utils/validation';
import {
  EMPLOYEE_ROLES,
  DEPARTMENTS,
  EMPLOYMENT_TYPES,
  EXPERIENCE_FIELDS,
} from '../../../shared/constants/validation.constants.js';

/** Blank form state. Experience fields stay empty until Experienced is chosen. */
const EMPTY_FORM = {
  name: '',
  role: '',
  department: '',
  email: '',
  phone: '',
  joiningDate: '',
  employmentType: '',
  yearsOfExperience: '',
  previousOrganization: '',
  previousRole: '',
  previousExperienceDescription: '',
};

/**
 * EmployeeForm Component
 * Shared by the add and edit flows. The Employment Type selection drives which
 * previous-experience fields are shown and required.
 */
const EmployeeForm = memo(({ initialData = null, onSubmit, loading = false }) => {
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  // Populate the form when editing an existing employee
  useEffect(() => {
    if (initialData) {
      setFormData({
        ...EMPTY_FORM,
        name: initialData.name || '',
        role: initialData.role || '',
        department: initialData.department || '',
        email: initialData.email || '',
        phone: initialData.phone || '',
        joiningDate: initialData.joiningDate
          ? new Date(initialData.joiningDate).toISOString().split('T')[0]
          : '',
        employmentType: initialData.employmentType || '',
        yearsOfExperience:
          initialData.yearsOfExperience !== undefined &&
          initialData.yearsOfExperience !== null
            ? String(initialData.yearsOfExperience)
            : '',
        previousOrganization: initialData.previousOrganization || '',
        previousRole: initialData.previousRole || '',
        previousExperienceDescription:
          initialData.previousExperienceDescription || '',
      });
    }
  }, [initialData]);

  const isExperienced = formData.employmentType === 'Experienced';

  /**
   * Only the fields relevant to the chosen employment type are validated and
   * submitted, so a fresher is never judged against experience rules.
   */
  const relevantFormData = useMemo(() => {
    if (isExperienced) return formData;

    const trimmed = { ...formData };
    EXPERIENCE_FIELDS.forEach((field) => delete trimmed[field]);
    return trimmed;
  }, [formData, isExperienced]);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;

    setFormData((prev) => {
      // Switching to Fresher discards any previously entered experience data so
      // it cannot be submitted or silently retained.
      if (name === 'employmentType' && value !== 'Experienced') {
        return {
          ...prev,
          employmentType: value,
          yearsOfExperience: '',
          previousOrganization: '',
          previousRole: '',
          previousExperienceDescription: '',
        };
      }

      return { ...prev, [name]: value };
    });

    // Clear this field's error as soon as the user edits it
    setErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });

    // Errors on now-hidden fields must not linger
    if (name === 'employmentType' && value !== 'Experienced') {
      setErrors((prev) => {
        const next = { ...prev };
        EXPERIENCE_FIELDS.forEach((field) => delete next[field]);
        return next;
      });
    }
  }, []);

  const handleBlur = useCallback(
    (e) => {
      const { name } = e.target;
      setTouched((prev) => ({ ...prev, [name]: true }));

      const fieldErrors = validateEmployee(relevantFormData);
      if (fieldErrors[name]) {
        setErrors((prev) => ({ ...prev, [name]: fieldErrors[name] }));
      }
    },
    [relevantFormData]
  );

  const handleSubmit = useCallback(
    (e) => {
      e.preventDefault();

      const validationErrors = validateEmployee(relevantFormData);

      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        // Mark everything touched so all messages become visible at once
        setTouched(
          Object.keys(relevantFormData).reduce((acc, key) => {
            acc[key] = true;
            return acc;
          }, {})
        );
        return;
      }

      onSubmit(relevantFormData);
    },
    [relevantFormData, onSubmit]
  );

  const buttonText = useMemo(() => {
    if (loading) return initialData ? 'Updating...' : 'Creating...';
    return initialData ? 'Update Employee' : 'Add Employee';
  }, [loading, initialData]);

  const maxDate = useMemo(() => new Date().toISOString().split('T')[0], []);

  /**
   * Role options, including the employee's current role even if it is not part
   * of the canonical list, so editing a legacy record never silently changes it.
   */
  const roleOptions = useMemo(() => {
    const current = initialData?.role;
    if (current && !EMPLOYEE_ROLES.includes(current)) {
      return [current, ...EMPLOYEE_ROLES];
    }
    return EMPLOYEE_ROLES;
  }, [initialData]);

  /** Department options, likewise preserving an existing non-standard value. */
  const departmentOptions = useMemo(() => {
    const current = initialData?.department;
    if (current && !DEPARTMENTS.includes(current)) {
      return [current, ...DEPARTMENTS];
    }
    return DEPARTMENTS;
  }, [initialData]);

  /** Shared props wiring a field to its label, error and validity state. */
  const fieldProps = (name) => ({
    id: name,
    name,
    value: formData[name],
    onChange: handleChange,
    onBlur: handleBlur,
    'aria-required': 'true',
    'aria-invalid': errors[name] && touched[name] ? 'true' : 'false',
    'aria-describedby': errors[name] && touched[name] ? `${name}-error` : undefined,
    className: `input ${errors[name] && touched[name] ? 'input-error' : ''}`,
  });

  /** Error text for a field, rendered as an alert and linked via aria-describedby. */
  const FieldError = ({ name }) =>
    errors[name] && touched[name] ? (
      <p className="error-text" id={`${name}-error`} role="alert">
        {errors[name]}
      </p>
    ) : null;

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-8"
      aria-label={initialData ? 'Edit employee form' : 'Add employee form'}
      noValidate
    >
      {/* ---------- Employee details ---------- */}
      <fieldset className="space-y-6">
        <legend className="text-base font-semibold text-theme-primary mb-2">
          Employee Details
        </legend>

        <div>
          <label htmlFor="name" className="label">
            Name <span className="text-required" aria-label="required">*</span>
          </label>
          <input type="text" placeholder="Enter employee name" {...fieldProps('name')} />
          <FieldError name="name" />
        </div>

        <div>
          <label htmlFor="role" className="label">
            Role <span className="text-required" aria-label="required">*</span>
          </label>
          <select {...fieldProps('role')}>
            <option value="">Select Role</option>
            {roleOptions.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
          <FieldError name="role" />
        </div>

        <div>
          <label htmlFor="department" className="label">
            Department <span className="text-required" aria-label="required">*</span>
          </label>
          <select {...fieldProps('department')}>
            <option value="">Select Department</option>
            {departmentOptions.map((department) => (
              <option key={department} value={department}>
                {department}
              </option>
            ))}
          </select>
          <FieldError name="department" />
        </div>

        <div>
          <label htmlFor="email" className="label">
            Email <span className="text-required" aria-label="required">*</span>
          </label>
          <input type="email" placeholder="example@company.com" {...fieldProps('email')} />
          <FieldError name="email" />
        </div>

        <div>
          <label htmlFor="phone" className="label">
            Phone <span className="text-required" aria-label="required">*</span>
          </label>
          <input type="tel" placeholder="+1 (555) 123-4567" {...fieldProps('phone')} />
          <FieldError name="phone" />
        </div>

        <div>
          <label htmlFor="joiningDate" className="label">
            Joining Date <span className="text-required" aria-label="required">*</span>
          </label>
          <input type="date" max={maxDate} {...fieldProps('joiningDate')} />
          <FieldError name="joiningDate" />
        </div>
      </fieldset>

      {/* ---------- Employment ---------- */}
      <fieldset className="space-y-6 pt-2 border-t border-theme">
        <legend className="text-base font-semibold text-theme-primary mb-2">
          Employment
        </legend>

        <div>
          <label htmlFor="employmentType" className="label">
            Employment Type{' '}
            <span className="text-required" aria-label="required">*</span>
          </label>
          <select {...fieldProps('employmentType')}>
            <option value="">Select Employment Type</option>
            {EMPLOYMENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <FieldError name="employmentType" />
        </div>

        {/* Previous-experience fields appear only for an experienced hire */}
        {isExperienced && (
          <div className="space-y-6 rounded-lg surface-muted border-theme p-4 sm:p-5">
            <p className="text-sm text-theme-secondary">
              Tell us about this employee&apos;s previous experience.
            </p>

            <div>
              <label htmlFor="yearsOfExperience" className="label">
                Years of Experience{' '}
                <span className="text-required" aria-label="required">*</span>
              </label>
              <input
                type="number"
                min="0"
                max="50"
                step="1"
                inputMode="numeric"
                placeholder="3"
                {...fieldProps('yearsOfExperience')}
              />
              <FieldError name="yearsOfExperience" />
            </div>

            <div>
              <label htmlFor="previousOrganization" className="label">
                Previous Organization{' '}
                <span className="text-required" aria-label="required">*</span>
              </label>
              <input
                type="text"
                placeholder="ABC Technologies"
                {...fieldProps('previousOrganization')}
              />
              <FieldError name="previousOrganization" />
            </div>

            <div>
              <label htmlFor="previousRole" className="label">
                Last Role <span className="text-required" aria-label="required">*</span>
              </label>
              <input
                type="text"
                placeholder="Senior React Developer"
                {...fieldProps('previousRole')}
              />
              <FieldError name="previousRole" />
            </div>

            <div>
              <label htmlFor="previousExperienceDescription" className="label">
                Previous Experience Description{' '}
                <span className="text-required" aria-label="required">*</span>
              </label>
              <textarea
                rows={4}
                placeholder="Briefly describe previous experience..."
                {...fieldProps('previousExperienceDescription')}
              />
              <FieldError name="previousExperienceDescription" />
            </div>
          </div>
        )}
      </fieldset>

      <div className="flex gap-4 pt-2">
        <button
          type="submit"
          className="btn btn-primary flex-1"
          disabled={loading}
          aria-busy={loading}
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <span
                className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"
                role="status"
                aria-label="Loading"
              />
              {buttonText}
            </span>
          ) : (
            <span>{buttonText}</span>
          )}
        </button>
      </div>
    </form>
  );
});

EmployeeForm.displayName = 'EmployeeForm';

export default EmployeeForm;

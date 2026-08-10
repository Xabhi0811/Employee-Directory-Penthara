import { useState, useEffect, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useEmployeeContext } from '../context/EmployeeContext';
import { formatDate } from '../utils/validation';

/**
 * EmployeeDetails Page
 * Displays ALL information belonging to an employee, fetched by their unique
 * database ID. Shows experience fields only for experienced employees.
 */
const EmployeeDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { fetchEmployee, removeEmployee } = useEmployeeContext();

  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadEmployee = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchEmployee(id);
      setEmployee(data);
    } catch (err) {
      setError(err.message || 'Failed to load employee');
    } finally {
      setLoading(false);
    }
  }, [id, fetchEmployee]);

  useEffect(() => {
    loadEmployee();
  }, [loadEmployee]);

  const handleDelete = useCallback(async () => {
    if (!employee) return;
    if (window.confirm(`Are you sure you want to delete ${employee.name}?`)) {
      try {
        await removeEmployee(employee.id || employee._id);
        navigate('/');
      } catch {
        // Toast handled by context
      }
    }
  }, [employee, removeEmployee, navigate]);

  if (loading) {
    return (
      <div className="page-bg flex items-center justify-center container-padding">
        <div className="text-center" role="status" aria-live="polite">
          <div className="spinner-lg mx-auto mb-4" aria-label="Loading"></div>
          <p className="text-sm sm:text-base text-theme-secondary font-medium">
            Loading employee details...
          </p>
        </div>
      </div>
    );
  }

  if (error || !employee) {
    return (
      <div className="page-bg flex items-center justify-center container-padding">
        <div className="text-center empty-state" role="alert">
          <svg
            className="empty-state-icon"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <h2 className="empty-state-title">Employee not found</h2>
          <p className="empty-state-description mb-6">
            {error || 'The employee you are looking for does not exist or has been removed.'}
          </p>
          <Link to="/" className="btn btn-primary">
            Back to Directory
          </Link>
        </div>
      </div>
    );
  }

  const isExperienced = employee.employmentType === 'Experienced';
  const employeeId = employee.id || employee._id;

  return (
    <div className="page-bg">
      <div className="max-w-3xl mx-auto container-padding section-spacing">
        {/* Header */}
        <header className="mb-6 sm:mb-8">
          <Link
            to="/"
            className="inline-flex items-center text-sm sm:text-base text-theme-secondary hover:text-theme-primary
                       mb-4 sm:mb-6 focus-visible-ring rounded-lg p-1 -ml-1"
          >
            <svg
              className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Back to Directory
          </Link>

          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="heading-responsive font-bold text-theme-primary mb-1 break-words">
                {employee.name}
              </h1>
              <p className="text-sm sm:text-base text-theme-accent font-medium">
                {employee.role}
              </p>
            </div>

            {employee.employmentType && (
              <span className={`badge ${isExperienced ? 'badge-primary' : 'badge-success'} px-3 py-1.5 text-xs sm:text-sm`}>
                {employee.employmentType}
              </span>
            )}
          </div>
        </header>

        {/* Details card */}
        <div className="card-surface rounded-lg overflow-hidden mb-6">
          <div className="p-5 sm:p-8">
            <h2 className="text-lg font-semibold text-theme-primary mb-5">
              Employee Information
            </h2>

            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
              <DetailItem label="Department" value={employee.department} />
              <DetailItem label="Email">
                <a
                  href={`mailto:${employee.email}`}
                  className="link-accent break-all"
                >
                  {employee.email}
                </a>
              </DetailItem>
              <DetailItem label="Phone">
                <a
                  href={`tel:${employee.phone}`}
                  className="link-accent"
                >
                  {employee.phone}
                </a>
              </DetailItem>
              <DetailItem
                label="Joining Date"
                value={formatDate(employee.joiningDate)}
              />
            </dl>
          </div>

          {/* Experience section – only for experienced employees */}
          {isExperienced && (
            <div className="card-section-muted p-5 sm:p-8">
              <h2 className="text-lg font-semibold text-theme-primary mb-5">
                Previous Experience
              </h2>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
                {employee.yearsOfExperience != null && (
                  <DetailItem
                    label="Total Experience"
                    value={`${employee.yearsOfExperience} ${
                      Number(employee.yearsOfExperience) === 1 ? 'year' : 'years'
                    }`}
                  />
                )}
                {employee.previousOrganization && (
                  <DetailItem
                    label="Previous Organization"
                    value={employee.previousOrganization}
                  />
                )}
                {employee.previousRole && (
                  <DetailItem label="Previous Role" value={employee.previousRole} />
                )}
                {employee.previousExperienceDescription && (
                  <div className="sm:col-span-2">
                    <DetailItem
                      label="Experience Description"
                      value={employee.previousExperienceDescription}
                    />
                  </div>
                )}
              </dl>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3" role="group" aria-label="Employee actions">
          <Link
            to={`/edit/${employeeId}`}
            className="btn btn-primary flex-1 text-center"
          >
            Edit Employee
          </Link>
          <button
            type="button"
            onClick={handleDelete}
            className="btn btn-danger flex-1"
          >
            Delete Employee
          </button>
        </div>
      </div>
    </div>
  );
};

/** Presentational helper for a labelled detail value. */
const DetailItem = ({ label, value, children }) => (
  <div>
    <dt className="text-sm text-theme-muted mb-0.5">{label}</dt>
    <dd className="text-sm sm:text-base text-theme-primary font-medium break-words">
      {children ?? value}
    </dd>
  </div>
);

export default EmployeeDetails;

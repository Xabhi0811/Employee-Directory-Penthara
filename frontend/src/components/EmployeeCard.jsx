import { memo, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { formatDate } from '../utils/validation';

/**
 * EmployeeCard Component
 * Displays individual employee information in a card layout
 * Memoized to prevent unnecessary re-renders
 */
const EmployeeCard = memo(({ employee, onDelete }) => {
  const navigate = useNavigate();
  
  // Handle both id and _id for compatibility
  const employeeId = employee.id || employee._id;

  const isExperienced = employee.employmentType === 'Experienced';

  const handleEdit = useCallback(() => {
    navigate(`/edit/${employeeId}`);
  }, [navigate, employeeId]);

  const handleDelete = useCallback(() => {
    if (window.confirm(`Are you sure you want to delete ${employee.name}?`)) {
      onDelete(employeeId);
    }
  }, [employee.name, employeeId, onDelete]);

  return (
    <div className="card hover-lift fade-in group" role="article" aria-label={`Employee: ${employee.name}`}>
      <div className="flex flex-col h-full">
        {/* Clickable header — navigates to employee details */}
        <Link
          to={`/employees/${employeeId}`}
          className="block mb-4 sm:mb-5 focus-visible-ring rounded-lg -m-1 p-1
                     group-hover:opacity-90"
          aria-label={`View details for ${employee.name}`}
        >
          <h3 className="title-hover-accent text-lg sm:text-xl font-semibold mb-1 sm:mb-2 break-words">
            {employee.name}
          </h3>
          <p className="text-sm sm:text-base text-theme-accent font-medium" aria-label={`Role: ${employee.role}`}>
            {employee.role}
          </p>
        </Link>

        {/* Employee Details with better spacing */}
        <div className="space-y-2.5 sm:space-y-3 mb-5 sm:mb-6 flex-grow">
          <div className="flex items-start">
            <svg
              className="w-4 h-4 sm:w-5 sm:h-5 text-theme-muted mr-2 mt-0.5 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
            <span className="text-sm sm:text-base text-theme-secondary break-words" aria-label={`Department: ${employee.department}`}>
              {employee.department}
            </span>
          </div>

          <div className="flex items-start">
            <svg
              className="w-4 h-4 sm:w-5 sm:h-5 text-theme-muted mr-2 mt-0.5 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            <a
              href={`mailto:${employee.email}`}
              className="link-subtle text-sm sm:text-base break-all focus-visible-ring rounded"
              aria-label={`Email ${employee.name} at ${employee.email}`}
            >
              {employee.email}
            </a>
          </div>

          <div className="flex items-start">
            <svg
              className="w-4 h-4 sm:w-5 sm:h-5 text-theme-muted mr-2 mt-0.5 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
              />
            </svg>
            <a
              href={`tel:${employee.phone}`}
              className="link-subtle text-sm sm:text-base focus-visible-ring rounded"
              aria-label={`Call ${employee.name} at ${employee.phone}`}
            >
              {employee.phone}
            </a>
          </div>

          <div className="flex items-start">
            <svg
              className="w-4 h-4 sm:w-5 sm:h-5 text-theme-muted mr-2 mt-0.5 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span className="text-sm sm:text-base text-theme-secondary" aria-label={`Joined on ${formatDate(employee.joiningDate)}`}>
              Joined: {formatDate(employee.joiningDate)}
            </span>
          </div>

          {/* Employment type badge */}
          {employee.employmentType && (
            <div className="pt-1">
              <span className={`badge ${isExperienced ? 'badge-primary' : 'badge-success'}`}>
                {employee.employmentType}
              </span>
            </div>
          )}

          {/* Previous experience, shown only for experienced employees so a
              fresher's card never displays irrelevant fields. */}
          {isExperienced && (
            <dl className="pt-2 mt-1 border-t border-theme space-y-1.5 text-sm sm:text-base">
              {employee.yearsOfExperience !== undefined &&
                employee.yearsOfExperience !== null && (
                  <div className="flex gap-1.5">
                    <dt className="text-theme-muted">Experience:</dt>
                    <dd className="text-theme-primary font-medium">
                      {employee.yearsOfExperience}{' '}
                      {Number(employee.yearsOfExperience) === 1 ? 'year' : 'years'}
                    </dd>
                  </div>
                )}
              {employee.previousOrganization && (
                <div className="flex gap-1.5">
                  <dt className="text-theme-muted">Previous:</dt>
                  <dd className="text-theme-primary break-words">
                    {employee.previousOrganization}
                  </dd>
                </div>
              )}
              {employee.previousRole && (
                <div className="flex gap-1.5">
                  <dt className="text-theme-muted">Last Role:</dt>
                  <dd className="text-theme-primary break-words">
                    {employee.previousRole}
                  </dd>
                </div>
              )}
            </dl>
          )}
        </div>

        {/* Action Buttons with better mobile spacing */}
        <div className="flex gap-2 sm:gap-3 pt-4 border-t border-theme" role="group" aria-label="Employee actions">
          <button
            onClick={handleEdit}
            className="btn btn-primary btn-sm flex-1 text-sm sm:text-base"
            aria-label={`Edit ${employee.name}'s information`}
          >
            <span className="flex items-center justify-center gap-1.5">
              <svg
                className="w-3.5 h-3.5 sm:w-4 sm:h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
              <span className="hidden sm:inline">Edit</span>
              <span className="sm:hidden">Edit</span>
            </span>
          </button>
          <button
            onClick={handleDelete}
            className="btn btn-danger btn-sm flex-1 text-sm sm:text-base"
            aria-label={`Delete ${employee.name}`}
          >
            <span className="flex items-center justify-center gap-1.5">
              <svg
                className="w-3.5 h-3.5 sm:w-4 sm:h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              <span className="hidden sm:inline">Delete</span>
              <span className="sm:hidden">Delete</span>
            </span>
          </button>
        </div>
      </div>
    </div>
  );
});

EmployeeCard.displayName = 'EmployeeCard';

export default EmployeeCard;

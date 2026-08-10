import { memo } from 'react';
import { Link } from 'react-router-dom';

/**
 * EmployeeSearchResults Component
 * Renders global search results as a clickable list that links to the employee
 * details page via ID. Shows name, role, and department so the user can
 * distinguish duplicate names.
 */
const EmployeeSearchResults = memo(({ results, loading }) => {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12" role="status" aria-live="polite">
        <div className="spinner-lg mb-4" aria-label="Searching"></div>
        <p className="text-sm text-theme-secondary">Searching employees...</p>
      </div>
    );
  }

  if (!results || results.length === 0) {
    return (
      <div className="empty-state" role="status" aria-live="polite">
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
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <h3 className="empty-state-title">No employees match your search.</h3>
        <p className="empty-state-description">
          Try a different name, role, or department.
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-3" role="list" aria-label="Search results">
      {results.map((emp) => {
        const empId = emp.id || emp._id;
        return (
          <li key={empId}>
            <Link
              to={`/employees/${empId}`}
              className="list-item-surface block rounded-lg p-4 sm:p-5
                         focus-visible-ring group"
              aria-label={`${emp.name}, ${emp.role}, ${emp.department}`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <p className="title-hover-accent text-base sm:text-lg font-semibold">
                    {emp.name}
                  </p>
                  <p className="text-sm text-theme-accent font-medium">{emp.role}</p>
                </div>
                <span className="text-xs sm:text-sm text-theme-muted surface-muted px-2.5 py-1 rounded-full self-start sm:self-center">
                  {emp.department}
                </span>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
});

EmployeeSearchResults.displayName = 'EmployeeSearchResults';

export default EmployeeSearchResults;

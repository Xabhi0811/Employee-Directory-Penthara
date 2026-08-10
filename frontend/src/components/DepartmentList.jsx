import { memo } from 'react';
import DepartmentCard from './DepartmentCard';
import { CardLoadingSkeleton } from './LoadingFallback';

/**
 * DepartmentList Component
 * Chooses between the loading skeletons, an error state with retry, the empty
 * states, and the responsive department grid.
 *
 * Grid: 1 column on mobile, 2 on tablet, 3 on laptop, 4 on wide desktop.
 */
const DepartmentList = memo(
  ({ departments, loading, error, onRetry, isFiltered = false }) => {
    if (loading) {
      return (
        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6"
          role="status"
          aria-live="polite"
          aria-label="Loading departments"
        >
          {Array.from({ length: 4 }).map((_, index) => (
            <CardLoadingSkeleton key={index} />
          ))}
          <span className="sr-only">Loading departments, please wait</span>
        </div>
      );
    }

    if (error) {
      return (
        <div className="empty-state" role="alert">
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
          <h3 className="empty-state-title">Unable to load departments</h3>
          <p className="empty-state-description mb-6">
            Unable to load departments. Please try again.
          </p>
          {onRetry && (
            <button type="button" onClick={onRetry} className="btn btn-primary">
              Try Again
            </button>
          )}
        </div>
      );
    }

    if (!departments || departments.length === 0) {
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
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
            />
          </svg>
          <h3 className="empty-state-title">
            {isFiltered ? 'No departments found.' : 'No departments available.'}
          </h3>
          <p className="empty-state-description">
            {isFiltered
              ? 'No departments match your search. Try a different term.'
              : 'Departments appear here once employees have been added.'}
          </p>
        </div>
      );
    }

    return (
      <div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6"
        role="list"
        aria-label="Departments"
      >
        {departments.map((department) => (
          <div role="listitem" key={department.name}>
            <DepartmentCard
              name={department.name}
              employeeCount={department.employeeCount}
            />
          </div>
        ))}
      </div>
    );
  }
);

DepartmentList.displayName = 'DepartmentList';

export default DepartmentList;

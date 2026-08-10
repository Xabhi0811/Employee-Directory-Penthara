import { memo } from 'react';
import { Link } from 'react-router-dom';

/**
 * DepartmentCard Component
 * Shows a department with its live employee count and links to that
 * department's employee list. The whole card is a single link so the entire
 * surface is clickable while remaining one predictable tab stop.
 */
const DepartmentCard = memo(({ name, employeeCount }) => {
  const employeeLabel = employeeCount === 1 ? 'Employee' : 'Employees';

  return (
    <Link
      to={`/departments/${encodeURIComponent(name)}`}
      className="card hover-lift fade-in group flex flex-col h-full focus-visible-ring"
      aria-label={`${name}, ${employeeCount} ${employeeLabel.toLowerCase()}. View employees`}
    >
      {/* Department icon */}
      <div
        className="flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 mb-4 rounded-lg icon-tile"
        aria-hidden="true"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
          />
        </svg>
      </div>

      <h3 className="text-lg sm:text-xl font-semibold text-theme-primary mb-1 break-words">
        {name}
      </h3>

      <p className="text-sm sm:text-base text-theme-secondary mb-5 sm:mb-6">
        <span className="font-semibold text-theme-primary">{employeeCount}</span>{' '}
        {employeeLabel}
      </p>

      {/* Pushed to the bottom so cards of differing heights stay aligned */}
      <span className="mt-auto inline-flex items-center gap-1.5 text-sm sm:text-base font-medium text-theme-accent">
        View Employees
        <svg
          className="w-4 h-4 group-hover:translate-x-0.5"
          style={{ transition: 'transform 200ms' }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M14 5l7 7m0 0l-7 7m7-7H3"
          />
        </svg>
      </span>
    </Link>
  );
});

DepartmentCard.displayName = 'DepartmentCard';

export default DepartmentCard;

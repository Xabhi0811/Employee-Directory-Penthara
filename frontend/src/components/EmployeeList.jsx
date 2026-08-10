import { memo } from 'react';
import EmployeeCard from './EmployeeCard';

/**
 * EmployeeList Component
 * Displays a grid of employee cards with empty state
 * Memoized to prevent unnecessary re-renders when employees array reference changes
 */
const EmployeeList = memo(({ employees, onDelete, loading }) => {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 sm:py-20" 
           role="status" 
           aria-live="polite">
        <div className="spinner-lg mb-4" aria-label="Loading employees"></div>
        <p className="text-sm sm:text-base text-theme-secondary font-medium">Loading employees...</p>
        <span className="sr-only">Please wait while we load the employee directory</span>
      </div>
    );
  }

  if (!employees || employees.length === 0) {
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
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
        <h3 className="empty-state-title">
          No employees found
        </h3>
        <p className="empty-state-description">
          {employees === null || employees.length === 0
            ? "Get started by adding a new employee to the directory."
            : "No employees match your search criteria. Try adjusting your filters."}
        </p>
      </div>
    );
  }

  return (
    <div 
      className="card-grid"
      role="list"
      aria-label="Employee directory"
    >
      {employees.map((employee) => (
        <EmployeeCard
          key={employee.id || employee._id}
          employee={employee}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
});

EmployeeList.displayName = 'EmployeeList';

export default EmployeeList;

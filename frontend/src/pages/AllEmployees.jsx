import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import SearchInput from '../components/SearchInput';
import EmployeeList from '../components/EmployeeList';
import { useEmployeeContext } from '../context/EmployeeContext';
import { MAX_PAGE_SIZE } from '../constants/api.constants';

/**
 * AllEmployees Page Component
 * Shows every employee in the directory, across all departments, with a search
 * box that matches on name, role or department.
 *
 * `limit` is set explicitly because the employees endpoint defaults to a page
 * size of 10 — without it this page would silently show only the first page and
 * disagree with the department headcounts on Home.
 */
const AllEmployees = () => {
  const { employees, loading, error, fetchEmployees, removeEmployee } =
    useEmployeeContext();

  const [searchTerm, setSearchTerm] = useState('');

  const loadEmployees = useCallback(() => {
    // Errors are reflected in the `error` state and shown inline below.
    fetchEmployees({ limit: MAX_PAGE_SIZE }).catch(() => {});
  }, [fetchEmployees]);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  const visibleEmployees = useMemo(() => {
    if (!searchTerm) return employees;

    const needle = searchTerm.trim().toLowerCase();
    return employees.filter(
      (employee) =>
        employee.name?.toLowerCase().includes(needle) ||
        employee.role?.toLowerCase().includes(needle) ||
        employee.department?.toLowerCase().includes(needle)
    );
  }, [employees, searchTerm]);

  const handleDelete = useCallback(
    async (id) => {
      try {
        await removeEmployee(id);
      } catch {
        // Failure is already reported to the user by the context toast.
      }
    },
    [removeEmployee]
  );

  const employeeLabel = employees.length === 1 ? 'Employee' : 'Employees';

  return (
    <div className="page-bg">
      <div className="max-w-7xl mx-auto container-padding section-spacing">
        <header className="mb-6 sm:mb-8" id="main-content">
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
            Back to Departments
          </Link>

          <h1 className="heading-responsive font-bold text-theme-primary mb-2">
            All Employees
          </h1>
          {!loading && !error && (
            <p className="text-sm sm:text-base text-theme-secondary">
              <span className="font-semibold text-theme-primary">
                {employees.length}
              </span>{' '}
              {employeeLabel} across the directory
            </p>
          )}
        </header>

        {/* Directory-wide employee search */}
        <section
          className="search-surface rounded-lg p-4 sm:p-6 mb-6 sm:mb-8"
          role="search"
          aria-label="Search all employees"
        >
          <div className="max-w-md">
            <SearchInput
              id="all-employee-search"
              label="Search all employees"
              placeholder="Search by name, role or department..."
              describedBy="all-employee-search-description"
              description="Type to filter employees by name, role or department"
              onSearch={setSearchTerm}
            />
          </div>
        </section>

        {error ? (
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
            <h3 className="empty-state-title">Unable to load employees</h3>
            <p className="empty-state-description mb-6">
              Unable to load employees. Please try again.
            </p>
            <button type="button" onClick={loadEmployees} className="btn btn-primary">
              Try Again
            </button>
          </div>
        ) : (
          <>
            {/* Search result count, announced politely */}
            {!loading && searchTerm && (
              <div
                className="mb-4 sm:mb-6"
                role="status"
                aria-live="polite"
                aria-atomic="true"
              >
                <p className="text-sm sm:text-base text-theme-secondary">
                  Showing{' '}
                  <span className="font-semibold">{visibleEmployees.length}</span> of{' '}
                  <span className="font-semibold">{employees.length}</span>{' '}
                  {employeeLabel.toLowerCase()}
                </p>
              </div>
            )}

            {/* Distinguish "directory is empty" from "search matched nothing" */}
            {!loading && employees.length === 0 ? (
              <div className="empty-state" role="status" aria-live="polite">
                <h3 className="empty-state-title">No employees yet.</h3>
                <p className="empty-state-description mb-6">
                  Add your first employee to see them listed here.
                </p>
                <Link to="/add" className="btn btn-primary">
                  Add Employee
                </Link>
              </div>
            ) : !loading && visibleEmployees.length === 0 ? (
              <div className="empty-state" role="status" aria-live="polite">
                <h3 className="empty-state-title">No employees match your search.</h3>
                <p className="empty-state-description">
                  Try a different name, role or department.
                </p>
              </div>
            ) : (
              <section aria-label="All employees">
                <EmployeeList
                  employees={visibleEmployees}
                  onDelete={handleDelete}
                  loading={loading}
                />
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AllEmployees;

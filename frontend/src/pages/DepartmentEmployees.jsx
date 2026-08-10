import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import SearchInput from '../components/SearchInput';
import EmployeeList from '../components/EmployeeList';
import { useEmployeeContext } from '../context/EmployeeContext';

/**
 * DepartmentEmployees Page Component
 * Shows only the employees belonging to the department named in the route, with
 * a search box that matches on employee name or role.
 *
 * The department filter is applied server-side via the employees endpoint and
 * then re-asserted client-side, so an employee from another department can never
 * appear on this page.
 */
const DepartmentEmployees = () => {
  const { departmentName } = useParams();
  const department = decodeURIComponent(departmentName || '');

  const { employees, loading, error, fetchEmployees, removeEmployee } =
    useEmployeeContext();

  const [searchTerm, setSearchTerm] = useState('');

  const loadEmployees = useCallback(() => {
    // Errors are reflected in the `error` state and shown inline below.
    fetchEmployees({ department }).catch(() => {});
  }, [fetchEmployees, department]);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  /**
   * Employees of this department only, narrowed further by the search term.
   *
   * The department check is intentionally redundant with the API filter: it
   * guarantees correctness even if the shared employee list in context still
   * holds results from a previous view.
   */
  const departmentEmployees = useMemo(
    () =>
      employees.filter(
        (employee) =>
          employee.department?.toLowerCase() === department.toLowerCase()
      ),
    [employees, department]
  );

  const visibleEmployees = useMemo(() => {
    if (!searchTerm) return departmentEmployees;

    const needle = searchTerm.trim().toLowerCase();
    return departmentEmployees.filter(
      (employee) =>
        employee.name?.toLowerCase().includes(needle) ||
        employee.role?.toLowerCase().includes(needle)
    );
  }, [departmentEmployees, searchTerm]);

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

  const employeeLabel = departmentEmployees.length === 1 ? 'Employee' : 'Employees';

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

          <h1 className="heading-responsive font-bold text-theme-primary mb-2 break-words">
            {department}
          </h1>
          {!loading && !error && (
            <p className="text-sm sm:text-base text-theme-secondary">
              <span className="font-semibold text-theme-primary">
                {departmentEmployees.length}
              </span>{' '}
              {employeeLabel}
            </p>
          )}
        </header>

        {/* In-department employee search */}
        <section
          className="search-surface rounded-lg p-4 sm:p-6 mb-6 sm:mb-8"
          role="search"
          aria-label={`Search employees in ${department}`}
        >
          <div className="max-w-md">
            <SearchInput
              id="employee-search"
              label={`Search employees in ${department}`}
              placeholder={`Search employees in ${department}...`}
              describedBy="employee-search-description"
              description="Type to filter employees by name or role"
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
                  <span className="font-semibold">{departmentEmployees.length}</span>{' '}
                  {employeeLabel.toLowerCase()}
                </p>
              </div>
            )}

            {/* Distinguish "department is empty" from "search matched nothing" */}
            {!loading && departmentEmployees.length === 0 ? (
              <div className="empty-state" role="status" aria-live="polite">
                <h3 className="empty-state-title">
                  No employees found in this department.
                </h3>
                <p className="empty-state-description mb-6">
                  Add an employee to {department} to see them listed here.
                </p>
                <Link to="/add" className="btn btn-primary">
                  Add Employee
                </Link>
              </div>
            ) : !loading && visibleEmployees.length === 0 ? (
              <div className="empty-state" role="status" aria-live="polite">
                <h3 className="empty-state-title">
                  No employees match your search.
                </h3>
                <p className="empty-state-description">
                  Try a different name or role.
                </p>
              </div>
            ) : (
              <section aria-label={`Employees in ${department}`}>
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

export default DepartmentEmployees;

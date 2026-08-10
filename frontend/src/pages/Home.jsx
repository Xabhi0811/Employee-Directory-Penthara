import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import SearchInput from '../components/SearchInput';
import DepartmentList from '../components/DepartmentList';
import EmployeeSearchResults from '../components/EmployeeSearchResults';
import { useEmployeeContext } from '../context/EmployeeContext';

/**
 * Home Page Component
 *
 * When no search term → show department cards (existing behaviour).
 * When the user types into the global search → query ALL employees across every
 * department, matching on name, role, or department. Duplicate names are handled
 * naturally because results include role + department so the user can tell them
 * apart, and each card links to `/employees/:id`.
 */
const Home = () => {
  const {
    departmentSummaries,
    departmentsLoading,
    departmentsError,
    fetchDepartmentSummaries,
    fetchEmployees,
    employees,
    loading: employeesLoading,
  } = useEmployeeContext();

  const [departmentSearch, setDepartmentSearch] = useState('');
  const [globalSearch, setGlobalSearch] = useState('');

  // Load departments on mount
  useEffect(() => {
    fetchDepartmentSummaries().catch(() => {});
  }, [fetchDepartmentSummaries]);

  // When a global search is active, fetch employees matching the term from the
  // backend so we get full-text search across all departments.
  useEffect(() => {
    if (globalSearch) {
      fetchEmployees({ search: globalSearch }).catch(() => {});
    }
  }, [globalSearch, fetchEmployees]);

  const handleRetry = useCallback(() => {
    fetchDepartmentSummaries().catch(() => {});
  }, [fetchDepartmentSummaries]);

  // Department filtering (only when showing department view)
  const filteredDepartments = useMemo(() => {
    if (!departmentSearch) return departmentSummaries;
    const needle = departmentSearch.trim().toLowerCase();
    return departmentSummaries.filter((d) =>
      d.name.toLowerCase().includes(needle)
    );
  }, [departmentSummaries, departmentSearch]);

  const totalEmployees = useMemo(
    () => departmentSummaries.reduce((t, d) => t + d.employeeCount, 0),
    [departmentSummaries]
  );

  // For global search: additional client-side filter to match on name, role,
  // department. The backend text search already narrows the set; this catches
  // cases the user is filtering by department name.
  const searchResults = useMemo(() => {
    if (!globalSearch) return [];
    const needle = globalSearch.trim().toLowerCase();
    return employees.filter(
      (emp) =>
        emp.name?.toLowerCase().includes(needle) ||
        emp.role?.toLowerCase().includes(needle) ||
        emp.department?.toLowerCase().includes(needle)
    );
  }, [globalSearch, employees]);

  const isSearching = Boolean(globalSearch);

  return (
    <div className="page-bg">
      <div className="max-w-7xl mx-auto container-padding section-spacing">
        <header className="mb-6 sm:mb-8" id="main-content">
          <h1 className="heading-responsive font-bold text-theme-primary mb-2">
            Employee Directory
          </h1>
          <p className="text-sm sm:text-base text-theme-secondary">
            Search for an employee or browse by department.
          </p>
        </header>

        {/* Global employee search */}
        <section
          className="search-surface rounded-lg p-4 sm:p-6 mb-6 sm:mb-8"
          role="search"
          aria-label="Search employees"
        >
          <div className="max-w-md">
            <SearchInput
              id="global-search"
              label="Search Employees"
              placeholder="Search by name, role, or department..."
              describedBy="global-search-desc"
              description="Search across all departments by name, role, or department"
              onSearch={setGlobalSearch}
            />
          </div>
        </section>

        {/* When searching: show employee results */}
        {isSearching ? (
          <section aria-label="Search results">
            <div
              className="mb-4 sm:mb-6"
              role="status"
              aria-live="polite"
              aria-atomic="true"
            >
              <h2 className="text-lg sm:text-xl font-semibold text-theme-primary">
                {employeesLoading
                  ? 'Searching...'
                  : `${searchResults.length} result${searchResults.length !== 1 ? 's' : ''} for "${globalSearch}"`}
              </h2>
            </div>
            <EmployeeSearchResults
              results={searchResults}
              loading={employeesLoading}
            />
          </section>
        ) : (
          <>
            {/* Department search (below global search) */}
            <section
              className="search-surface rounded-lg p-4 sm:p-6 mb-6 sm:mb-8"
              role="search"
              aria-label="Filter departments"
            >
              <div className="max-w-md">
                <SearchInput
                  id="department-search"
                  label="Filter Departments"
                  placeholder="Filter departments..."
                  describedBy="department-search-description"
                  description="Type to filter departments by name"
                  onSearch={setDepartmentSearch}
                />
              </div>
            </section>

            {/* Department summary */}
            {!departmentsLoading && !departmentsError && (
              <div
                className="flex flex-wrap items-baseline justify-between gap-2 mb-4 sm:mb-6"
                role="status"
                aria-live="polite"
                aria-atomic="true"
              >
                <h2 className="text-lg sm:text-xl font-semibold text-theme-primary">
                  Departments
                </h2>
                <p className="text-sm sm:text-base text-theme-secondary">
                  {departmentSearch
                    ? `${filteredDepartments.length} of ${departmentSummaries.length} departments`
                    : `${departmentSummaries.length} departments · ${totalEmployees} employees`}
                </p>
              </div>
            )}

            <DepartmentList
              departments={filteredDepartments}
              loading={departmentsLoading}
              error={departmentsError}
              onRetry={handleRetry}
              isFiltered={Boolean(departmentSearch)}
            />
          </>
        )}

        {/* Floating add button */}
        <Link
          to="/add"
          className="btn btn-primary fixed bottom-6 right-6 sm:bottom-8 sm:right-8
                     w-14 h-14 sm:w-16 sm:h-16 !px-0 rounded-full
                     flex items-center justify-center
                     lg:hidden z-50"
          style={{ boxShadow: 'var(--shadow-lg)' }}
          aria-label="Add new employee"
        >
          <svg
            className="w-6 h-6 sm:w-7 sm:h-7"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
        </Link>
      </div>
    </div>
  );
};

export default Home;

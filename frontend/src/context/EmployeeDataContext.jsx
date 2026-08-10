/**
 * Employee Data Context
 * Separated data state from actions to prevent unnecessary re-renders
 * Components only re-render when they need data, not when actions are called
 */

import { createContext, useContext, useState } from 'react';

const EmployeeDataContext = createContext(null);

export const EmployeeDataProvider = ({ children }) => {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  // Departments with live employee counts, powering the department cards.
  const [departmentSummaries, setDepartmentSummaries] = useState([]);
  const [loading, setLoading] = useState(false);
  // Tracked separately from `loading` so the department view and the employee
  // view can show their own loading state without interfering.
  const [departmentsLoading, setDepartmentsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [departmentsError, setDepartmentsError] = useState(null);

  // Direct value object without useMemo - dependencies change frequently
  // so useMemo overhead exceeds benefit
  const value = {
    employees,
    departments,
    departmentSummaries,
    loading,
    departmentsLoading,
    error,
    departmentsError,
    setEmployees,
    setDepartments,
    setDepartmentSummaries,
    setLoading,
    setDepartmentsLoading,
    setError,
    setDepartmentsError,
  };

  return (
    <EmployeeDataContext.Provider value={value}>
      {children}
    </EmployeeDataContext.Provider>
  );
};

/**
 * Hook to access employee data
 */
export const useEmployeeData = () => {
  const context = useContext(EmployeeDataContext);
  if (!context) {
    throw new Error('useEmployeeData must be used within EmployeeDataProvider');
  }
  return context;
};

export default EmployeeDataContext;

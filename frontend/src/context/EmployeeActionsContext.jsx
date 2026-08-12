/**
 * Employee Actions Context
 * Separated actions from data to prevent unnecessary re-renders
 * Actions are stable and don't cause re-renders when called
 */

import { createContext, useContext, useCallback, useMemo, useRef } from 'react';
import toast from 'react-hot-toast';
import {
  getEmployees,
  getEmployee,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getDepartments,
  getDepartmentsWithCounts,
} from '../services/employeeService';
import { useEmployeeData } from './EmployeeDataContext';

const EmployeeActionsContext = createContext(null);

export const EmployeeActionsProvider = ({ children }) => {
  const {
    setEmployees,
    setDepartments,
    setDepartmentSummaries,
    setLoading,
    setDepartmentsLoading,
    setError,
    setDepartmentsError,
  } = useEmployeeData();

  // Track pending requests to prevent duplicates
  const pendingRequests = useRef(new Map());

  /**
   * Fetch all employees with request deduplication
   */
  const fetchEmployees = useCallback(
    async (filters = {}) => {
      const requestKey = `fetchEmployees:${JSON.stringify(filters)}`;
      
      // Check if request is already pending
      if (pendingRequests.current.has(requestKey)) {
        return pendingRequests.current.get(requestKey);
      }

      const requestPromise = (async () => {
        try {
          setLoading(true);
          setError(null);
          const data = await getEmployees(filters);
          setEmployees(data);
          return data;
        } catch (err) {
          setError(err.message);
          toast.error(err.message || 'Failed to fetch employees');
          throw err;
        } finally {
          setLoading(false);
          pendingRequests.current.delete(requestKey);
        }
      })();

      pendingRequests.current.set(requestKey, requestPromise);
      return requestPromise;
    },
    [setEmployees, setLoading, setError]
  );

  /**
   * Fetch single employee with request deduplication
   */
  const fetchEmployee = useCallback(
    async (id) => {
      const requestKey = `fetchEmployee:${id}`;
      
      // Check if request is already pending
      if (pendingRequests.current.has(requestKey)) {
        return pendingRequests.current.get(requestKey);
      }

      const requestPromise = (async () => {
        try {
          setLoading(true);
          setError(null);
          const data = await getEmployee(id);
          return data;
        } catch (err) {
          setError(err.message);
          toast.error(err.message || 'Failed to fetch employee');
          throw err;
        } finally {
          setLoading(false);
          pendingRequests.current.delete(requestKey);
        }
      })();

      pendingRequests.current.set(requestKey, requestPromise);
      return requestPromise;
    },
    [setLoading, setError]
  );

  /**
   * Fetch departments with request deduplication
   */
  const fetchDepartments = useCallback(async () => {
    const requestKey = 'fetchDepartments';
    
    // Check if request is already pending
    if (pendingRequests.current.has(requestKey)) {
      return pendingRequests.current.get(requestKey);
    }

    const requestPromise = (async () => {
      try {
        setError(null);
        const data = await getDepartments();
        setDepartments(data);
        return data;
      } catch (err) {
        setError(err.message);
        toast.error('Failed to load departments');
        // Log only in development
        if (process.env.NODE_ENV === 'development') {
          console.error('Failed to fetch departments:', err);
        }
        throw err;
      } finally {
        pendingRequests.current.delete(requestKey);
      }
    })();

    pendingRequests.current.set(requestKey, requestPromise);
    return requestPromise;
  }, [setDepartments, setError]);

  /**
   * Fetch departments with live employee counts (department cards).
   *
   * Uses its own loading/error state so a failure here shows a retryable
   * message in the department view without affecting the employee list.
   */
  const fetchDepartmentSummaries = useCallback(async () => {
    const requestKey = 'fetchDepartmentSummaries';

    if (pendingRequests.current.has(requestKey)) {
      return pendingRequests.current.get(requestKey);
    }

    const requestPromise = (async () => {
      try {
        setDepartmentsLoading(true);
        setDepartmentsError(null);
        const data = await getDepartmentsWithCounts();
        setDepartmentSummaries(data);
        return data;
      } catch (err) {
        setDepartmentsError(err.message || 'Unable to load departments');
        throw err;
      } finally {
        setDepartmentsLoading(false);
        pendingRequests.current.delete(requestKey);
      }
    })();

    pendingRequests.current.set(requestKey, requestPromise);
    return requestPromise;
  }, [setDepartmentSummaries, setDepartmentsLoading, setDepartmentsError]);

  /**
   * Add new employee
   */
  const addEmployee = useCallback(
    async (employeeData) => {
      const loadingToast = toast.loading('Creating employee...');
      try {
        setError(null);
        const newEmployee = await createEmployee(employeeData);
        setEmployees((prev) => [newEmployee, ...prev]);
        // Refresh department summaries so the Home page counts stay accurate.
        // The backend cache is cleared on every mutation; this syncs the
        // frontend context to match.
        fetchDepartmentSummaries().catch(() => {});
        toast.success('Employee created successfully!', { id: loadingToast });
        return newEmployee;
      } catch (err) {
        setError(err.message);
        toast.error(err.message || 'Failed to create employee', {
          id: loadingToast,
        });
        throw err;
      }
    },
    [setEmployees, setError, fetchDepartmentSummaries]
  );

  /**
   * Update existing employee
   */
  const modifyEmployee = useCallback(
    async (id, employeeData) => {
      const loadingToast = toast.loading('Updating employee...');
      try {
        setError(null);
        const updatedEmployee = await updateEmployee(id, employeeData);
        setEmployees((prev) =>
          prev.map((emp) =>
            (emp.id || emp._id) === id ? updatedEmployee : emp
          )
        );
        // Refresh department summaries — an employee may have moved departments.
        fetchDepartmentSummaries().catch(() => {});
        toast.success('Employee updated successfully!', { id: loadingToast });
        return updatedEmployee;
      } catch (err) {
        setError(err.message);
        toast.error(err.message || 'Failed to update employee', {
          id: loadingToast,
        });
        throw err;
      }
    },
    [setEmployees, setError, fetchDepartmentSummaries]
  );

  /**
   * Remove employee
   */
  const removeEmployee = useCallback(
    async (id) => {
      const loadingToast = toast.loading('Deleting employee...');
      try {
        setError(null);
        await deleteEmployee(id);
        setEmployees((prev) =>
          prev.filter((emp) => (emp.id || emp._id) !== id)
        );
        // Refresh department summaries so the headcount drops immediately.
        fetchDepartmentSummaries().catch(() => {});
        toast.success('Employee deleted successfully', { id: loadingToast });
      } catch (err) {
        setError(err.message);
        toast.error(err.message || 'Failed to delete employee', {
          id: loadingToast,
        });
        throw err;
      }
    },
    [setEmployees, setError, fetchDepartmentSummaries]
  );

  // Memoize actions object - these functions are stable and won't cause re-renders
  const actions = useMemo(
    () => ({
      fetchEmployees,
      fetchEmployee,
      fetchDepartments,
      fetchDepartmentSummaries,
      addEmployee,
      modifyEmployee,
      removeEmployee,
    }),
    [
      fetchEmployees,
      fetchEmployee,
      fetchDepartments,
      fetchDepartmentSummaries,
      addEmployee,
      modifyEmployee,
      removeEmployee,
    ]
  );

  return (
    <EmployeeActionsContext.Provider value={actions}>
      {children}
    </EmployeeActionsContext.Provider>
  );
};

/**
 * Hook to access employee actions
 */
export const useEmployeeActions = () => {
  const context = useContext(EmployeeActionsContext);
  if (!context) {
    throw new Error(
      'useEmployeeActions must be used within EmployeeActionsProvider'
    );
  }
  return context;
};

export default EmployeeActionsContext;

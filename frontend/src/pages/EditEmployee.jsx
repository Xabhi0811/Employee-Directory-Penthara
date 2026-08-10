import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import EmployeeForm from '../components/EmployeeForm';
import { useEmployeeContext } from '../context/EmployeeContext';

/**
 * Edit Employee Page Component
 * Handles editing existing employees
 * Uses Context API for centralized state management
 */
const EditEmployee = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { fetchEmployee, modifyEmployee } = useEmployeeContext();

  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  /**
   * Fetch employee data on component mount with cleanup
   */
  useEffect(() => {
    const abortController = new AbortController();
    
    const loadEmployee = async () => {
      try {
        setFetching(true);
        const data = await fetchEmployee(id);
        // Only update state if component is still mounted
        if (!abortController.signal.aborted) {
          setEmployee(data);
        }
      } catch (error) {
        // Only handle error if not aborted
        if (!abortController.signal.aborted) {
          if (process.env.NODE_ENV === 'development') {
            console.error('Failed to fetch employee:', error);
          }
          navigate('/');
        }
      } finally {
        if (!abortController.signal.aborted) {
          setFetching(false);
        }
      }
    };

    loadEmployee();
    
    // Cleanup: cancel request if component unmounts
    return () => abortController.abort();
  }, [id, fetchEmployee, navigate]);

  /**
   * Handle form submission
   */
  const handleSubmit = async (employeeData) => {
    try {
      setLoading(true);
      await modifyEmployee(id, employeeData);
      navigate('/');
    } catch (error) {
      // Error handling is done in Context with toast
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to update employee:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="page-bg flex items-center justify-center container-padding">
        <div className="text-center">
          <div className="spinner-lg mx-auto mb-4"></div>
          <p className="text-sm sm:text-base text-theme-secondary font-medium">Loading employee data...</p>
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="page-bg flex items-center justify-center container-padding">
        <div className="text-center empty-state">
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
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <h2 className="empty-state-title">Employee not found</h2>
          <p className="empty-state-description mb-6">
            The employee you're looking for doesn't exist or has been removed.
          </p>
          <button
            onClick={() => navigate('/')}
            className="btn btn-primary"
          >
            Back to Employee List
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-bg">
      <div className="max-w-3xl mx-auto container-padding section-spacing">
        {/* Header with better spacing */}
        <div className="mb-6 sm:mb-8">
          <button
            onClick={() => navigate('/')}
            className="flex items-center text-sm sm:text-base text-theme-secondary hover:text-theme-primary mb-4 sm:mb-6 focus-visible-ring rounded-lg p-1 -ml-1"
            aria-label="Back to employee list"
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
            Back to Employee List
          </button>
          <h1 className="heading-responsive font-bold text-theme-primary mb-2">
            Edit Employee
          </h1>
          <p className="text-sm sm:text-base text-theme-secondary">
            Update the employee information below
          </p>
        </div>

        {/* Form Card with responsive padding */}
        <div className="card-surface rounded-lg responsive-padding">
          <EmployeeForm
            initialData={employee}
            onSubmit={handleSubmit}
            loading={loading}
          />
          <div className="section-divider"></div>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="btn btn-secondary w-full"
            disabled={loading}
            aria-label="Cancel and return to employee list"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditEmployee;

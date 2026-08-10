import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import EmployeeForm from '../components/EmployeeForm';
import { useEmployeeContext } from '../context/EmployeeContext';

/**
 * Add Employee Page Component
 * Handles creating new employees
 * Uses Context API for centralized state management
 */
const AddEmployee = () => {
  const navigate = useNavigate();
  const { addEmployee } = useEmployeeContext();
  const [loading, setLoading] = useState(false);

  /**
   * Handle form submission
   */
  const handleSubmit = async (employeeData) => {
    try {
      setLoading(true);
      await addEmployee(employeeData);
      navigate('/');
    } catch (error) {
      // Error handling is done in Context with toast
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to create employee:', error);
      }
    } finally {
      setLoading(false);
    }
  };

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
            Add New Employee
          </h1>
          <p className="text-sm sm:text-base text-theme-secondary">
            Fill in the employee details below
          </p>
        </div>

        {/* Employee Form with responsive padding */}
        <div className="card-surface rounded-lg responsive-padding">
          <EmployeeForm onSubmit={handleSubmit} loading={loading} />
        </div>
      </div>
    </div>
  );
};

export default AddEmployee;

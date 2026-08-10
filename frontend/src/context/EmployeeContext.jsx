/**
 * Employee Context (Optimized)
 * Global state management for employee data
 * Split into separate data and actions contexts to prevent unnecessary re-renders
 */

import { EmployeeDataProvider } from './EmployeeDataContext';
import { EmployeeActionsProvider } from './EmployeeActionsContext';
import { useEmployeeData } from './EmployeeDataContext';
import { useEmployeeActions } from './EmployeeActionsContext';

/**
 * Combined Employee Provider
 * Wraps app with both data and actions providers
 */
export const EmployeeProvider = ({ children }) => {
  return (
    <EmployeeDataProvider>
      <EmployeeActionsProvider>{children}</EmployeeActionsProvider>
    </EmployeeDataProvider>
  );
};

/**
 * Combined hook for backward compatibility
 * Components can use this or separate hooks for better optimization
 */
export const useEmployeeContext = () => {
  const data = useEmployeeData();
  const actions = useEmployeeActions();
  
  return {
    ...data,
    ...actions,
  };
};

// Export separate hooks for fine-grained control
export { useEmployeeData, useEmployeeActions };

export default EmployeeProvider;


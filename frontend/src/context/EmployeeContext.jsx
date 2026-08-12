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
 * Wraps children in both the data and actions providers.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Tree that needs employee state
 */
export const EmployeeProvider = ({ children }) => {
  return (
    <EmployeeDataProvider>
      <EmployeeActionsProvider>{children}</EmployeeActionsProvider>
    </EmployeeDataProvider>
  );
};

/**
 * Convenience hook returning employee data and actions together. Prefer the
 * separate hooks when a component only needs one half.
 *
 * @returns {Object} Combined employee data and action functions
 */
export const useEmployeeContext = () => {
  const data = useEmployeeData();
  const actions = useEmployeeActions();
  
  return {
    ...data,
    ...actions,
  };
};

export { useEmployeeData, useEmployeeActions };

export default EmployeeProvider;


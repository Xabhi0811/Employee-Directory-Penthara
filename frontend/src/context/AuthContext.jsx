/**
 * Auth Context (Optimized)
 * Global state management for authentication
 * Split into separate data and actions contexts to prevent unnecessary re-renders
 */

import { AuthDataProvider } from './AuthDataContext';
import { AuthActionsProvider } from './AuthActionsContext';
import { useAuthData } from './AuthDataContext';
import { useAuthActions } from './AuthActionsContext';

/**
 * Combined Auth Provider
 * Wraps app with both data and actions providers
 */
export const AuthProvider = ({ children }) => {
  return (
    <AuthDataProvider>
      <AuthActionsProvider>{children}</AuthActionsProvider>
    </AuthDataProvider>
  );
};

/**
 * Combined hook for convenience
 * Components can use this or separate hooks for better optimization
 */
export const useAuth = () => {
  const data = useAuthData();
  const actions = useAuthActions();
  
  return {
    ...data,
    ...actions,
  };
};

export { useAuthData, useAuthActions };

export default AuthProvider;

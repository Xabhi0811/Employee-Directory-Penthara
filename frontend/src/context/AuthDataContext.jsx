/**
 * Auth Data Context
 * Separated data state from actions to prevent unnecessary re-renders
 * Components only re-render when authentication state changes
 */

import { createContext, useContext, useState } from 'react';

const AuthDataContext = createContext(null);

export const AuthDataProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // Start as true to check auth on mount
  const [error, setError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Direct value object without useMemo
  const value = {
    user,
    loading,
    error,
    isAuthenticated,
    setUser,
    setLoading,
    setError,
    setIsAuthenticated,
  };

  return (
    <AuthDataContext.Provider value={value}>
      {children}
    </AuthDataContext.Provider>
  );
};

/**
 * Hook to access auth data
 */
export const useAuthData = () => {
  const context = useContext(AuthDataContext);
  if (!context) {
    throw new Error('useAuthData must be used within AuthDataProvider');
  }
  return context;
};

export default AuthDataContext;

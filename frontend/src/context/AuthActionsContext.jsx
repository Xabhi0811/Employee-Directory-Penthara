/**
 * Auth Actions Context
 * Separated actions from data to prevent unnecessary re-renders
 * Actions are stable and don't cause re-renders when called
 */

import { createContext, useContext, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { login as loginApi, logout as logoutApi, getMe, signup as signupApi } from '../services/authService';
import { useAuthData } from './AuthDataContext';

const AuthActionsContext = createContext(null);

export const AuthActionsProvider = ({ children }) => {
  const {
    setUser,
    setLoading,
    setError,
    setIsAuthenticated,
  } = useAuthData();

  // Track pending requests to prevent duplicates
  const pendingRequests = useRef(new Map());

  /**
   * Check authentication status on app load
   */
  const checkAuth = useCallback(async () => {
    const requestKey = 'checkAuth';
    
    // Check if request is already pending
    if (pendingRequests.current.has(requestKey)) {
      return pendingRequests.current.get(requestKey);
    }

    const requestPromise = (async () => {
      try {
        setLoading(true);
        setError(null);
        const userData = await getMe();
        setUser(userData);
        setIsAuthenticated(true);
        return userData;
      } catch (err) {
        // Not authenticated or error
        setUser(null);
        setIsAuthenticated(false);
        // Don't show error toast on initial load if not authenticated
        if (err.response?.status !== 401) {
          setError(err.message);
        }
        return null;
      } finally {
        setLoading(false);
        pendingRequests.current.delete(requestKey);
      }
    })();

    pendingRequests.current.set(requestKey, requestPromise);
    return requestPromise;
  }, [setUser, setLoading, setError, setIsAuthenticated]);

  /**
   * Signup - Register a new user
   */
  const signup = useCallback(
    async (userData) => {
      try {
        setLoading(true);
        setError(null);
        const newUser = await signupApi(userData);
        
        toast.success('Account created successfully! Please log in.');
        return newUser;
      } catch (err) {
        const errorMessage = err.message || 'Signup failed. Please try again.';
        setError(errorMessage);
        toast.error(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [setLoading, setError]
  );

  /**
   * Login - Authenticate user
   */
  const login = useCallback(
    async (credentials) => {
      try {
        setLoading(true);
        setError(null);
        const { user: userData } = await loginApi(credentials);
        
        setUser(userData);
        setIsAuthenticated(true);
        toast.success(`Welcome back, ${userData.name}!`);
        return userData;
      } catch (err) {
        const errorMessage = err.message || 'Login failed. Please try again.';
        setError(errorMessage);
        setUser(null);
        setIsAuthenticated(false);
        toast.error(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [setUser, setLoading, setError, setIsAuthenticated]
  );

  /**
   * Logout - Clear authentication
   */
  const logout = useCallback(async () => {
    try {
      setLoading(true);
      await logoutApi();
      
      setUser(null);
      setIsAuthenticated(false);
      setError(null);
      toast.success('Logged out successfully');
    } catch (err) {
      // Even if API call fails, clear local state
      setUser(null);
      setIsAuthenticated(false);
      setError(null);
      toast.error('Logout failed, but session cleared');
    } finally {
      setLoading(false);
    }
  }, [setUser, setLoading, setError, setIsAuthenticated]);

  /**
   * Clear error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, [setError]);

  // Stable actions object
  const actions = {
    checkAuth,
    signup,
    login,
    logout,
    clearError,
  };

  return (
    <AuthActionsContext.Provider value={actions}>
      {children}
    </AuthActionsContext.Provider>
  );
};

/**
 * Hook to access auth actions
 */
export const useAuthActions = () => {
  const context = useContext(AuthActionsContext);
  if (!context) {
    throw new Error('useAuthActions must be used within AuthActionsProvider');
  }
  return context;
};

export default AuthActionsContext;

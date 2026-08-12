import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { EmployeeProvider } from './context/EmployeeContext';
import { AuthProvider } from './context/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import { PageLoadingFallback } from './components/LoadingFallback';
import { useAuth } from './context/AuthContext';

/*
 * Shown when a lazily-loaded route chunk fails to download, which typically
 * happens after a redeploy invalidates the previous build's chunk filenames.
 */
const ChunkLoadFallback = () => (
  <div className="page-bg flex items-center justify-center p-4">
    <div className="text-center max-w-md">
      <h2 className="text-2xl font-bold text-theme-primary mb-4">Failed to Load Page</h2>
      <p className="text-theme-secondary mb-6">
        There was an error loading the page. Please try refreshing.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="btn btn-primary"
      >
        Refresh Page
      </button>
    </div>
  </div>
);

/*
 * Lazily load a route, recovering from a stale-chunk error.
 *
 * A single reload is attempted (guarded so it can never loop); if the chunk is
 * still unavailable the user gets an explicit retry screen instead of a blank page.
 *
 * @param {() => Promise<{default: React.ComponentType}>} importPage
 */
const lazyRoute = (importPage) =>
  lazy(() =>
    importPage().catch(() => {
      if (!window.chunkLoadErrorHandled) {
        window.chunkLoadErrorHandled = true;
        window.location.reload();
      }
      return { default: ChunkLoadFallback };
    })
  );

// Route components are code-split so each page ships in its own chunk.
const Home = lazyRoute(() => import('./pages/Home'));
const AllEmployees = lazyRoute(() => import('./pages/AllEmployees'));
const DepartmentEmployees = lazyRoute(() => import('./pages/DepartmentEmployees'));
const EmployeeDetails = lazyRoute(() => import('./pages/EmployeeDetails'));
const AddEmployee = lazyRoute(() => import('./pages/AddEmployee'));
const EditEmployee = lazyRoute(() => import('./pages/EditEmployee'));
const Login = lazyRoute(() => import('./pages/Login'));
const Signup = lazyRoute(() => import('./pages/Signup'));

/*
 * Auth Check Component
 * Checks authentication status on app mount
 */
const AuthCheck = ({ children }) => {
  const { checkAuth } = useAuth();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return children;
};

/*
 * Main App Component
 * Sets up routing, global state, and global components
 */
function App() {
  return (
    <ErrorBoundary>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <AuthCheck>
            <EmployeeProvider>
              <div className="page-bg theme-transition">
                <Navbar />

                <main>
                  <Suspense fallback={<PageLoadingFallback />}>
                    <Routes>
                      {/* Public Routes */}
                      <Route path="/login" element={<Login />} />
                      <Route path="/signup" element={<Signup />} />

                      {/* Protected Routes */}
                      <Route
                        path="/"
                        element={
                          <ProtectedRoute>
                            <Home />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/employees"
                        element={
                          <ProtectedRoute>
                            <AllEmployees />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/departments/:departmentName"
                        element={
                          <ProtectedRoute>
                            <DepartmentEmployees />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/employees/:id"
                        element={
                          <ProtectedRoute>
                            <EmployeeDetails />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/add"
                        element={
                          <ProtectedRoute>
                            <AddEmployee />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/edit/:id"
                        element={
                          <ProtectedRoute>
                            <EditEmployee />
                          </ProtectedRoute>
                        }
                      />
                    </Routes>
                  </Suspense>
                </main>

                <Toaster
                  position="top-right"
                  toastOptions={{
                    duration: 3000,
                    // Colours come from the theme tokens so toasts match
                    // light/dark mode instead of being fixed dark grey.
                    style: {
                      background: 'var(--color-bg-surface)',
                      color: 'var(--color-text-primary)',
                      border: '1px solid var(--color-border)',
                      boxShadow: 'var(--shadow-lg)',
                      borderRadius: 'var(--radius-card)',
                    },
                    success: {
                      duration: 3000,
                      iconTheme: {
                        primary: 'var(--color-primary)',
                        secondary: 'var(--color-bg-surface)',
                      },
                    },
                    error: {
                      duration: 4000,
                      iconTheme: {
                        primary: 'var(--color-danger)',
                        secondary: 'var(--color-bg-surface)',
                      },
                    },
                  }}
                />
              </div>
            </EmployeeProvider>
          </AuthCheck>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}

export default App;

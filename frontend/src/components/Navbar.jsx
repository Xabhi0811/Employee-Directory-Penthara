import { memo, useMemo, useCallback, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';
import { useAuth } from '../context/AuthContext';

/**
 * Theme Toggle Component
 * A compact, professional toggle with smooth icon transitions
 */
const ThemeToggle = memo(({ isDark, onToggle }) => (
  <button
    onClick={onToggle}
    className="theme-toggle"
    aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    type="button"
  >
    <span className="theme-toggle-icon" aria-hidden="true">
      {isDark ? (
        // Sun icon - shown in dark mode
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
      ) : (
        // Moon icon - shown in light mode
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
          />
        </svg>
      )}
    </span>
  </button>
));

ThemeToggle.displayName = 'ThemeToggle';

/**
 * User Menu Component
 * Dropdown menu with user info and logout
 */
const UserMenu = memo(({ user, onLogout }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = () => {
    setIsOpen(false);
    onLogout();
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="nav-user-trigger flex items-center space-x-2 px-3 py-2 rounded-lg focus-visible-ring"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <div className="w-8 h-8 icon-tile-solid rounded-full flex items-center justify-center font-medium text-sm">
          {user?.name?.charAt(0).toUpperCase() || 'U'}
        </div>
        <span className="hidden sm:inline text-sm font-medium">{user?.name}</span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          
          {/* Dropdown Menu */}
          <div className="absolute right-0 mt-2 w-48 card-surface rounded-lg shadow-lg py-1 z-20">
            <div className="px-4 py-2 border-b border-theme-border">
              <p className="text-sm font-medium text-theme-primary">{user?.name}</p>
              <p className="text-xs text-theme-secondary truncate">{user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="menu-item-danger w-full text-left px-4 py-2 text-sm flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              <span>Logout</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
});

UserMenu.displayName = 'UserMenu';

/**
 * Navbar Component
 * Main navigation header with responsive design
 * Memoized to prevent unnecessary re-renders
 */
const Navbar = memo(() => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const { user, isAuthenticated, logout } = useAuth();

  const isActive = useCallback((path) => {
    return location.pathname === path;
  }, [location.pathname]);

  const handleLogout = useCallback(async () => {
    await logout();
    navigate('/login', { replace: true });
  }, [logout, navigate]);

  // `shortLabel` keeps the bar readable on narrow screens.
  const navLinks = useMemo(() => [
    { path: '/', label: 'Home', shortLabel: 'Home' },
    { path: '/employees', label: 'All Employees', shortLabel: 'All' },
    { path: '/add', label: 'Add Employee', shortLabel: 'Add' },
  ], []);

  // Don't show navbar on login/signup pages
  const isAuthPage = location.pathname === '/login' || location.pathname === '/signup';
  if (isAuthPage) {
    return null;
  }

  return (
    <>
      {/* Skip to main content link for accessibility */}
      <a
        href="#main-content"
        className="skip-link rounded-b-lg"
      >
        Skip to main content
      </a>
      
      <nav className="nav-surface sticky top-0 z-40" role="navigation" aria-label="Main navigation">
        <div className="max-w-7xl mx-auto container-padding">
          <div className="flex justify-between items-center h-14 sm:h-16">
            {/* Logo and Title */}
            <Link to="/" className="flex items-center space-x-2 sm:space-x-3 focus-visible-ring rounded-lg" aria-label="Employee Directory Home">
              <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 icon-tile-solid rounded-lg flex-shrink-0" aria-hidden="true">
                <svg
                  className="w-5 h-5 sm:w-6 sm:h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <span className="text-lg sm:text-xl font-bold text-theme-primary hidden xs:inline">
                Employee Directory
              </span>
              <span className="text-lg font-bold text-theme-primary xs:hidden">
                Employees
              </span>
            </Link>

            {/* Navigation Links and Theme Toggle */}
            <div className="flex items-center space-x-2 sm:space-x-3" role="navigation" aria-label="Page navigation">
              {isAuthenticated && navLinks.map(({ path, label, shortLabel }) => (
                <Link
                  key={path}
                  to={path}
                  className={`px-3 py-2 sm:px-4 sm:py-2 rounded-lg font-medium text-sm sm:text-base ${
                    isActive(path)
                      ? 'nav-link-active'
                      : 'nav-link'
                  }`}
                  aria-current={isActive(path) ? 'page' : undefined}
                >
                  <span className="hidden sm:inline">{label}</span>
                  <span className="sm:hidden">{shortLabel}</span>
                </Link>
              ))}
              
              {/* Theme Toggle */}
              <ThemeToggle isDark={isDark} onToggle={toggleTheme} />

              {/* User Menu */}
              {isAuthenticated && user && (
                <UserMenu user={user} onLogout={handleLogout} />
              )}
            </div>
          </div>
        </div>
      </nav>
    </>
  );
});

Navbar.displayName = 'Navbar';

export default Navbar;

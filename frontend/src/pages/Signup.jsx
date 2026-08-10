import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Signup Page Component
 * Handles user registration
 */
const Signup = () => {
  const navigate = useNavigate();
  const { signup, loading, error, clearError, isAuthenticated } = useAuth();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  
  const [validationErrors, setValidationErrors] = useState({});

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Clear errors when component unmounts
  useEffect(() => {
    return () => {
      clearError();
    };
  }, [clearError]);

  /**
   * Handle input change
   */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    
    // Clear validation error for this field
    if (validationErrors[name]) {
      setValidationErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  /**
   * Validate form data
   */
  const validateForm = () => {
    const errors = {};

    // Name validation
    if (!formData.name.trim()) {
      errors.name = 'Name is required';
    } else if (formData.name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters';
    } else if (!/^[a-zA-Z\s'-]+$/.test(formData.name)) {
      errors.name = 'Name can only contain letters, spaces, hyphens, and apostrophes';
    }

    // Email validation
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    // Password validation (strong password requirements)
    if (!formData.password) {
      errors.password = 'Password is required';
    } else {
      const passwordErrors = [];
      if (formData.password.length < 8) {
        passwordErrors.push('at least 8 characters');
      }
      if (!/[a-z]/.test(formData.password)) {
        passwordErrors.push('one lowercase letter');
      }
      if (!/[A-Z]/.test(formData.password)) {
        passwordErrors.push('one uppercase letter');
      }
      if (!/[0-9]/.test(formData.password)) {
        passwordErrors.push('one number');
      }
      if (!/[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\/'`~;]/.test(formData.password)) {
        passwordErrors.push('one special character');
      }

      if (passwordErrors.length > 0) {
        errors.password = `Password must contain ${passwordErrors.join(', ')}`;
      }
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Clear previous errors
    clearError();
    
    // Validate form
    if (!validateForm()) {
      return;
    }

    try {
      await signup(formData);
      // Navigate to login on success
      navigate('/login', { replace: true });
    } catch (err) {
      // Error handling is done in Context with toast
      if (process.env.NODE_ENV === 'development') {
        console.error('Signup failed:', err);
      }
    }
  };

  return (
    <div className="page-bg min-h-screen flex items-center justify-center">
      <div className="max-w-md w-full container-padding py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-theme-primary mb-2">
            Create Account
          </h1>
          <p className="text-sm sm:text-base text-theme-secondary">
            Sign up to access the Employee Directory
          </p>
        </div>

        {/* Signup Form */}
        <div className="card-surface rounded-lg responsive-padding">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name Field */}
            <div>
              <label htmlFor="name" className="label">
                Full Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={`input ${validationErrors.name ? 'input-error' : ''}`}
                placeholder="John Doe"
                disabled={loading}
                autoComplete="name"
                aria-invalid={validationErrors.name ? 'true' : 'false'}
              />
              {validationErrors.name && (
                <p className="error-text">{validationErrors.name}</p>
              )}
            </div>

            {/* Email Field */}
            <div>
              <label htmlFor="email" className="label">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`input ${validationErrors.email ? 'input-error' : ''}`}
                placeholder="you@example.com"
                disabled={loading}
                autoComplete="email"
                aria-invalid={validationErrors.email ? 'true' : 'false'}
              />
              {validationErrors.email && (
                <p className="error-text">{validationErrors.email}</p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="label">
                Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className={`input ${validationErrors.password ? 'input-error' : ''}`}
                placeholder="Create a strong password"
                disabled={loading}
                autoComplete="new-password"
                aria-invalid={validationErrors.password ? 'true' : 'false'}
              />
              {validationErrors.password && (
                <p className="error-text">{validationErrors.password}</p>
              )}
              {!validationErrors.password && (
                <p className="mt-1.5 text-xs text-theme-muted">
                  Must be 8+ characters with uppercase, lowercase, number, and special character
                </p>
              )}
            </div>

            {/* Confirm Password Field */}
            <div>
              <label htmlFor="confirmPassword" className="label">
                Confirm Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className={`input ${validationErrors.confirmPassword ? 'input-error' : ''}`}
                placeholder="Re-enter your password"
                disabled={loading}
                autoComplete="new-password"
                aria-invalid={validationErrors.confirmPassword ? 'true' : 'false'}
              />
              {validationErrors.confirmPassword && (
                <p className="error-text">{validationErrors.confirmPassword}</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full btn btn-primary mt-6"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Creating account...
                </span>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          {/* Login Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-theme-secondary">
              Already have an account?{' '}
              <Link
                to="/login"
                className="link-accent font-medium focus-visible-ring rounded px-1"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;

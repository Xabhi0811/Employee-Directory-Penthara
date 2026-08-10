/**
 * Error Boundary Component
 * Catches JavaScript errors in child components and displays fallback UI
 * Prevents entire app from crashing due to component errors
 */

import { Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  /**
   * Update state when error is caught
   */
  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  /**
   * Log error details for debugging
   */
  componentDidCatch(error, errorInfo) {
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    this.setState({
      error,
      errorInfo,
    });

    // Log to error reporting service (e.g., Sentry) in production
    if (process.env.NODE_ENV === 'production') {
      // Example: logErrorToService(error, errorInfo);
    }
  }

  /**
   * Reset error boundary state
   */
  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI can be provided via props
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div className="page-bg flex items-center justify-center px-4">
          <div className="max-w-md w-full card-surface p-8">
            <div className="badge-danger flex items-center justify-center w-16 h-16 rounded-full mx-auto mb-4">
              <svg
                className="w-8 h-8"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            
            <h2 className="text-2xl font-bold text-theme-primary text-center mb-2">
              Oops! Something went wrong
            </h2>
            
            <p className="text-theme-secondary text-center mb-6">
              We're sorry for the inconvenience. Please try refreshing the page
              or contact support if the problem persists.
            </p>

            {/* Error details in development */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mb-6 p-4 surface-muted rounded border border-theme">
                <summary className="cursor-pointer font-semibold text-sm text-theme-secondary mb-2">
                  Error Details (Development Only)
                </summary>
                <div className="text-xs text-theme-muted space-y-2">
                  <p className="font-mono break-all">
                    <strong>Error:</strong> {this.state.error.toString()}
                  </p>
                  {this.state.errorInfo && (
                    <pre className="whitespace-pre-wrap overflow-auto max-h-40 text-xs">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              </details>
            )}

            <div className="flex gap-3">
              <button
                onClick={this.handleReset}
                className="btn btn-primary flex-1"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="btn btn-secondary flex-1"
              >
                Go Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

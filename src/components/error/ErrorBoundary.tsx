import React, { Component, type ReactNode } from 'react';
import type { ErrorInfo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../constants/routes.constants';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * ErrorBoundary component that catches JavaScript errors in its child component tree,
 * logs those errors, and displays a fallback UI.
 */
class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { 
      hasError: true, 
      error,
      errorInfo: null,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error to an error reporting service
    console.error('Uncaught error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  public render() {
    const { hasError, error, errorInfo } = this.state;
    const { children, fallback } = this.props;

    if (hasError) {
      // Render fallback UI if provided
      if (fallback) {
        return fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
          <div className="sm:mx-auto sm:w-full sm:max-w-md">
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Something went wrong
            </h2>
          </div>

          <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
            <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
              <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-5 w-5 text-red-400"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">
                      An error occurred
                    </h3>
                    <div className="mt-2 text-sm text-red-700">
                      <p>{error?.message || 'Unknown error'}</p>
                      {import.meta.env.DEV && errorInfo && (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-sm">
                            Show error details
                          </summary>
                          <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
                            {errorInfo.componentStack}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-6">
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Reload Page
                </button>
                
                <div className="mt-4 text-center">
                  <a
                    href={ROUTES.HOME}
                    className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
                  >
                    Go back home
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return children;
  }
}

/**
 * A higher-order component that wraps a component with ErrorBoundary
 */
const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  FallbackComponent?: React.ComponentType
) => {
  return (props: P) => {
    const navigate = useNavigate();
    
    const handleReset = () => {
      navigate(ROUTES.HOME);
    };

    const fallback = FallbackComponent ? <FallbackComponent /> : (
      <div className="p-4 text-center">
        <h2 className="text-lg font-medium text-gray-900 mb-2">Something went wrong</h2>
        <button
          onClick={handleReset}
          className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
        >
          Go back home
        </button>
      </div>
    );

    return (
      <ErrorBoundary fallback={fallback}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
};

export { ErrorBoundary, withErrorBoundary };

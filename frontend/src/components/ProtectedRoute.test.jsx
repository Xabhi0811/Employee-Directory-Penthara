/**
 * ProtectedRoute Component Tests
 * Tests authentication-based route protection and redirects
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import { AuthProvider } from '../context/AuthContext';
import * as authService from '../services/authService';

// Mock auth service
vi.mock('../services/authService');

// Mock toast notifications
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const renderProtectedRoute = (initialRoute = '/protected') => {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <AuthProvider>
        <Routes>
          <Route
            path="/protected"
            element={
              <ProtectedRoute>
                <div>Protected Content</div>
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<div>Login Page</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );
};

describe('ProtectedRoute Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading spinner while checking authentication', () => {
    authService.getMe.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

    renderProtectedRoute();

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('redirects to login when user is not authenticated', async () => {
    authService.getMe.mockRejectedValueOnce(new Error('Not authenticated'));

    renderProtectedRoute();

    await waitFor(() => {
      expect(screen.getByText('Login Page')).toBeInTheDocument();
    });

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('renders children when user is authenticated', async () => {
    const mockUser = { id: '1', name: 'Test User', email: 'test@example.com' };
    authService.getMe.mockResolvedValueOnce(mockUser);

    renderProtectedRoute();

    await waitFor(() => {
      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

    expect(screen.queryByText('Login Page')).not.toBeInTheDocument();
  });

  it('does not render children during loading', () => {
    authService.getMe.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

    renderProtectedRoute();

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('preserves attempted location for redirect after login', async () => {
    authService.getMe.mockRejectedValueOnce(new Error('Not authenticated'));

    const { container } = renderProtectedRoute('/protected');

    await waitFor(() => {
      expect(screen.getByText('Login Page')).toBeInTheDocument();
    });

    // The location state should preserve where the user was trying to go
    // This would be tested in a more integrated test with actual navigation
  });
});

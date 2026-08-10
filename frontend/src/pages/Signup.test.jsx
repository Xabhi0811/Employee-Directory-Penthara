/**
 * Signup Component Tests
 * Tests signup form validation, submission, and redirect logic
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import Signup from './Signup';
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

const renderSignup = (initialRoute = '/signup') => {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <AuthProvider>
        <Routes>
          <Route path="/signup" element={<Signup />} />
          <Route path="/login" element={<div>Login Page</div>} />
          <Route path="/" element={<div>Home Page</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );
};

describe('Signup Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders signup form with all fields', () => {
    renderSignup();

    expect(screen.getByRole('heading', { name: /create account/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
  });

  it('has a link to login page', () => {
    renderSignup();

    const loginLink = screen.getByRole('link', { name: /sign in/i });
    expect(loginLink).toBeInTheDocument();
    expect(loginLink).toHaveAttribute('href', '/login');
  });

  it('shows password requirements hint', () => {
    renderSignup();

    expect(screen.getByText(/must be 8\+ characters/i)).toBeInTheDocument();
  });

  it('shows validation error for empty name', async () => {
    const user = userEvent.setup();
    renderSignup();

    const submitButton = screen.getByRole('button', { name: /create account/i });
    await user.click(submitButton);

    expect(await screen.findByText(/name is required/i)).toBeInTheDocument();
  });

  it('shows validation error for short name', async () => {
    const user = userEvent.setup();
    renderSignup();

    const nameInput = screen.getByLabelText(/full name/i);
    await user.type(nameInput, 'A');

    const submitButton = screen.getByRole('button', { name: /create account/i });
    await user.click(submitButton);

    expect(await screen.findByText(/name must be at least 2 characters/i)).toBeInTheDocument();
  });

  it('shows validation error for invalid name characters', async () => {
    const user = userEvent.setup();
    renderSignup();

    const nameInput = screen.getByLabelText(/full name/i);
    await user.type(nameInput, 'John123');

    const submitButton = screen.getByRole('button', { name: /create account/i });
    await user.click(submitButton);

    expect(await screen.findByText(/name can only contain letters/i)).toBeInTheDocument();
  });

  it('shows validation error for invalid email', async () => {
    const user = userEvent.setup();
    renderSignup();

    const emailInput = screen.getByLabelText(/email address/i);
    await user.type(emailInput, 'invalid-email');

    const submitButton = screen.getByRole('button', { name: /create account/i });
    await user.click(submitButton);

    expect(await screen.findByText(/please enter a valid email/i)).toBeInTheDocument();
  });

  it('shows validation error for weak password - no uppercase', async () => {
    const user = userEvent.setup();
    renderSignup();

    const passwordInput = screen.getByLabelText(/^password$/i);
    await user.type(passwordInput, 'test@1234');

    const submitButton = screen.getByRole('button', { name: /create account/i });
    await user.click(submitButton);

    expect(await screen.findByText(/password must contain.*uppercase/i)).toBeInTheDocument();
  });

  it('shows validation error for weak password - no lowercase', async () => {
    const user = userEvent.setup();
    renderSignup();

    const passwordInput = screen.getByLabelText(/^password$/i);
    await user.type(passwordInput, 'TEST@1234');

    const submitButton = screen.getByRole('button', { name: /create account/i });
    await user.click(submitButton);

    expect(await screen.findByText(/password must contain.*lowercase/i)).toBeInTheDocument();
  });

  it('shows validation error for weak password - no number', async () => {
    const user = userEvent.setup();
    renderSignup();

    const passwordInput = screen.getByLabelText(/^password$/i);
    await user.type(passwordInput, 'Test@abcd');

    const submitButton = screen.getByRole('button', { name: /create account/i });
    await user.click(submitButton);

    expect(await screen.findByText(/password must contain.*number/i)).toBeInTheDocument();
  });

  it('shows validation error for weak password - no special character', async () => {
    const user = userEvent.setup();
    renderSignup();

    const passwordInput = screen.getByLabelText(/^password$/i);
    await user.type(passwordInput, 'Test1234');

    const submitButton = screen.getByRole('button', { name: /create account/i });
    await user.click(submitButton);

    expect(await screen.findByText(/password must contain.*special character/i)).toBeInTheDocument();
  });

  it('shows validation error for short password', async () => {
    const user = userEvent.setup();
    renderSignup();

    const passwordInput = screen.getByLabelText(/^password$/i);
    await user.type(passwordInput, 'Te@1');

    const submitButton = screen.getByRole('button', { name: /create account/i });
    await user.click(submitButton);

    expect(await screen.findByText(/at least 8 characters/i)).toBeInTheDocument();
  });

  it('shows validation error when passwords do not match', async () => {
    const user = userEvent.setup();
    renderSignup();

    const passwordInput = screen.getByLabelText(/^password$/i);
    const confirmInput = screen.getByLabelText(/confirm password/i);

    await user.type(passwordInput, 'Test@1234');
    await user.type(confirmInput, 'Different@1234');

    const submitButton = screen.getByRole('button', { name: /create account/i });
    await user.click(submitButton);

    expect(await screen.findByText(/passwords do not match/i)).toBeInTheDocument();
  });

  it('submits form with valid data', async () => {
    const user = userEvent.setup();
    const mockUser = { id: '1', name: 'Test User', email: 'test@example.com' };
    
    authService.signup.mockResolvedValueOnce(mockUser);
    authService.getMe.mockResolvedValueOnce(null);

    renderSignup();

    await user.type(screen.getByLabelText(/full name/i), 'Test User');
    await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'Test@1234');
    await user.type(screen.getByLabelText(/confirm password/i), 'Test@1234');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(authService.signup).toHaveBeenCalledWith({
        name: 'Test User',
        email: 'test@example.com',
        password: 'Test@1234',
        confirmPassword: 'Test@1234',
      });
    });
  });

  it('shows loading state during submission', async () => {
    const user = userEvent.setup();
    
    authService.signup.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
    authService.getMe.mockResolvedValueOnce(null);

    renderSignup();

    await user.type(screen.getByLabelText(/full name/i), 'Test User');
    await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'Test@1234');
    await user.type(screen.getByLabelText(/confirm password/i), 'Test@1234');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(screen.getByText(/creating account/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /creating account/i })).toBeDisabled();
  });

  it('redirects to login page after successful signup', async () => {
    const user = userEvent.setup();
    const mockUser = { id: '1', name: 'Test User', email: 'test@example.com' };
    
    authService.signup.mockResolvedValueOnce(mockUser);
    authService.getMe.mockResolvedValueOnce(null);

    renderSignup();

    await user.type(screen.getByLabelText(/full name/i), 'Test User');
    await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'Test@1234');
    await user.type(screen.getByLabelText(/confirm password/i), 'Test@1234');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText('Login Page')).toBeInTheDocument();
    });
  });

  it('clears field validation error when user starts typing', async () => {
    const user = userEvent.setup();
    renderSignup();

    // Trigger validation error
    const submitButton = screen.getByRole('button', { name: /create account/i });
    await user.click(submitButton);

    expect(await screen.findByText(/name is required/i)).toBeInTheDocument();

    // Start typing to clear error
    const nameInput = screen.getByLabelText(/full name/i);
    await user.type(nameInput, 'T');

    expect(screen.queryByText(/name is required/i)).not.toBeInTheDocument();
  });

  it('has proper autocomplete attributes', () => {
    renderSignup();

    expect(screen.getByLabelText(/full name/i)).toHaveAttribute('autocomplete', 'name');
    expect(screen.getByLabelText(/email address/i)).toHaveAttribute('autocomplete', 'email');
    expect(screen.getByLabelText(/^password$/i)).toHaveAttribute('autocomplete', 'new-password');
    expect(screen.getByLabelText(/confirm password/i)).toHaveAttribute('autocomplete', 'new-password');
  });
});

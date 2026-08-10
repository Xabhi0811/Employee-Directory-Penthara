/**
 * Global test setup for the frontend suite.
 *
 * - Registers jest-dom matchers (toBeInTheDocument, toHaveValue, etc.).
 * - Unmounts the React tree after every test so DOM state never leaks between
 *   cases.
 */

import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
});

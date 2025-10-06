import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock Next.js router by default
globalThis.mockRouter = {
  push: vi.fn(),
  replace: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  refresh: vi.fn(),
  prefetch: vi.fn(),
};

// Mock environment variables
process.env.NEXTAUTH_URL = "http://localhost:3000";
process.env.NEXTAUTH_SECRET = "test-secret-key-for-testing-only";

// Setup global test utilities
global.sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

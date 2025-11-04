import "@testing-library/jest-dom";
import { expect, afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

// Define the matchers interface locally since the import path is not available
interface TestingLibraryMatchers<E, R> {
  toBeInTheDocument(): R;
  toHaveTextContent(text: string | RegExp): R;
  toBeVisible(): R;
  toBeDisabled(): R;
  // Add more matchers as needed
}

// Extend Vitest's expect with jest-dom matchers
declare module "vitest" {
  interface Assertion<T = any> extends jest.Matchers<void, T>, TestingLibraryMatchers<T, void> {}
}

// Cleanup after each test case
afterEach(() => {
  cleanup();
});

// Mock environment variables
process.env.NEXTAUTH_SECRET = "test-secret";
process.env.NEXTAUTH_URL = "http://localhost:3000";
process.env.JWT_SECRET = "test-jwt-secret";

// Mock Next.js router
vi.mock("next/router", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    pathname: "/",
    query: {},
    asPath: "/",
  }),
}));

// Mock Next.js navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

// Mock Next.js image
vi.mock("next/image", () => ({
  default: ({ src, alt, ...props }: any) => {
    return null; // Return null instead of JSX in TS file
  },
}));

// Mock Socket.io client
vi.mock("socket.io-client", () => ({
  io: vi.fn(() => ({
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    connected: true,
    id: "mock-socket-id",
  })),
}));

// Mock Auth.js
vi.mock("next-auth/react", () => ({
  useSession: vi.fn(() => ({
    data: null,
    status: "unauthenticated",
    update: vi.fn(),
  })),
  signIn: vi.fn(),
  signOut: vi.fn(),
  getSession: vi.fn(() => Promise.resolve(null)),
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock window.matchMedia for responsive tests
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock Web APIs
global.Audio = vi.fn().mockImplementation(() => ({
  play: vi.fn(() => Promise.resolve()),
  pause: vi.fn(),
  load: vi.fn(),
  currentTime: 0,
  duration: 0,
  paused: true,
  volume: 1,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
}));

// Mock Notification API
global.Notification = {
  requestPermission: vi.fn(() => Promise.resolve("granted")),
  permission: "granted",
} as any;

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn(() => Promise.resolve()),
    readText: vi.fn(() => Promise.resolve("")),
  },
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
  writable: true,
});

// Mock sessionStorage
Object.defineProperty(window, "sessionStorage", {
  value: localStorageMock,
  writable: true,
});

// Mock console methods for cleaner test output
if (process.env.NODE_ENV === "test") {
  global.console = {
    ...console,
    log: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
}

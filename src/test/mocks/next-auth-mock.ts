import { vi } from "vitest";
import { UserRole } from "@/types/auth";

// Mock session factory
export function createMockAuthSession(overrides: any = {}) {
  return {
    user: {
      id: "1",
      name: "Test User",
      email: "test@example.com",
      image: null,
      role: UserRole.USER,
      isActive: true,
      ...overrides.user,
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    ...overrides,
  };
}

// Mock NextAuth functions
export const mockAuth = vi.fn();
export const mockSignIn = vi.fn();
export const mockSignOut = vi.fn();
export const mockUseSession = vi.fn();

// Default mock implementations
mockAuth.mockResolvedValue({
  user: {
    id: "1",
    email: "test@example.com",
    role: UserRole.USER,
  },
});

mockUseSession.mockReturnValue({
  data: createMockAuthSession(),
  status: "authenticated",
  update: vi.fn(),
});

mockSignIn.mockResolvedValue({ ok: true, error: null, status: 200, url: null });
mockSignOut.mockResolvedValue({ url: "/login" });

// Reset all mocks
export function resetAuthMocks() {
  mockAuth.mockClear();
  mockSignIn.mockClear();
  mockSignOut.mockClear();
  mockUseSession.mockClear();

  // Reset to defaults
  mockAuth.mockResolvedValue({
    user: {
      id: "1",
      email: "test@example.com",
      role: UserRole.USER,
    },
  });

  mockUseSession.mockReturnValue({
    data: createMockAuthSession(),
    status: "authenticated",
    update: vi.fn(),
  });
}

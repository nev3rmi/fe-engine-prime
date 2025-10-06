import { UserRole } from "@/types/auth";

// Integration test helpers for auth testing
export interface TestUser {
  id: string;
  email: string;
  name: string;
  password: string;
  role: UserRole;
}

// Test user factory
export function createTestUserData(role: UserRole = UserRole.USER): TestUser {
  const timestamp = Date.now();

  return {
    id: `test-user-${timestamp}`,
    email: `test-${timestamp}@example.com`,
    name: `Test User ${timestamp}`,
    password: "TestPassword123!",
    role,
  };
}

// Predefined test users
export const TEST_USERS = {
  USER: {
    id: "1",
    email: "test@example.com",
    name: "Test User",
    password: "testuser123",
    role: UserRole.USER,
  },
  EDITOR: {
    id: "2",
    email: "editor@example.com",
    name: "Editor User",
    password: "editoruser123",
    role: UserRole.EDITOR,
  },
  ADMIN: {
    id: "3",
    email: "admin@example.com",
    name: "Admin User",
    password: "adminuser123",
    role: UserRole.ADMIN,
  },
};

// Cleanup helper
export async function cleanupTestData() {
  // Clear any test data created during tests
  // In production, this would clean database test entries
}

// Session validation helper
export function isValidSessionToken(token: string): boolean {
  return token.length >= 32;
}

// Wait helper
export function waitFor(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

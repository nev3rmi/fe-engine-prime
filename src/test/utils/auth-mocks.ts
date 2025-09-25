import { vi } from 'vitest'
import { Session } from 'next-auth'
import { UserRole, User, Permission } from '@/types/auth'
import { createMockSession, createMockAdminSession, createMockEditorSession } from './test-utils'

// Mock Auth.js session hook
export const mockUseSession = (session: Session | null = null) => {
  vi.mock('next-auth/react', () => ({
    useSession: vi.fn(() => ({
      data: session,
      status: session ? 'authenticated' : 'unauthenticated',
      update: vi.fn(),
    }))
  }))
}

// Mock server-side auth
export const mockServerAuth = (session: Session | null = null) => {
  vi.mock('@/lib/auth', () => ({
    auth: vi.fn(() => Promise.resolve(session)),
  }))
}

// Mock permission checking
export const mockHasPermission = (hasPermission: boolean = true) => {
  vi.mock('@/lib/auth/permissions', () => ({
    hasPermission: vi.fn(() => Promise.resolve(hasPermission)),
    hasAllPermissions: vi.fn(() => Promise.resolve(hasPermission)),
    hasAnyPermission: vi.fn(() => Promise.resolve(hasPermission)),
  }))
}

// Mock user service
export const mockUserService = () => {
  vi.mock('@/lib/auth/user-service', () => ({
    getUserById: vi.fn(() => Promise.resolve(null)),
    updateUser: vi.fn(() => Promise.resolve(null)),
    createUser: vi.fn(() => Promise.resolve(null)),
    deleteUser: vi.fn(() => Promise.resolve(true)),
    getAllUsers: vi.fn(() => Promise.resolve([])),
  }))
}

// Auth test scenarios
export const authTestScenarios = {
  unauthenticated: () => mockUseSession(null),
  user: () => mockUseSession(createMockSession()),
  editor: () => mockUseSession(createMockEditorSession()),
  admin: () => mockUseSession(createMockAdminSession()),
}

// Helper to create user with specific permissions
export const createUserWithPermissions = (permissions: Permission[]): User => ({
  id: '1',
  email: 'test@example.com',
  name: 'Test User',
  image: 'https://example.com/avatar.jpg',
  username: 'testuser',
  role: UserRole.USER,
  provider: 'github',
  providerId: 'github-123',
  isActive: true,
  emailVerified: true,
  lastLoginAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
  permissions,
  metadata: {},
})

// Mock API responses
export const mockApiResponse = (data: any, status = 200) => {
  global.fetch = vi.fn(() =>
    Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(data),
      text: () => Promise.resolve(JSON.stringify(data)),
    })
  ) as any
}

// Mock protected API call
export const mockProtectedApiCall = (response: any, status = 200, hasPermission = true) => {
  // Mock permission check first
  mockHasPermission(hasPermission)

  // Mock API response
  mockApiResponse(response, hasPermission ? status : 403)

  return { response, status: hasPermission ? status : 403 }
}
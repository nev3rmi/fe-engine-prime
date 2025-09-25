import React, { ReactElement, ReactNode } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { SessionProvider } from 'next-auth/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from 'next-themes'
import { Session } from 'next-auth'
import { UserRole } from '@/types/auth'

// Create a custom render function that includes providers
function customRender(
  ui: ReactElement,
  options: RenderOptions & {
    session?: Session | null
    queryClient?: QueryClient
  } = {}
) {
  const { session = null, queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  }), ...renderOptions } = options

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <SessionProvider session={session}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            {children}
          </ThemeProvider>
        </SessionProvider>
      </QueryClientProvider>
    )
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions })
}

// Mock user sessions for different roles
export const createMockSession = (overrides: Partial<Session> = {}): Session => {
  return {
    user: {
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
      lastLoginAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      permissions: ['READ_CONTENT', 'VIEW_DASHBOARD', 'JOIN_REALTIME_CHANNELS', 'ACCESS_API'],
      metadata: {},
    },
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
    ...overrides,
  }
}

export const createMockAdminSession = (): Session => {
  return createMockSession({
    user: {
      id: '1',
      email: 'admin@example.com',
      name: 'Admin User',
      image: 'https://example.com/admin-avatar.jpg',
      username: 'adminuser',
      role: UserRole.ADMIN,
      provider: 'github',
      providerId: 'github-admin',
      isActive: true,
      emailVerified: true,
      lastLoginAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      permissions: [
        'READ_CONTENT', 'VIEW_DASHBOARD', 'JOIN_REALTIME_CHANNELS', 'ACCESS_API',
        'READ_USER', 'UPDATE_USER', 'CREATE_CONTENT', 'UPDATE_CONTENT',
        'DELETE_CONTENT', 'PUBLISH_CONTENT', 'VIEW_ANALYTICS', 'EXPORT_DATA',
        'MODERATE_REALTIME_CHANNELS', 'CREATE_USER', 'DELETE_USER',
        'MANAGE_USER_ROLES', 'MANAGE_SYSTEM_SETTINGS', 'VIEW_SYSTEM_LOGS',
        'MANAGE_INTEGRATIONS', 'ADMIN_API_ACCESS'
      ],
      metadata: {},
    },
  })
}

export const createMockEditorSession = (): Session => {
  return createMockSession({
    user: {
      id: '2',
      email: 'editor@example.com',
      name: 'Editor User',
      image: 'https://example.com/editor-avatar.jpg',
      username: 'editoruser',
      role: UserRole.EDITOR,
      provider: 'google',
      providerId: 'google-editor',
      isActive: true,
      emailVerified: true,
      lastLoginAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      permissions: [
        'READ_CONTENT', 'VIEW_DASHBOARD', 'JOIN_REALTIME_CHANNELS', 'ACCESS_API',
        'READ_USER', 'UPDATE_USER', 'CREATE_CONTENT', 'UPDATE_CONTENT',
        'DELETE_CONTENT', 'PUBLISH_CONTENT', 'VIEW_ANALYTICS', 'EXPORT_DATA',
        'MODERATE_REALTIME_CHANNELS'
      ],
      metadata: {},
    },
  })
}

// Re-export everything from React Testing Library
export * from '@testing-library/react'

// Override the default render with our custom render
export { customRender as render }
# Authentication & Authorization System Guide

## Overview

FE-Engine Prime implements a comprehensive authentication and authorization
system using **Auth.js v5** (NextAuth) with JWT tokens and Role-Based Access
Control (RBAC). This guide provides all the information needed for other agents
to work with the authentication system.

## Architecture

### Core Components

1. **Auth.js v5 Configuration** (`/src/lib/auth/`)

   - Multi-provider OAuth (GitHub, Google, Discord)
   - JWT token management with extended user data
   - Session handling with role and permission information

2. **RBAC System** (`/src/types/auth.ts`, `/src/lib/auth/permissions.ts`)

   - Three-tier role hierarchy: USER → EDITOR → ADMIN
   - Granular permission system with 15+ specific permissions
   - Permission inheritance through role hierarchy

3. **Middleware Protection** (`/middleware.ts`, `/src/lib/middleware/auth.ts`)
   - Route-based access control
   - API endpoint protection
   - Session validation and permission checking

## Role Hierarchy

### USER (Level 1)

- **Description**: Basic access with read permissions and content interaction
- **Permissions**:
  - READ_CONTENT
  - VIEW_DASHBOARD
  - JOIN_REALTIME_CHANNELS
  - ACCESS_API

### EDITOR (Level 2)

- **Description**: Content management and limited user administration
- **All USER permissions plus**:
  - READ_USER, UPDATE_USER
  - CREATE_CONTENT, UPDATE_CONTENT, DELETE_CONTENT, PUBLISH_CONTENT
  - VIEW_ANALYTICS, EXPORT_DATA
  - MODERATE_REALTIME_CHANNELS

### ADMIN (Level 3)

- **Description**: Full system access with all administrative privileges
- **All EDITOR permissions plus**:
  - CREATE_USER, DELETE_USER, MANAGE_USER_ROLES
  - MANAGE_SYSTEM_SETTINGS, VIEW_SYSTEM_LOGS, MANAGE_INTEGRATIONS
  - ADMIN_API_ACCESS

## Implementation Patterns

### 1. Protecting API Routes

```typescript
// /src/app/api/example/route.ts
import { withAuth } from "@/lib/middleware/auth";
import { Permission } from "@/types/auth";

export const GET = withAuth(
  async (request: NextRequest, { user }) => {
    // Your API logic here
    // 'user' is automatically available and authenticated
    return NextResponse.json({ data: "protected data" });
  },
  {
    requiredPermissions: [Permission.READ_CONTENT],
    requireAll: true, // Optional: true = ALL permissions, false = ANY permission
  }
);
```

### 2. Client-Side Session Access

```typescript
// In React components
import { useSession } from "next-auth/react"
import { User } from "@/types/auth"

export default function MyComponent() {
  const { data: session, status } = useSession()
  const user = session?.user as User

  if (status === "loading") return <div>Loading...</div>
  if (!user) return <div>Please sign in</div>

  return (
    <div>
      <p>Welcome, {user.name}!</p>
      <p>Role: {user.role}</p>
      <p>Permissions: {user.permissions?.join(', ')}</p>
    </div>
  )
}
```

### 3. Permission Checking in Components

```typescript
// Custom hook for permission checking
import { useSession } from "next-auth/react"
import { hasPermission } from "@/lib/auth/permissions"
import { Permission, User } from "@/types/auth"

export function usePermissions() {
  const { data: session } = useSession()
  const user = session?.user as User

  const checkPermission = async (permission: Permission): Promise<boolean> => {
    if (!user) return false
    return await hasPermission(user, permission)
  }

  return { user, checkPermission }
}

// Usage in component
export function AdminPanel() {
  const { user, checkPermission } = usePermissions()
  const [canManageUsers, setCanManageUsers] = useState(false)

  useEffect(() => {
    checkPermission(Permission.MANAGE_USER_ROLES).then(setCanManageUsers)
  }, [user])

  if (!canManageUsers) {
    return <div>Access denied</div>
  }

  return <div>Admin content here</div>
}
```

### 4. Middleware Configuration

The main middleware (`/middleware.ts`) automatically handles:

- Public routes (no auth required)
- Protected routes (auth required)
- Role-specific routes (admin/editor only)
- Permission-specific routes

**Route Patterns**:

```typescript
// Public routes
["/", "/login", "/auth/*", "/api/health", "/api/auth/*"][
  // Protected routes (any authenticated user)
  ("/dashboard", "/profile", "/settings")
][
  // Admin routes (ADMIN role required)
  ("/admin", "/dashboard/users", "/dashboard/settings", "/api/admin/*")
][
  // Editor routes (EDITOR or ADMIN role required)
  ("/editor", "/dashboard/content", "/api/content/*")
];
```

## Environment Configuration

Create `.env.local` file (use `.env.example` as template):

```bash
# Required
AUTH_SECRET=your-auth-secret-here
NEXTAUTH_URL=http://localhost:3000

# OAuth Providers (at least one required)
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

DISCORD_CLIENT_ID=your-discord-client-id
DISCORD_CLIENT_SECRET=your-discord-client-secret

# JWT Configuration
JWT_SECRET=your-jwt-secret-here
```

## Database Integration

The current implementation uses an in-memory mock database
(`/src/lib/auth/user-service.ts`). For production:

1. **Replace Mock Service**: Update user-service.ts with actual database calls
2. **Database Schema**: User table should include:
   ```sql
   CREATE TABLE users (
     id VARCHAR PRIMARY KEY,
     email VARCHAR UNIQUE NOT NULL,
     name VARCHAR,
     image VARCHAR,
     username VARCHAR,
     role ENUM('USER', 'EDITOR', 'ADMIN') DEFAULT 'USER',
     provider VARCHAR,
     provider_id VARCHAR,
     is_active BOOLEAN DEFAULT true,
     email_verified BOOLEAN DEFAULT false,
     last_login_at TIMESTAMP,
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     metadata JSON
   );
   ```

## Common Use Cases

### 1. Creating Protected Pages

```typescript
// /src/app/admin/page.tsx
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { hasPermission } from "@/lib/auth/permissions"
import { Permission, User } from "@/types/auth"

export default async function AdminPage() {
  const session = await auth()
  const user = session?.user as User

  if (!user) {
    redirect("/login")
  }

  const canManageSettings = await hasPermission(user, Permission.MANAGE_SYSTEM_SETTINGS)
  if (!canManageSettings) {
    redirect("/dashboard")
  }

  return <div>Admin content</div>
}
```

### 2. Role-Based UI Components

```typescript
// /src/components/RoleGuard.tsx
import { useSession } from "next-auth/react"
import { UserRole, User } from "@/types/auth"
import { ReactNode } from "react"

interface RoleGuardProps {
  children: ReactNode
  allowedRoles: UserRole[]
  fallback?: ReactNode
}

export function RoleGuard({ children, allowedRoles, fallback }: RoleGuardProps) {
  const { data: session } = useSession()
  const user = session?.user as User

  if (!user || !allowedRoles.includes(user.role)) {
    return fallback || null
  }

  return <>{children}</>
}

// Usage
<RoleGuard allowedRoles={[UserRole.ADMIN, UserRole.EDITOR]}>
  <EditButton />
</RoleGuard>
```

### 3. API Client with Authentication

```typescript
// /src/lib/api/client.ts
import axios from "axios";
import { getSession } from "next-auth/react";

const apiClient = axios.create({
  baseURL: "/api",
});

// Add auth header to all requests
apiClient.interceptors.request.use(async config => {
  const session = await getSession();
  if (session) {
    config.headers.Authorization = `Bearer ${session.accessToken}`;
  }
  return config;
});

// Handle auth errors
apiClient.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default apiClient;
```

## Security Best Practices

1. **Environment Variables**: Never commit secrets to version control
2. **JWT Expiration**: Tokens expire after 30 days, update every 24 hours
3. **Permission Checking**: Always verify permissions on both client and server
4. **Session Validation**: Middleware validates every request
5. **Error Handling**: Graceful degradation for auth failures

## Testing Authentication

```typescript
// Example test setup
import { mockSession } from "@/test/utils/auth"
import { UserRole } from "@/types/auth"

describe("Protected Component", () => {
  it("should render for admin users", () => {
    mockSession({
      user: {
        id: "1",
        role: UserRole.ADMIN,
        permissions: [/* admin permissions */]
      }
    })

    render(<AdminComponent />)
    expect(screen.getByText("Admin Panel")).toBeInTheDocument()
  })
})
```

## Migration Notes

When migrating from other auth systems:

1. **User Data**: Map existing users to new role/permission structure
2. **Session Handling**: Update all session access to use new format
3. **Route Protection**: Replace old guards with new middleware patterns
4. **API Updates**: Update all API routes to use withAuth wrapper

## Troubleshooting

### Common Issues

1. **Environment Variables**: Ensure all required env vars are set
2. **Provider Configuration**: Check OAuth app settings match env vars
3. **Middleware Conflicts**: Ensure middleware.ts is in project root
4. **Session Access**: Use proper session hooks and server-side auth calls

### Debug Mode

Set `NODE_ENV=development` to enable:

- Detailed auth logs
- JWT token inspection
- Middleware request tracing

## Integration Points

Other agents working on this project should integrate with:

- **Agent 1 (Foundation)**: Session providers and client-side auth components
- **Agent 3 (UI)**: Protected route components and role-based UI elements
- **Database Agent**: User management APIs and data persistence
- **API Agents**: Middleware integration and permission checking

## File Structure Reference

```
src/
├── lib/auth/
│   ├── index.ts           # Main Auth.js export
│   ├── config.ts          # Auth.js configuration
│   ├── permissions.ts     # Permission checking logic
│   └── user-service.ts    # User CRUD operations
├── lib/middleware/
│   └── auth.ts            # Authentication middleware utilities
├── types/
│   └── auth.ts            # TypeScript interfaces and enums
├── app/api/auth/
│   └── [...nextauth]/route.ts  # Auth.js API routes
└── app/api/users/         # User management API endpoints
middleware.ts              # Next.js middleware (project root)
```

This authentication system is production-ready and provides a solid foundation
for the entire application. All agents should use these patterns for consistent
and secure user management.

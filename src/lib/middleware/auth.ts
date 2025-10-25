import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { hasPermission, checkPermission } from "@/lib/auth/permissions";
import type { User, PermissionContext } from "@/types/auth";
import { Permission } from "@/types/auth";

/**
 * Authentication middleware options
 */
interface AuthMiddlewareOptions {
  requiredPermissions?: Permission[];
  requireAll?: boolean; // If true, user must have ALL permissions; if false, ANY permission
  redirectTo?: string;
  allowUnauthenticated?: boolean;
}

/**
 * Create authentication middleware
 */
export function createAuthMiddleware(options: AuthMiddlewareOptions = {}) {
  return async function authMiddleware(request: NextRequest) {
    try {
      const session = await auth();
      const user = session?.user as User | undefined;

      // Check if authentication is required
      if (!options.allowUnauthenticated && !user) {
        return redirectToLogin(request, options.redirectTo);
      }

      // If user exists but account is inactive
      if (user && !user.isActive) {
        return NextResponse.json({ error: "Account is inactive" }, { status: 403 });
      }

      // Check permissions if required
      if (options.requiredPermissions && options.requiredPermissions.length > 0 && user) {
        const permissionResults = await Promise.all(
          options.requiredPermissions.map(permission => hasPermission(user, permission))
        );

        const hasRequiredPermissions = options.requireAll
          ? permissionResults.every(result => result)
          : permissionResults.some(result => result);

        if (!hasRequiredPermissions) {
          return NextResponse.json(
            {
              error: "Insufficient permissions",
              requiredPermissions: options.requiredPermissions,
              userPermissions: user.permissions || [],
            },
            { status: 403 }
          );
        }
      }

      // Add user info to request headers for downstream handlers
      const response = NextResponse.next();
      if (user) {
        response.headers.set("x-user-id", user.id);
        response.headers.set("x-user-role", user.role);
        response.headers.set("x-user-permissions", JSON.stringify(user.permissions || []));
      }

      return response;
    } catch (error) {
      console.error("Auth middleware error:", error);
      return NextResponse.json({ error: "Authentication error" }, { status: 500 });
    }
  };
}

/**
 * Redirect to login page
 */
function redirectToLogin(request: NextRequest, customRedirect?: string): NextResponse {
  const redirectUrl = customRedirect || "/login";
  const callbackUrl = request.nextUrl.pathname + request.nextUrl.search;

  const loginUrl = new URL(redirectUrl, request.url);
  loginUrl.searchParams.set("callbackUrl", callbackUrl);

  return NextResponse.redirect(loginUrl);
}

/**
 * API route wrapper with authentication and permissions
 */
export function withAuth<T = any>(
  handler: (request: NextRequest, context: { user: User }) => Promise<NextResponse<T>>,
  options: AuthMiddlewareOptions = {}
) {
  return async function wrappedHandler(request: NextRequest): Promise<NextResponse<T>> {
    try {
      const session = await auth();
      const user = session?.user as User | undefined;

      // Check authentication
      if (!user) {
        return NextResponse.json(
          { error: "Authentication required" },
          { status: 401 }
        ) as NextResponse<T>;
      }

      // Check if account is active
      if (!user.isActive) {
        return NextResponse.json(
          { error: "Account is inactive" },
          { status: 403 }
        ) as NextResponse<T>;
      }

      // Check permissions
      if (options.requiredPermissions && options.requiredPermissions.length > 0) {
        const permissionResults = await Promise.all(
          options.requiredPermissions.map(permission => hasPermission(user, permission))
        );

        const hasRequiredPermissions = options.requireAll
          ? permissionResults.every(result => result)
          : permissionResults.some(result => result);

        if (!hasRequiredPermissions) {
          return NextResponse.json(
            {
              error: "Insufficient permissions",
              requiredPermissions: options.requiredPermissions,
            },
            { status: 403 }
          ) as NextResponse<T>;
        }
      }

      // Call the actual handler with authenticated user
      return handler(request, { user });
    } catch (error) {
      console.error("withAuth wrapper error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      ) as NextResponse<T>;
    }
  };
}

/**
 * Role-based access control decorator
 */
export function requireRole(role: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    descriptor.value = async function (...args: any[]) {
      const session = await auth();
      const user = session?.user as User | undefined;

      if (!user || user.role !== role) {
        throw new Error(`Access denied. Required role: ${role}`);
      }

      return method.apply(this, args);
    };
  };
}

/**
 * Permission-based access control decorator
 */
export function requirePermission(permission: Permission) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    descriptor.value = async function (...args: any[]) {
      const session = await auth();
      const user = session?.user as User | undefined;

      if (!user) {
        throw new Error("Authentication required");
      }

      const hasRequiredPermission = await hasPermission(user, permission);
      if (!hasRequiredPermission) {
        throw new Error(`Access denied. Required permission: ${permission}`);
      }

      return method.apply(this, args);
    };
  };
}

/**
 * Get user from request headers (set by middleware)
 */
export function getUserFromHeaders(request: NextRequest): Partial<User> | null {
  const userId = request.headers.get("x-user-id");
  const userRole = request.headers.get("x-user-role");
  const userPermissions = request.headers.get("x-user-permissions");

  if (!userId || !userRole) {
    return null;
  }

  return {
    id: userId,
    role: userRole as any,
    permissions: userPermissions ? JSON.parse(userPermissions) : [],
  };
}

/**
 * Check permission for a specific context
 */
export async function checkContextPermission(
  request: NextRequest,
  action: Permission,
  resourceId?: string,
  metadata?: Record<string, any>
): Promise<{ allowed: boolean; reason?: string }> {
  try {
    const session = await auth();
    const user = session?.user as User | undefined;

    if (!user) {
      return { allowed: false, reason: "Authentication required" };
    }

    const context: PermissionContext = {
      user,
      action,
      resource: resourceId,
      metadata,
    };

    const result = await checkPermission(context);
    return {
      allowed: result.granted,
      reason: result.reason,
    };
  } catch (error) {
    console.error("Error checking context permission:", error);
    return { allowed: false, reason: "Internal error" };
  }
}

/**
 * Middleware configuration for common routes
 */
export const authRoutes = {
  // Public routes (no authentication required)
  // Note: "/" removed - now handled in middleware with auth check (FE-229)
  public: ["/login", "/auth/signin", "/auth/signup", "/auth/error", "/api/health", "/api/auth/.*", "/avatar-demo", "/api/avatar/.*", "/demo/.*"],

  // Protected routes (authentication required)
  protected: ["/dashboard", "/profile", "/settings"],

  // Admin routes (admin role required)
  admin: ["/admin", "/dashboard/users", "/dashboard/settings", "/api/admin/.*"],

  // Editor routes (editor role or higher required)
  editor: ["/editor", "/dashboard/content", "/api/content/.*"],
};

/**
 * Check if a path matches any of the given patterns
 */
export function matchesPath(path: string, patterns: string[]): boolean {
  return patterns.some(pattern => {
    const regex = new RegExp(`^${pattern.replace(/\*/g, ".*")}$`);
    return regex.test(path);
  });
}

/**
 * Get required permissions for a specific route
 */
export function getRoutePermissions(path: string): Permission[] {
  // Admin routes
  if (matchesPath(path, ["/admin", "/dashboard/users", "/api/admin/.*"])) {
    return [Permission.MANAGE_SYSTEM_SETTINGS, Permission.MANAGE_USER_ROLES];
  }

  // User management routes
  if (matchesPath(path, ["/dashboard/users", "/api/users/.*"])) {
    return [Permission.READ_USER, Permission.UPDATE_USER];
  }

  // Content management routes
  if (matchesPath(path, ["/dashboard/content", "/api/content/.*"])) {
    return [Permission.READ_CONTENT, Permission.UPDATE_CONTENT];
  }

  // Dashboard routes
  if (matchesPath(path, ["/dashboard"])) {
    return [Permission.VIEW_DASHBOARD];
  }

  // API routes
  if (matchesPath(path, ["/api/.*"])) {
    return [Permission.ACCESS_API];
  }

  return [];
}

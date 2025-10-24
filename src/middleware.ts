import { NextResponse, type NextRequest } from "next/server";

import { auth } from "@/lib/auth";
import { hasAllPermissions } from "@/lib/auth/permissions";
import { authRoutes, matchesPath, getRoutePermissions } from "@/lib/middleware/auth";
import type { User } from "@/types/auth";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  // TODO: Replace with structured logging (FE-159)
  console.log(`[MIDDLEWARE START] Request to: ${pathname}`);

  // Skip middleware for static files, API auth routes, and health checks
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/avatar") || // Avatar API routes are public
    pathname === "/api/health"
  ) {
    return NextResponse.next();
  }

  try {
    const session = await auth();
    const user = session?.user as User | undefined;

    // TODO: Replace with structured logging (FE-159)
    // console.log(
    //   `[MIDDLEWARE] Path: ${pathname}, User: ${user ? `${user.email} (${user.role})` : "none"}, Session: ${!!session}`
    // );

    // SPECIAL CASE: Root route - redirect based on auth status
    // This prevents authentication bypass via root route (FE-229)
    if (pathname === "/") {
      if (user) {
        // Authenticated users → dashboard
        return NextResponse.redirect(new URL("/dashboard", request.url));
      } else {
        // Unauthenticated users → login
        return NextResponse.redirect(new URL("/login", request.url));
      }
    }

    // Handle public routes
    if (matchesPath(pathname, authRoutes.public)) {
      // TODO: Replace with structured logging (FE-159)
      // console.log(`[MIDDLEWARE] ${pathname} is PUBLIC route`);
      // If user is authenticated and trying to access login, redirect to dashboard
      if (user && (pathname === "/login" || pathname === "/auth/signin")) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
      return NextResponse.next();
    }

    // Authentication required for protected routes
    // TODO: Replace with structured logging (FE-159)
    // console.log(`[MIDDLEWARE] ${pathname} is NOT public, checking auth...`);
    if (!user) {
      // TODO: Replace with structured logging (FE-159)
      // console.log(`[MIDDLEWARE] NO USER found, redirecting to login`);
      // For API routes, return 401
      if (pathname.startsWith("/api")) {
        return NextResponse.json({ error: "Authentication required" }, { status: 401 });
      }
      // For pages, redirect to login
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname + request.nextUrl.search);
      return NextResponse.redirect(loginUrl);
    }

    // Check if user account is active
    if (!user.isActive) {
      if (pathname.startsWith("/api")) {
        return NextResponse.json({ error: "Account is inactive" }, { status: 403 });
      }
      return NextResponse.redirect(new URL("/auth/inactive", request.url));
    }

    // Check admin routes
    if (matchesPath(pathname, authRoutes.admin)) {
      if (user.role !== "ADMIN") {
        if (pathname.startsWith("/api")) {
          return NextResponse.json({ error: "Admin access required" }, { status: 403 });
        }
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    }

    // Check editor routes
    if (matchesPath(pathname, authRoutes.editor)) {
      if (user.role !== "ADMIN" && user.role !== "EDITOR") {
        if (pathname.startsWith("/api")) {
          return NextResponse.json({ error: "Editor access required" }, { status: 403 });
        }
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    }

    // Check specific route permissions
    const requiredPermissions = getRoutePermissions(pathname);
    if (requiredPermissions.length > 0) {
      const hasPermissions = await hasAllPermissions(user, requiredPermissions);
      if (!hasPermissions) {
        if (pathname.startsWith("/api")) {
          return NextResponse.json(
            {
              error: "Insufficient permissions",
              requiredPermissions,
              userPermissions: user.permissions ?? [],
            },
            { status: 403 }
          );
        }
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    }

    // Add user info to headers for API routes
    const response = NextResponse.next();
    response.headers.set("x-user-id", user.id);
    response.headers.set("x-user-role", user.role);
    response.headers.set("x-user-permissions", JSON.stringify(user.permissions ?? []));
    response.headers.set("x-user-active", user.isActive.toString());

    return response;
  } catch (error) {
    console.error("Middleware error:", error);

    // For API routes, return error response
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ error: "Authentication service error" }, { status: 500 });
    }

    // For pages, redirect to error page
    return NextResponse.redirect(new URL("/auth/error", request.url));
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|public/).*)",
  ],
};

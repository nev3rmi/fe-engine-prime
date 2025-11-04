"use client";

import { useCallback, useMemo } from "react";

import { useSession } from "next-auth/react";

import { hasPermission, hasAnyPermission, hasAllPermissions } from "@/lib/auth/permissions";
import type { User, Permission } from "@/types/auth";
import { UserRole } from "@/types/auth";

/**
 * Custom hook for authentication and authorization
 */
export function useAuth() {
  const { data: session, status } = useSession();
  const user = session?.user as User | undefined;

  // Session states
  const isLoading = status === "loading";
  const isAuthenticated = status === "authenticated" && !!user;
  const isUnauthenticated = status === "unauthenticated";

  // User role checks
  const isAdmin = useMemo(() => user?.role === UserRole.ADMIN, [user?.role]);
  const isEditor = useMemo(() => user?.role === UserRole.EDITOR, [user?.role]);
  const isUser = useMemo(() => user?.role === UserRole.USER, [user?.role]);

  // Permission checking functions
  const checkPermission = useCallback(
    async (permission: Permission): Promise<boolean> => {
      if (!user) {
        return false;
      }
      return await hasPermission(user, permission);
    },
    [user]
  );

  const checkAnyPermission = useCallback(
    async (permissions: Permission[]): Promise<boolean> => {
      if (!user) {
        return false;
      }
      return await hasAnyPermission(user, permissions);
    },
    [user]
  );

  const checkAllPermissions = useCallback(
    async (permissions: Permission[]): Promise<boolean> => {
      if (!user) {
        return false;
      }
      return await hasAllPermissions(user, permissions);
    },
    [user]
  );

  // Role hierarchy checks
  const hasRoleOrHigher = useCallback(
    (role: UserRole): boolean => {
      if (!user) {
        return false;
      }

      const roleHierarchy = {
        [UserRole.USER]: 1,
        [UserRole.EDITOR]: 2,
        [UserRole.ADMIN]: 3,
      };

      return roleHierarchy[user.role] >= roleHierarchy[role];
    },
    [user]
  );

  // User permissions as array
  const permissions = useMemo(() => user?.permissions || [], [user?.permissions]);

  return {
    // Session data
    user,
    session,
    status,

    // Session states
    isLoading,
    isAuthenticated,
    isUnauthenticated,

    // Role checks
    isAdmin,
    isEditor,
    isUser,

    // Permission functions
    checkPermission,
    checkAnyPermission,
    checkAllPermissions,
    hasRoleOrHigher,

    // User data
    permissions,
    role: user?.role,
    isActive: user?.isActive || false,
  };
}

/**
 * Hook for permission-based component rendering
 */
export function usePermissions(requiredPermissions: Permission[], requireAll = true) {
  const { user, checkPermission, checkAnyPermission, checkAllPermissions } = useAuth();

  const checkFunction = requireAll ? checkAllPermissions : checkAnyPermission;

  const hasPermissions = useMemo(async () => {
    if (!user || requiredPermissions.length === 0) {
      return true;
    }
    return await checkFunction(requiredPermissions);
  }, [user, requiredPermissions, requireAll, checkFunction]);

  return {
    hasPermissions,
    user,
    isLoading: !user,
  };
}

/**
 * Hook for role-based component rendering
 */
export function useRole(allowedRoles: UserRole[]) {
  const { user, role, isLoading } = useAuth();

  const hasRole = useMemo(() => {
    if (!user || !role) {
      return false;
    }
    return allowedRoles.includes(role);
  }, [user, role, allowedRoles]);

  return {
    hasRole,
    role,
    user,
    isLoading,
  };
}

/**
 * Hook for admin-only access
 */
export function useAdminOnly() {
  const { isAdmin, user, isLoading } = useAuth();

  return {
    isAdmin,
    hasAccess: isAdmin,
    user,
    isLoading,
  };
}

/**
 * Hook for editor-or-higher access
 */
export function useEditorAccess() {
  const { isAdmin, isEditor, user, isLoading } = useAuth();

  const hasAccess = isAdmin || isEditor;

  return {
    hasAccess,
    isAdmin,
    isEditor,
    user,
    isLoading,
  };
}

import {
  Permission,
  UserRole,
  User,
  PermissionResult,
  PermissionContext,
  DEFAULT_ROLE_PERMISSIONS,
  ROLE_HIERARCHY,
} from "@/types/auth";

/**
 * Get permissions for a specific role
 */
export async function getRolePermissions(role: UserRole): Promise<Permission[]> {
  return DEFAULT_ROLE_PERMISSIONS[role] || [];
}

/**
 * Check if a user has a specific permission
 */
export async function hasPermission(
  user: User | null,
  permission: Permission,
  context?: Record<string, any>
): Promise<boolean> {
  if (!user || !user.isActive) {
    return false;
  }

  const userPermissions = user.permissions || (await getRolePermissions(user.role));
  return userPermissions.includes(permission);
}

/**
 * Check if a user has any of the specified permissions
 */
export async function hasAnyPermission(
  user: User | null,
  permissions: Permission[]
): Promise<boolean> {
  if (!user || !user.isActive) {
    return false;
  }

  for (const permission of permissions) {
    if (await hasPermission(user, permission)) {
      return true;
    }
  }
  return false;
}

/**
 * Check if a user has all of the specified permissions
 */
export async function hasAllPermissions(
  user: User | null,
  permissions: Permission[]
): Promise<boolean> {
  if (!user || !user.isActive) {
    return false;
  }

  for (const permission of permissions) {
    if (!(await hasPermission(user, permission))) {
      return false;
    }
  }
  return true;
}

/**
 * Check if a user can perform an action on a resource
 */
export async function checkPermission(context: PermissionContext): Promise<PermissionResult> {
  const { user, action } = context;

  if (!user) {
    return {
      granted: false,
      reason: "User not authenticated",
    };
  }

  if (!user.isActive) {
    return {
      granted: false,
      reason: "User account is inactive",
    };
  }

  const userPermissions = user.permissions || (await getRolePermissions(user.role));
  const hasRequiredPermission = userPermissions.includes(action);

  if (!hasRequiredPermission) {
    return {
      granted: false,
      reason: "Insufficient permissions",
      missingPermissions: [action],
    };
  }

  // Additional context-based checks can be added here
  // For example, resource ownership, team membership, etc.

  return {
    granted: true,
  };
}

/**
 * Check if a user has a higher or equal role than another user
 */
export function hasHigherOrEqualRole(userRole: UserRole, targetRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[targetRole];
}

/**
 * Get the minimum role required for a permission
 */
export function getMinimumRoleForPermission(permission: Permission): UserRole | null {
  for (const [role, permissions] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
    if (permissions.includes(permission)) {
      return role as UserRole;
    }
  }
  return null;
}

/**
 * Check if a role can manage another role
 */
export function canManageRole(managerRole: UserRole, targetRole: UserRole): boolean {
  // Admins can manage all roles
  if (managerRole === UserRole.ADMIN) {
    return true;
  }

  // Editors can only manage Users
  if (managerRole === UserRole.EDITOR && targetRole === UserRole.USER) {
    return true;
  }

  // Users cannot manage any roles
  return false;
}

/**
 * Get all permissions for multiple roles (useful for role hierarchies)
 */
export async function getPermissionsForRoles(roles: UserRole[]): Promise<Permission[]> {
  const allPermissions = new Set<Permission>();

  for (const role of roles) {
    const rolePermissions = await getRolePermissions(role);
    rolePermissions.forEach(permission => allPermissions.add(permission));
  }

  return Array.from(allPermissions);
}

/**
 * Filter permissions by category
 */
export function filterPermissionsByCategory(
  permissions: Permission[],
  category: string
): Permission[] {
  const categoryMap: Record<string, Permission[]> = {
    user: [
      Permission.CREATE_USER,
      Permission.READ_USER,
      Permission.UPDATE_USER,
      Permission.DELETE_USER,
      Permission.MANAGE_USER_ROLES,
    ],
    content: [
      Permission.CREATE_CONTENT,
      Permission.READ_CONTENT,
      Permission.UPDATE_CONTENT,
      Permission.DELETE_CONTENT,
      Permission.PUBLISH_CONTENT,
    ],
    system: [
      Permission.MANAGE_SYSTEM_SETTINGS,
      Permission.VIEW_SYSTEM_LOGS,
      Permission.MANAGE_INTEGRATIONS,
    ],
    dashboard: [Permission.VIEW_DASHBOARD, Permission.VIEW_ANALYTICS, Permission.EXPORT_DATA],
    realtime: [Permission.JOIN_REALTIME_CHANNELS, Permission.MODERATE_REALTIME_CHANNELS],
    api: [Permission.ACCESS_API, Permission.ADMIN_API_ACCESS],
  };

  return permissions.filter(permission => categoryMap[category]?.includes(permission) || false);
}

/**
 * Create a permission matrix for UI display
 */
export function createPermissionMatrix(): Record<UserRole, Record<string, Permission[]>> {
  const matrix: Record<UserRole, Record<string, Permission[]>> = {
    [UserRole.ADMIN]: {},
    [UserRole.EDITOR]: {},
    [UserRole.USER]: {},
  };

  const categories = ["user", "content", "system", "dashboard", "realtime", "api"];

  for (const role of Object.values(UserRole)) {
    const rolePermissions = DEFAULT_ROLE_PERMISSIONS[role];

    for (const category of categories) {
      matrix[role][category] = filterPermissionsByCategory(rolePermissions, category);
    }
  }

  return matrix;
}

/**
 * Validate permission assignment
 */
export function validatePermissionAssignment(
  assignerRole: UserRole,
  targetRole: UserRole,
  permissions: Permission[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check if assigner can manage target role
  if (!canManageRole(assignerRole, targetRole)) {
    errors.push(`${assignerRole} role cannot manage ${targetRole} role`);
  }

  // Check if assigner has all permissions they're trying to assign
  const assignerPermissions = DEFAULT_ROLE_PERMISSIONS[assignerRole];
  const invalidPermissions = permissions.filter(p => !assignerPermissions.includes(p));

  if (invalidPermissions.length > 0) {
    errors.push(`Cannot assign permissions you don't have: ${invalidPermissions.join(", ")}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get permission description for UI
 */
export function getPermissionDescription(permission: Permission): string {
  const descriptions: Record<Permission, string> = {
    // User Management
    [Permission.CREATE_USER]: "Create new user accounts",
    [Permission.READ_USER]: "View user information and profiles",
    [Permission.UPDATE_USER]: "Edit user information and settings",
    [Permission.DELETE_USER]: "Delete user accounts",
    [Permission.MANAGE_USER_ROLES]: "Assign and modify user roles",

    // Content Management
    [Permission.CREATE_CONTENT]: "Create new content and posts",
    [Permission.READ_CONTENT]: "View and access content",
    [Permission.UPDATE_CONTENT]: "Edit and modify existing content",
    [Permission.DELETE_CONTENT]: "Remove content permanently",
    [Permission.PUBLISH_CONTENT]: "Publish content and make it public",

    // System Administration
    [Permission.MANAGE_SYSTEM_SETTINGS]: "Configure system-wide settings",
    [Permission.VIEW_SYSTEM_LOGS]: "Access system logs and audit trails",
    [Permission.MANAGE_INTEGRATIONS]: "Configure external integrations",

    // Dashboard
    [Permission.VIEW_DASHBOARD]: "Access the main dashboard",
    [Permission.VIEW_ANALYTICS]: "View analytics and reports",
    [Permission.EXPORT_DATA]: "Export data and generate reports",

    // Real-time Communication
    [Permission.JOIN_REALTIME_CHANNELS]: "Join real-time chat and collaboration",
    [Permission.MODERATE_REALTIME_CHANNELS]: "Moderate chat channels and communications",

    // API Access
    [Permission.ACCESS_API]: "Make API calls and access endpoints",
    [Permission.ADMIN_API_ACCESS]: "Access administrative API endpoints",
  };

  return descriptions[permission] || "Unknown permission";
}

/**
 * Get role description for UI
 */
export function getRoleDescription(role: UserRole): string {
  const descriptions: Record<UserRole, string> = {
    [UserRole.ADMIN]: "Full system access with all administrative privileges",
    [UserRole.EDITOR]: "Content management and limited user administration",
    [UserRole.USER]: "Basic access with read permissions and content interaction",
  };

  return descriptions[role] || "Unknown role";
}

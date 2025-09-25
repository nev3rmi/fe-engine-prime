import type { DefaultSession } from "next-auth";

/**
 * User Role Hierarchy
 * ADMIN: Full system access, can manage all users and settings
 * EDITOR: Can create, edit, and delete content, manage some users
 * USER: Basic access, can view and interact with content
 */
export enum UserRole {
  ADMIN = "ADMIN",
  EDITOR = "EDITOR",
  USER = "USER",
}

/**
 * Granular Permission System
 * Each permission represents a specific action that can be performed
 */
export enum Permission {
  // User Management Permissions
  CREATE_USER = "CREATE_USER",
  READ_USER = "READ_USER",
  UPDATE_USER = "UPDATE_USER",
  DELETE_USER = "DELETE_USER",
  MANAGE_USER_ROLES = "MANAGE_USER_ROLES",

  // Content Management Permissions
  CREATE_CONTENT = "CREATE_CONTENT",
  READ_CONTENT = "READ_CONTENT",
  UPDATE_CONTENT = "UPDATE_CONTENT",
  DELETE_CONTENT = "DELETE_CONTENT",
  PUBLISH_CONTENT = "PUBLISH_CONTENT",

  // System Administration Permissions
  MANAGE_SYSTEM_SETTINGS = "MANAGE_SYSTEM_SETTINGS",
  VIEW_SYSTEM_LOGS = "VIEW_SYSTEM_LOGS",
  MANAGE_INTEGRATIONS = "MANAGE_INTEGRATIONS",

  // Dashboard Permissions
  VIEW_DASHBOARD = "VIEW_DASHBOARD",
  VIEW_ANALYTICS = "VIEW_ANALYTICS",
  EXPORT_DATA = "EXPORT_DATA",

  // Real-time Communication Permissions
  JOIN_REALTIME_CHANNELS = "JOIN_REALTIME_CHANNELS",
  MODERATE_REALTIME_CHANNELS = "MODERATE_REALTIME_CHANNELS",

  // API Access Permissions
  ACCESS_API = "ACCESS_API",
  ADMIN_API_ACCESS = "ADMIN_API_ACCESS",
}

/**
 * User entity with role and permissions
 */
export interface User {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  username: string | null;
  role: UserRole;
  permissions?: Permission[];
  provider: string | null;
  providerId: string;
  isActive: boolean;
  emailVerified: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}

/**
 * Role definition with associated permissions
 */
export interface RoleDefinition {
  role: UserRole;
  permissions: Permission[];
  description: string;
  isDefault?: boolean;
}

/**
 * Permission check context for middleware
 */
export interface PermissionContext {
  user: User;
  resource?: string;
  action: Permission;
  metadata?: Record<string, any>;
}

/**
 * Authentication session with extended user information
 */
export interface AuthSession extends DefaultSession {
  user: {
    id: string;
    role: UserRole;
    permissions: Permission[];
    username: string | null;
    isActive: boolean;
  } & DefaultSession["user"];
}

/**
 * Extended JWT token with additional fields
 */
export interface ExtendedJWT {
  userId: string;
  role: UserRole;
  permissions: Permission[];
  username: string | null;
  isActive: boolean;
}

/**
 * Authentication provider configuration
 */
export interface AuthProvider {
  id: string;
  name: string;
  type: "oauth" | "credentials" | "email";
  enabled: boolean;
  config: Record<string, any>;
}

/**
 * Permission check result
 */
export interface PermissionResult {
  granted: boolean;
  reason?: string;
  requiredRole?: UserRole;
  missingPermissions?: Permission[];
}

/**
 * User creation data
 */
export interface CreateUserData {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  username: string | null;
  role: UserRole;
  provider: string | null;
  providerId: string;
  isActive: boolean;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}

/**
 * User update data
 */
export interface UpdateUserData {
  name?: string | null;
  image?: string | null;
  username?: string | null;
  role?: UserRole;
  isActive?: boolean;
  emailVerified?: boolean;
  lastLoginAt?: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}

/**
 * Authentication error types
 */
export enum AuthError {
  INVALID_CREDENTIALS = "INVALID_CREDENTIALS",
  USER_NOT_FOUND = "USER_NOT_FOUND",
  USER_INACTIVE = "USER_INACTIVE",
  INSUFFICIENT_PERMISSIONS = "INSUFFICIENT_PERMISSIONS",
  TOKEN_EXPIRED = "TOKEN_EXPIRED",
  INVALID_TOKEN = "INVALID_TOKEN",
  PROVIDER_ERROR = "PROVIDER_ERROR",
}

/**
 * Role hierarchy levels for permission inheritance
 */
export const ROLE_HIERARCHY = {
  [UserRole.ADMIN]: 3,
  [UserRole.EDITOR]: 2,
  [UserRole.USER]: 1,
} as const;

/**
 * Default role permissions mapping
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.ADMIN]: [
    // Full access to all permissions
    Permission.CREATE_USER,
    Permission.READ_USER,
    Permission.UPDATE_USER,
    Permission.DELETE_USER,
    Permission.MANAGE_USER_ROLES,
    Permission.CREATE_CONTENT,
    Permission.READ_CONTENT,
    Permission.UPDATE_CONTENT,
    Permission.DELETE_CONTENT,
    Permission.PUBLISH_CONTENT,
    Permission.MANAGE_SYSTEM_SETTINGS,
    Permission.VIEW_SYSTEM_LOGS,
    Permission.MANAGE_INTEGRATIONS,
    Permission.VIEW_DASHBOARD,
    Permission.VIEW_ANALYTICS,
    Permission.EXPORT_DATA,
    Permission.JOIN_REALTIME_CHANNELS,
    Permission.MODERATE_REALTIME_CHANNELS,
    Permission.ACCESS_API,
    Permission.ADMIN_API_ACCESS,
  ],
  [UserRole.EDITOR]: [
    // Content management and some user management
    Permission.READ_USER,
    Permission.UPDATE_USER,
    Permission.CREATE_CONTENT,
    Permission.READ_CONTENT,
    Permission.UPDATE_CONTENT,
    Permission.DELETE_CONTENT,
    Permission.PUBLISH_CONTENT,
    Permission.VIEW_DASHBOARD,
    Permission.VIEW_ANALYTICS,
    Permission.EXPORT_DATA,
    Permission.JOIN_REALTIME_CHANNELS,
    Permission.MODERATE_REALTIME_CHANNELS,
    Permission.ACCESS_API,
  ],
  [UserRole.USER]: [
    // Basic read access and content interaction
    Permission.READ_CONTENT,
    Permission.VIEW_DASHBOARD,
    Permission.JOIN_REALTIME_CHANNELS,
    Permission.ACCESS_API,
  ],
};

// Extend NextAuth types
declare module "next-auth" {
  interface Session extends AuthSession {}
  interface User {
    role?: UserRole;
    permissions?: Permission[];
    username?: string | null;
    isActive?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends ExtendedJWT {}
}

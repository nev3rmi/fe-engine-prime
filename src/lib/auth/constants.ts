import { Permission, UserRole } from "@/types/auth"

/**
 * Authentication configuration constants
 */
export const AUTH_CONFIG = {
  // Session configuration
  SESSION: {
    MAX_AGE: 30 * 24 * 60 * 60, // 30 days in seconds
    UPDATE_AGE: 24 * 60 * 60, // 24 hours in seconds
    STRATEGY: "jwt" as const,
  },

  // JWT configuration
  JWT: {
    MAX_AGE: 30 * 24 * 60 * 60, // 30 days in seconds
  },

  // Pages configuration
  PAGES: {
    SIGN_IN: "/login",
    SIGN_OUT: "/auth/signout",
    ERROR: "/auth/error",
    INACTIVE: "/auth/inactive",
  },

  // Default redirect paths
  REDIRECTS: {
    AFTER_SIGN_IN: "/dashboard",
    AFTER_SIGN_OUT: "/",
    UNAUTHORIZED: "/login",
    FORBIDDEN: "/dashboard",
  },
} as const

/**
 * Route patterns for middleware
 */
export const ROUTE_PATTERNS = {
  // Public routes (no authentication required)
  PUBLIC: [
    "/",
    "/login",
    "/auth/signin",
    "/auth/signup",
    "/auth/error",
    "/auth/inactive",
    "/api/health",
    "/api/auth/.*",
  ],

  // Protected routes (authentication required)
  PROTECTED: [
    "/dashboard",
    "/profile",
    "/settings",
  ],

  // Admin only routes
  ADMIN: [
    "/admin",
    "/dashboard/users",
    "/dashboard/settings",
    "/api/admin/.*",
  ],

  // Editor or higher routes
  EDITOR: [
    "/editor",
    "/dashboard/content",
    "/api/content/.*",
  ],

  // Static files and API auth (skip middleware)
  SKIP: [
    "/_next",
    "/favicon.ico",
    "/api/auth",
    "/api/health",
  ],
} as const

/**
 * Permission categories for UI organization
 */
export const PERMISSION_CATEGORIES = {
  USER_MANAGEMENT: [
    Permission.CREATE_USER,
    Permission.READ_USER,
    Permission.UPDATE_USER,
    Permission.DELETE_USER,
    Permission.MANAGE_USER_ROLES,
  ],

  CONTENT_MANAGEMENT: [
    Permission.CREATE_CONTENT,
    Permission.READ_CONTENT,
    Permission.UPDATE_CONTENT,
    Permission.DELETE_CONTENT,
    Permission.PUBLISH_CONTENT,
  ],

  SYSTEM_ADMINISTRATION: [
    Permission.MANAGE_SYSTEM_SETTINGS,
    Permission.VIEW_SYSTEM_LOGS,
    Permission.MANAGE_INTEGRATIONS,
  ],

  DASHBOARD_ACCESS: [
    Permission.VIEW_DASHBOARD,
    Permission.VIEW_ANALYTICS,
    Permission.EXPORT_DATA,
  ],

  REALTIME_COMMUNICATION: [
    Permission.JOIN_REALTIME_CHANNELS,
    Permission.MODERATE_REALTIME_CHANNELS,
  ],

  API_ACCESS: [
    Permission.ACCESS_API,
    Permission.ADMIN_API_ACCESS,
  ],
} as const

/**
 * Role descriptions for UI display
 */
export const ROLE_DESCRIPTIONS = {
  [UserRole.ADMIN]: {
    title: "Administrator",
    description: "Full system access with all administrative privileges",
    level: 3,
    color: "red",
    badge: "ADMIN",
  },

  [UserRole.EDITOR]: {
    title: "Editor",
    description: "Content management and limited user administration",
    level: 2,
    color: "blue",
    badge: "EDITOR",
  },

  [UserRole.USER]: {
    title: "User",
    description: "Basic access with read permissions and content interaction",
    level: 1,
    color: "green",
    badge: "USER",
  },
} as const

/**
 * Permission descriptions for UI display
 */
export const PERMISSION_DESCRIPTIONS = {
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

  // Dashboard Access
  [Permission.VIEW_DASHBOARD]: "Access the main dashboard",
  [Permission.VIEW_ANALYTICS]: "View analytics and reports",
  [Permission.EXPORT_DATA]: "Export data and generate reports",

  // Real-time Communication
  [Permission.JOIN_REALTIME_CHANNELS]: "Join real-time chat and collaboration",
  [Permission.MODERATE_REALTIME_CHANNELS]: "Moderate chat channels and communications",

  // API Access
  [Permission.ACCESS_API]: "Make API calls and access endpoints",
  [Permission.ADMIN_API_ACCESS]: "Access administrative API endpoints",
} as const

/**
 * OAuth provider configurations
 */
export const OAUTH_PROVIDERS = {
  GITHUB: {
    id: "github",
    name: "GitHub",
    icon: "github",
    color: "#333",
  },

  GOOGLE: {
    id: "google",
    name: "Google",
    icon: "google",
    color: "#4285F4",
  },

  DISCORD: {
    id: "discord",
    name: "Discord",
    icon: "discord",
    color: "#7289DA",
  },
} as const

/**
 * Error messages for authentication
 */
export const AUTH_ERRORS = {
  INVALID_CREDENTIALS: "Invalid email or password",
  USER_NOT_FOUND: "User account not found",
  USER_INACTIVE: "User account is inactive",
  INSUFFICIENT_PERMISSIONS: "You don't have permission to access this resource",
  TOKEN_EXPIRED: "Your session has expired. Please sign in again",
  INVALID_TOKEN: "Invalid authentication token",
  PROVIDER_ERROR: "Authentication provider error",
  NETWORK_ERROR: "Network error. Please try again",
  UNKNOWN_ERROR: "An unexpected error occurred",
} as const

/**
 * Session refresh configuration
 */
export const SESSION_REFRESH = {
  INTERVAL: 5 * 60 * 1000, // 5 minutes
  ON_WINDOW_FOCUS: true,
  ON_MOUNT: true,
} as const
import {
  AuditAction,
  AuditSeverity,
  type AuditLogEntry,
  type CreateAuditLogParams,
} from "@/types/audit";

// In-memory storage for audit logs (in production, this should be a database)
const auditLogs: AuditLogEntry[] = [];

/**
 * Create an audit log entry
 */
export async function createAuditLog(params: CreateAuditLogParams): Promise<AuditLogEntry> {
  const entry: AuditLogEntry = {
    id: crypto.randomUUID(),
    timestamp: new Date(),
    action: params.action,
    severity: params.severity ?? getSeverityForAction(params.action),
    userId: params.userId,
    targetUserId: params.targetUserId,
    metadata: params.metadata,
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
    details: params.details,
  };

  auditLogs.push(entry);

  // Log to console for visibility (in production, send to logging service)
  // eslint-disable-next-line no-console
  console.log("[AUDIT]", {
    action: entry.action,
    severity: entry.severity,
    userId: entry.userId,
    targetUserId: entry.targetUserId,
    timestamp: entry.timestamp.toISOString(),
    details: entry.details,
  });

  return entry;
}

/**
 * Get audit logs with optional filtering
 */
export async function getAuditLogs(options?: {
  userId?: string;
  targetUserId?: string;
  action?: AuditAction;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}): Promise<AuditLogEntry[]> {
  let filtered = [...auditLogs];

  if (options?.userId) {
    filtered = filtered.filter(log => log.userId === options.userId);
  }

  if (options?.targetUserId) {
    filtered = filtered.filter(log => log.targetUserId === options.targetUserId);
  }

  if (options?.action) {
    filtered = filtered.filter(log => log.action === options.action);
  }

  if (options?.startDate) {
    filtered = filtered.filter(log => log.timestamp >= options.startDate!);
  }

  if (options?.endDate) {
    filtered = filtered.filter(log => log.timestamp <= options.endDate!);
  }

  // Sort by timestamp descending (newest first)
  filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  if (options?.limit) {
    filtered = filtered.slice(0, options.limit);
  }

  return filtered;
}

/**
 * Get audit logs for a specific user
 */
export async function getUserAuditLogs(userId: string, limit = 100): Promise<AuditLogEntry[]> {
  return getAuditLogs({ userId, limit });
}

/**
 * Get audit logs where user was the target (e.g., their role was changed)
 */
export async function getTargetUserAuditLogs(
  targetUserId: string,
  limit = 100
): Promise<AuditLogEntry[]> {
  return getAuditLogs({ targetUserId, limit });
}

/**
 * Get recent security events
 */
export async function getSecurityEvents(limit = 50): Promise<AuditLogEntry[]> {
  const securityActions = [
    AuditAction.LOGIN_FAILED,
    AuditAction.UNAUTHORIZED_ACCESS_ATTEMPT,
    AuditAction.PERMISSION_DENIED,
    AuditAction.ROLE_CHANGED,
  ];

  const filtered = auditLogs.filter(log => securityActions.includes(log.action));

  return filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, limit);
}

/**
 * Determine severity based on action
 */
function getSeverityForAction(action: AuditAction): AuditSeverity {
  switch (action) {
    case AuditAction.LOGIN_FAILED:
    case AuditAction.PERMISSION_DENIED:
      return AuditSeverity.WARNING;

    case AuditAction.UNAUTHORIZED_ACCESS_ATTEMPT:
      return AuditSeverity.ERROR;

    case AuditAction.ROLE_CHANGED:
    case AuditAction.USER_DEACTIVATED:
      return AuditSeverity.CRITICAL;

    case AuditAction.LOGIN_SUCCESS:
    case AuditAction.LOGOUT:
    case AuditAction.PERMISSION_GRANTED:
    case AuditAction.USER_ACTIVATED:
      return AuditSeverity.INFO;

    default:
      return AuditSeverity.INFO;
  }
}

/**
 * Helper to log role change events
 */
export async function logRoleChange(params: {
  userId: string;
  targetUserId: string;
  oldRole: string;
  newRole: string;
  ipAddress?: string;
  userAgent?: string;
}): Promise<AuditLogEntry> {
  return createAuditLog({
    action: AuditAction.ROLE_CHANGED,
    severity: AuditSeverity.CRITICAL,
    userId: params.userId,
    targetUserId: params.targetUserId,
    metadata: {
      oldRole: params.oldRole,
      newRole: params.newRole,
    },
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
    details: `Role changed from ${params.oldRole} to ${params.newRole}`,
  });
}

/**
 * Helper to log user status change events
 */
export async function logUserStatusChange(params: {
  userId: string;
  targetUserId: string;
  action: "activate" | "deactivate";
  ipAddress?: string;
  userAgent?: string;
}): Promise<AuditLogEntry> {
  const auditAction =
    params.action === "activate" ? AuditAction.USER_ACTIVATED : AuditAction.USER_DEACTIVATED;

  return createAuditLog({
    action: auditAction,
    severity: params.action === "deactivate" ? AuditSeverity.CRITICAL : AuditSeverity.INFO,
    userId: params.userId,
    targetUserId: params.targetUserId,
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
    details: `User ${params.action === "activate" ? "activated" : "deactivated"}`,
  });
}

/**
 * Helper to log authentication events
 */
export async function logAuthentication(params: {
  action: AuditAction.LOGIN_SUCCESS | AuditAction.LOGIN_FAILED | AuditAction.LOGOUT;
  userId?: string;
  email?: string;
  ipAddress?: string;
  userAgent?: string;
  reason?: string;
}): Promise<AuditLogEntry> {
  return createAuditLog({
    action: params.action,
    userId: params.userId,
    metadata: {
      email: params.email,
      reason: params.reason,
    },
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
    details: params.reason ?? `Authentication: ${params.action}`,
  });
}

/**
 * Helper to log unauthorized access attempts
 */
export async function logUnauthorizedAccess(params: {
  userId?: string;
  requestedResource: string;
  requiredPermission?: string;
  ipAddress?: string;
  userAgent?: string;
}): Promise<AuditLogEntry> {
  return createAuditLog({
    action: AuditAction.UNAUTHORIZED_ACCESS_ATTEMPT,
    severity: AuditSeverity.ERROR,
    userId: params.userId,
    metadata: {
      requestedResource: params.requestedResource,
      requiredPermission: params.requiredPermission,
    },
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
    details: `Unauthorized access attempt to ${params.requestedResource}`,
  });
}

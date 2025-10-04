import { describe, it, expect, beforeEach } from "vitest";
import {
  createAuditLog,
  getAuditLogs,
  getUserAuditLogs,
  getTargetUserAuditLogs,
  getSecurityEvents,
  logRoleChange,
  logUserStatusChange,
  logAuthentication,
  logUnauthorizedAccess,
} from "../audit-service";
import { AuditAction, AuditSeverity } from "@/types/audit";

describe("Audit Service", () => {
  describe("createAuditLog", () => {
    it("should create an audit log entry", async () => {
      const entry = await createAuditLog({
        action: AuditAction.LOGIN_SUCCESS,
        userId: "user-1",
        metadata: { test: "data" },
      });

      expect(entry).toMatchObject({
        action: AuditAction.LOGIN_SUCCESS,
        userId: "user-1",
        severity: AuditSeverity.INFO,
      });
      expect(entry.id).toBeDefined();
      expect(entry.timestamp).toBeInstanceOf(Date);
    });

    it("should use custom severity if provided", async () => {
      const entry = await createAuditLog({
        action: AuditAction.LOGIN_SUCCESS,
        severity: AuditSeverity.CRITICAL,
      });

      expect(entry.severity).toBe(AuditSeverity.CRITICAL);
    });

    it("should auto-assign severity based on action", async () => {
      const criticalEntry = await createAuditLog({
        action: AuditAction.ROLE_CHANGED,
      });
      expect(criticalEntry.severity).toBe(AuditSeverity.CRITICAL);

      const warningEntry = await createAuditLog({
        action: AuditAction.LOGIN_FAILED,
      });
      expect(warningEntry.severity).toBe(AuditSeverity.WARNING);

      const errorEntry = await createAuditLog({
        action: AuditAction.UNAUTHORIZED_ACCESS_ATTEMPT,
      });
      expect(errorEntry.severity).toBe(AuditSeverity.ERROR);
    });
  });

  describe("getAuditLogs", () => {
    beforeEach(async () => {
      // Create some test logs
      await createAuditLog({ action: AuditAction.LOGIN_SUCCESS, userId: "user-1" });
      await createAuditLog({
        action: AuditAction.ROLE_CHANGED,
        userId: "user-1",
        targetUserId: "user-2",
      });
      await createAuditLog({ action: AuditAction.LOGIN_SUCCESS, userId: "user-2" });
    });

    it("should filter by userId", async () => {
      const logs = await getUserAuditLogs("user-1");
      expect(logs.every(log => log.userId === "user-1")).toBe(true);
    });

    it("should filter by targetUserId", async () => {
      const logs = await getTargetUserAuditLogs("user-2");
      expect(logs.every(log => log.targetUserId === "user-2")).toBe(true);
    });

    it("should filter by action", async () => {
      const logs = await getAuditLogs({ action: AuditAction.ROLE_CHANGED });
      expect(logs.every(log => log.action === AuditAction.ROLE_CHANGED)).toBe(true);
    });

    it("should limit results", async () => {
      const logs = await getAuditLogs({ limit: 1 });
      expect(logs.length).toBe(1);
    });

    it("should sort by timestamp descending", async () => {
      const logs = await getAuditLogs();
      for (let i = 1; i < logs.length; i++) {
        expect(logs[i - 1].timestamp.getTime()).toBeGreaterThanOrEqual(logs[i].timestamp.getTime());
      }
    });
  });

  describe("getSecurityEvents", () => {
    it("should return only security-related events", async () => {
      await createAuditLog({ action: AuditAction.LOGIN_SUCCESS });
      await createAuditLog({ action: AuditAction.LOGIN_FAILED });
      await createAuditLog({ action: AuditAction.UNAUTHORIZED_ACCESS_ATTEMPT });
      await createAuditLog({ action: AuditAction.ROLE_CHANGED });

      const securityEvents = await getSecurityEvents();
      const securityActions = [
        AuditAction.LOGIN_FAILED,
        AuditAction.UNAUTHORIZED_ACCESS_ATTEMPT,
        AuditAction.PERMISSION_DENIED,
        AuditAction.ROLE_CHANGED,
      ];

      expect(securityEvents.every(event => securityActions.includes(event.action))).toBe(true);
    });
  });

  describe("logRoleChange", () => {
    it("should log role change with proper metadata", async () => {
      const entry = await logRoleChange({
        userId: "admin-1",
        targetUserId: "user-1",
        oldRole: "USER",
        newRole: "EDITOR",
      });

      expect(entry.action).toBe(AuditAction.ROLE_CHANGED);
      expect(entry.severity).toBe(AuditSeverity.CRITICAL);
      expect(entry.userId).toBe("admin-1");
      expect(entry.targetUserId).toBe("user-1");
      expect(entry.metadata).toMatchObject({
        oldRole: "USER",
        newRole: "EDITOR",
      });
      expect(entry.details).toContain("USER");
      expect(entry.details).toContain("EDITOR");
    });
  });

  describe("logUserStatusChange", () => {
    it("should log user activation", async () => {
      const entry = await logUserStatusChange({
        userId: "admin-1",
        targetUserId: "user-1",
        action: "activate",
      });

      expect(entry.action).toBe(AuditAction.USER_ACTIVATED);
      expect(entry.severity).toBe(AuditSeverity.INFO);
    });

    it("should log user deactivation with critical severity", async () => {
      const entry = await logUserStatusChange({
        userId: "admin-1",
        targetUserId: "user-1",
        action: "deactivate",
      });

      expect(entry.action).toBe(AuditAction.USER_DEACTIVATED);
      expect(entry.severity).toBe(AuditSeverity.CRITICAL);
    });
  });

  describe("logAuthentication", () => {
    it("should log login success", async () => {
      const entry = await logAuthentication({
        action: AuditAction.LOGIN_SUCCESS,
        userId: "user-1",
        email: "user@example.com",
        ipAddress: "192.168.1.1",
      });

      expect(entry.action).toBe(AuditAction.LOGIN_SUCCESS);
      expect(entry.userId).toBe("user-1");
      expect(entry.metadata?.email).toBe("user@example.com");
      expect(entry.ipAddress).toBe("192.168.1.1");
    });

    it("should log login failure", async () => {
      const entry = await logAuthentication({
        action: AuditAction.LOGIN_FAILED,
        email: "user@example.com",
        reason: "Invalid credentials",
        ipAddress: "192.168.1.1",
      });

      expect(entry.action).toBe(AuditAction.LOGIN_FAILED);
      expect(entry.metadata?.reason).toBe("Invalid credentials");
    });
  });

  describe("logUnauthorizedAccess", () => {
    it("should log unauthorized access attempts", async () => {
      const entry = await logUnauthorizedAccess({
        userId: "user-1",
        requestedResource: "/admin/users",
        requiredPermission: "MANAGE_USER_ROLES",
        ipAddress: "192.168.1.1",
      });

      expect(entry.action).toBe(AuditAction.UNAUTHORIZED_ACCESS_ATTEMPT);
      expect(entry.severity).toBe(AuditSeverity.ERROR);
      expect(entry.metadata).toMatchObject({
        requestedResource: "/admin/users",
        requiredPermission: "MANAGE_USER_ROLES",
      });
    });
  });
});

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  createMockSession,
  getSession,
  validateSession,
  expireSession,
  signOut,
  countActiveSessions,
  getActiveSessions,
  invalidateAllUserSessions,
  refreshSession,
  clearAllSessions,
  sleep,
} from "@/test/utils/session-helpers";
import { UserRole } from "@/types/auth";

describe("Session Management Integration Tests", () => {
  beforeEach(async () => {
    await clearAllSessions();
  });

  afterEach(async () => {
    await clearAllSessions();
  });

  describe("Test 1: Session creation on successful authentication", () => {
    it("should create valid session with correct user data", async () => {
      // Step 1-2: Authenticate and create session
      const session = await createMockSession({
        user: {
          id: "user-test-1",
          email: "test@example.com",
          role: UserRole.USER,
        },
      });

      // Step 3-4: Verify session exists and has correct email
      expect(session).toBeDefined();
      expect(session.user.email).toBe("test@example.com");

      // Step 5: Verify role
      expect(session.user.role).toBe(UserRole.USER);

      // Step 6: Verify expiration is in future
      expect(session.expires).toBeGreaterThan(Date.now());

      // Step 7: Verify token is defined and long enough
      expect(session.token).toBeDefined();
      expect(session.token.length).toBeGreaterThan(32);
    });
  });

  describe("Test 2: Session persistence across requests", () => {
    it("should maintain same session across multiple requests", async () => {
      // Step 1: Create mock session for user123 with EDITOR role
      const mockSession = await createMockSession({
        user: {
          id: "user123",
          email: "editor@example.com",
          role: UserRole.EDITOR,
        },
      });

      // Step 3-4: Simulate first request - retrieve session
      const retrievedSession1 = await getSession(mockSession.token);
      expect(retrievedSession1).toBeDefined();
      expect(retrievedSession1?.user.id).toBe("user123");

      // Step 5-7: Simulate second request with same token
      const retrievedSession2 = await getSession(mockSession.token);
      expect(retrievedSession2).toBeDefined();
      expect(retrievedSession2?.user.id).toBe("user123");
      expect(retrievedSession2?.user.role).toBe(UserRole.EDITOR);

      // Step 8-9: Verify no session duplication
      const sessionCount = await countActiveSessions("user123");
      expect(sessionCount).toBe(1);
    });
  });

  describe("Test 3: Session expiration handling", () => {
    it("should invalidate session after expiration time", async () => {
      // Step 1: Create session with short expiration (100ms)
      const session = await createMockSession({
        user: {
          id: "user-expiry-test",
          email: "expiry@example.com",
        },
        expiresIn: 100,
      });

      // Step 2: Validate session - should be valid
      const isValid1 = await validateSession(session.token);
      expect(isValid1).toBe(true);

      // Step 3: Wait past expiration
      await sleep(150);

      // Step 4: Validate again - should be invalid
      const isValid2 = await validateSession(session.token);
      expect(isValid2).toBe(false);

      // Step 5: Attempt to retrieve expired session - should return null
      const expiredSession = await getSession(session.token);
      expect(expiredSession).toBeNull();
    });
  });

  describe("Test 4: Session refresh on activity", () => {
    it("should extend session expiration on activity", async () => {
      // Step 1: Create session with 1 hour expiration
      const session = await createMockSession({
        user: {
          id: "user-refresh-test",
          email: "refresh@example.com",
        },
        expiresIn: 3600000,
      });

      // Step 2: Store original expiry
      const originalExpiry = session.expires;

      // Step 3: Sleep to simulate time passing
      await sleep(50);

      // Step 6: Refresh session (simulates activity)
      const refreshedSession = await refreshSession(session.token);

      // Step 7: Verify expiration extended
      expect(refreshedSession).toBeDefined();
      expect(refreshedSession!.expires).toBeGreaterThan(originalExpiry);
    });
  });

  describe("Test 5: Concurrent sessions for same user", () => {
    it("should allow multiple active sessions per user", async () => {
      // Step 1: Create first session for user999
      const session1 = await createMockSession({
        user: {
          id: "user999",
          email: "multi@example.com",
          device: "browser-1",
        },
      });

      // Step 2: Create second session for user999
      const session2 = await createMockSession({
        user: {
          id: "user999",
          email: "multi@example.com",
          device: "browser-2",
        },
      });

      // Step 3: Verify both sessions active
      const sessionCount = await countActiveSessions("user999");
      expect(sessionCount).toBe(2);

      // Step 4: Sign out from session1
      await signOut(session1.token);

      // Step 5: Validate session1 - should be false
      const isValid1 = await validateSession(session1.token);
      expect(isValid1).toBe(false);

      // Step 6: Validate session2 - should still be true
      const isValid2 = await validateSession(session2.token);
      expect(isValid2).toBe(true);

      // Step 7: Verify count reduced to 1
      const updatedCount = await countActiveSessions("user999");
      expect(updatedCount).toBe(1);
    });
  });

  describe("Test 6: Session invalidation on password change", () => {
    it("should invalidate all sessions when password changes", async () => {
      const userId = "user-password-change";

      // Step 1-2: Create session
      const session = await createMockSession({
        user: {
          id: userId,
          email: "change@example.com",
        },
      });

      // Step 3: Validate session - should be valid
      const isValid1 = await validateSession(session.token);
      expect(isValid1).toBe(true);

      // Step 4-5: Simulate password change - invalidate all sessions
      await invalidateAllUserSessions(userId);

      // Verify session invalidated
      const isValid2 = await validateSession(session.token);
      expect(isValid2).toBe(false);

      // Step 6-7: Create new session (simulate new login with new password)
      const newSession = await createMockSession({
        user: {
          id: userId,
          email: "change@example.com",
        },
      });

      expect(newSession).toBeDefined();
      expect(newSession.token).not.toBe(session.token);
    });
  });

  describe("Test 7: Session storage cleanup on logout", () => {
    it("should completely remove session data on logout", async () => {
      // Step 1: Create session with custom data
      const session = await createMockSession({
        user: {
          id: "cleanup-user",
          email: "cleanup@example.com",
        },
        data: {
          preferences: {
            theme: "dark",
          },
        },
      });

      // Step 2: Verify session exists
      const retrievedBefore = await getSession(session.token);
      expect(retrievedBefore).toBeDefined();
      expect(retrievedBefore?.data?.preferences?.theme).toBe("dark");

      // Step 3: Sign out
      await signOut(session.token);

      // Step 4-5: Verify session and data are gone
      const retrievedAfter = await getSession(session.token);
      expect(retrievedAfter).toBeNull();
    });
  });

  describe("Additional Edge Cases", () => {
    it("should handle session token replay attempts", async () => {
      const session = await createMockSession({
        user: {
          id: "replay-test",
          email: "replay@example.com",
        },
      });

      // Sign out (invalidate session)
      await signOut(session.token);

      // Attempt to use same token again
      const isValid = await validateSession(session.token);
      expect(isValid).toBe(false);
    });

    it("should handle retrieving non-existent session", async () => {
      const result = await getSession("non-existent-token");
      expect(result).toBeNull();
    });

    it("should allow multiple sessions from different devices", async () => {
      const userId = "multi-device-user";

      await createMockSession({
        user: { id: userId, device: "chrome-desktop" },
      });

      await createMockSession({
        user: { id: userId, device: "firefox-mobile" },
      });

      await createMockSession({
        user: { id: userId, device: "safari-tablet" },
      });

      const sessions = await getActiveSessions(userId);
      expect(sessions).toHaveLength(3);

      // Verify different devices
      const devices = sessions.map(s => s.device);
      expect(devices).toContain("chrome-desktop");
      expect(devices).toContain("firefox-mobile");
      expect(devices).toContain("safari-tablet");
    });
  });
});

function generateSessionToken(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";

  for (let i = 0; i < 64; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return token;
}

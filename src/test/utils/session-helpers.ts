import { UserRole } from "@/types/auth";

export interface SessionConfig {
  user: {
    id: string;
    email?: string;
    role?: UserRole;
    device?: string;
  };
  expiresIn?: number;
  data?: any;
}

export interface Session {
  id: string;
  token: string;
  user: {
    id: string;
    email: string;
    role: UserRole;
  };
  expires: number;
  data?: any;
  device?: string;
}

// In-memory session store for testing
const sessionStore = new Map<string, Session>();

export async function createMockSession(config: SessionConfig): Promise<Session> {
  const token = generateSessionToken();
  const expiresIn = config.expiresIn || 3600000; // Default 1 hour

  const session: Session = {
    id: `session-${Date.now()}-${Math.random()}`,
    token,
    user: {
      id: config.user.id,
      email: config.user.email || `${config.user.id}@example.com`,
      role: config.user.role || UserRole.USER,
    },
    expires: Date.now() + expiresIn,
    data: config.data,
    device: config.user.device,
  };

  sessionStore.set(token, session);
  return session;
}

export async function getSession(tokenOrId: string): Promise<Session | null> {
  // Try by token first
  let session = sessionStore.get(tokenOrId);

  if (!session) {
    // Try by session ID
    for (const [, sess] of sessionStore) {
      if (sess.id === tokenOrId) {
        session = sess;
        break;
      }
    }
  }

  // Check if expired
  if (session && session.expires < Date.now()) {
    sessionStore.delete(session.token);
    return null;
  }

  return session || null;
}

export async function validateSession(token: string): Promise<boolean> {
  const session = await getSession(token);
  return session !== null && session.expires > Date.now();
}

export async function expireSession(tokenOrId: string): Promise<void> {
  const session = await getSession(tokenOrId);

  if (session) {
    session.expires = Date.now() - 1000; // Set to past
  }
}

export async function signOut(token: string): Promise<void> {
  sessionStore.delete(token);
}

export async function countActiveSessions(userId: string): Promise<number> {
  let count = 0;
  const now = Date.now();

  for (const [, session] of sessionStore) {
    if (session.user.id === userId && session.expires > now) {
      count++;
    }
  }

  return count;
}

export async function getActiveSessions(userId: string): Promise<Session[]> {
  const sessions: Session[] = [];
  const now = Date.now();

  for (const [, session] of sessionStore) {
    if (session.user.id === userId && session.expires > now) {
      sessions.push(session);
    }
  }

  return sessions;
}

export async function invalidateAllUserSessions(userId: string): Promise<void> {
  for (const [token, session] of sessionStore) {
    if (session.user.id === userId) {
      sessionStore.delete(token);
    }
  }
}

export async function refreshSession(token: string): Promise<Session | null> {
  const session = await getSession(token);

  if (session) {
    // Extend expiration by 1 hour
    session.expires = Date.now() + 3600000;
    return session;
  }

  return null;
}

export async function clearAllSessions(): Promise<void> {
  sessionStore.clear();
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Helper to generate secure session token
function generateSessionToken(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";

  for (let i = 0; i < 64; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return token;
}

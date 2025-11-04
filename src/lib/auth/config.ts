import Credentials from "next-auth/providers/credentials";
import Discord from "next-auth/providers/discord";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";

import { getRolePermissions } from "@/lib/auth/permissions";
import { getUserById, createUser, updateUser, getUserByEmail } from "@/lib/auth/user-service";
import type { UserRole, Permission } from "@/types/auth";

import type { NextAuthConfig, Session, User as NextAuthUser } from "next-auth";
import type { JWT } from "next-auth/jwt";

export const config = {
  pages: {
    signIn: "/login",
    signOut: "/auth/signout",
    error: "/auth/error",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // Mock credentials for testing
        const testCredentials = {
          "admin@example.com": { password: "adminuser123", role: "ADMIN" as UserRole },
          "editor@example.com": { password: "editoruser123", role: "EDITOR" as UserRole },
          "test@example.com": { password: "testuser123", role: "USER" as UserRole },
        };

        const email = credentials.email as string;
        const password = credentials.password as string;

        // Check against mock credentials
        const testCred = testCredentials[email as keyof typeof testCredentials];
        if (testCred && testCred.password === password) {
          // Check if user exists in mock database
          let user = await getUserByEmail(email);

          if (!user) {
            // Create user if doesn't exist
            const newUserId = Date.now().toString();
            const usernameBase = email.split("@")[0] || "user";
            await createUser({
              id: newUserId,
              email,
              name: usernameBase.charAt(0).toUpperCase() + usernameBase.slice(1),
              image: null,
              username: usernameBase,
              role: testCred.role,
              provider: "credentials",
              providerId: newUserId,
              isActive: true,
              emailVerified: true,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
            user = await getUserByEmail(email);
          }

          if (user) {
            return {
              id: user.id,
              email: user.email,
              name: user.name,
              image: user.image,
              username: user.username,
            };
          }
        }

        return null;
      },
    }),
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      profile(profile) {
        return {
          id: profile.id.toString(),
          name: profile.name || profile.login,
          email: profile.email,
          image: profile.avatar_url,
          username: profile.login,
        };
      },
    }),
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
        };
      },
    }),
    Discord({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
      profile(profile) {
        return {
          id: profile.id,
          name: profile.global_name ?? profile.username,
          email: profile.email,
          image: `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`,
          username: profile.username,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      try {
        if (!user.email) {
          console.error("No email provided by OAuth provider");
          return false;
        }

        // Check if user exists in database
        const existingUser = await getUserById(user.id!);

        if (!existingUser) {
          // Create new user with default role
          await createUser({
            id: user.id!,
            email: user.email,
            name: user.name ?? null,
            image: user.image ?? null,
            username: (user as any).username,
            role: "USER" as UserRole,
            provider: account?.provider ?? null,
            providerId: user.id!,
            isActive: true,
            emailVerified: !!user.email,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        } else {
          // Update existing user info
          await updateUser(existingUser.id, {
            name: user.name ?? null,
            image: user.image ?? null,
            username: (user as any).username,
            lastLoginAt: new Date(),
            updatedAt: new Date(),
          });
        }

        return true;
      } catch (error) {
        console.error("SignIn callback error:", error);
        return false;
      }
    },

    async jwt({ token, user, account }: { token: JWT; user?: NextAuthUser; account?: any }) {
      // Initial sign in
      if (user) {
        const dbUser = await getUserById(user.id!);
        if (dbUser) {
          token.role = dbUser.role;
          token.permissions = await getRolePermissions(dbUser.role);
          token.userId = dbUser.id;
          token.username = dbUser.username;
          token.isActive = dbUser.isActive;
        }
      }

      // Return previous token if the access token has not expired yet
      return token;
    },

    async session({ session, token }: { session: Session; token: JWT }) {
      if (token && session.user) {
        session.user.id = token.userId as string;
        session.user.role = token.role as UserRole;
        session.user.permissions = token.permissions as Permission[];
        session.user.username = token.username as string;
        session.user.isActive = token.isActive as boolean;
      }
      return session;
    },

    async redirect({ url, baseUrl }) {
      // Allows relative callback URLs
      if (url.startsWith("/")) {
        return `${baseUrl}${url}`;
      }
      // Allows callback URLs on the same origin
      else if (new URL(url).origin === baseUrl) {
        return url;
      }
      return baseUrl;
    },
  },
  session: {
    strategy: "jwt" as const,
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
  },
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.AUTH_SECRET!,
  debug: process.env.NODE_ENV === "development",
  trustHost: true,
} satisfies NextAuthConfig;

export default config;

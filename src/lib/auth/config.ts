import { NextAuthConfig } from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import Discord from "next-auth/providers/discord";
import { JWT } from "next-auth/jwt";
import { Session, User as NextAuthUser } from "next-auth";
import { UserRole, Permission, User } from "@/types/auth";
import { getUserById, createUser, updateUser } from "@/lib/auth/user-service";
import { getRolePermissions } from "@/lib/auth/permissions";

export const config = {
  pages: {
    signIn: "/login",
    signOut: "/auth/signout",
    error: "/auth/error",
  },
  providers: [
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
        let existingUser = await getUserById(user.id!);

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
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      // Allows callback URLs on the same origin
      else if (new URL(url).origin === baseUrl) return url;
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

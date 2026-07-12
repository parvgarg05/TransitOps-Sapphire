/**
 * Auth.js (NextAuth) Configuration
 * 
 * This module configures Auth.js with:
 * - Credentials provider for email/password authentication
 * - JWT session strategy
 * - Custom authorize function with hashing, lockout, and generic-rejection logic
 * 
 * Requirements: 1.1, 1.2, 1.5, 1.6
 */

import { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/db";
import { validateCredentials, GENERIC_AUTH_ERROR } from "@/domain/loginPolicy";
import { verifyPassword } from "@/domain/password";
import { computeLockoutState, LOCKOUT_CONFIG, LoginAttempt } from "@/domain/lockout";
import type { Role } from "@/domain/types";

/**
 * Maps the persisted role identifier (e.g. "FLEET_MANAGER") to the canonical
 * domain Role string (e.g. "Fleet Manager") used across the RBAC matrix,
 * dashboard default-view mapping, and the rest of the domain layer.
 *
 * Accepts either the enum-style name or the already-canonical name so the app
 * is resilient to how roles were seeded.
 */
export function normalizeRole(name: string): Role | null {
  const map: Record<string, Role> = {
    FLEET_MANAGER: "Fleet Manager",
    DRIVER: "Driver",
    SAFETY_OFFICER: "Safety Officer",
    FINANCIAL_ANALYST: "Financial Analyst",
    "Fleet Manager": "Fleet Manager",
    Driver: "Driver",
    "Safety Officer": "Safety Officer",
    "Financial Analyst": "Financial Analyst",
  };
  return map[name] ?? null;
}

/**
 * Auth.js configuration
 * 
 * Requirement 1.1: Secure login using email and password
 * Requirement 1.2: Generic authentication error message
 * Requirement 1.5: Role-Based Access Control (RBAC)
 * Requirement 1.6: Account lockout for 5 consecutive failures
 */
export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        // Ensure credentials are provided
        if (!credentials?.email || !credentials?.password) {
          throw new Error(GENERIC_AUTH_ERROR);
        }

        const { email, password } = credentials;

        // Step 1: Validate credential format (Req 1.8)
        const validationResult = validateCredentials(email, password);
        if (!validationResult.ok) {
          throw new Error(validationResult.error);
        }

        // Step 2: Look up user by email
        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase() },
          include: { role: true },
        });

        // If user doesn't exist, return generic error (Req 1.2)
        if (!user) {
          throw new Error(GENERIC_AUTH_ERROR);
        }

        // Step 3: Build attempt timeline for lockout check
        // For this implementation, we'll use the failedAttempts count and lockedUntil
        // stored in the database to compute lockout state
        const now = new Date();
        
        // Check if account is currently locked
        if (user.lockedUntil && user.lockedUntil > now) {
          const minutesRemaining = Math.ceil(
            (user.lockedUntil.getTime() - now.getTime()) / (60 * 1000)
          );
          throw new Error(
            `Account is temporarily locked due to multiple failed login attempts. Please try again in ${minutesRemaining} minute${minutesRemaining !== 1 ? 's' : ''}.`
          );
        }

        // Step 4: Verify password hash (Req 1.4)
        const isPasswordValid = await verifyPassword(password, user.passwordHash);

        if (!isPasswordValid) {
          // Increment failed attempts
          const newFailedAttempts = user.failedAttempts + 1;
          
          // Check if this failure triggers a lockout (Req 1.6)
          let updateData: { failedAttempts: number; lockedUntil?: Date } = {
            failedAttempts: newFailedAttempts,
          };

          if (newFailedAttempts >= LOCKOUT_CONFIG.MAX_CONSECUTIVE_FAILURES) {
            // Lock the account for 15 minutes
            updateData.lockedUntil = new Date(
              now.getTime() + LOCKOUT_CONFIG.LOCKOUT_DURATION_MINUTES * 60 * 1000
            );
          }

          // Update user record with failed attempt
          await prisma.user.update({
            where: { id: user.id },
            data: updateData,
          });

          // Return generic error (Req 1.2)
          throw new Error(GENERIC_AUTH_ERROR);
        }

        // Step 5: Password is correct - reset failed attempts and lockout
        await prisma.user.update({
          where: { id: user.id },
          data: {
            failedAttempts: 0,
            lockedUntil: null,
            lastActivityAt: now,
          },
        });

        // Step 6: Return user with the canonical domain role for the session
        // (Req 1.5). Normalizing here keeps RBAC + dashboard mapping consistent.
        return {
          id: user.id,
          email: user.email,
          role: normalizeRole(user.role.name) ?? user.role.name,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      // On initial sign in, add user data to token
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.role = user.role;
      }
      // Stamp a rolling activity timestamp so middleware can enforce the
      // 30-minute idle timeout (Req 1.7). This is refreshed each time the
      // session is re-issued (client session polling / navigation).
      token.lastActivity = Date.now();
      return token;
    },
    async session({ session, token }) {
      // Add user data from token to session
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
};

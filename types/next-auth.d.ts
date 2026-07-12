/**
 * Type declarations for NextAuth
 * 
 * Extends the default NextAuth types to include our custom user properties
 * (id, email, role) in the session and JWT token.
 */

import { DefaultSession, DefaultUser } from "next-auth";
import { DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  /**
   * Extend the User type returned by the authorize function
   */
  interface User extends DefaultUser {
    id: string;
    email: string;
    role: string;
  }

  /**
   * Extend the Session type to include custom user properties
   */
  interface Session {
    user: {
      id: string;
      email: string;
      role: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  /**
   * Extend the JWT token type to include custom properties
   */
  interface JWT extends DefaultJWT {
    id: string;
    email: string;
    role: string;
  }
}

/**
 * NextAuth API Route Handler (App Router)
 * 
 * This route handles all Auth.js endpoints:
 * - POST /api/auth/signin - Login
 * - POST /api/auth/signout - Logout
 * - GET /api/auth/session - Get current session
 * - GET /api/auth/csrf - CSRF token
 * - GET /api/auth/providers - Available providers
 * 
 * Requirements: 1.1, 1.2, 1.5, 1.6
 */

import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };

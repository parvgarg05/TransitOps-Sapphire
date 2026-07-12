/**
 * Auth + RBAC Middleware
 * 
 * This middleware:
 * 1. Verifies the session exists
 * 2. Checks idle timeout (30 minutes)
 * 3. Redirects unauthenticated app requests to /login
 * 4. Returns 401 for unauthenticated API requests
 * 5. Checks RBAC permissions using can(role, action)
 * 6. Returns 403 with no data change on permission denial
 * 
 * Requirements: 1.3, 1.7, 2.2, 2.3, 2.4
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { isSessionExpired } from "./domain/session";
import { can, type Action } from "./domain/rbac";
import type { Role } from "./domain/types";

// ============================================================================
// Route Configuration
// ============================================================================

/**
 * Public routes that don't require authentication.
 * These routes are accessible without a session.
 */
const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/api/auth/login",
  "/api/auth/logout",
];

/**
 * API auth routes that should bypass middleware.
 * These are handled by the auth provider.
 */
const AUTH_API_ROUTES = [
  "/api/auth/",
];

/**
 * Static asset patterns that should bypass middleware.
 */
const STATIC_PATTERNS = [
  "/_next/",
  "/favicon.ico",
  "/public/",
];

// ============================================================================
// Route-to-Action Mapping
// ============================================================================

/**
 * Maps route patterns to required RBAC actions.
 * Used to determine which permission is required for each route.
 */
const ROUTE_ACTIONS: Array<{ pattern: RegExp; action: Action }> = [
  // Vehicle routes
  { pattern: /^\/api\/vehicles\/create$/i, action: "vehicle:create" },
  { pattern: /^\/api\/vehicles\/\w+\/update$/i, action: "vehicle:update" },
  { pattern: /^\/api\/vehicles\/\w+\/retire$/i, action: "vehicle:retire" },
  { pattern: /^\/api\/vehicles/i, action: "vehicle:read" },
  { pattern: /^\/vehicles/i, action: "vehicle:read" },

  // Maintenance routes
  { pattern: /^\/api\/maintenance\/open$/i, action: "maintenance:open" },
  { pattern: /^\/api\/maintenance\/\w+\/close$/i, action: "maintenance:close" },
  { pattern: /^\/api\/maintenance\/\w+\/record-cost$/i, action: "maintenance:record-cost" },
  { pattern: /^\/maintenance/i, action: "maintenance:open" },

  // Driver routes
  { pattern: /^\/api\/drivers\/\w+\/update-compliance$/i, action: "driver:update-compliance" },
  { pattern: /^\/api\/drivers/i, action: "driver:read" },
  { pattern: /^\/drivers/i, action: "driver:read" },

  // Financial routes
  { pattern: /^\/api\/fuel/i, action: "fuel:read" },
  { pattern: /^\/api\/expenses/i, action: "expense:read" },
  { pattern: /^\/api\/analytics/i, action: "analytics:read" },
  { pattern: /^\/api\/operational-cost/i, action: "operational-cost:read" },
  { pattern: /^\/fuel/i, action: "fuel:read" },
  { pattern: /^\/expenses/i, action: "expense:read" },
  { pattern: /^\/analytics/i, action: "analytics:read" },

  // Trip routes
  { pattern: /^\/api\/trips\/create$/i, action: "trip:create" },
  { pattern: /^\/api\/trips\/\w+\/assign$/i, action: "trip:assign" },
  { pattern: /^\/api\/trips/i, action: "trip:read" },
  { pattern: /^\/trips/i, action: "trip:read" },

  // Dashboard routes
  { pattern: /^\/dashboard/i, action: "dashboard:view" },
];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Checks if a route is public (doesn't require authentication).
 */
function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) => pathname === route) ||
         AUTH_API_ROUTES.some((route) => pathname.startsWith(route)) ||
         STATIC_PATTERNS.some((pattern) => pathname.startsWith(pattern));
}

/**
 * Checks if a route is an API route.
 */
function isApiRoute(pathname: string): boolean {
  return pathname.startsWith("/api/");
}

/**
 * Determines the required action for a given route.
 * Returns null if no specific action is required (e.g., public routes).
 */
function getRequiredAction(pathname: string): Action | null {
  for (const { pattern, action } of ROUTE_ACTIONS) {
    if (pattern.test(pathname)) {
      return action;
    }
  }
  return null;
}

/**
 * Session data extracted from the NextAuth JWT.
 */
interface SessionInfo {
  userId: string;
  role: Role;
  lastActivityAt: Date;
}

/**
 * Reads and verifies the NextAuth JWT from the request.
 *
 * The token is issued by Auth.js (see lib/auth.ts) and carries the user id,
 * role, and a rolling `lastActivity` timestamp used for idle-timeout checks.
 */
async function getSessionFromToken(
  request: NextRequest
): Promise<SessionInfo | null> {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token || !token.role) {
    return null;
  }

  // `lastActivity` is stamped (ms since epoch) by the jwt callback; fall back to
  // the token issued-at (`iat`, seconds) when absent.
  const lastActivityMs =
    typeof token.lastActivity === "number"
      ? token.lastActivity
      : typeof token.iat === "number"
        ? token.iat * 1000
        : Date.now();

  return {
    userId: (token.id as string) ?? (token.sub as string) ?? "",
    role: token.role as Role,
    lastActivityAt: new Date(lastActivityMs),
  };
}

// ============================================================================
// Middleware Function
// ============================================================================

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Step 1: Allow public routes to pass through
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // Step 2: Verify a valid NextAuth session exists
  const session = await getSessionFromToken(request);

  if (!session) {
    // No session: redirect app pages to /login, return 401 for API
    if (isApiRoute(pathname)) {
      return NextResponse.json(
        { error: "Unauthorized: No session found" },
        { status: 401 }
      );
    }

    // Redirect to login with no page content
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Step 3: Check idle timeout (Requirement 1.7)
  const now = new Date();
  if (isSessionExpired(session.lastActivityAt, now)) {
    if (isApiRoute(pathname)) {
      return NextResponse.json(
        { error: "Unauthorized: Session expired due to inactivity" },
        { status: 401 }
      );
    }
    return NextResponse.redirect(new URL("/login?expired=true", request.url));
  }

  // Step 4: Check RBAC permissions (Requirements 2.2, 2.3, 2.4)
  const requiredAction = getRequiredAction(pathname);

  if (requiredAction && !can(session.role, requiredAction)) {
    // Not authorized: return 403 with no data change
    if (isApiRoute(pathname)) {
      return NextResponse.json(
        {
          error: "Forbidden: Insufficient permissions",
          required: requiredAction,
          role: session.role,
        },
        { status: 403 }
      );
    }

    // For app pages, redirect to the dashboard with a forbidden flag. If the
    // role cannot even view the dashboard (would loop), send them to /login.
    const fallback =
      can(session.role, "dashboard:view") &&
      !pathname.startsWith("/dashboard")
        ? "/dashboard?error=forbidden"
        : "/login?error=forbidden";
    return NextResponse.redirect(new URL(fallback, request.url));
  }

  // Step 5: Session is valid and authorized - continue
  return NextResponse.next();
}

// ============================================================================
// Middleware Configuration
// ============================================================================

/**
 * Configure which routes the middleware should run on.
 * Excludes static files and certain Next.js internal routes.
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|public/).*)",
  ],
};

/**
 * Middleware Tests
 *
 * Tests for Auth + RBAC middleware functionality:
 * - Session verification (via NextAuth JWT / getToken)
 * - Idle timeout enforcement
 * - Unauthenticated request handling
 * - RBAC permission checks
 *
 * Requirements: 1.3, 1.7, 2.2, 2.3, 2.4
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "../middleware";
import type { Role } from "../domain/types";

// Mock the domain modules
vi.mock("../domain/session", () => ({
  isSessionExpired: vi.fn(),
}));

vi.mock("../domain/rbac", () => ({
  can: vi.fn(),
}));

// Mock NextAuth's getToken - the middleware reads the session from the JWT.
vi.mock("next-auth/jwt", () => ({
  getToken: vi.fn(),
}));

import { isSessionExpired } from "../domain/session";
import { can } from "../domain/rbac";
import { getToken } from "next-auth/jwt";

interface SessionData {
  userId: string;
  role: Role;
  lastActivityAt: string;
}

describe("Auth + RBAC Middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: no authenticated session.
    vi.mocked(getToken).mockResolvedValue(null);
  });

  // Build a mock NextRequest for a given path.
  function createRequest(pathname: string): NextRequest {
    return new NextRequest(`http://localhost:3000${pathname}`);
  }

  // Configure getToken to return a JWT for the given session data.
  function authenticateAs(sessionData: SessionData): void {
    vi.mocked(getToken).mockResolvedValue({
      id: sessionData.userId,
      sub: sessionData.userId,
      email: "user@example.com",
      role: sessionData.role,
      lastActivity: new Date(sessionData.lastActivityAt).getTime(),
    } as never);
  }

  describe("Public Routes", () => {
    it("should allow access to /login without session", async () => {
      const response = await middleware(createRequest("/login"));
      expect(response).toBeDefined();
      expect(response.status).not.toBe(401);
      expect(response.status).not.toBe(403);
    });

    it("should allow access to /api/auth/login without session", async () => {
      const response = await middleware(createRequest("/api/auth/login"));
      expect(response).toBeDefined();
      expect(response.status).not.toBe(401);
      expect(response.status).not.toBe(403);
    });

    it("should allow access to /api/auth/logout without session", async () => {
      const response = await middleware(createRequest("/api/auth/logout"));
      expect(response).toBeDefined();
      expect(response.status).not.toBe(401);
      expect(response.status).not.toBe(403);
    });

    it("should allow access to static assets without session", async () => {
      const response = await middleware(createRequest("/_next/static/chunk.js"));
      expect(response).toBeDefined();
      expect(response.status).not.toBe(401);
      expect(response.status).not.toBe(403);
    });
  });

  describe("Session Verification", () => {
    it("should redirect to /login for app pages without session", async () => {
      const response = await middleware(createRequest("/dashboard"));

      expect(response).toBeDefined();
      expect(response.status).toBe(307); // Temporary redirect
      expect(response.headers.get("location")).toContain("/login");
      expect(response.headers.get("location")).toContain(
        "redirect=%2Fdashboard"
      );
    });

    it("should return 401 for API routes without session", async () => {
      const response = await middleware(createRequest("/api/vehicles"));

      expect(response).toBeDefined();
      expect(response.status).toBe(401);
    });
  });

  describe("Idle Timeout (Requirement 1.7)", () => {
    it("should redirect to /login if session expired due to inactivity", async () => {
      authenticateAs({
        userId: "user-1",
        role: "Fleet Manager",
        lastActivityAt: new Date(Date.now() - 31 * 60 * 1000).toISOString(),
      });

      vi.mocked(isSessionExpired).mockReturnValue(true);

      const response = await middleware(createRequest("/dashboard"));

      expect(isSessionExpired).toHaveBeenCalled();
      expect(response.status).toBe(307); // Redirect
      expect(response.headers.get("location")).toContain("/login");
      expect(response.headers.get("location")).toContain("expired=true");
    });

    it("should return 401 for API routes if session expired", async () => {
      authenticateAs({
        userId: "user-1",
        role: "Fleet Manager",
        lastActivityAt: new Date(Date.now() - 31 * 60 * 1000).toISOString(),
      });

      vi.mocked(isSessionExpired).mockReturnValue(true);

      const response = await middleware(createRequest("/api/vehicles"));

      expect(response.status).toBe(401);
    });

    it("should allow access if session is not expired", async () => {
      authenticateAs({
        userId: "user-1",
        role: "Fleet Manager",
        lastActivityAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      });

      vi.mocked(isSessionExpired).mockReturnValue(false);
      vi.mocked(can).mockReturnValue(true);

      const response = await middleware(createRequest("/dashboard"));

      expect(isSessionExpired).toHaveBeenCalled();
      expect(response.status).not.toBe(401);
      expect(response.status).not.toBe(307);
    });
  });

  describe("RBAC Permission Checks (Requirements 2.2, 2.3, 2.4)", () => {
    it("should allow access when user has required permissions", async () => {
      authenticateAs({
        userId: "user-1",
        role: "Fleet Manager",
        lastActivityAt: new Date().toISOString(),
      });

      vi.mocked(isSessionExpired).mockReturnValue(false);
      vi.mocked(can).mockReturnValue(true); // Has permission

      const response = await middleware(createRequest("/api/vehicles"));

      expect(can).toHaveBeenCalledWith("Fleet Manager", "vehicle:read");
      expect(response.status).not.toBe(403);
    });

    it("should return 403 for API routes when user lacks permissions", async () => {
      authenticateAs({
        userId: "user-1",
        role: "Driver",
        lastActivityAt: new Date().toISOString(),
      });

      vi.mocked(isSessionExpired).mockReturnValue(false);
      vi.mocked(can).mockReturnValue(false); // No permission

      const response = await middleware(createRequest("/api/vehicles/create"));

      expect(can).toHaveBeenCalledWith("Driver", "vehicle:create");
      expect(response.status).toBe(403);
    });

    it("should redirect to dashboard for app pages when user lacks permissions", async () => {
      authenticateAs({
        userId: "user-1",
        role: "Driver",
        lastActivityAt: new Date().toISOString(),
      });

      vi.mocked(isSessionExpired).mockReturnValue(false);
      vi.mocked(can).mockReturnValue(false);

      const response = await middleware(createRequest("/vehicles"));

      expect(response.status).toBe(307); // Redirect
      expect(response.headers.get("location")).toContain("/dashboard");
      expect(response.headers.get("location")).toContain("error=forbidden");
    });

    it("should check vehicle:create permission for POST /api/vehicles/create", async () => {
      authenticateAs({
        userId: "user-1",
        role: "Fleet Manager",
        lastActivityAt: new Date().toISOString(),
      });

      vi.mocked(isSessionExpired).mockReturnValue(false);
      vi.mocked(can).mockReturnValue(true);

      await middleware(createRequest("/api/vehicles/create"));

      expect(can).toHaveBeenCalledWith("Fleet Manager", "vehicle:create");
    });

    it("should check maintenance:open permission for maintenance routes", async () => {
      authenticateAs({
        userId: "user-1",
        role: "Fleet Manager",
        lastActivityAt: new Date().toISOString(),
      });

      vi.mocked(isSessionExpired).mockReturnValue(false);
      vi.mocked(can).mockReturnValue(true);

      await middleware(createRequest("/api/maintenance/open"));

      expect(can).toHaveBeenCalledWith("Fleet Manager", "maintenance:open");
    });

    it("should check trip:create permission for trip creation", async () => {
      authenticateAs({
        userId: "user-1",
        role: "Driver",
        lastActivityAt: new Date().toISOString(),
      });

      vi.mocked(isSessionExpired).mockReturnValue(false);
      vi.mocked(can).mockReturnValue(true);

      await middleware(createRequest("/api/trips/create"));

      expect(can).toHaveBeenCalledWith("Driver", "trip:create");
    });

    it("should check dashboard:view permission for dashboard access", async () => {
      authenticateAs({
        userId: "user-1",
        role: "Financial Analyst",
        lastActivityAt: new Date().toISOString(),
      });

      vi.mocked(isSessionExpired).mockReturnValue(false);
      vi.mocked(can).mockReturnValue(true);

      await middleware(createRequest("/dashboard"));

      expect(can).toHaveBeenCalledWith("Financial Analyst", "dashboard:view");
    });
  });

  describe("Route-to-Action Mapping", () => {
    const testCases: Array<{
      route: string;
      expectedAction: string;
      role: Role;
      shouldAllow: boolean;
    }> = [
      { route: "/api/vehicles", expectedAction: "vehicle:read", role: "Fleet Manager", shouldAllow: true },
      { route: "/api/vehicles/create", expectedAction: "vehicle:create", role: "Fleet Manager", shouldAllow: true },
      { route: "/api/vehicles/create", expectedAction: "vehicle:create", role: "Driver", shouldAllow: false },
      { route: "/api/drivers", expectedAction: "driver:read", role: "Safety Officer", shouldAllow: true },
      { route: "/api/drivers", expectedAction: "driver:read", role: "Driver", shouldAllow: false },
      { route: "/api/trips/create", expectedAction: "trip:create", role: "Driver", shouldAllow: true },
      { route: "/api/trips/create", expectedAction: "trip:create", role: "Financial Analyst", shouldAllow: false },
      { route: "/api/fuel", expectedAction: "fuel:read", role: "Financial Analyst", shouldAllow: true },
      { route: "/api/fuel", expectedAction: "fuel:read", role: "Driver", shouldAllow: false },
    ];

    testCases.forEach(({ route, role, shouldAllow }) => {
      it(`should ${shouldAllow ? "allow" : "deny"} ${role} access to ${route}`, async () => {
        authenticateAs({
          userId: "user-1",
          role,
          lastActivityAt: new Date().toISOString(),
        });

        vi.mocked(isSessionExpired).mockReturnValue(false);
        vi.mocked(can).mockReturnValue(shouldAllow);

        const response = await middleware(createRequest(route));

        if (shouldAllow) {
          expect(response.status).not.toBe(403);
        } else {
          expect(response.status).toBe(403);
        }
      });
    });
  });
});

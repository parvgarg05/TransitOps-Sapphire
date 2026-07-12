/**
 * Middleware Tests
 * 
 * Tests for Auth + RBAC middleware functionality:
 * - Session verification
 * - Idle timeout enforcement
 * - Unauthenticated request handling
 * - RBAC permission checks
 * 
 * Requirements: 1.3, 1.7, 2.2, 2.3, 2.4
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { middleware } from "../middleware";
import type { Role } from "../domain/types";

// Mock the domain modules
vi.mock("../domain/session", () => ({
  isSessionExpired: vi.fn(),
}));

vi.mock("../domain/rbac", () => ({
  can: vi.fn(),
}));

import { isSessionExpired } from "../domain/session";
import { can } from "../domain/rbac";

describe("Auth + RBAC Middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Helper to create a mock NextRequest
  function createRequest(
    pathname: string,
    sessionData?: { userId: string; role: Role; lastActivityAt: string }
  ): NextRequest {
    const url = `http://localhost:3000${pathname}`;
    const request = new NextRequest(url);

    if (sessionData) {
      // Set session cookie
      request.cookies.set("session", JSON.stringify(sessionData));
    }

    return request;
  }

  describe("Public Routes", () => {
    it("should allow access to /login without session", () => {
      const request = createRequest("/login");
      const response = middleware(request);

      expect(response).toBeDefined();
      expect(response.status).not.toBe(401);
      expect(response.status).not.toBe(403);
    });

    it("should allow access to /api/auth/login without session", () => {
      const request = createRequest("/api/auth/login");
      const response = middleware(request);

      expect(response).toBeDefined();
      expect(response.status).not.toBe(401);
      expect(response.status).not.toBe(403);
    });

    it("should allow access to /api/auth/logout without session", () => {
      const request = createRequest("/api/auth/logout");
      const response = middleware(request);

      expect(response).toBeDefined();
      expect(response.status).not.toBe(401);
      expect(response.status).not.toBe(403);
    });

    it("should allow access to static assets without session", () => {
      const request = createRequest("/_next/static/chunk.js");
      const response = middleware(request);

      expect(response).toBeDefined();
      expect(response.status).not.toBe(401);
      expect(response.status).not.toBe(403);
    });
  });

  describe("Session Verification", () => {
    it("should redirect to /login for app pages without session", () => {
      const request = createRequest("/dashboard");
      const response = middleware(request);

      expect(response).toBeDefined();
      expect(response.status).toBe(307); // Temporary redirect
      expect(response.headers.get("location")).toContain("/login");
      expect(response.headers.get("location")).toContain("redirect=%2Fdashboard");
    });

    it("should return 401 for API routes without session", () => {
      const request = createRequest("/api/vehicles");
      const response = middleware(request);

      expect(response).toBeDefined();
      expect(response.status).toBe(401);
    });
  });

  describe("Idle Timeout (Requirement 1.7)", () => {
    it("should redirect to /login if session expired due to inactivity", () => {
      const sessionData = {
        userId: "user-1",
        role: "Fleet Manager" as Role,
        lastActivityAt: new Date(Date.now() - 31 * 60 * 1000).toISOString(), // 31 minutes ago
      };

      vi.mocked(isSessionExpired).mockReturnValue(true);

      const request = createRequest("/dashboard", sessionData);
      const response = middleware(request);

      expect(isSessionExpired).toHaveBeenCalled();
      expect(response.status).toBe(307); // Redirect
      expect(response.headers.get("location")).toContain("/login");
      expect(response.headers.get("location")).toContain("expired=true");
    });

    it("should return 401 for API routes if session expired", () => {
      const sessionData = {
        userId: "user-1",
        role: "Fleet Manager" as Role,
        lastActivityAt: new Date(Date.now() - 31 * 60 * 1000).toISOString(),
      };

      vi.mocked(isSessionExpired).mockReturnValue(true);

      const request = createRequest("/api/vehicles", sessionData);
      const response = middleware(request);

      expect(response.status).toBe(401);
    });

    it("should allow access if session is not expired", () => {
      const sessionData = {
        userId: "user-1",
        role: "Fleet Manager" as Role,
        lastActivityAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(), // 10 minutes ago
      };

      vi.mocked(isSessionExpired).mockReturnValue(false);
      vi.mocked(can).mockReturnValue(true);

      const request = createRequest("/dashboard", sessionData);
      const response = middleware(request);

      expect(isSessionExpired).toHaveBeenCalled();
      expect(response.status).not.toBe(401);
      expect(response.status).not.toBe(307);
    });
  });

  describe("RBAC Permission Checks (Requirements 2.2, 2.3, 2.4)", () => {
    it("should allow access when user has required permissions", () => {
      const sessionData = {
        userId: "user-1",
        role: "Fleet Manager" as Role,
        lastActivityAt: new Date().toISOString(),
      };

      vi.mocked(isSessionExpired).mockReturnValue(false);
      vi.mocked(can).mockReturnValue(true); // Has permission

      const request = createRequest("/api/vehicles", sessionData);
      const response = middleware(request);

      expect(can).toHaveBeenCalledWith("Fleet Manager", "vehicle:read");
      expect(response.status).not.toBe(403);
    });

    it("should return 403 for API routes when user lacks permissions", () => {
      const sessionData = {
        userId: "user-1",
        role: "Driver" as Role, // Driver doesn't have vehicle:create permission
        lastActivityAt: new Date().toISOString(),
      };

      vi.mocked(isSessionExpired).mockReturnValue(false);
      vi.mocked(can).mockReturnValue(false); // No permission

      const request = createRequest("/api/vehicles/create", sessionData);
      const response = middleware(request);

      expect(can).toHaveBeenCalledWith("Driver", "vehicle:create");
      expect(response.status).toBe(403);
    });

    it("should redirect to dashboard for app pages when user lacks permissions", () => {
      const sessionData = {
        userId: "user-1",
        role: "Driver" as Role,
        lastActivityAt: new Date().toISOString(),
      };

      vi.mocked(isSessionExpired).mockReturnValue(false);
      vi.mocked(can).mockReturnValue(false);

      const request = createRequest("/vehicles", sessionData);
      const response = middleware(request);

      expect(response.status).toBe(307); // Redirect
      expect(response.headers.get("location")).toContain("/dashboard");
      expect(response.headers.get("location")).toContain("error=forbidden");
    });

    it("should check vehicle:create permission for POST /api/vehicles/create", () => {
      const sessionData = {
        userId: "user-1",
        role: "Fleet Manager" as Role,
        lastActivityAt: new Date().toISOString(),
      };

      vi.mocked(isSessionExpired).mockReturnValue(false);
      vi.mocked(can).mockReturnValue(true);

      const request = createRequest("/api/vehicles/create", sessionData);
      middleware(request);

      expect(can).toHaveBeenCalledWith("Fleet Manager", "vehicle:create");
    });

    it("should check maintenance:open permission for maintenance routes", () => {
      const sessionData = {
        userId: "user-1",
        role: "Fleet Manager" as Role,
        lastActivityAt: new Date().toISOString(),
      };

      vi.mocked(isSessionExpired).mockReturnValue(false);
      vi.mocked(can).mockReturnValue(true);

      const request = createRequest("/api/maintenance/open", sessionData);
      middleware(request);

      expect(can).toHaveBeenCalledWith("Fleet Manager", "maintenance:open");
    });

    it("should check trip:create permission for trip creation", () => {
      const sessionData = {
        userId: "user-1",
        role: "Driver" as Role,
        lastActivityAt: new Date().toISOString(),
      };

      vi.mocked(isSessionExpired).mockReturnValue(false);
      vi.mocked(can).mockReturnValue(true);

      const request = createRequest("/api/trips/create", sessionData);
      middleware(request);

      expect(can).toHaveBeenCalledWith("Driver", "trip:create");
    });

    it("should check dashboard:view permission for dashboard access", () => {
      const sessionData = {
        userId: "user-1",
        role: "Financial Analyst" as Role,
        lastActivityAt: new Date().toISOString(),
      };

      vi.mocked(isSessionExpired).mockReturnValue(false);
      vi.mocked(can).mockReturnValue(true);

      const request = createRequest("/dashboard", sessionData);
      middleware(request);

      expect(can).toHaveBeenCalledWith("Financial Analyst", "dashboard:view");
    });
  });

  describe("Session Activity Update", () => {
    it("should update session lastActivityAt on successful request", () => {
      const sessionData = {
        userId: "user-1",
        role: "Fleet Manager" as Role,
        lastActivityAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 minutes ago
      };

      vi.mocked(isSessionExpired).mockReturnValue(false);
      vi.mocked(can).mockReturnValue(true);

      const request = createRequest("/dashboard", sessionData);
      const response = middleware(request);

      // Check that the session cookie was updated
      const updatedCookie = response.cookies.get("session");
      expect(updatedCookie).toBeDefined();
      
      if (updatedCookie) {
        const updatedSession = JSON.parse(updatedCookie.value);
        const lastActivityDate = new Date(updatedSession.lastActivityAt);
        const now = new Date();
        
        // LastActivityAt should be very recent (within last few seconds)
        expect(now.getTime() - lastActivityDate.getTime()).toBeLessThan(5000);
      }
    });
  });

  describe("Route-to-Action Mapping", () => {
    const testCases: Array<{ route: string; expectedAction: string; role: Role; shouldAllow: boolean }> = [
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

    testCases.forEach(({ route, expectedAction, role, shouldAllow }) => {
      it(`should ${shouldAllow ? "allow" : "deny"} ${role} access to ${route}`, () => {
        const sessionData = {
          userId: "user-1",
          role,
          lastActivityAt: new Date().toISOString(),
        };

        vi.mocked(isSessionExpired).mockReturnValue(false);
        vi.mocked(can).mockReturnValue(shouldAllow);

        const request = createRequest(route, sessionData);
        const response = middleware(request);

        if (shouldAllow) {
          expect(response.status).not.toBe(403);
        } else {
          expect(response.status).toBe(403);
        }
      });
    });
  });
});

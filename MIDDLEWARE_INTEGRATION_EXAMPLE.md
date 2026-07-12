# Middleware Integration Example

## How to Integrate with Auth Routes

The middleware is designed to work seamlessly with your authentication system. Here's how to integrate it:

## 1. Login Route Implementation

Create `/app/api/auth/login/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { hash, verify } from "@/domain/password";
import { prisma } from "@/lib/prisma";
import type { Role } from "@/domain/types";

export async function POST(request: NextRequest) {
  const { email, password } = await request.json();

  // Find user in database
  const user = await prisma.user.findUnique({
    where: { email },
    include: { role: true },
  });

  if (!user || !user.passwordHash) {
    return NextResponse.json(
      { error: "Invalid credentials" },
      { status: 401 }
    );
  }

  // Verify password
  const isValid = await verify(password, user.passwordHash);
  
  if (!isValid) {
    return NextResponse.json(
      { error: "Invalid credentials" },
      { status: 401 }
    );
  }

  // Create session data
  const sessionData = {
    userId: user.id,
    role: user.role.name as Role,
    lastActivityAt: new Date().toISOString(),
  };

  // Create response with session cookie
  const response = NextResponse.json({
    success: true,
    user: {
      id: user.id,
      email: user.email,
      role: user.role.name,
    },
  });

  // Set session cookie (same format as middleware expects)
  response.cookies.set("session", JSON.stringify(sessionData), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24, // 24 hours
    path: "/",
  });

  return response;
}
```

## 2. Logout Route Implementation

Create `/app/api/auth/logout/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  // Create response
  const response = NextResponse.json({
    success: true,
    message: "Logged out successfully",
  });

  // Clear session cookie
  response.cookies.delete("session");

  return response;
}
```

## 3. Session Check Route Implementation

Create `/app/api/auth/session/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { isSessionExpired } from "@/domain/session";
import type { Role } from "@/domain/types";

export async function GET(request: NextRequest) {
  // Get session cookie
  const sessionCookie = request.cookies.get("session");

  if (!sessionCookie) {
    return NextResponse.json(
      { authenticated: false },
      { status: 401 }
    );
  }

  try {
    // Parse session data
    const sessionData = JSON.parse(sessionCookie.value);
    const { userId, role, lastActivityAt } = sessionData;

    // Check if session expired
    if (isSessionExpired(new Date(lastActivityAt), new Date())) {
      return NextResponse.json(
        { authenticated: false, reason: "Session expired" },
        { status: 401 }
      );
    }

    // Return session info
    return NextResponse.json({
      authenticated: true,
      userId,
      role,
      lastActivityAt,
    });
  } catch (error) {
    return NextResponse.json(
      { authenticated: false, reason: "Invalid session" },
      { status: 401 }
    );
  }
}
```

## 4. Login Page Implementation

Create `/app/login/page.tsx`:

```typescript
"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const redirect = searchParams.get("redirect") || "/dashboard";
  const expired = searchParams.get("expired");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "Login failed");
        return;
      }

      // Successful login - redirect
      router.push(redirect);
      router.refresh();
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
        <div>
          <h2 className="text-center text-3xl font-bold text-gray-900">
            TransitOps Login
          </h2>
          {expired && (
            <p className="mt-2 text-center text-sm text-orange-600">
              Your session expired due to inactivity. Please log in again.
            </p>
          )}
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded bg-red-50 p-3 text-sm text-red-800">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Logging in..." : "Log in"}
          </button>
        </form>
      </div>
    </div>
  );
}
```

## 5. Client-Side Session Hook

Create `/hooks/useSession.ts`:

```typescript
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Role } from "@/domain/types";

interface Session {
  authenticated: boolean;
  userId?: string;
  role?: Role;
  lastActivityAt?: string;
}

export function useSession() {
  const router = useRouter();
  const [session, setSession] = useState<Session>({ authenticated: false });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const response = await fetch("/api/auth/session");
      const data = await response.json();
      setSession(data);
    } catch (error) {
      setSession({ authenticated: false });
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setSession({ authenticated: false });
      router.push("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return {
    session,
    loading,
    logout,
    refresh: checkSession,
  };
}
```

## 6. Protected Page Example

Create `/app/dashboard/page.tsx`:

```typescript
"use client";

import { useSession } from "@/hooks/useSession";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DashboardPage() {
  const { session, loading, logout } = useSession();
  const router = useRouter();

  // Client-side check (middleware handles server-side)
  useEffect(() => {
    if (!loading && !session.authenticated) {
      router.push("/login");
    }
  }, [session, loading, router]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!session.authenticated) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold">TransitOps Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                Role: <strong>{session.role}</strong>
              </span>
              <button
                onClick={logout}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Dashboard content based on role */}
        <h2 className="text-2xl font-semibold mb-4">
          Welcome, {session.role}!
        </h2>
        
        {/* Role-specific content */}
        {session.role === "Fleet Manager" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="font-semibold mb-2">Vehicles</h3>
              <p className="text-gray-600">Manage your fleet</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="font-semibold mb-2">Maintenance</h3>
              <p className="text-gray-600">Track maintenance</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="font-semibold mb-2">Reports</h3>
              <p className="text-gray-600">View analytics</p>
            </div>
          </div>
        )}

        {session.role === "Driver" && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="font-semibold mb-2">My Trips</h3>
            <p className="text-gray-600">View and manage your trips</p>
          </div>
        )}

        {/* Other role-specific views... */}
      </main>
    </div>
  );
}
```

## 7. API Route Protection Example

Create `/app/api/vehicles/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Middleware automatically checks for vehicle:read permission
export async function GET(request: NextRequest) {
  // Get session from cookie (already validated by middleware)
  const sessionCookie = request.cookies.get("session");
  const session = sessionCookie ? JSON.parse(sessionCookie.value) : null;

  // Fetch vehicles (middleware already authorized this)
  const vehicles = await prisma.vehicle.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    vehicles,
    requestedBy: session?.role,
  });
}

// Middleware automatically checks for vehicle:create permission
export async function POST(request: NextRequest) {
  const body = await request.json();

  // Create vehicle (middleware already authorized this)
  const vehicle = await prisma.vehicle.create({
    data: body,
  });

  return NextResponse.json(vehicle, { status: 201 });
}
```

## 8. Environment Variables

Add to `.env.local`:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/transitops"

# Node Environment
NODE_ENV="development"

# Session Secret (for JWT if using)
SESSION_SECRET="your-secret-key-here-change-in-production"
```

## Testing the Integration

1. **Start the application**:
   ```bash
   npm run dev
   ```

2. **Test public access**:
   - Visit `http://localhost:3000/login` ✅ Should load

3. **Test protected access**:
   - Visit `http://localhost:3000/dashboard` ❌ Should redirect to login

4. **Test login**:
   - Log in with seeded credentials
   - Should redirect to dashboard ✅

5. **Test session timeout**:
   - Wait 30 minutes (or modify timeout for testing)
   - Try to access dashboard ❌ Should redirect to login

6. **Test RBAC**:
   - Log in as Driver
   - Try to access `/api/vehicles/create` ❌ Should return 403

7. **Test logout**:
   - Click logout
   - Should redirect to login ✅

## Middleware Flow Diagram

```
Request
   │
   ├─→ Is public route? ────────→ Allow ✅
   │
   ├─→ Has session cookie? ──No──→ Redirect/401 ❌
   │       │
   │      Yes
   │       │
   ├─→ Session expired? ────Yes──→ Redirect/401 ❌
   │       │
   │      No
   │       │
   ├─→ Has permission? ─────No───→ 403 ❌
   │       │
   │      Yes
   │       │
   └─→ Update activity ───────────→ Allow ✅
```

## Security Considerations

1. **HTTPS Only**: Always use HTTPS in production
2. **Secure Cookies**: Set `secure: true` in production
3. **CSRF Protection**: SameSite=lax provides basic protection
4. **XSS Protection**: HttpOnly cookies prevent JavaScript access
5. **Session Rotation**: Consider rotating session IDs on privilege changes
6. **Audit Logging**: Log all authentication events and permission denials

## Next Steps

Once the middleware is integrated:

1. ✅ Test all role combinations
2. ✅ Verify session timeout works correctly
3. ✅ Ensure RBAC permissions are enforced
4. ✅ Add audit logging for security events
5. ✅ Implement proper error handling in production

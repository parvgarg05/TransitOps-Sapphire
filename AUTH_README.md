# Authentication Implementation

This document describes the Auth.js (NextAuth) authentication implementation for TransitOps.

## Overview

The authentication system uses **Auth.js v4** (NextAuth) with:
- **Credentials Provider** for email/password authentication
- **JWT Session Strategy** for stateless sessions
- **Role-Based Access Control (RBAC)** with user roles
- **Account Lockout** protection against brute force attacks
- **Generic Error Messages** to prevent user enumeration

## Requirements Implemented

- **Requirement 1.1**: Secure login using email and password
- **Requirement 1.2**: Generic authentication error messages (no indication of which field was incorrect)
- **Requirement 1.5**: Role-Based Access Control (RBAC)
- **Requirement 1.6**: Account lockout after 5 consecutive failed attempts within 15 minutes

## Architecture

### Core Files

1. **`lib/auth.ts`** - Auth.js configuration with Credentials provider
   - Custom `authorize` function implementing the authentication flow
   - JWT session strategy configuration
   - Session callbacks for user data propagation

2. **`app/api/auth/[...nextauth]/route.ts`** - NextAuth API route handler
   - Handles all Auth.js endpoints (signin, signout, session, etc.)

3. **`types/next-auth.d.ts`** - TypeScript type extensions
   - Extends NextAuth types to include custom user properties (id, email, role)

4. **`lib/session.ts`** - Session utility functions
   - `getCurrentSession()` - Get current session
   - `getCurrentUser()` - Get current user
   - `requireAuth()` - Require authentication
   - `requireRole(roles)` - Require specific roles

5. **`components/providers/SessionProvider.tsx`** - Client-side session provider
   - Wraps the app for client-side session access

### API Routes

The following endpoints are available:

#### Authentication Endpoints (NextAuth)

- **POST `/api/auth/callback/credentials`** - Login with email/password
- **POST `/api/auth/signout`** - Logout
- **GET `/api/auth/session`** - Get current session (NextAuth format)
- **GET `/api/auth/csrf`** - Get CSRF token
- **GET `/api/auth/providers`** - Get available providers

#### Convenience Endpoints

- **GET `/api/auth/session`** - Get current session (custom format)
- **POST `/api/auth/login`** - Documentation endpoint (redirects to NextAuth)
- **POST `/api/auth/logout`** - Documentation endpoint (redirects to NextAuth)

## Authentication Flow

### Login Flow

1. **Credential Validation** (`domain/loginPolicy.ts`)
   - Validates email length (≤254 chars)
   - Validates password length (≤128 chars)
   - Returns generic error for any validation failure

2. **User Lookup**
   - Queries database for user by email (case-insensitive)
   - Returns generic error if user not found (prevents enumeration)

3. **Lockout Check** (`domain/lockout.ts`)
   - Checks if account is currently locked
   - Locked accounts return error with remaining lockout time

4. **Password Verification** (`domain/password.ts`)
   - Verifies password using bcrypt comparison
   - Returns generic error if password is incorrect

5. **Failed Attempt Handling**
   - Increments `failedAttempts` counter
   - If 5+ consecutive failures, sets `lockedUntil` to 15 minutes from now
   - Returns generic error message

6. **Success Handling**
   - Resets `failedAttempts` to 0
   - Clears `lockedUntil`
   - Updates `lastActivityAt` timestamp
   - Creates JWT session with user id, email, and role

### Session Management

Sessions are stored as JWT tokens with:
- **User ID** - Unique identifier
- **Email** - User email address
- **Role** - User role (FLEET_MANAGER, DRIVER, SAFETY_OFFICER, FINANCIAL_ANALYST)

Session tokens are valid for **30 days** by default.

## Usage

### Client-Side (React Components)

```tsx
"use client";

import { useSession, signIn, signOut } from "next-auth/react";

export function MyComponent() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <div>Loading...</div>;
  }

  if (status === "unauthenticated") {
    return <button onClick={() => signIn()}>Sign In</button>;
  }

  return (
    <div>
      <p>Welcome, {session.user.email}</p>
      <p>Role: {session.user.role}</p>
      <button onClick={() => signOut()}>Sign Out</button>
    </div>
  );
}
```

### Server Components

```tsx
import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function Dashboard() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Welcome, {user.email}</p>
      <p>Role: {user.role}</p>
    </div>
  );
}
```

### API Routes

```tsx
import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireRole } from "@/lib/session";

export async function GET(request: NextRequest) {
  // Require any authenticated user
  const session = await requireAuth();

  return NextResponse.json({ user: session.user });
}

export async function POST(request: NextRequest) {
  // Require specific role
  await requireRole(["FLEET_MANAGER", "SAFETY_OFFICER"]);

  // ... protected logic
  return NextResponse.json({ success: true });
}
```

### Login Form Example

```tsx
"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError(result.error);
    } else {
      // Redirect to dashboard or desired page
      window.location.href = "/dashboard";
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        required
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        required
      />
      {error && <p className="error">{error}</p>}
      <button type="submit">Sign In</button>
    </form>
  );
}
```

## Environment Variables

Required environment variables in `.env`:

```env
# NextAuth Configuration
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-change-this-in-production"

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/transitops"
```

To generate a secure `NEXTAUTH_SECRET`:

```bash
openssl rand -base64 32
```

## Security Features

### 1. Password Hashing (Req 1.4)
- Passwords are hashed using bcrypt with 10 salt rounds
- Plain-text passwords are never stored or logged
- Password verification uses constant-time comparison

### 2. Generic Error Messages (Req 1.2)
- All authentication failures return "Invalid email or password"
- No indication of whether email exists or password is incorrect
- Prevents user enumeration attacks

### 3. Account Lockout (Req 1.6)
- After 5 consecutive failed attempts within 15 minutes
- Account locked for 15 minutes
- Error message indicates account is locked and time remaining
- Successful login resets lockout state

### 4. Input Validation (Req 1.8)
- Email length limited to 254 characters
- Password length limited to 128 characters
- Validation happens before database lookup

### 5. Session Security
- JWT tokens signed with secret key
- Sessions expire after 30 days
- CSRF protection enabled by default

## Testing

### Manual Testing

1. **Successful Login**
   ```bash
   curl -X POST http://localhost:3000/api/auth/callback/credentials \
     -H "Content-Type: application/json" \
     -d '{"email":"user@example.com","password":"correct-password"}'
   ```

2. **Failed Login**
   ```bash
   curl -X POST http://localhost:3000/api/auth/callback/credentials \
     -H "Content-Type: application/json" \
     -d '{"email":"user@example.com","password":"wrong-password"}'
   ```

3. **Get Session**
   ```bash
   curl http://localhost:3000/api/auth/session \
     -H "Cookie: next-auth.session-token=YOUR_TOKEN"
   ```

### Integration Tests

Test files should verify:
- Credential validation logic
- Password verification
- Lockout behavior after 5 failures
- Generic error messages
- Session creation and management

## Troubleshooting

### "NEXTAUTH_SECRET not set"
- Ensure `NEXTAUTH_SECRET` is set in `.env`
- Generate a new secret: `openssl rand -base64 32`

### "Prisma Client not found"
- Run `npm run db:generate` to generate Prisma client
- Ensure database is running and accessible

### "Account locked" message persists
- Check `lockedUntil` field in database
- Wait 15 minutes or manually reset the field
- Successful login will automatically reset lockout

### Session not persisting
- Check browser cookies are enabled
- Verify `NEXTAUTH_URL` matches your application URL
- Check for CORS issues if using different domains

## References

- [Auth.js Documentation](https://authjs.dev/)
- [NextAuth.js Guide](https://next-auth.js.org/)
- [Next.js App Router Authentication](https://nextjs.org/docs/app/building-your-application/authentication)

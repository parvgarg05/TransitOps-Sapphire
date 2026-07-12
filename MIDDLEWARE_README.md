# Auth + RBAC Middleware Documentation

## Overview

The `middleware.ts` file implements authentication and role-based access control (RBAC) for the TransitOps application. It runs on every request to protected routes and enforces security policies.

## Requirements Satisfied

- **Requirement 1.3**: Only authenticated users can access the application
- **Requirement 1.7**: Session idle timeout (30 minutes of inactivity)
- **Requirement 2.2**: Authorized role + action → permit
- **Requirement 2.3**: Unauthorized action → deny, no data change
- **Requirement 2.4**: Not explicitly authorized → unauthorized (fail-closed)

## Features

### 1. Session Verification

The middleware verifies that a valid session exists for all protected routes:

- **No session**: 
  - App pages → Redirect to `/login` with redirect URL
  - API routes → Return 401 Unauthorized

### 2. Idle Timeout Enforcement

Sessions expire after 30 minutes of inactivity (Requirement 1.7):

- Uses `isSessionExpired()` from `domain/session.ts`
- **Expired session**:
  - App pages → Redirect to `/login?expired=true`
  - API routes → Return 401 Unauthorized
  - Session cookie is cleared

### 3. RBAC Permission Checks

The middleware checks permissions before routing using the `can()` function from `domain/rbac.ts`:

- Each route is mapped to a required action (e.g., `vehicle:create`, `trip:read`)
- **Permission denied**:
  - API routes → Return 403 Forbidden (no data change)
  - App pages → Redirect to `/dashboard?error=forbidden`

### 4. Activity Tracking

On every successful request, the middleware updates the session's `lastActivityAt` timestamp to prevent idle timeout.

## Route Configuration

### Public Routes (No Authentication Required)

- `/login` - Login page
- `/api/auth/login` - Login endpoint
- `/api/auth/logout` - Logout endpoint
- `/_next/*` - Next.js static files
- `/favicon.ico` - Favicon
- `/public/*` - Public assets

### Protected Routes (Authentication + RBAC Required)

All other routes require authentication and appropriate permissions:

#### Vehicle Routes
- `/api/vehicles` → Requires `vehicle:read`
- `/api/vehicles/create` → Requires `vehicle:create`
- `/api/vehicles/:id/update` → Requires `vehicle:update`
- `/api/vehicles/:id/retire` → Requires `vehicle:retire`

#### Maintenance Routes
- `/api/maintenance/open` → Requires `maintenance:open`
- `/api/maintenance/:id/close` → Requires `maintenance:close`
- `/api/maintenance/:id/record-cost` → Requires `maintenance:record-cost`

#### Driver Routes
- `/api/drivers` → Requires `driver:read`
- `/api/drivers/:id/update-compliance` → Requires `driver:update-compliance`

#### Trip Routes
- `/api/trips` → Requires `trip:read`
- `/api/trips/create` → Requires `trip:create`
- `/api/trips/:id/assign` → Requires `trip:assign`

#### Financial Routes
- `/api/fuel` → Requires `fuel:read`
- `/api/expenses` → Requires `expense:read`
- `/api/analytics` → Requires `analytics:read`
- `/api/operational-cost` → Requires `operational-cost:read`

#### Dashboard Routes
- `/dashboard` → Requires `dashboard:view`
- `/` (root) → Requires `dashboard:view`

## Role Permissions Matrix

| Role | Allowed Actions |
|------|----------------|
| **Fleet Manager** | vehicle:*, maintenance:*, dashboard:view |
| **Driver** | trip:*, dashboard:view |
| **Safety Officer** | driver:read, driver:update-compliance, dashboard:view |
| **Financial Analyst** | fuel:read, expense:read, analytics:read, operational-cost:read, dashboard:view |

## Session Format

The middleware expects a session cookie with the following structure:

```json
{
  "userId": "user-id",
  "role": "Fleet Manager",
  "lastActivityAt": "2024-01-01T12:00:00.000Z"
}
```

### Session Cookie Configuration

- **Name**: `session`
- **HttpOnly**: `true` (prevents XSS attacks)
- **Secure**: `true` in production (HTTPS only)
- **SameSite**: `lax` (CSRF protection)
- **Max Age**: 24 hours

## Integration with Auth.js

The middleware is designed to work with Auth.js (NextAuth.js) Credentials provider:

1. **Login** (`/api/auth/login`):
   - Validates credentials
   - Creates session with user role
   - Sets session cookie

2. **Logout** (`/api/auth/logout`):
   - Clears session cookie
   - Redirects to login

3. **Session Check** (`/api/auth/session`):
   - Returns current session data
   - Used by client-side components

## Error Responses

### 401 Unauthorized

Returned when:
- No session cookie exists
- Session has expired due to inactivity

```json
{
  "error": "Unauthorized: No session found"
}
```

```json
{
  "error": "Unauthorized: Session expired due to inactivity"
}
```

### 403 Forbidden

Returned when:
- User lacks required permissions for the action

```json
{
  "error": "Forbidden: Insufficient permissions",
  "required": "vehicle:create",
  "role": "Driver"
}
```

## Testing

The middleware includes comprehensive tests covering:

- ✅ Public route access without authentication
- ✅ Protected route blocking without session
- ✅ Idle timeout enforcement (30 minutes)
- ✅ RBAC permission checks for all route types
- ✅ Session activity timestamp updates
- ✅ Correct redirects for app vs. API routes

Run tests with:

```bash
npm test -- __tests__/middleware.test.ts
```

## Implementation Notes

### Fail-Closed Security

The middleware follows fail-closed security principles:

- Unknown routes → Require authentication
- Unknown roles → Deny all actions
- Missing permissions → Deny access
- Invalid session → Require re-authentication

### No Data Changes on Denial

Per Requirement 2.3, when a permission check fails, the middleware returns 403 **before** any data operations occur, ensuring no unauthorized data changes.

### Performance Considerations

- Session checks are fast (in-memory cookie parsing)
- RBAC checks use a static permission matrix (O(1) lookup)
- No database queries in middleware (all decisions from session cookie)

## Future Enhancements

Potential improvements for production:

1. **JWT Integration**: Replace JSON cookie with signed JWT tokens
2. **Session Store**: Use Redis or database for server-side session storage
3. **Rate Limiting**: Add rate limiting per user/IP
4. **Audit Logging**: Log all permission denials for security monitoring
5. **Dynamic Permissions**: Support permission overrides per user
6. **API Key Support**: Allow API key authentication for external integrations

## Related Files

- `domain/session.ts` - Session expiry logic
- `domain/rbac.ts` - Permission matrix and `can()` function
- `domain/types.ts` - Role and status type definitions
- `__tests__/middleware.test.ts` - Middleware test suite

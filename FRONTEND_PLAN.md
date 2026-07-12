# Frontend Plan — TransitOps

All 7 feature pages and their components are already built (Dashboard, Vehicles, Drivers, Trips, Maintenance, Expenses, Reports). The blockers below prevent the app from being usable; they are the execution priority.

## Blockers (must fix — app is inaccessible without these)

1. **Login page** — `middleware.ts` redirects unauthenticated users to `/login`, but no `app/login/page.tsx` exists (404). Build a credentials login form wired to NextAuth `signIn`.
2. **Middleware/NextAuth session mismatch** — middleware reads a custom JSON `session` cookie, but NextAuth issues a JWT. Rewrite `getSession` in middleware to use `getToken` from `next-auth/jwt` so RBAC actually sees the logged-in user.
3. **SessionProvider not wired** — `components/providers/SessionProvider.tsx` exists but is not used in `app/layout.tsx`. Wrap the app so client components can read the session.
4. **Global navigation** — no sidebar/header; pages are isolated. Build an app shell (Sidebar + Header with role badge + logout) and render it around authenticated pages.

## Polish (after blockers)

5. Loading/error states consistency across pages.
6. Toast notifications for action feedback.
7. Confirmation dialogs for destructive actions (retire vehicle, cancel trip).
8. Responsive audit at 360 / 768 / 1280 / 1920 px.
9. Accessibility pass (labels, keyboard nav, contrast).

## Execution order

Blockers 1–4 first (makes the app usable end-to-end), then polish 5–9 as time allows.

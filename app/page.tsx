/**
 * Public landing page (marketing surface) at `/`.
 *
 * This route is public — the middleware allows it without a session and the
 * app shell renders it full-bleed (no sidebar/header). Authenticated users can
 * jump straight to the dashboard via the CTA.
 */

import { LandingPage } from "@/components/landing/LandingPage";

export default function Home() {
  return <LandingPage />;
}

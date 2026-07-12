/**
 * Logout API Route
 * 
 * This is a convenience wrapper around NextAuth's signout endpoint.
 * Client applications can POST to /api/auth/logout to end their session.
 * 
 * Requirements: 1.1
 */

import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  // Note: This endpoint is primarily for documentation.
  // In practice, client applications should use NextAuth's built-in
  // signOut function or POST directly to /api/auth/signout
  
  return NextResponse.json(
    { 
      message: "Please use NextAuth's signOut function or POST to /api/auth/signout",
      endpoint: "/api/auth/signout"
    },
    { status: 200 }
  );
}

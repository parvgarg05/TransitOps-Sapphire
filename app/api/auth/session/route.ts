/**
 * Session API Route
 * 
 * This endpoint returns the current user's session information.
 * Client applications can GET /api/auth/session to retrieve session data.
 * 
 * This is a convenience wrapper that uses NextAuth's getServerSession.
 * 
 * Requirements: 1.1, 1.5
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { user: null, authenticated: false },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { 
        user: session.user,
        authenticated: true 
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to retrieve session" },
      { status: 500 }
    );
  }
}

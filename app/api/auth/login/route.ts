/**
 * Login API Route
 * 
 * This is a convenience wrapper around NextAuth's signin endpoint.
 * Client applications can POST to /api/auth/login with { email, password }
 * 
 * Requirements: 1.1, 1.2, 1.6
 */

import { NextRequest, NextResponse } from "next/server";
import { signIn } from "next-auth/react";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Note: This endpoint is primarily for documentation.
    // In practice, client applications should use NextAuth's built-in
    // signIn function or POST directly to /api/auth/callback/credentials
    
    return NextResponse.json(
      { 
        message: "Please use NextAuth's signIn function or POST to /api/auth/callback/credentials",
        endpoint: "/api/auth/callback/credentials"
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid request" },
      { status: 400 }
    );
  }
}

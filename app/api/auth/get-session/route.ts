import { auth } from "@/lib/core/auth/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

/**
 * Helper endpoint to get the current session
 * Useful for middleware or client-side session checks
 */
export async function GET() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json(null, { status: 401 });
  }

  return NextResponse.json(session);
}

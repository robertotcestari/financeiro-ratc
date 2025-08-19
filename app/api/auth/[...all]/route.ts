import { auth } from "@/lib/core/auth/auth";
import { toNextJsHandler } from "better-auth/next-js";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/core/database/client";

/**
 * Better Auth API Route Handler for Next.js App Router
 * 
 * This catch-all route handles all authentication endpoints:
 * - GET /api/auth/session - Gets current session
 * - POST /api/auth/sign-in/social - Initiates social login (Google)
 * - GET /api/auth/callback/google - Handles OAuth callback from Google
 * - POST /api/auth/sign-out - Signs out the user
 * - GET /api/auth/user - Gets current user info
 * 
 * The [...all] dynamic route captures all paths after /api/auth/
 * and Better Auth routes them to the appropriate handlers internally.
 */

// Allowed email for authentication
const ALLOWED_EMAIL = "robertotcestari@gmail.com";

const handlers = toNextJsHandler(auth.handler);

// Custom GET handler that validates after Google callback
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const pathname = url.pathname;
  
  // Handle the request normally first
  const response = await handlers.GET(req);
  
  // Check if this is a Google callback
  if (pathname.includes("/callback/google")) {
    // Check if there's a redirect with a session
    if (response.status === 302 || response.status === 307) {
      // Get the session to check the user
      const cookies = req.cookies;
      const sessionToken = cookies.get("better-auth.session_token");
      
      if (sessionToken) {
        // Check the user's email in the database
        const session = await prisma.session.findUnique({
          where: { token: sessionToken.value },
          include: { user: true }
        });
        
        if (session?.user && session.user.email !== ALLOWED_EMAIL) {
          // Delete unauthorized session
          await prisma.session.delete({
            where: { id: session.id }
          }).catch(() => {});
          
          // Redirect to signin with error
          return NextResponse.redirect(new URL("/auth/signin?error=unauthorized", req.url));
        }
      }
    }
  }
  
  return response;
}

// Use the original POST handler
export const POST = handlers.POST;
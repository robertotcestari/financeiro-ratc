import { auth } from "./auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { Session, User } from "./auth";

// Allowed email for authentication
const ALLOWED_EMAIL = "robertotcestari@gmail.com";

/**
 * Get the current session from server components
 */
export async function getServerSession(): Promise<Session | null> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  
  // Validate that the user is allowed
  if (session && session.user.email !== ALLOWED_EMAIL) {
    return null; // Treat as unauthenticated if not allowed
  }
  
  return session;
}

/**
 * Get the current user from server components
 */
export async function getCurrentUser(): Promise<User | null> {
  const session = await getServerSession();
  return session?.user || null;
}

/**
 * Require authentication for a server component
 * Redirects to sign-in page if not authenticated or not authorized
 */
export async function requireAuth(): Promise<Session> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  
  if (!session || session.user.email !== ALLOWED_EMAIL) {
    redirect("/auth/signin");
  }
  
  return session;
}

/**
 * Check if user is authenticated (for server components)
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await getServerSession();
  return !!session;
}
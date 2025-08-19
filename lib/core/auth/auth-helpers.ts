import { auth } from "./auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { User } from "./auth";

/**
 * Server-side authentication helpers for Next.js App Router
 * These functions should only be used in Server Components and Server Actions
 */

/**
 * Get the current session from the server
 * @returns Session object or null if not authenticated
 */
export async function getSession() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    return session;
  } catch (error) {
    console.error("Error getting session:", error);
    return null;
  }
}

/**
 * Require authentication for a page/component
 * Redirects to signin if not authenticated
 * @param redirectTo - Optional URL to redirect after signin
 * @returns Session object if authenticated
 */
export async function requireAuth(redirectTo?: string) {
  const session = await getSession();
  
  if (!session) {
    const signInUrl = redirectTo 
      ? `/auth/signin?redirect=${encodeURIComponent(redirectTo)}`
      : "/auth/signin";
    redirect(signInUrl);
  }
  
  return session;
}

/**
 * Get session or redirect to signin
 * Similar to requireAuth but with explicit redirect parameter
 * @param currentPath - Current path to redirect back after signin
 * @returns Session object
 */
export async function getSessionOrRedirect(currentPath: string) {
  const session = await getSession();
  
  if (!session) {
    redirect(`/auth/signin?redirect=${encodeURIComponent(currentPath)}`);
  }
  
  return session;
}

/**
 * Check authentication for Server Actions
 * Throws an error if not authenticated instead of redirecting
 * @returns Session object if authenticated
 * @throws Error if not authenticated
 */
export async function checkAuth() {
  const session = await getSession();
  
  if (!session) {
    throw new Error("Unauthorized: Please sign in to continue");
  }
  
  return session;
}

/**
 * Get user from session
 * @returns User object or null if not authenticated
 */
export async function getCurrentUser(): Promise<User | null> {
  const session = await getSession();
  return session?.user || null;
}

/**
 * Check if user is authenticated (boolean check)
 * @returns true if authenticated, false otherwise
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession();
  return !!session;
}

/**
 * Type guard to check if a session exists
 */
export function hasSession(
  session: Awaited<ReturnType<typeof getSession>>
): session is NonNullable<typeof session> {
  return session !== null;
}

/**
 * Get session with specific validation
 * Useful for checking session freshness or specific conditions
 * @param options - Validation options
 * @returns Session object or null
 */
export async function getValidSession(options?: {
  maxAge?: number; // Maximum age in seconds
}) {
  const session = await getSession();
  
  if (!session) return null;
  
  // Additional validation can be added here
  if (options?.maxAge) {
    const sessionAge = Date.now() - new Date(session.session.createdAt).getTime();
    const maxAgeMs = options.maxAge * 1000;
    
    if (sessionAge > maxAgeMs) {
      return null; // Session is too old
    }
  }
  
  return session;
}

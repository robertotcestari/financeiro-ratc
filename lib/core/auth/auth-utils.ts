import { auth } from "./auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { Session, User } from "./auth";
import { ADMIN_PERMISSION } from "./permissions";

/**
 * Get the current session from server components
 */
export async function getServerSession(): Promise<Session | null> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  
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
  if (!session) {
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

/**
 * Check if current user has admin role
 */
export async function isAdmin(): Promise<boolean> {
  const session = await getServerSession();
  if (!session) return false;
  try {
    const has = await auth.api.userHasPermission({
      body: {
        userId: session.session.userId,
        permissions: ADMIN_PERMISSION,
      },
      headers: await headers(),
    });
    return !!has;
  } catch {
    return false;
  }
}

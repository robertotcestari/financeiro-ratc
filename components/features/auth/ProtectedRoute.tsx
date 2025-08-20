import { requireAuthWithRedirect } from "@/lib/core/auth";
import type { ReactNode } from "react";

interface ProtectedRouteProps {
  children: ReactNode;
  redirectTo?: string;
}

/**
 * Server Component wrapper that protects routes
 * Automatically redirects to signin if not authenticated
 */
export default async function ProtectedRoute({ 
  children, 
  redirectTo 
}: ProtectedRouteProps) {
  // This will redirect if not authenticated
  await requireAuthWithRedirect(redirectTo);
  
  // If we reach here, user is authenticated
  return <>{children}</>;
}
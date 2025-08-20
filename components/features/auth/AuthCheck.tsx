import { getSession } from "@/lib/core/auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import type { ReactNode } from "react";

interface AuthCheckProps {
  children: ReactNode;
  fallback?: ReactNode;
  redirectTo?: string;
}

/**
 * Component that checks authentication and shows loading state
 * Use this when you need custom loading UI
 */
async function AuthCheckInner({ children, redirectTo }: AuthCheckProps) {
  const session = await getSession();
  
  if (!session) {
    const signInUrl = redirectTo 
      ? `/auth/signin?redirect=${encodeURIComponent(redirectTo)}`
      : "/auth/signin";
    redirect(signInUrl);
  }
  
  return <>{children}</>;
}

export default function AuthCheck({ 
  children, 
  fallback = <AuthLoadingState />,
  redirectTo 
}: AuthCheckProps) {
  return (
    <Suspense fallback={fallback}>
      <AuthCheckInner redirectTo={redirectTo}>
        {children}
      </AuthCheckInner>
    </Suspense>
  );
}

/**
 * Default loading state for auth checks
 */
export function AuthLoadingState() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Verificando autenticação...</p>
      </div>
    </div>
  );
}
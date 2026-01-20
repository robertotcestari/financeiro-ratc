"use client";

import { ReactNode } from "react";
import { useSession } from "@/lib/core/auth/auth-client";

interface SessionProviderProps {
  children: ReactNode;
}

/**
 * Session Provider Component
 * 
 * Handles session initialization and loading states.
 * Shows a loading spinner while session is being fetched.
 */
export function SessionProvider({ children }: SessionProviderProps) {
  const session = useSession();
  const isInitialized = !session.isPending;

  // Show loading state while session is initializing
  if (!isInitialized && session.isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]">
            <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">
              Carregando...
            </span>
          </div>
          <p className="text-sm text-muted-foreground">Carregando sessão...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

"use client";

import { ReactNode } from "react";
import { AuthProvider } from "./auth-provider";
import { SessionProvider } from "./session-provider";

interface ProvidersProps {
  children: ReactNode;
}

/**
 * Root Providers Component
 * 
 * Wraps the application with all necessary providers.
 * Currently includes:
 * - AuthProvider: Authentication context
 * - SessionProvider: Session initialization and loading states
 * 
 * Future providers can be added here (Theme, i18n, etc.)
 */
export function Providers({ children }: ProvidersProps) {
  return (
    <AuthProvider>
      <SessionProvider>
        {children}
      </SessionProvider>
    </AuthProvider>
  );
}
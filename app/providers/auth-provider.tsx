"use client";

import { ReactNode } from "react";

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Authentication Provider Component
 * 
 * This provider wraps the application to provide authentication context.
 * Better Auth's client automatically manages session state internally,
 * so we don't need to explicitly create a React Context.
 * 
 * The useSession hook from auth-client will work anywhere within this provider.
 */
export function AuthProvider({ children }: AuthProviderProps) {
  // Better Auth handles session state internally through its client
  // No additional context setup needed
  return <>{children}</>;
}
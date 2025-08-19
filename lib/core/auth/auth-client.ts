"use client";

import { createAuthClient } from "better-auth/react";
import type { Session, User } from "./auth";

// Create the auth client with proper typing
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
});

// Export commonly used hooks and functions
export const {
  // Authentication functions
  signIn,
  signOut,
  
  // Session hooks
  useSession,
  
  // Additional utilities
  getSession,
  listSessions,
  revokeSession,
  revokeSessions,
  revokeOtherSessions,
  updateUser,
  deleteUser,
  linkSocial,
  unlinkAccount,
  listAccounts,
} = authClient;

// Helper function to check if user is authenticated
export const isAuthenticated = async (): Promise<boolean> => {
  const session = await getSession();
  return !!session;
};

// Type exports for convenience
export type { Session, User };
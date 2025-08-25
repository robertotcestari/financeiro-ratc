"use client";

import { createAuthClient } from "better-auth/react";
import { adminClient } from "better-auth/client/plugins";
import type { Session, User } from "./auth";
import { ac, roleAdmin, roleUser, roleSuperuser } from "./permissions";

// Create the auth client with proper typing and admin plugin for access control
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  plugins: [
    adminClient({
      ac,
      roles: {
        admin: roleAdmin,
        user: roleUser,
        superuser: roleSuperuser,
      },
    }),
  ],
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

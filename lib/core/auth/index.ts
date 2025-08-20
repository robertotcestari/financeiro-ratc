// Core authentication exports
export * from './auth';

// Client-side exports (excluding getSession to avoid conflict)
export {
  authClient,
  signIn,
  signOut,
  useSession,
  listSessions,
  revokeSession,
  revokeSessions,
  revokeOtherSessions,
} from './auth-client';

// Server-side auth-helpers exports
export {
  getSession,
  requireAuth as requireAuthWithRedirect,
  getSessionOrRedirect,
  checkAuth,
  hasSession,
  getValidSession,
} from './auth-helpers';

// Server-side auth-utils exports (with renamed conflicting exports)
export {
  getServerSession,
  getCurrentUser,
  requireAuth,
  isAuthenticated,
} from './auth-utils';
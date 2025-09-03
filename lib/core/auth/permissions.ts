import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements, adminAc } from "better-auth/plugins/admin/access";

// Define the permission surface for the app
// Resources and allowed actions
export const statement = {
  // Include Better Auth admin plugin's default statements (user/session/etc)
  ...defaultStatements,
  // App-specific resources
  admin: ["access"],
  report: ["view"],
} as const;

export const ac = createAccessControl(statement);

// Roles
// Note: pass at least one resource key to avoid `never` inference on authorize()
// Using empty action arrays means "no permissions" for that resource.
export const roleUser = ac.newRole({
  report: [],
});

export const roleAdmin = ac.newRole({
  // Grant all admin capabilities needed by Better Auth admin plugin
  ...adminAc.statements,
  // App-specific permissions
  admin: ["access"],
  report: ["view"],
});

export const roleSuperuser = ac.newRole({
  // Start from full admin capabilities (includes user/session management, impersonation, etc.)
  ...adminAc.statements,
  // App-specific permissions; mirror or exceed admin
  admin: ["access"],
  report: ["view"],
});

// Common permission helpers (names consistent across app)
// Narrowed, mutable arrays to satisfy AccessControl Subset typing
export const ADMIN_PERMISSION: { admin: (typeof statement)["admin"][number][] } = {
  admin: ["access"],
};
export const REPORT_VIEW_PERMISSION: { report: (typeof statement)["report"][number][] } = {
  report: ["view"],
};

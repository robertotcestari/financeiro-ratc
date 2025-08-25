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
export const roleUser = ac.newRole({
  // No report access for regular users
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
export const ADMIN_PERMISSION = { admin: ["access"] } as const;
export const REPORT_VIEW_PERMISSION = { report: ["view"] } as const;

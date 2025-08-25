import { headers } from "next/headers";
import { auth } from "./auth";
import { ADMIN_PERMISSION, statement } from "./permissions";

// Map of resource -> allowed actions, constrained by our access control statement
export type Permissions = {
  [K in keyof typeof statement]?: (typeof statement)[K][number][]
};

/**
 * Ensure the current user (from request headers) has the given permissions.
 * Throws "Unauthorized" if no session or "Forbidden" if lacks permission.
 */
export async function requirePermissions(permissions: Permissions): Promise<void> {
  const hdrs = await headers();
  const session = await auth.api.getSession({ headers: hdrs });
  if (!session) throw new Error("Unauthorized");

  const ok = await auth.api.userHasPermission({
    headers: hdrs,
    body: {
      userId: session.session.userId,
      permissions,
    },
  });
  if (!ok) throw new Error("Forbidden");
}

/** Convenience helper for admin-only server actions */
export async function requireAdmin(): Promise<void> {
  await requirePermissions(ADMIN_PERMISSION);
}


import { requireAdminOrRedirect } from "@/lib/core/auth/permission-helpers";
import { getCurrentUser } from "@/lib/core/auth/auth-utils";
import { listManagedUsers } from "./actions";
import { UsersManager } from "./components/UsersManager";

export const dynamic = "force-dynamic";

export default async function UsersAdminPage() {
  await requireAdminOrRedirect();
  const [users, currentUser] = await Promise.all([
    listManagedUsers(),
    getCurrentUser(),
  ]);

  return (
    <UsersManager users={users} currentUserId={currentUser?.id ?? ""} />
  );
}

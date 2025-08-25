import { prisma } from "@/lib/core/database/client";
import { auth } from "@/lib/core/auth/auth";
import { requireAdmin } from "@/lib/core/auth/permission-helpers";
import { headers } from "next/headers";

type Role = "admin" | "user" | "superuser";

export const dynamic = "force-dynamic";

// Page view permissions removed

async function getData() {
  const users = await prisma.user.findMany({
    orderBy: { email: "asc" },
    select: { id: true, email: true, name: true, role: true },
  });
  return users;
}

async function updateRoleAction(formData: FormData) {
  "use server";
  await requireAdmin();
  const userId = String(formData.get("userId") || "").trim();
  const role = (String(formData.get("role") || "user").toLowerCase() as Role);
  if (!userId) return;
  await auth.api.setRole({ body: { userId, role }, headers: await headers() });
}

export default async function UsersAdminPage({ params }: { params: unknown }) {
  const users = await getData();

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Controle de Usuários</h1>
      <p className="text-sm text-gray-600 mb-6">
        Apenas administradores podem acessar esta página. Gerencie as permissões via Better Auth.
      </p>

      <table className="w-full text-sm border rounded overflow-hidden">
        <thead className="bg-gray-100">
          <tr>
            <th className="text-left p-2 border-b">Nome</th>
            <th className="text-left p-2 border-b">E-mail</th>
            <th className="text-left p-2 border-b">Papel</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-b">
              <td className="p-2">{u.name ?? "—"}</td>
              <td className="p-2">{u.email}</td>
              <td className="p-2">
                <form action={updateRoleAction} className="inline-flex gap-2 items-center">
                  <input type="hidden" name="userId" value={u.id} />
                  <select name="role" defaultValue={(u.role as Role) ?? "user"} className="border rounded px-2 py-1">
                    <option value="user">Usuário</option>
                    <option value="admin">Admin</option>
                    <option value="superuser">Superuser</option>
                  </select>
                  <button type="submit" className="text-blue-600">Salvar</button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

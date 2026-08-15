"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isAdminRole, type UserRole } from "@/lib/core/auth/user-management";
import {
  banUserAction,
  createUserAction,
  removeUserAction,
  setUserPasswordAction,
  unbanUserAction,
  updateUserRoleAction,
  type ManagedUser,
} from "../actions";
import { CreateUserDialog } from "./CreateUserDialog";
import { SetPasswordDialog } from "./SetPasswordDialog";
import { UsersTable } from "./UsersTable";

interface UsersManagerProps {
  users: ManagedUser[];
  currentUserId: string;
}

export function UsersManager({ users, currentUserId }: UsersManagerProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [passwordUser, setPasswordUser] = useState<ManagedUser | null>(null);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);

  const stats = useMemo(() => {
    return {
      total: users.length,
      admins: users.filter((user) => isAdminRole(user.role)).length,
      banned: users.filter((user) => user.banned).length,
    };
  }, [users]);

  const handleCreate = async (input: {
    name: string;
    email: string;
    password: string;
    role: UserRole;
  }) => {
    const result = await createUserAction(input);
    if (!result.success) {
      toast.error(result.error);
      return false;
    }
    toast.success("Usuário criado com sucesso");
    setCreateOpen(false);
    return true;
  };

  const handleRoleChange = async (userId: string, role: UserRole) => {
    setPendingUserId(userId);
    const result = await updateUserRoleAction({ userId, role });
    setPendingUserId(null);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Papel atualizado");
  };

  const handleSetPassword = async (userId: string, password: string) => {
    const result = await setUserPasswordAction({ userId, password });
    if (!result.success) {
      toast.error(result.error);
      return false;
    }
    toast.success("Senha definida com sucesso");
    setPasswordUser(null);
    return true;
  };

  const handleBanToggle = async (user: ManagedUser) => {
    setPendingUserId(user.id);
    const result = user.banned
      ? await unbanUserAction({ userId: user.id })
      : await banUserAction({ userId: user.id });
    setPendingUserId(null);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(user.banned ? "Usuário desbanido" : "Usuário banido");
  };

  const handleRemove = async (user: ManagedUser) => {
    setPendingUserId(user.id);
    const result = await removeUserAction({ userId: user.id });
    setPendingUserId(null);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Usuário excluído");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Usuários</h1>
            <p className="mt-2 text-gray-600">
              Crie contas com e-mail e senha e gerencie papéis de acesso
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Novo usuário
          </Button>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-sm text-gray-600">Total de usuários</div>
          </div>
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="text-2xl font-bold text-blue-600">{stats.admins}</div>
            <div className="text-sm text-gray-600">Administradores</div>
          </div>
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="text-2xl font-bold text-red-600">{stats.banned}</div>
            <div className="text-sm text-gray-600">Banidos</div>
          </div>
        </div>

        {users.length === 0 ? (
          <div className="rounded-lg bg-white p-8 text-center shadow-md">
            <Users className="mx-auto mb-4 h-12 w-12 text-gray-400" />
            <h3 className="mb-2 text-lg font-medium text-gray-900">
              Nenhum usuário cadastrado
            </h3>
            <p className="text-gray-600">
              Comece criando o primeiro usuário com e-mail e senha.
            </p>
          </div>
        ) : (
          <UsersTable
            users={users}
            currentUserId={currentUserId}
            pendingUserId={pendingUserId}
            onRoleChange={handleRoleChange}
            onSetPassword={setPasswordUser}
            onBanToggle={handleBanToggle}
            onRemove={handleRemove}
          />
        )}
      </div>

      <CreateUserDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={handleCreate}
      />

      <SetPasswordDialog
        user={passwordUser}
        onOpenChange={(open) => {
          if (!open) setPasswordUser(null);
        }}
        onSubmit={handleSetPassword}
      />
    </div>
  );
}

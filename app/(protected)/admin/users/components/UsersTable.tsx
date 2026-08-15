"use client";

import { MoreHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ROLE_LABELS,
  USER_ROLES,
  parseUserRole,
  type UserRole,
} from "@/lib/core/auth/user-management";
import type { ManagedUser } from "../actions";

interface UsersTableProps {
  users: ManagedUser[];
  currentUserId: string;
  pendingUserId: string | null;
  onRoleChange: (userId: string, role: UserRole) => Promise<void>;
  onSetPassword: (user: ManagedUser) => void;
  onBanToggle: (user: ManagedUser) => Promise<void>;
  onRemove: (user: ManagedUser) => Promise<void>;
}

function providerLabel(providers: string[]): string {
  const labels = providers.map((provider) => {
    if (provider === "credential") return "E-mail";
    if (provider === "google") return "Google";
    return provider;
  });
  return labels.length > 0 ? labels.join(", ") : "—";
}

export function UsersTable({
  users,
  currentUserId,
  pendingUserId,
  onRoleChange,
  onSetPassword,
  onBanToggle,
  onRemove,
}: UsersTableProps) {
  return (
    <div className="overflow-hidden rounded-lg bg-white shadow-md">
      <div className="border-b border-gray-200 px-6 py-4">
        <h2 className="text-lg font-medium text-gray-900">
          Usuários cadastrados ({users.length})
        </h2>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                Nome
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                E-mail
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                Acesso
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                Papel
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium tracking-wider text-gray-500 uppercase">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {users.map((user) => {
              const isSelf = user.id === currentUserId;
              const isPending = pendingUserId === user.id;
              const role = parseUserRole(user.role);

              return (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {user.name || "—"}
                      {isSelf && (
                        <span className="ml-2 text-xs text-gray-500">(você)</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{user.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {providerLabel(user.providers)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Select
                      value={role}
                      disabled={isSelf || isPending}
                      onValueChange={(value) =>
                        onRoleChange(user.id, value as UserRole)
                      }
                    >
                      <SelectTrigger className="h-8 w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {USER_ROLES.map((value) => (
                          <SelectItem key={value} value={value}>
                            {ROLE_LABELS[value]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant={user.banned ? "destructive" : "secondary"}>
                      {user.banned ? "Banido" : "Ativo"}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-right whitespace-nowrap">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={isPending}
                          aria-label={`Ações de ${user.name || user.email}`}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onSetPassword(user)}>
                          Definir senha
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={isSelf}
                          onClick={() => onBanToggle(user)}
                        >
                          {user.banned ? "Desbanir" : "Banir"}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          disabled={isSelf}
                          className="text-red-600"
                          onClick={() => {
                            const confirmed = window.confirm(
                              `Excluir o usuário ${user.email}? Esta ação não pode ser desfeita.`
                            );
                            if (confirmed) {
                              void onRemove(user);
                            }
                          }}
                        >
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

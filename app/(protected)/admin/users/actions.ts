"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/core/auth/auth";
import { getServerSession } from "@/lib/core/auth/auth-utils";
import { requireAdmin } from "@/lib/core/auth/permission-helpers";
import { prisma } from "@/lib/core/database/client";
import {
  createUserSchema,
  firstZodError,
  mapAuthError,
  setPasswordSchema,
  setRoleSchema,
  userIdSchema,
} from "@/lib/core/auth/user-management";

export type ActionResult =
  | { success: true }
  | { success: false; error: string };

export type ManagedUser = {
  id: string;
  email: string;
  name: string | null;
  role: string | null;
  banned: boolean;
  banReason: string | null;
  createdAt: string;
  emailVerified: boolean;
  providers: string[];
};

function fail(error: unknown, fallback: string): ActionResult {
  if (error instanceof z.ZodError) {
    return { success: false, error: firstZodError(error) };
  }
  if (error instanceof Error && (error.message === "Unauthorized" || error.message === "Forbidden")) {
    return { success: false, error: "Sem permissão para gerenciar usuários." };
  }
  return { success: false, error: mapAuthError(error, fallback) };
}

async function actorUserId(): Promise<string | null> {
  const session = await getServerSession();
  return session?.user?.id ?? null;
}

export async function listManagedUsers(): Promise<ManagedUser[]> {
  await requireAdmin();

  const users = await prisma.user.findMany({
    orderBy: { email: "asc" },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      banned: true,
      banReason: true,
      createdAt: true,
      emailVerified: true,
      accounts: {
        select: { providerId: true },
      },
    },
  });

  return users.map((user) => ({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    banned: Boolean(user.banned),
    banReason: user.banReason,
    createdAt: user.createdAt.toISOString(),
    emailVerified: user.emailVerified,
    providers: user.accounts.map((account) => account.providerId),
  }));
}

export async function createUserAction(input: unknown): Promise<ActionResult> {
  try {
    await requireAdmin();
    const data = createUserSchema.parse(input);

    await auth.api.createUser({
      body: {
        email: data.email,
        password: data.password,
        name: data.name,
        role: data.role,
        data: { emailVerified: true },
      },
      headers: await headers(),
    });

    revalidatePath("/admin/users");
    return { success: true };
  } catch (error) {
    return fail(error, "Erro ao criar usuário");
  }
}

export async function updateUserRoleAction(input: unknown): Promise<ActionResult> {
  try {
    await requireAdmin();
    const data = setRoleSchema.parse(input);
    const currentUserId = await actorUserId();

    if (currentUserId && data.userId === currentUserId) {
      return { success: false, error: "Você não pode alterar o próprio papel." };
    }

    await auth.api.setRole({
      body: { userId: data.userId, role: data.role },
      headers: await headers(),
    });

    revalidatePath("/admin/users");
    return { success: true };
  } catch (error) {
    return fail(error, "Erro ao atualizar papel");
  }
}

export async function setUserPasswordAction(input: unknown): Promise<ActionResult> {
  try {
    await requireAdmin();
    const data = setPasswordSchema.parse(input);

    await auth.api.setUserPassword({
      body: { userId: data.userId, newPassword: data.password },
      headers: await headers(),
    });

    revalidatePath("/admin/users");
    return { success: true };
  } catch (error) {
    return fail(error, "Erro ao definir senha");
  }
}

export async function banUserAction(input: unknown): Promise<ActionResult> {
  try {
    await requireAdmin();
    const data = userIdSchema.parse(input);
    const currentUserId = await actorUserId();

    if (currentUserId && data.userId === currentUserId) {
      return { success: false, error: "Você não pode banir a si mesmo." };
    }

    await auth.api.banUser({
      body: {
        userId: data.userId,
        banReason: "Banido por um administrador",
      },
      headers: await headers(),
    });

    revalidatePath("/admin/users");
    return { success: true };
  } catch (error) {
    return fail(error, "Erro ao banir usuário");
  }
}

export async function unbanUserAction(input: unknown): Promise<ActionResult> {
  try {
    await requireAdmin();
    const data = userIdSchema.parse(input);

    await auth.api.unbanUser({
      body: { userId: data.userId },
      headers: await headers(),
    });

    revalidatePath("/admin/users");
    return { success: true };
  } catch (error) {
    return fail(error, "Erro ao desbanir usuário");
  }
}

export async function removeUserAction(input: unknown): Promise<ActionResult> {
  try {
    await requireAdmin();
    const data = userIdSchema.parse(input);
    const currentUserId = await actorUserId();

    if (currentUserId && data.userId === currentUserId) {
      return { success: false, error: "Você não pode excluir a si mesmo." };
    }

    await auth.api.removeUser({
      body: { userId: data.userId },
      headers: await headers(),
    });

    revalidatePath("/admin/users");
    return { success: true };
  } catch (error) {
    return fail(error, "Erro ao excluir usuário");
  }
}

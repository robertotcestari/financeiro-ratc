import { z } from "zod";

export const USER_ROLES = ["user", "admin", "superuser"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const MIN_PASSWORD_LENGTH = 8;

export const ROLE_LABELS: Record<UserRole, string> = {
  user: "Usuário",
  admin: "Admin",
  superuser: "Superuser",
};

export function isAdminRole(role: string | null | undefined): boolean {
  return role === "admin" || role === "superuser";
}

export function generatePassword(length = 12): string {
  const chars = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => chars[byte % chars.length]).join("");
}

export function parseUserRole(value: string | null | undefined): UserRole {
  if (value === "admin" || value === "superuser" || value === "user") {
    return value;
  }
  return "user";
}

export const createUserSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome (mínimo 2 caracteres)"),
  email: z
    .string()
    .trim()
    .email("E-mail inválido")
    .transform((value) => value.toLowerCase()),
  password: z
    .string()
    .min(
      MIN_PASSWORD_LENGTH,
      `A senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres`
    ),
  role: z.enum(USER_ROLES),
});

export const setPasswordSchema = z.object({
  userId: z.string().min(1, "Usuário inválido"),
  password: z
    .string()
    .min(
      MIN_PASSWORD_LENGTH,
      `A senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres`
    ),
});

export const setRoleSchema = z.object({
  userId: z.string().min(1, "Usuário inválido"),
  role: z.enum(USER_ROLES),
});

export const userIdSchema = z.object({
  userId: z.string().min(1, "Usuário inválido"),
});

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  USER_ALREADY_EXISTS: "Já existe um usuário com este e-mail",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "Já existe um usuário com este e-mail",
  FAILED_TO_CREATE_USER: "Não foi possível criar o usuário",
  YOU_CANNOT_BAN_YOURSELF: "Você não pode banir a si mesmo",
  YOU_ARE_NOT_ALLOWED_TO_CREATE_USERS:
    "Sem permissão para criar usuários",
  YOU_ARE_NOT_ALLOWED_TO_CHANGE_USERS_ROLE:
    "Sem permissão para alterar papéis",
  YOU_ARE_NOT_ALLOWED_TO_BAN_USERS: "Sem permissão para banir usuários",
  YOU_ARE_NOT_ALLOWED_TO_DELETE_USERS: "Sem permissão para excluir usuários",
  YOU_ARE_NOT_ALLOWED_TO_SET_USER_PASSWORD:
    "Sem permissão para alterar senhas",
};

function readErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== "object") return undefined;
  const record = error as {
    code?: string;
    body?: { code?: string };
  };
  return record.body?.code ?? record.code;
}

function readErrorMessage(error: unknown): string | undefined {
  if (error instanceof Error && error.message) return error.message;
  if (!error || typeof error !== "object") return undefined;
  const record = error as {
    message?: string;
    body?: { message?: string };
  };
  return record.body?.message ?? record.message;
}

export function mapAuthError(error: unknown, fallback: string): string {
  const code = readErrorCode(error);
  if (code && AUTH_ERROR_MESSAGES[code]) {
    return AUTH_ERROR_MESSAGES[code];
  }

  const message = readErrorMessage(error);
  if (!message) return fallback;

  const normalized = message.toLowerCase();
  if (normalized.includes("already exists")) {
    return AUTH_ERROR_MESSAGES.USER_ALREADY_EXISTS;
  }
  if (normalized.includes("password") && normalized.includes("least")) {
    return `A senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres`;
  }

  return fallback;
}

export function firstZodError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Dados inválidos";
}

export function isPermissionGranted(
  result: { success?: boolean } | boolean | null | undefined
): boolean {
  if (typeof result === "boolean") return result;
  return result?.success === true;
}

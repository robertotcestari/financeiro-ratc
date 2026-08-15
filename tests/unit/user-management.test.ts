import { describe, expect, it } from 'vitest';
import {
  createUserSchema,
  generatePassword,
  isAdminRole,
  isPermissionGranted,
  mapAuthError,
  MIN_PASSWORD_LENGTH,
  parseUserRole,
  setPasswordSchema,
  setRoleSchema,
} from '@/lib/core/auth/user-management';

describe('user management helpers', () => {
  describe('isAdminRole', () => {
    it('accepts admin and superuser', () => {
      expect(isAdminRole('admin')).toBe(true);
      expect(isAdminRole('superuser')).toBe(true);
    });

    it('rejects regular users and empty values', () => {
      expect(isAdminRole('user')).toBe(false);
      expect(isAdminRole(null)).toBe(false);
      expect(isAdminRole(undefined)).toBe(false);
    });
  });

  describe('parseUserRole', () => {
    it('returns known roles and defaults to user', () => {
      expect(parseUserRole('admin')).toBe('admin');
      expect(parseUserRole('superuser')).toBe('superuser');
      expect(parseUserRole('user')).toBe('user');
      expect(parseUserRole('unknown')).toBe('user');
      expect(parseUserRole(null)).toBe('user');
    });
  });

  describe('createUserSchema', () => {
    it('accepts a valid payload and normalizes email', () => {
      const result = createUserSchema.parse({
        name: 'Maria Silva',
        email: '  Maria@RATC.com  ',
        password: 'senha-segura',
        role: 'user',
      });

      expect(result.email).toBe('maria@ratc.com');
      expect(result.role).toBe('user');
    });

    it('rejects short name, invalid email and short password', () => {
      const result = createUserSchema.safeParse({
        name: 'A',
        email: 'nao-e-email',
        password: '123',
        role: 'user',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('setPasswordSchema', () => {
    it('requires the minimum password length', () => {
      const invalid = setPasswordSchema.safeParse({
        userId: 'user-1',
        password: '1234567',
      });
      const valid = setPasswordSchema.safeParse({
        userId: 'user-1',
        password: '12345678',
      });

      expect(invalid.success).toBe(false);
      expect(valid.success).toBe(true);
      expect(MIN_PASSWORD_LENGTH).toBe(8);
    });
  });

  describe('setRoleSchema', () => {
    it('rejects unknown roles', () => {
      const result = setRoleSchema.safeParse({
        userId: 'user-1',
        role: 'owner',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('mapAuthError', () => {
    it('maps known Better Auth codes', () => {
      expect(
        mapAuthError({ body: { code: 'USER_ALREADY_EXISTS' } }, 'fallback')
      ).toBe('Já existe um usuário com este e-mail');
    });

    it('maps already-exists messages without a code', () => {
      expect(mapAuthError(new Error('User already exists'), 'fallback')).toBe(
        'Já existe um usuário com este e-mail'
      );
    });

    it('returns the fallback for unknown errors', () => {
      expect(mapAuthError({}, 'Erro ao criar usuário')).toBe(
        'Erro ao criar usuário'
      );
    });
  });

  describe('isPermissionGranted', () => {
    it('supports boolean and object responses', () => {
      expect(isPermissionGranted(true)).toBe(true);
      expect(isPermissionGranted(false)).toBe(false);
      expect(isPermissionGranted({ success: true })).toBe(true);
      expect(isPermissionGranted({ success: false })).toBe(false);
      expect(isPermissionGranted(null)).toBe(false);
    });
  });

  describe('generatePassword', () => {
    it('generates a password with the requested length', () => {
      const password = generatePassword(12);
      expect(password).toHaveLength(12);
      expect(password).toMatch(/^[a-zA-Z0-9]+$/);
    });
  });
});

import type { Prisma, Vendor } from '@/app/generated/prisma';
import { prisma } from './client';
import { PayableError } from '@/lib/core/payables/errors';

export type VendorInput = {
  name: string;
  document?: string | null;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  isActive?: boolean;
  defaultCategoryId?: string | null;
  defaultPropertyId?: string | null;
};

function emptyToNull(value?: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export async function listVendors(params?: {
  isActive?: boolean;
  search?: string;
}): Promise<Vendor[]> {
  const where: Prisma.VendorWhereInput = {};
  if (params?.isActive !== undefined) {
    where.isActive = params.isActive;
  }
  if (params?.search?.trim()) {
    const search = params.search.trim();
    where.OR = [
      { name: { contains: search } },
      { document: { contains: search } },
    ];
  }

  return prisma.vendor.findMany({
    where,
    include: {
      defaultCategory: { select: { id: true, name: true } },
      defaultProperty: { select: { id: true, code: true } },
    },
    orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
  });
}

export async function getVendorById(id: string) {
  return prisma.vendor.findUnique({
    where: { id },
    include: {
      defaultCategory: { select: { id: true, name: true } },
      defaultProperty: { select: { id: true, code: true } },
    },
  });
}

export async function createVendor(input: VendorInput): Promise<Vendor> {
  const name = input.name.trim();
  if (!name) {
    throw new PayableError('Nome do fornecedor é obrigatório', 'invalid_name');
  }

  try {
    return await prisma.vendor.create({
      data: {
        name,
        document: emptyToNull(input.document),
        email: emptyToNull(input.email),
        phone: emptyToNull(input.phone),
        notes: emptyToNull(input.notes),
        isActive: input.isActive ?? true,
        defaultCategoryId: emptyToNull(input.defaultCategoryId),
        defaultPropertyId: emptyToNull(input.defaultPropertyId),
      },
    });
  } catch (error) {
    if (
      typeof error === 'object' &&
      error &&
      (error as { code?: string }).code === 'P2002'
    ) {
      throw new PayableError(
        'Já existe um fornecedor com este documento',
        'duplicate_document'
      );
    }
    throw error;
  }
}

export async function updateVendor(
  id: string,
  input: VendorInput
): Promise<Vendor> {
  const existing = await prisma.vendor.findUnique({ where: { id } });
  if (!existing) {
    throw new PayableError('Fornecedor não encontrado', 'not_found');
  }

  const name = input.name.trim();
  if (!name) {
    throw new PayableError('Nome do fornecedor é obrigatório', 'invalid_name');
  }

  try {
    return await prisma.vendor.update({
      where: { id },
      data: {
        name,
        document: emptyToNull(input.document),
        email: emptyToNull(input.email),
        phone: emptyToNull(input.phone),
        notes: emptyToNull(input.notes),
        isActive: input.isActive ?? existing.isActive,
        defaultCategoryId: emptyToNull(input.defaultCategoryId),
        defaultPropertyId: emptyToNull(input.defaultPropertyId),
      },
    });
  } catch (error) {
    if (
      typeof error === 'object' &&
      error &&
      (error as { code?: string }).code === 'P2002'
    ) {
      throw new PayableError(
        'Já existe um fornecedor com este documento',
        'duplicate_document'
      );
    }
    throw error;
  }
}

export async function deactivateVendor(id: string): Promise<Vendor> {
  const existing = await prisma.vendor.findUnique({ where: { id } });
  if (!existing) {
    throw new PayableError('Fornecedor não encontrado', 'not_found');
  }

  return prisma.vendor.update({
    where: { id },
    data: { isActive: false },
  });
}

import { prisma } from './client';

export async function getFormCategories() {
  return await prisma.category.findMany({
    select: {
      id: true,
      name: true,
      level: true,
      orderIndex: true,
      parentId: true,
    },
    orderBy: [
      { level: 'asc' },
      { orderIndex: 'asc' },
      { name: 'asc' },
    ],
  });
}

export async function getFormProperties() {
  return await prisma.property.findMany({
    where: {
      isActive: true,
    },
    select: {
      id: true,
      code: true,
      description: true,
      city: true,
      address: true,
    },
    orderBy: [
      { city: 'asc' },
      { code: 'asc' },
    ],
  });
}

export async function getFormBankAccounts() {
  return await prisma.bankAccount.findMany({
    select: {
      id: true,
      name: true,
      bankName: true,
      accountType: true,
      isActive: true,
    },
    orderBy: [
      { isActive: 'desc' },
      { name: 'asc' },
    ],
  });
}
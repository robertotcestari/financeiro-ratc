import { prisma } from './client';
import type { SavedFile } from '@/app/generated/prisma';

export async function createSavedFile(params: {
  fileName: string;
  path: string;
  type: 'DRE' | 'ALUGUEIS';
  savedAt?: Date;
  metadata?: any; // Optional metadata for additional context
}): Promise<SavedFile> {
  const { fileName, path, type, savedAt } = params;
  return prisma.savedFile.create({
    data: {
      fileName,
      path,
      type: type as any,
      ...(savedAt ? { savedAt } : {}),
    },
  });
}

export async function listSavedFiles(limit = 50): Promise<SavedFile[]> {
  return prisma.savedFile.findMany({
    orderBy: { savedAt: 'desc' },
    take: limit,
  });
}

export async function findSavedFileByDRE(year: number, month: number) {
  const padded = String(month).padStart(2, '0');
  const fileName = `DRE_${year}_${padded}.pdf`;
  // Search by exact name and type
  return prisma.savedFile.findFirst({
    where: {
      fileName,
      // Use string to avoid enum codegen timing issues
      type: 'DRE' as any,
    },
    orderBy: { savedAt: 'desc' },
  });
}

export async function findSavedFileByRentPayments(year: number, month: number) {
  const padded = String(month).padStart(2, '0');
  const fileName = `Alugueis_${year}_${padded}.pdf`;
  // Search by exact name and type
  return prisma.savedFile.findFirst({
    where: {
      fileName,
      // Use string to avoid enum codegen timing issues
      type: 'ALUGUEIS' as any,
    },
    orderBy: { savedAt: 'desc' },
  });
}

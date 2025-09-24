import { prisma } from './client';
import type { Prisma, SavedFile } from '@/app/generated/prisma';

export async function createSavedFile(params: {
  fileName: string;
  path: string;
  type: 'DRE' | 'ALUGUEIS' | 'TRIBUTACAO';
  savedAt?: Date;
  metadata?: unknown; // Optional metadata for additional context
}): Promise<SavedFile> {
  const { fileName, path, type, savedAt } = params;
  return prisma.savedFile.create({
    data: {
      fileName,
      path,
      type: type as Prisma.$Enums.SavedFileType,
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
      type: 'DRE' as Prisma.$Enums.SavedFileType,
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
      type: 'ALUGUEIS' as Prisma.$Enums.SavedFileType,
    },
    orderBy: { savedAt: 'desc' },
  });
}

export async function findSavedFileByTributacao(year: number, month: number) {
  const padded = String(month).padStart(2, '0');
  const fileName = `Tributacao_${year}_${padded}.pdf`;
  return prisma.savedFile.findFirst({
    where: {
      fileName,
      type: 'TRIBUTACAO' as Prisma.$Enums.SavedFileType,
    },
    orderBy: { savedAt: 'desc' },
  });
}

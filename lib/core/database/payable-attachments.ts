import { prisma } from './client';
import { PayableError } from '@/lib/core/payables/errors';
import { uploadPdfToS3 } from '@/lib/core/storage/s3';
import type { PayableAttachmentPurpose } from '@/app/generated/prisma';

export async function listPayableAttachments(payableId: string) {
  return prisma.payableAttachment.findMany({
    where: { payableId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createPayableAttachment(params: {
  payableId: string;
  installmentId?: string | null;
  title: string;
  fileName: string;
  contentType?: string | null;
  sizeBytes?: number | null;
  body: Buffer;
  purpose?: PayableAttachmentPurpose;
  createdById?: string | null;
}) {
  const payable = await prisma.payable.findUnique({
    where: { id: params.payableId },
  });
  if (!payable) {
    throw new PayableError('Título não encontrado', 'not_found');
  }

  const key = `payables/${params.payableId}/${Date.now()}-${params.fileName}`;
  const uploaded = await uploadPdfToS3({
    key,
    body: params.body,
    contentType: params.contentType ?? 'application/octet-stream',
  });

  return prisma.payableAttachment.create({
    data: {
      payableId: params.payableId,
      installmentId: params.installmentId || null,
      title: params.title.trim() || params.fileName,
      fileName: params.fileName,
      contentType: params.contentType || null,
      sizeBytes: params.sizeBytes ?? params.body.length,
      storageKey: uploaded.key,
      referenceUrl: uploaded.url,
      purpose: params.purpose ?? 'SUPPORTING_DOCUMENT',
      createdById: params.createdById || null,
    },
  });
}

export async function deletePayableAttachment(id: string) {
  const existing = await prisma.payableAttachment.findUnique({
    where: { id },
  });
  if (!existing) {
    throw new PayableError('Anexo não encontrado', 'not_found');
  }

  await prisma.payableAttachment.delete({ where: { id } });
  return existing;
}

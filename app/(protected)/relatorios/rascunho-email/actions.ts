'use server';

import { createSavedFile } from '@/lib/core/database/saved-files';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { getS3Config, uploadPdfToS3 } from '@/lib/core/storage/s3';

export async function saveGeneratedDREToStorage(params: {
  base64: string; // PDF base64 sem prefixo
  fileName: string;
}): Promise<{ ok: true; path: string } | { ok: false; error: string }> {
  const { base64, fileName } = params;
  try {
    const buffer = Buffer.from(base64, 'base64');

    // S3 (se configurado)
    const s3 = getS3Config();
    if (s3) {
      const key = `dre/${new Date().getFullYear()}/${Date.now()}_${fileName}`;
      await uploadPdfToS3({ key, body: buffer, contentType: 'application/pdf' });
      const pathValue = `s3://${s3.bucket}/${key}`;
      await createSavedFile({ fileName, path: pathValue, type: 'DRE' });
      return { ok: true, path: pathValue };
    }

    // Local fallback: salva em backups/generated-reports
    const dir = join(process.cwd(), 'backups', 'generated-reports');
    await mkdir(dir, { recursive: true });
    const target = join(dir, fileName);
    await writeFile(target, buffer);

    const pathValue = `file://${target}`;

    // Salva metadados na base
    await createSavedFile({ fileName, path: pathValue, type: 'DRE' });

    return { ok: true, path: pathValue };
  } catch (e: any) {
    console.error('saveGeneratedDREToStorage error:', e);
    return { ok: false, error: e?.message || 'unknown_error' };
  }
}

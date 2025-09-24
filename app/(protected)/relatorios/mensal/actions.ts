'use server';

import { createSavedFile } from '@/lib/core/database/saved-files';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { getS3Config, uploadPdfToS3 } from '@/lib/core/storage/s3';
import { prisma } from '@/lib/core/database/client';
import { Prisma } from '@/app/generated/prisma';
import { calculateFinancialIndicators } from '@/lib/core/database/dre';
import { listInadimplentes } from '@/lib/core/database/inadimplentes';
import { findSavedFileByDRE } from '@/lib/core/database/saved-files';

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

export async function getRentPayments(month: number, year: number) {
  const where: Prisma.ProcessedTransactionWhereInput = {
    category: {
      OR: [
        { name: { equals: 'Aluguel' } },
        { name: { equals: 'Aluguel de Terceiros' } }
      ]
    },
    year,
    month
  };

  const transactions = await prisma.processedTransaction.findMany({
    where,
    include: {
      transaction: {
        include: {
          bankAccount: true
        }
      },
      property: true,
      category: true
    },
    orderBy: [
      { property: { code: 'asc' } },
      { transaction: { date: 'asc' } }
    ]
  });

  return transactions.map(t => ({
    id: t.id,
    date: t.transaction?.date || new Date(),
    propertyId: t.propertyId || t.property?.id || null,
    propertyCode: t.property?.code || '',
    propertyAddress: t.property?.address || '',
    propertyCity: t.property?.city || '',
    tenant: t.details || t.transaction?.description || '',
    amount: Number(t.transaction?.amount || 0),
    bankAccount: t.transaction?.bankAccount?.name || 'N/A',
    category: t.category?.name || 'N/A'
  }));
}

export async function saveGeneratedRentPaymentsToStorage(params: {
  base64: string; // PDF base64 sem prefixo
  fileName: string;
  month: number;
  year: number;
}): Promise<{ ok: true; path: string } | { ok: false; error: string }> {
  const { base64, fileName, month, year } = params;
  try {
    const buffer = Buffer.from(base64, 'base64');

    // S3 (se configurado)
    const s3 = getS3Config();
    if (s3) {
      const key = `alugueis/${year}/${Date.now()}_${fileName}`;
      await uploadPdfToS3({ key, body: buffer, contentType: 'application/pdf' });
      const pathValue = `s3://${s3.bucket}/${key}`;
      await createSavedFile({ fileName, path: pathValue, type: 'ALUGUEIS', metadata: { month, year } });
      return { ok: true, path: pathValue };
    }

    // Local fallback: salva em backups/generated-reports
    const dir = join(process.cwd(), 'backups', 'generated-reports', 'alugueis');
    await mkdir(dir, { recursive: true });
    const target = join(dir, fileName);
    await writeFile(target, buffer);

    const pathValue = `file://${target}`;

    // Salva metadados na base
    await createSavedFile({ fileName, path: pathValue, type: 'ALUGUEIS', metadata: { month, year } });

    return { ok: true, path: pathValue };
  } catch (e: any) {
    console.error('saveGeneratedRentPaymentsToStorage error:', e);
    return { ok: false, error: e?.message || 'unknown_error' };
  }
}

export async function sendMonthlyReportEmail(params: {
  month: number;
  year: number;
  to?: string;
  recipients?: string[];
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  'use server';

  const { month, year, to, recipients } = params;

  try {
    // Import here to avoid issues with server components
    const { sendEmail } = await import('@/lib/core/email');
    const { renderMonthlyReportEmail } = await import('@/lib/core/email/templates');

    // Get data for the report
    const [indicators, inadimplentes, rentPayments] = await Promise.all([
      calculateFinancialIndicators(year, month),
      listInadimplentes(),
      getRentPayments(month, year),
    ]);

    // Get previous month for comparison
    const prevMonth = (y: number, m: number) => {
      if (m === 1) return { year: y - 1, month: 12 };
      return { year: y, month: m - 1 };
    };

    const p1 = prevMonth(year, month);

    const indP1 = await calculateFinancialIndicators(p1.year, p1.month);

    // Prepare DRE data for email (2 months only)
    const dreData = [
      {
        label: new Date(p1.year, p1.month - 1, 1)
          .toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
          .replace('.', ''),
        values: {
          receitasOperacionais: indP1.totalReceitasOperacionais,
          despesasOperacionais: indP1.totalDespesasOperacionais,
          lucroOperacional: indP1.lucroOperacional,
          receitasEDespesasNaoOperacionais:
            indP1.totalReceitasNaoOperacionais + indP1.totalDespesasNaoOperacionais,
          resultadoDeCaixa: indP1.resultadoDeCaixa,
        },
      },
      {
        label: new Date(year, month - 1, 1)
          .toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
          .replace('.', ''),
        values: {
          receitasOperacionais: indicators.totalReceitasOperacionais,
          despesasOperacionais: indicators.totalDespesasOperacionais,
          lucroOperacional: indicators.lucroOperacional,
          receitasEDespesasNaoOperacionais:
            indicators.totalReceitasNaoOperacionais + indicators.totalDespesasNaoOperacionais,
          resultadoDeCaixa: indicators.resultadoDeCaixa,
        },
      },
    ];

    // Transform inadimplentes data
    const properties = await prisma.property.findMany({
      select: { id: true, code: true, address: true, city: true },
    });
    const propertyMap = Object.fromEntries(
      properties.map((p) => [p.id, { code: p.code, address: p.address, city: p.city }])
    );

    const { daysOverdueFrom } = await import('@/lib/utils/date-helpers');
    const calculateDaysOverdue = (dueDate: string): number => daysOverdueFrom(dueDate);

    const transformedInadimplentes = inadimplentes
      .filter((item) => !item.data.settled)
      .map((item) => {
        const property = propertyMap[item.data.propertyId];
        const propertyDisplay = property
          ? `${property.code} - ${property.address}${property.city ? `, ${property.city}` : ''}`
          : 'Imóvel não encontrado';

        return {
          id: item.id,
          nome: item.data.tenant,
          imovel: propertyDisplay,
          valor: item.data.amount,
          diasAtraso: calculateDaysOverdue(item.data.dueDate),
        };
      });

    // Get S3 URLs for reports if available
    const getPublicUrlFromPath = (path: string): string | null => {
      if (path.startsWith('s3://')) {
        const without = path.replace('s3://', '');
        const parts = without.split('/');
        const bucket = parts.shift() as string;
        const key = parts.join('/');
        const base = process.env.S3_PUBLIC_BASE_URL || (process.env.AWS_REGION ? `https://${bucket}.s3.${process.env.AWS_REGION}.amazonaws.com` : null);
        if (base) return `${base.replace(/\/$/, '')}/${key}`;
      }
      return null;
    };

    // Get existing DRE file
    const existingDreFile = await findSavedFileByDRE(year, month);
    const dreReportUrl = existingDreFile?.path ? getPublicUrlFromPath(existingDreFile.path) || undefined : undefined;

    // Find rent payments PDF if available
    const { findSavedFileByRentPayments } = await import('@/lib/core/database/saved-files');
    const existingRentFile = await findSavedFileByRentPayments(year, month);
    const rentReportUrl = existingRentFile?.path ? getPublicUrlFromPath(existingRentFile.path) || undefined : undefined;

    // Render email HTML
    const html = await renderMonthlyReportEmail({
      month,
      year,
      inadimplentes: transformedInadimplentes,
      rentPayments,
      dreData,
      dreReportUrl,
      rentReportUrl,
    });

    // Send email
    // Priority: recipients array > to parameter > env variable
    const emailTo = recipients && recipients.length > 0 
      ? recipients.join(', ') 
      : (to || process.env.MAILGUN_TO_EMAIL);
      
    if (!emailTo) {
      throw new Error('No email recipient specified. Provide recipients or set MAILGUN_TO_EMAIL environment variable.');
    }

    const subjectDate = new Date(year, month - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).replace(' ', ' de ');
    const result = await sendEmail({
      to: emailTo,
      subject: `[RATC] Relatório Mensal - ${subjectDate}`,
      html,
    });

    return result;
  } catch (error: any) {
    console.error('Error sending monthly report email:', error);
    return {
      success: false,
      error: error.message || 'Unknown error occurred while sending email',
    };
  }
}

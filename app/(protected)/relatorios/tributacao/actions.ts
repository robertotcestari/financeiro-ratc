'use server';

import { revalidatePath } from 'next/cache';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';

import {
  getTributacaoDefaults,
  updateTributacaoDefaultField,
  updateTributacaoZeroFlag,
} from '@/lib/core/database/tributacao-defaults';
import type { TributacaoNumericField } from '@/lib/core/database/tributacao-defaults';
import { getS3Config, uploadPdfToS3 } from '@/lib/core/storage/s3';
import { createSavedFile, findSavedFileByTributacao } from '@/lib/core/database/saved-files';
import { getRentPayments } from '@/app/(protected)/relatorios/mensal/actions';
import { formatCurrency } from '@/lib/formatters';

export async function loadTributacaoDefaults() {
  return getTributacaoDefaults();
}

export async function updateDefaultValueAction(params: {
  propertyId: string;
  field: TributacaoNumericField;
  value: number;
}) {
  const { propertyId, field, value } = params;
  if (!propertyId) {
    return {
      success: false,
      error: 'missing_property_id',
    } as const;
  }

  await updateTributacaoDefaultField(propertyId, field, value);
  revalidatePath('/relatorios/tributacao');
  return { success: true } as const;
}

export async function updateZeroFlagAction(params: {
  propertyId: string;
  forceZero: boolean;
}) {
  const { propertyId, forceZero } = params;
  if (!propertyId) {
    return {
      success: false,
      error: 'missing_property_id',
    } as const;
  }

  await updateTributacaoZeroFlag(propertyId, forceZero);
  revalidatePath('/relatorios/tributacao');
  return { success: true } as const;
}

export async function saveGeneratedTributacaoReportToStorage(params: {
  base64: string;
  fileName: string;
  month: number;
  year: number;
}): Promise<{ ok: true; path: string } | { ok: false; error: string }> {
  const { base64, fileName, month, year } = params;
  try {
    const buffer = Buffer.from(base64, 'base64');

    const s3 = getS3Config();
    if (s3) {
      const key = `tributacao/${year}/${Date.now()}_${fileName}`;
      await uploadPdfToS3({ key, body: buffer, contentType: 'application/pdf' });
      const pathValue = `s3://${s3.bucket}/${key}`;
      await createSavedFile({
        fileName,
        path: pathValue,
        type: 'TRIBUTACAO',
        metadata: { month, year },
      });
      return { ok: true, path: pathValue };
    }

    const dir = join(process.cwd(), 'backups', 'generated-reports', 'tributacao');
    await mkdir(dir, { recursive: true });
    const target = join(dir, fileName);
    await writeFile(target, buffer);
    const pathValue = `file://${target}`;
    await createSavedFile({
      fileName,
      path: pathValue,
      type: 'TRIBUTACAO',
      metadata: { month, year },
    });
    return { ok: true, path: pathValue };
  } catch (error: unknown) {
    console.error('saveGeneratedTributacaoReportToStorage error:', error);
    const message = error instanceof Error ? error.message : 'unknown_error';
    return { ok: false, error: message };
  }
}

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const getPublicUrlFromPath = (path: string): string | null => {
  if (path.startsWith('s3://')) {
    const without = path.replace('s3://', '');
    const parts = without.split('/');
    const bucket = parts.shift() as string;
    const key = parts.join('/');
    const base =
      process.env.S3_PUBLIC_BASE_URL ||
      (process.env.AWS_REGION
        ? `https://${bucket}.s3.${process.env.AWS_REGION}.amazonaws.com`
        : null);
    if (base) return `${base.replace(/\/$/, '')}/${key}`;
  }
  return null;
};

export async function sendTributacaoReportEmail(params: {
  month: number;
  year: number;
  to?: string;
  recipients?: string[];
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  'use server';

  const { month, year, to, recipients } = params;

  try {
    const { sendEmail } = await import('@/lib/core/email');

    const [rentPayments, defaults, savedFile] = await Promise.all([
      getRentPayments(month, year),
      getTributacaoDefaults(),
      findSavedFileByTributacao(year, month),
    ]);

    interface AggregatedRow {
      key: string;
      propertyLabel: string;
      amount: number;
      condominio: number;
      iptu: number;
      nonTaxable: number;
      taxable: number;
      forceZero: boolean;
    }

    const aggregated = new Map<string, AggregatedRow>();

    for (const payment of rentPayments) {
      const propertyKey = payment.propertyId || payment.propertyCode || payment.id;
      const defaultsEntry = payment.propertyId ? defaults[payment.propertyId] : undefined;
      const labelParts = [payment.propertyCode, payment.propertyAddress, payment.propertyCity]
        .filter(Boolean)
        .join(' — ');
      const propertyLabel = labelParts || payment.propertyCode || '—';
      const base = aggregated.get(propertyKey) ?? {
        key: propertyKey,
        propertyLabel,
        amount: 0,
        condominio: defaultsEntry?.condominio ?? 0,
        iptu: defaultsEntry?.iptu ?? 0,
        nonTaxable: defaultsEntry?.nonTaxable ?? 0,
        taxable: 0,
        forceZero: defaultsEntry?.forceZero ?? false,
      };

      base.amount += Number(payment.amount ?? 0);
      base.condominio = defaultsEntry?.condominio ?? base.condominio;
      base.iptu = defaultsEntry?.iptu ?? base.iptu;
      base.nonTaxable = defaultsEntry?.nonTaxable ?? base.nonTaxable;
      base.forceZero = defaultsEntry?.forceZero ?? base.forceZero;
      const baseTaxable = Math.max(0, base.amount - base.condominio - base.iptu - base.nonTaxable);
      base.taxable = base.forceZero ? 0 : baseTaxable;

      aggregated.set(propertyKey, base);
    }

    const rows = Array.from(aggregated.values()).sort((a, b) =>
      a.propertyLabel.localeCompare(b.propertyLabel)
    );

    const totals = rows.reduce(
      (acc, row) => {
        acc.amount += row.amount;
        acc.condominio += row.condominio;
        acc.iptu += row.iptu;
        acc.nonTaxable += row.nonTaxable;
        acc.taxable += row.taxable;
        return acc;
      },
      { amount: 0, condominio: 0, iptu: 0, nonTaxable: 0, taxable: 0 }
    );

    const tableRowsHtml = rows
      .map(
        (row) => `
          <tr>
            <td style="padding: 8px 12px; border: 1px solid #e5e7eb; text-align: left;">
              ${escapeHtml(row.propertyLabel)}
            </td>
            <td style="padding: 8px 12px; border: 1px solid #e5e7eb; text-align: right;">
              ${formatCurrency(row.amount)}
            </td>
            <td style="padding: 8px 12px; border: 1px solid #e5e7eb; text-align: right;">
              ${formatCurrency(row.condominio)}
            </td>
            <td style="padding: 8px 12px; border: 1px solid #e5e7eb; text-align: right;">
              ${formatCurrency(row.iptu)}
            </td>
            <td style="padding: 8px 12px; border: 1px solid #e5e7eb; text-align: right;">
              ${formatCurrency(row.nonTaxable)}
            </td>
            <td style="padding: 8px 12px; border: 1px solid #e5e7eb; text-align: right; font-weight: 600; color: #1d4ed8;">
              ${formatCurrency(row.taxable)}
            </td>
          </tr>
        `
      )
      .join('');

    const totalsRowHtml = `
      <tr style="background-color: #f3f4f6; font-weight: 600;">
        <td style="padding: 10px 12px; border: 1px solid #d1d5db; text-align: left;">TOTAL</td>
        <td style="padding: 10px 12px; border: 1px solid #d1d5db; text-align: right;">${formatCurrency(
          totals.amount
        )}</td>
        <td style="padding: 10px 12px; border: 1px solid #d1d5db; text-align: right;">${formatCurrency(
          totals.condominio
        )}</td>
        <td style="padding: 10px 12px; border: 1px solid #d1d5db; text-align: right;">${formatCurrency(
          totals.iptu
        )}</td>
        <td style="padding: 10px 12px; border: 1px solid #d1d5db; text-align: right;">${formatCurrency(
          totals.nonTaxable
        )}</td>
        <td style="padding: 10px 12px; border: 1px solid #d1d5db; text-align: right; color: #1d4ed8;">${formatCurrency(
          totals.taxable
        )}</td>
      </tr>
    `;

    const monthLabel = new Date(year, month - 1, 1).toLocaleDateString('pt-BR', {
      month: 'long',
      year: 'numeric',
    });

    const pdfLink = savedFile?.path ? getPublicUrlFromPath(savedFile.path) : null;

    const html = `<!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <meta charSet="utf-8" />
          <title>Relatório de Tributação</title>
        </head>
        <body style="font-family: Arial, sans-serif; background-color: #f3f4f6; padding: 24px;">
          <div style="max-width: 800px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 24px;">
            <h1 style="margin: 0 0 24px; color: #111827; font-size: 20px;">
              [RATC] Relatório de Tributação - ${escapeHtml(monthLabel.replace(' ', ' de '))}
            </h1>
            <p style="color: #4b5563; font-size: 14px; line-height: 1.6;">
              Segue resumo dos aluguéis recebidos e respectivos abatimentos utilizados para apuração da receita tributável.
            </p>
            <ul style="color: #4b5563; font-size: 13px; line-height: 1.6; margin: 16px 0 24px 20px;">
              <li>Totais consolidados por imóvel</li>
              <li>Campos editáveis (condomínio, IPTU e valores não tributáveis) aplicados automaticamente</li>
              <li>Receita tributável calculada e destacada</li>
              ${pdfLink ? `<li>PDF salvo em: <a href="${pdfLink}" target="_blank" rel="noreferrer">abrir relatório tributação</a></li>` : ''}
            </ul>
            ${rows.length === 0
              ? `<p style="color: #6b7280; font-size: 14px;">Nenhum aluguel recebido foi contabilizado para o período.</p>`
              : `<div style="overflow-x: auto;">
                  <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                    <thead>
                      <tr style="background-color: #111827; color: #fff;">
                        <th style="padding: 10px 12px; text-align: left;">Imóvel</th>
                        <th style="padding: 10px 12px; text-align: right;">Valor Recebido</th>
                        <th style="padding: 10px 12px; text-align: right;">Condomínio</th>
                        <th style="padding: 10px 12px; text-align: right;">IPTU</th>
                        <th style="padding: 10px 12px; text-align: right;">Não Tributável</th>
                        <th style="padding: 10px 12px; text-align: right;">Receita Tributável</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${tableRowsHtml}
                      ${totalsRowHtml}
                    </tbody>
                  </table>
                </div>`}
            <p style="margin-top: 28px; color: #9ca3af; font-size: 12px;">
              Este email foi enviado automaticamente pelo Financeiro RATC.
            </p>
          </div>
        </body>
      </html>`;

    const emailTo =
      recipients && recipients.length > 0
        ? recipients.join(', ')
        : to || process.env.MAILGUN_TO_EMAIL;

    if (!emailTo) {
      throw new Error(
        'No email recipient specified. Provide recipients or set MAILGUN_TO_EMAIL environment variable.'
      );
    }

    const subjectDate = monthLabel.replace(' ', ' de ');
    const result = await sendEmail({
      to: emailTo,
      subject: `[RATC] Relatório Tributação - ${subjectDate}`,
      html,
    });

    return result;
  } catch (error: unknown) {
    console.error('Error sending tributação report email:', error);
    const message = error instanceof Error ? error.message : 'Unknown error occurred while sending email';
    return {
      success: false,
      error: message,
    };
  }
}

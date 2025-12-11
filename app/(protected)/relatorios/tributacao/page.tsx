import Link from 'next/link';
import { FileText as FileTextIcon, Mail } from 'lucide-react';

import MonthFilters from '@/app/(protected)/relatorios/mensal/components/MonthFilters';
import { getRentPayments } from '@/app/(protected)/relatorios/mensal/actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TaxationTable } from './components/TaxationTable';
import { loadTributacaoDefaults } from './actions';
import { findSavedFileByTributacao } from '@/lib/core/database/saved-files';
import { ExportTributacaoReportButton } from './components/ExportTributacaoReportButton';
import { SendTributacaoEmailButton } from './components/SendTributacaoEmailButton';
import { formatCurrency } from '@/lib/formatters';

interface SearchParams {
  mes?: string;
  ano?: string;
}

export default async function TributacaoReportPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  const today = new Date();
  const previousMonth = today.getMonth();
  const previousYear = previousMonth === 0 ? today.getFullYear() - 1 : today.getFullYear();

  const parsedMonth = params.mes ? Number.parseInt(params.mes, 10) : Number.NaN;
  const parsedYear = params.ano ? Number.parseInt(params.ano, 10) : Number.NaN;

  const mes = Number.isNaN(parsedMonth)
    ? previousMonth === 0
      ? 12
      : previousMonth
    : parsedMonth;

  const ano = Number.isNaN(parsedYear) ? previousYear : parsedYear;

  const [rentPayments, defaults, existingFile] = await Promise.all([
    getRentPayments(mes, ano),
    loadTributacaoDefaults(),
    findSavedFileByTributacao(ano, mes),
  ]);

  const tableRows = rentPayments.map((payment) => ({
    id: payment.id,
    propertyId: payment.propertyId ?? null,
    propertyCode: payment.propertyCode,
    propertyAddress: payment.propertyAddress,
    propertyCity: payment.propertyCity,
    amount: payment.amount,
  }));

  const aggregatedMap = new Map<
    string,
    {
      propertyId: string | null;
      propertyCode: string;
      propertyLabel: string;
      amount: number;
      condominio: number;
      iptu: number;
      nonTaxable: number;
      taxable: number;
      forceZero: boolean;
    }
  >();

  for (const row of tableRows) {
    const key = row.propertyId ?? row.propertyCode ?? row.id;
    const defaultsEntry = row.propertyId ? defaults[row.propertyId] : undefined;
    const propertyLabel = [row.propertyCode, row.propertyAddress, row.propertyCity]
      .filter(Boolean)
      .join(' — ') || row.propertyCode || '—';
    const base = aggregatedMap.get(key) ?? {
      propertyId: row.propertyId,
      propertyCode: row.propertyCode,
      propertyLabel,
      amount: 0,
      condominio: defaultsEntry?.condominio ?? 0,
      iptu: defaultsEntry?.iptu ?? 0,
      nonTaxable: defaultsEntry?.nonTaxable ?? 0,
      taxable: 0,
      forceZero: defaultsEntry?.forceZero ?? false,
    };

    base.amount += row.amount;
    base.condominio = defaultsEntry?.condominio ?? base.condominio;
    base.iptu = defaultsEntry?.iptu ?? base.iptu;
    base.nonTaxable = defaultsEntry?.nonTaxable ?? base.nonTaxable;
    base.forceZero = defaultsEntry?.forceZero ?? base.forceZero;
    const taxableBase = Math.max(0, base.amount - base.condominio - base.iptu - base.nonTaxable);
    base.taxable = base.forceZero ? 0 : taxableBase;

    aggregatedMap.set(key, base);
  }

  const reportRowsAll = Array.from(aggregatedMap.values()).sort((a, b) =>
    a.propertyLabel.localeCompare(b.propertyLabel)
  );

  const reportRows = reportRowsAll.filter((row) => {
    const values = [row.amount, row.condominio, row.iptu, row.nonTaxable, row.taxable];
    return values.some((value) => Math.abs(value) > 0.0001);
  });

  const totals = reportRows.reduce(
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

  const mailgunConfigured = Boolean(
    process.env.MAILGUN_API_KEY && process.env.MAILGUN_DOMAIN
  );

  const subjectDate = new Date(ano, mes - 1, 1)
    .toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    .replace(' ', ' de ');

  const getPublicUrlFromPath = (path: string): string | null => {
    if (path.startsWith('s3://')) {
      const without = path.replace('s3://', '');
      const parts = without.split('/');
      const bucket = parts.shift() as string;
      const key = parts.join('/');
      const base = process.env.S3_PUBLIC_BASE_URL ||
        (process.env.AWS_REGION ? `https://${bucket}.s3.${process.env.AWS_REGION}.amazonaws.com` : null);
      if (base) {
        return `${base.replace(/\/$/, '')}/${key}`;
      }
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Relatório Tributação</h1>
          <p className="text-sm text-gray-500 mt-1">
            Visualize os aluguéis recebidos no período e ajuste os valores dedutíveis para apurar a receita tributável.
          </p>
        </div>

        <MonthFilters
          selectedMonth={mes}
          selectedYear={ano}
          basePath="/relatorios/tributacao"
        />

        <Card>
          <CardHeader>
            <CardTitle>Aluguéis Recebidos — {mes.toString().padStart(2, '0')}/{ano}</CardTitle>
          </CardHeader>
          <CardContent>
            <TaxationTable rows={tableRows} defaults={defaults} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Relatório Tributação (PDF)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              Gere o PDF com os valores de condomínio, IPTU e receitas tributáveis por imóvel e faça o download ou salve no armazenamento configurado.
            </p>
            <ExportTributacaoReportButton rows={reportRows} month={mes} year={ano} />
            {existingFile ? (
              <div className="flex flex-col gap-2 text-sm text-gray-700">
                <div className="flex items-center gap-2">
                  <FileTextIcon className="w-4 h-4" />
                  <span className="font-medium">{existingFile.fileName}</span>
                </div>
                <span className="text-xs text-gray-500">
                  Última geração em {new Date(existingFile.savedAt).toLocaleString('pt-BR')}
                </span>
                {existingFile.path && getPublicUrlFromPath(existingFile.path) && (
                  <Link
                    href={getPublicUrlFromPath(existingFile.path)!}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Abrir relatório salvo
                  </Link>
                )}
              </div>
            ) : (
              <p className="text-xs text-gray-500">
                Ainda não há PDF salvo para {mes.toString().padStart(2, '0')}/{ano}. Gere o relatório para salvar uma versão.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Envio de Relatório por Email
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg border">
              <h4 className="font-medium text-gray-900 mb-2">Preview do Email</h4>
              <div className="text-sm text-gray-600 space-y-2">
                <p>
                  <strong>Assunto:</strong> [RATC] Relatório Tributação - {subjectDate}
                </p>
                <div className="mt-3">
                  <p className="font-medium text-gray-900 mb-1">Conteúdo do email:</p>
                  <ul className="text-xs space-y-1 ml-4">
                    <li>• Resumo tributário por imóvel ({reportRows.length} imóveis)</li>
                    <li>• Receita tributável total: {formatCurrency(totals.taxable)}</li>
                    <li>• Valores abatidos: Condomínio {formatCurrency(totals.condominio)}, IPTU {formatCurrency(totals.iptu)}, Não tributável {formatCurrency(totals.nonTaxable)}</li>
                    {existingFile && getPublicUrlFromPath(existingFile.path) && (
                      <li>
                        • PDF salvo: <Link href={getPublicUrlFromPath(existingFile.path)!} target="_blank" className="text-blue-600 hover:underline">abrir relatório</Link>
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="text-sm text-gray-600">
                <p>Status da configuração:</p>
                <p className="text-xs">
                  {mailgunConfigured
                    ? '✅ Configuração completa'
                    : '⚠️ Verifique as variáveis de ambiente do Mailgun'}
                </p>
              </div>
              <SendTributacaoEmailButton
                month={mes}
                year={ano}
                defaultEmail="robertotcestari@gmail.com,felipeprado25@hotmail.com,contato.contabilidade10@gmail.com"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

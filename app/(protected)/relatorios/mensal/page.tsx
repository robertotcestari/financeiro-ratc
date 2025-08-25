import { calculateFinancialIndicators } from '@/lib/core/database/dre';
// Page view permissions removed
import { formatCurrency, formatDate } from '@/lib/formatters';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import DRESummaryEmailTableMulti from './components/DRESummaryEmailTableMulti';
import MonthFilters from './components/MonthFilters';
import ExportYearDREButton from './components/ExportYearDREButton';
import { generateMonthlyDRE } from '@/app/(protected)/dre/actions';
import { findSavedFileByDRE, findSavedFileByRentPayments } from '@/lib/core/database/saved-files';
import { listInadimplentes } from '@/lib/core/database/inadimplentes';
import { prisma } from '@/lib/core/database/client';
import { FileText as FileTextIcon, Mail } from 'lucide-react';
import { getRentPayments } from './actions';
// import RentPaymentsTable from './components/RentPaymentsTable'; // deprecated view, replaced by summary
import SendEmailButton from './components/SendEmailButton';
import ExportRentPaymentsButton from './components/ExportRentPaymentsButton';

// Interface for inadimplentes data from database
interface InadimplenteItem {
  id: string;
  nome: string;
  imovel?: string;
  valor: number;
  diasAtraso: number;
  settled: boolean;
}

async function getProperties() {
  return prisma.property.findMany({
    orderBy: { code: 'asc' },
    select: { id: true, code: true, address: true, city: true },
  });
}

function calculateDaysOverdue(dueDate: string): number {
  const due = new Date(dueDate);
  const today = new Date();
  const diffTime = today.getTime() - due.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays); // Don't show negative days
}

interface SearchParams {
  mes?: string;
  ano?: string;
}

export default async function EmailRascunhoPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const today = new Date();
  // Quando não há parâmetros, usa o mês anterior ao atual
  const previousMonth = today.getMonth(); // getMonth() retorna 0-11, então já é o mês anterior
  const previousYear = previousMonth === 0 ? today.getFullYear() - 1 : today.getFullYear();
  
  const mes = params.mes ? parseInt(params.mes) : (previousMonth === 0 ? 12 : previousMonth);
  const ano = params.ano ? parseInt(params.ano) : previousYear;
  const ultimoDiaMes = new Date(ano, mes, 0);

  // Helper to compute previous months with year handling
  const prevMonth = (y: number, m: number) => {
    // m is 1..12, returns previous month and possibly previous year
    if (m === 1) return { year: y - 1, month: 12 };
    return { year: y, month: m - 1 };
  };

  const p1 = prevMonth(ano, mes);

  const [indAtual, indP1] = await Promise.all([
    calculateFinancialIndicators(ano, mes),
    calculateFinancialIndicators(p1.year, p1.month),
  ]);

  // Order oldest -> newest so the most recent month is on the right
  const mesesTabela = [
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
      label: new Date(ano, mes - 1, 1)
        .toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
        .replace('.', ''),
      values: {
        receitasOperacionais: indAtual.totalReceitasOperacionais,
        despesasOperacionais: indAtual.totalDespesasOperacionais,
        lucroOperacional: indAtual.lucroOperacional,
        receitasEDespesasNaoOperacionais:
          indAtual.totalReceitasNaoOperacionais + indAtual.totalDespesasNaoOperacionais,
        resultadoDeCaixa: indAtual.resultadoDeCaixa,
      },
    },
  ];

  // Fetch real inadimplentes data, properties and rent payments
  const [inadimplentesRaw, properties, rentPayments] = await Promise.all([
    listInadimplentes(),
    getProperties(),
    getRentPayments(mes, ano),
  ]);

  // Create property map for quick lookup
  const propertyMap = Object.fromEntries(
    properties.map((p) => [p.id, { code: p.code, address: p.address, city: p.city }])
  );

  // Transform data to match the expected format
  const inadimplentes: InadimplenteItem[] = inadimplentesRaw
    .filter((item) => !item.data.settled) // Only show unsettled inadimplentes
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
        settled: item.data.settled,
      };
    });

  // Prepare full-year DRE rows for PDF export
  const allMonths = Array.from({ length: 12 }, (_, i) => i + 1);
  const { rows: dreRowsForYear } = await generateMonthlyDRE(ano, allMonths);
  const paddedMonth = String(mes).padStart(2, '0');
  const pdfFileName = `DRE_${ano}_${paddedMonth}.pdf`;
  const rentPdfFileName = `Alugueis_${ano}_${paddedMonth}.pdf`;
  const existingFile = await findSavedFileByDRE(ano, mes);
  const existingRentFile = await findSavedFileByRentPayments(ano, mes);

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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Relatório Mensal</h1>
        </div>

        <div className="mb-6">
          <MonthFilters selectedMonth={mes} selectedYear={ano} />
        </div>

        <div className="grid grid-cols-1 gap-6">
          {/* Inadimplentes */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  Inadimplentes até {formatDate(ultimoDiaMes)} (Último dia do mês)
                </CardTitle>
                <Link href="/inadimplentes">
                  <Button variant="outline" size="sm">
                    Gerenciar Inadimplentes
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {inadimplentes.length === 0 ? (
                <p className="text-gray-500">Sem inadimplentes no período.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-600 border-b">
                        <th className="py-2 pr-4">Nome</th>
                        <th className="py-2 pr-4">Imóvel</th>
                        <th className="py-2 pr-4">Valor</th>
                        <th className="py-2">Dias de atraso</th>
                      </tr>
                    </thead>
                    <tbody>
                       {inadimplentes.map((item) => (
                         <tr key={item.id} className="border-b last:border-none">
                           <td className="py-2 pr-4">{item.nome}</td>
                           <td className="py-2 pr-4 text-gray-600">{item.imovel || '-'}</td>
                           <td className="py-2 pr-4 font-medium">{formatCurrency(item.valor)}</td>
                           <td className="py-2">{item.diasAtraso} dias</td>
                         </tr>
                       ))}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="text-xs text-gray-500 mt-3">
                Fonte: dados de inadimplentes cadastrados no sistema.
              </p>
            </CardContent>
          </Card>

          {/* DRE Resumo */}
          <Card>
            <CardHeader>
              <CardTitle>
                DRE Resumo — {mesesTabela.map(m => m.label.toUpperCase()).join(' e ')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DRESummaryEmailTableMulti months={mesesTabela} />
              <p className="text-xs text-gray-500 mt-3">
                Fonte: DRE calculado automaticamente a partir das transações categorizadas do mês.
              </p>
            </CardContent>
          </Card>

          {/* Aluguéis Recebidos (Resumo igual ao email) */}
          <Card>
            <CardHeader>
              <CardTitle>Aluguéis Recebidos</CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const totalProprios = rentPayments
                  .filter(p => p.category === 'Aluguel')
                  .reduce((sum, p) => sum + p.amount, 0);
                const totalTerceiros = rentPayments
                  .filter(p => p.category === 'Aluguel de Terceiros')
                  .reduce((sum, p) => sum + p.amount, 0);
                const link = existingRentFile?.path ? getPublicUrlFromPath(existingRentFile.path) : null;
                return (
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Total de Aluguéis Próprios Recebidos</span>
                      <span className="font-semibold text-green-700">{formatCurrency(totalProprios)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Total de Aluguéis de Terceiros</span>
                      <span className="font-semibold text-green-700">{formatCurrency(totalTerceiros)}</span>
                    </div>
                    {link && (
                      <div className="pt-2">
                        <Link href={link} target="_blank" className="text-blue-600 hover:underline">
                          Ver relatório de aluguéis completo (PDF)
                        </Link>
                      </div>
                    )}
                  </div>
                );
              })()}
              <p className="text-xs text-gray-500 mt-3">
                Fonte: transações categorizadas como Aluguel no período.
              </p>
            </CardContent>
          </Card>

          {/* Anexo Aluguéis PDF */}
          <Card>
            <CardHeader>
              <CardTitle>Anexo dos Aluguéis Recebidos (PDF)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {existingRentFile ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-gray-700">
                    <FileTextIcon className="w-4 h-4" />
                    <span className="text-sm font-medium">{existingRentFile.fileName}</span>
                    <span className="text-xs text-gray-500">salvo em {new Date(existingRentFile.savedAt).toLocaleString('pt-BR')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {existingRentFile.path && getPublicUrlFromPath(existingRentFile.path) && (
                      <Link
                        href={getPublicUrlFromPath(existingRentFile.path)!}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center text-sm px-3 py-1.5 rounded-md bg-blue-600 text-white hover:bg-blue-700"
                      >
                        Abrir / Download
                      </Link>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-sm text-gray-700">
                    Será anexado o relatório de aluguéis recebidos em PDF de {new Date(ano, mes - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}.
                  </p>
                  <div className="flex items-center gap-3">
                    <ExportRentPaymentsButton 
                      payments={rentPayments} 
                      month={mes} 
                      year={ano} 
                      fileName={rentPdfFileName} 
                    />
                    <Link
                      href={`/recebimento-alugueis?month=${mes}&year=${ano}`}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      Ver aluguéis no sistema
                    </Link>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Anexo DRE PDF */}
          <Card>
            <CardHeader>
              <CardTitle>Anexo do DRE (PDF — meses do ano corrente)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {existingFile ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-gray-700">
                    <FileTextIcon className="w-4 h-4" />
                    <span className="text-sm font-medium">{existingFile.fileName}</span>
                    <span className="text-xs text-gray-500">salvo em {new Date(existingFile.savedAt).toLocaleString('pt-BR')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {existingFile.path && getPublicUrlFromPath(existingFile.path) && (
                      <Link
                        href={getPublicUrlFromPath(existingFile.path)!}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center text-sm px-3 py-1.5 rounded-md bg-blue-600 text-white hover:bg-blue-700"
                      >
                        Abrir / Download
                      </Link>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-sm text-gray-700">
                    Será anexado o DRE consolidado em PDF contendo todos os meses de {ano}.
                  </p>
                  <div className="flex items-center gap-3">
                    <ExportYearDREButton year={ano} months={allMonths} rows={dreRowsForYear} fileName={pdfFileName} />
                    <Link
                      href={`/dre?year=${ano}&months=${Array.from({ length: 12 }, (_, i) => i + 1).join(',')}`}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      Ver DRE no sistema
                    </Link>
                  </div>
                  <p className="text-xs text-gray-500">
                    Dica: se preferir, abra o DRE no sistema e use a exportação direta de lá.
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Email Preview and Send */}
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
                  <p><strong>Assunto:</strong> [RATC] Relatório Mensal - {new Date(ano, mes - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).replace(' ', ' de ')}</p>
                  <div className="mt-3">
                    <p className="font-medium text-gray-900 mb-1">Conteúdo do email:</p>
                     <ul className="text-xs space-y-1 ml-4">
                      <li>• Inadimplentes até o último dia do mês ({inadimplentes.length} registros)</li>
                      <li>• DRE Resumo (comparativo de 2 meses)</li>
                      <li>• Aluguéis: totais (Próprios e Terceiros) + link para PDF</li>
                      {existingFile && <li>• Link para relatório DRE em PDF</li>}
                    </ul>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="text-sm text-gray-600">
                  <p>Status da configuração:</p>
                  <p className="text-xs">
                    {process.env.MAILGUN_API_KEY && process.env.MAILGUN_DOMAIN
                      ? '✅ Configuração completa'
                      : '⚠️ Verifique as variáveis de ambiente do Mailgun'
                    }
                  </p>
                </div>
                <SendEmailButton
                  month={mes}
                  year={ano}
                  defaultEmail={process.env.MAILGUN_TO_EMAIL}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

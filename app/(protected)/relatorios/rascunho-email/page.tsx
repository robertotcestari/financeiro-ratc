import { calculateFinancialIndicators } from '@/lib/core/database/dre';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import DRESummaryEmailTableMulti from './components/DRESummaryEmailTableMulti';
import MonthFilters from './components/MonthFilters';
import ExportYearDREButton from './components/ExportYearDREButton';
import { generateMonthlyDRE } from '@/app/(protected)/dre/actions';
import { findSavedFileByDRE } from '@/lib/core/database/saved-files';
import { FileText as FileTextIcon } from 'lucide-react';

// Simple mock for delinquent tenants until we wire real data
interface InadimplenteItem {
  nome: string;
  imovel?: string;
  valor: number;
  diasAtraso: number;
}

function getMockInadimplentes(): InadimplenteItem[] {
  return [
    { nome: 'João Silva', imovel: 'CAT - Rua Brasil, 123', valor: 1850.0, diasAtraso: 12 },
    { nome: 'Maria Souza', imovel: 'SJP - Av. Andaló, 456', valor: 2100.0, diasAtraso: 30 },
    { nome: 'Empresa XYZ Ltda', imovel: 'RIB - Centro Comercial', valor: 7500.0, diasAtraso: 7 },
  ];
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
  const mes = params.mes ? parseInt(params.mes) : today.getMonth() + 1;
  const ano = params.ano ? parseInt(params.ano) : today.getFullYear();
  const ultimoDiaMes = new Date(ano, mes, 0);

  // Helper to compute previous months with year handling
  const prevMonth = (y: number, m: number) => {
    // m is 1..12, returns previous month and possibly previous year
    if (m === 1) return { year: y - 1, month: 12 };
    return { year: y, month: m - 1 };
  };

  const p1 = prevMonth(ano, mes);
  const p2 = prevMonth(p1.year, p1.month);

  const [indAtual, indP1, indP2] = await Promise.all([
    calculateFinancialIndicators(ano, mes),
    calculateFinancialIndicators(p1.year, p1.month),
    calculateFinancialIndicators(p2.year, p2.month),
  ]);

  // Order oldest -> newest so the most recent month is on the right
  const mesesTabela = [
    {
      label: new Date(p2.year, p2.month - 1, 1)
        .toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
        .replace('.', ''),
      values: {
        receitasOperacionais: indP2.totalReceitasOperacionais,
        despesasOperacionais: indP2.totalDespesasOperacionais,
        lucroOperacional: indP2.lucroOperacional,
        receitasEDespesasNaoOperacionais:
          indP2.totalReceitasNaoOperacionais + indP2.totalDespesasNaoOperacionais,
        resultadoDeCaixa: indP2.resultadoDeCaixa,
      },
    },
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

  const inadimplentes = getMockInadimplentes();

  // Prepare full-year DRE rows for PDF export
  const allMonths = Array.from({ length: 12 }, (_, i) => i + 1);
  const { rows: dreRowsForYear } = await generateMonthlyDRE(ano, allMonths);
  const paddedMonth = String(mes).padStart(2, '0');
  const pdfFileName = `DRE_${ano}_${paddedMonth}.pdf`;
  const existingFile = await findSavedFileByDRE(ano, mes);

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
              <CardTitle>
                Inadimplentes até {formatDate(ultimoDiaMes)} (Último dia do mês)
              </CardTitle>
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
                      {inadimplentes.map((item, idx) => (
                        <tr key={idx} className="border-b last:border-none">
                          <td className="py-2 pr-4">{item.nome}</td>
                          <td className="py-2 pr-4 text-gray-600">{item.imovel ?? '-'}</td>
                          <td className="py-2 pr-4 font-medium">{formatCurrency(item.valor)}</td>
                          <td className="py-2">{item.diasAtraso} dias</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="text-xs text-gray-500 mt-3">
                Observação: estes dados estão usando um mock e serão integrados futuramente.
              </p>
            </CardContent>
          </Card>

          {/* DRE Resumo */}
          <Card>
            <CardHeader>
              <CardTitle>
                DRE Resumo — {mesesTabela.map(m => m.label.toUpperCase()).join(', ')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DRESummaryEmailTableMulti months={mesesTabela} />
              <p className="text-xs text-gray-500 mt-3">
                Fonte: DRE calculado automaticamente a partir das transações categorizadas do mês.
              </p>
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
        </div>
      </div>
    </div>
  );
}

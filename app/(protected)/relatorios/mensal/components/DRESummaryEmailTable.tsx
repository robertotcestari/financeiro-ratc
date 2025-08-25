import { formatCurrency } from '@/lib/formatters';

export interface DRESummaryEmailTableProps {
  receitasOperacionais: number;
  despesasOperacionais: number;
  lucroOperacional: number;
  receitasEDespesasNaoOperacionais: number;
  resultadoDeCaixa: number;
}

export function DRESummaryEmailTable({
  receitasOperacionais,
  despesasOperacionais,
  lucroOperacional,
  receitasEDespesasNaoOperacionais,
  resultadoDeCaixa,
}: DRESummaryEmailTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-600 border-b">
            <th className="py-2 pr-4">Linha</th>
            <th className="py-2">Valor</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b">
            <td className="py-2 pr-4">Receitas operacionais</td>
            <td className="py-2 font-medium text-green-700">{formatCurrency(receitasOperacionais)}</td>
          </tr>
          <tr className="border-b">
            <td className="py-2 pr-4">Despesas operacionais</td>
            <td className="py-2 font-medium text-red-700">{formatCurrency(despesasOperacionais)}</td>
          </tr>
          <tr className="border-b">
            <td className="py-2 pr-4">Lucro operacional</td>
            <td className={`py-2 font-semibold ${lucroOperacional >= 0 ? 'text-green-700' : 'text-red-700'}`}>
              {formatCurrency(lucroOperacional)}
            </td>
          </tr>
          <tr className="border-b">
            <td className="py-2 pr-4">Receitas e despesas não operacionais</td>
            <td className={`py-2 font-medium ${receitasEDespesasNaoOperacionais >= 0 ? 'text-green-700' : 'text-red-700'}`}>
              {formatCurrency(receitasEDespesasNaoOperacionais)}
            </td>
          </tr>
          <tr>
            <td className="py-2 pr-4">Resultado de caixa</td>
            <td className={`py-2 font-semibold ${resultadoDeCaixa >= 0 ? 'text-green-800' : 'text-red-800'}`}>
              {formatCurrency(resultadoDeCaixa)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}


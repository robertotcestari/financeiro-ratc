import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, DollarSign, Receipt, Calculator } from 'lucide-react';

interface Props {
  stats: {
    totalAmount: number;
    count: number;
    average: number;
    previousTotal: number;
    percentageChange: number;
    previousMonth: number;
    previousYear: number;
    last3MonthsAverage: number;
    percentageChangeLast3Months: number;
  };
}

const months = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
];

export default function RentSummaryCards({ stats }: Props) {
  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  const isPositive = stats.percentageChange >= 0;
  const isPositive3Months = stats.percentageChangeLast3Months >= 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Total Recebido
          </CardTitle>
          <DollarSign className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            {formatCurrency(stats.totalAmount)}
          </div>
          <div className="space-y-1 mt-2">
            <div className="flex items-center text-xs text-gray-600">
              {isPositive ? (
                <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
              ) : (
                <TrendingDown className="h-3 w-3 mr-1 text-red-500" />
              )}
              <span className={isPositive ? 'text-green-600' : 'text-red-600'}>
                {stats.percentageChange > 0 && '+'}
                {stats.percentageChange.toFixed(1)}%
              </span>
              <span className="ml-1">
                vs mês anterior
              </span>
            </div>
            <div className="flex items-center text-xs text-gray-600">
              {isPositive3Months ? (
                <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
              ) : (
                <TrendingDown className="h-3 w-3 mr-1 text-red-500" />
              )}
              <span className={isPositive3Months ? 'text-green-600' : 'text-red-600'}>
                {stats.percentageChangeLast3Months > 0 && '+'}
                {stats.percentageChangeLast3Months.toFixed(1)}%
              </span>
              <span className="ml-1">
                vs média 3 meses
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Quantidade
          </CardTitle>
          <Receipt className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {stats.count}
          </div>
          <p className="text-xs text-gray-600 mt-1">
            Recebimentos no período
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Valor Médio
          </CardTitle>
          <Calculator className="h-4 w-4 text-purple-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrency(stats.average)}
          </div>
          <p className="text-xs text-gray-600 mt-1">
            Por recebimento
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Mês Anterior
          </CardTitle>
          <DollarSign className="h-4 w-4 text-gray-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-gray-700">
            {formatCurrency(stats.previousTotal)}
          </div>
          <p className="text-xs text-gray-600 mt-1">
            {months[stats.previousMonth - 1]}/{stats.previousYear}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
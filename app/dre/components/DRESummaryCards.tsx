import { generateMonthlyDRE } from '../actions';
import { Card, CardContent, CardTitle } from '@/components/ui/card';

interface DRESummaryCardsProps {
  year: number;
  selectedMonths: number[];
}

export async function DRESummaryCards({ year, selectedMonths }: DRESummaryCardsProps) {
  if (selectedMonths.length === 0) {
    return null;
  }

  const { monthlyTotals } = await generateMonthlyDRE(year, selectedMonths);
  
  // Calculate totals across all selected months
  const totalReceitas = selectedMonths.reduce((sum, month) => sum + (monthlyTotals[month]?.receitas || 0), 0);
  const totalDespesas = selectedMonths.reduce((sum, month) => sum + (monthlyTotals[month]?.despesas || 0), 0);
  const totalResultado = totalReceitas + totalDespesas; // Despesas are negative
  
  const margemLiquida = totalReceitas !== 0 ? (totalResultado / totalReceitas) * 100 : 0;
  const indiceDespesas = totalReceitas !== 0 ? (Math.abs(totalDespesas) / totalReceitas) * 100 : 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      <Card>
        <CardContent className="p-4">
          <CardTitle className="text-sm font-medium text-muted-foreground mb-1">Total de Receitas</CardTitle>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(totalReceitas)}</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4">
          <CardTitle className="text-sm font-medium text-muted-foreground mb-1">Total de Despesas</CardTitle>
          <p className="text-2xl font-bold text-red-600">{formatCurrency(totalDespesas)}</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4">
          <CardTitle className="text-sm font-medium text-muted-foreground mb-1">Resultado Líquido</CardTitle>
          <p className={`text-2xl font-bold ${totalResultado >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(totalResultado)}
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4">
          <CardTitle className="text-sm font-medium text-muted-foreground mb-1">Margem Líquida</CardTitle>
          <p className={`text-2xl font-bold ${margemLiquida >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatPercent(margemLiquida)}
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4">
          <CardTitle className="text-sm font-medium text-muted-foreground mb-1">Índice de Despesas</CardTitle>
          <p className="text-2xl font-bold text-orange-600">{formatPercent(indiceDespesas)}</p>
        </CardContent>
      </Card>
    </div>
  );
}
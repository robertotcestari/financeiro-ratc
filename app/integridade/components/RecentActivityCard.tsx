import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface RecentActivity {
  bankAccountId: string;
  accountName: string;
  transactionCount: number;
  amount: number;
}

interface Props {
  recentActivity: RecentActivity[];
}

export function RecentActivityCard({ recentActivity }: Props) {
  const totalTransactions = recentActivity.reduce((sum, activity) => sum + activity.transactionCount, 0);
  const totalAmount = recentActivity.reduce((sum, activity) => sum + activity.amount, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          📅 Movimentação Últimos 3 Meses
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-blue-600">
              {totalTransactions.toLocaleString()}
            </div>
            <div className="text-sm text-blue-600">
              Total de Transações
            </div>
          </div>

          <div className="bg-green-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-green-600">
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
              }).format(totalAmount)}
            </div>
            <div className="text-sm text-green-600">
              Volume Movimentado
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Conta
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Transações
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Volume
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {recentActivity.map((activity) => (
                <tr key={activity.bankAccountId} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {activity.accountName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {activity.transactionCount}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                    <span className={`font-medium ${
                      activity.amount >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL'
                      }).format(activity.amount)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {recentActivity.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p>Nenhuma movimentação encontrada nos últimos 3 meses.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
import { BankAccount, Transaction, AccountType } from '@/app/generated/prisma';
import Link from 'next/link';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type SerializedTransaction = Omit<Transaction, 'amount'> & {
  amount: number;
  balance: number | null;
};

interface BankCardProps {
  bank: BankAccount & {
    transactions: SerializedTransaction[];
    _count: {
      transactions: number;
    };
    totalTransactions: number;
    currentBalance: number;
    lastTransactionDate?: Date;
  };
}

export function BankCard({ bank }: BankCardProps) {
  const formatLastDate = (date?: Date) =>
    date ? formatDate(new Date(date)) : 'Nenhuma transação';

  const getAccountTypeLabel = (type: AccountType) => {
    switch (type) {
      case 'CHECKING':
        return 'Conta Corrente';
      case 'SAVINGS':
        return 'Poupança';
      case 'INVESTMENT':
        return 'Investimento';
      default:
        return type;
    }
  };

  const getAccountTypeColor = (type: AccountType) => {
    switch (type) {
      case 'CHECKING':
        return 'bg-blue-100 text-blue-800';
      case 'SAVINGS':
        return 'bg-green-100 text-green-800';
      case 'INVESTMENT':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const balanceColor =
    bank.currentBalance >= 0 ? 'text-green-600' : 'text-red-600';

  return (
    <Link href={`/bancos/${bank.id}`}>
      <Card className="hover:shadow-lg transition-shadow cursor-pointer">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-lg">{bank.name}</CardTitle>
              <p className="text-sm text-muted-foreground">{bank.bankName}</p>
            </div>
            <span
              className={`px-2 py-1 text-xs rounded-full ${getAccountTypeColor(
                bank.accountType
              )}`}
            >
              {getAccountTypeLabel(bank.accountType)}
            </span>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Saldo atual:</span>
            <span className={`text-lg font-semibold ${balanceColor}`}>
              {formatCurrency(bank.currentBalance)}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Total de transações:</span>
            <span className="text-sm font-medium">
              {bank.totalTransactions}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Última transação:</span>
            <span className="text-sm">
              {formatLastDate(bank.lastTransactionDate)}
            </span>
          </div>

          {bank.transactions.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <h4 className="text-sm font-medium mb-2">
                Transações recentes:
              </h4>
              <div className="space-y-1">
                {bank.transactions.slice(0, 3).map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex justify-between items-center text-xs"
                  >
                    <span className="text-muted-foreground truncate max-w-[150px]">
                      {transaction.description}
                    </span>
                    <span
                      className={
                        transaction.amount >= 0
                          ? 'text-green-600'
                          : 'text-red-600'
                      }
                    >
                      {formatCurrency(transaction.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

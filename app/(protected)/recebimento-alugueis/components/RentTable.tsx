import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface Transaction {
  id: string;
  date: Date;
  property: string;
  description: string;
  amount: number;
  bankAccount: string;
  category: string;
}

interface Props {
  transactions: Transaction[];
}

export default function RentTable({ transactions }: Props) {
  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  if (transactions.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        <p className="text-lg font-medium">Nenhum recebimento encontrado</p>
        <p className="text-sm mt-2">Não há recebimentos de aluguel para o período selecionado.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">Data</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead>Imóvel</TableHead>
            <TableHead>Descrição</TableHead>
            <TableHead className="text-right">Valor</TableHead>
            <TableHead>Conta</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((transaction) => (
            <TableRow key={transaction.id}>
              <TableCell className="font-medium">
                {formatDate(transaction.date)}
              </TableCell>
              <TableCell className="text-sm">{transaction.category}</TableCell>
              <TableCell>{transaction.property}</TableCell>
              <TableCell className="max-w-[300px] truncate text-xs text-gray-500">
                {transaction.description}
              </TableCell>
              <TableCell className="text-right font-semibold text-green-600">
                {formatCurrency(transaction.amount)}
              </TableCell>
              <TableCell className="text-sm text-gray-600">
                {transaction.bankAccount}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      
      <div className="p-4 border-t text-sm text-gray-600">
        Total de {transactions.length} recebimento{transactions.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}
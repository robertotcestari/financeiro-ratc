'use client';

import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

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
  month: number;
  year: number;
}

const months = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export default function ExportButton({ transactions, month, year }: Props) {
  const handleExport = () => {
    // Preparar dados para CSV
    const headers = ['Data', 'Categoria', 'Imóvel', 'Descrição', 'Valor', 'Conta Bancária'];
    
    const rows = transactions.map(t => [
      new Date(t.date).toLocaleDateString('pt-BR'),
      t.category,
      t.property,
      t.description.replace(/"/g, '""'), // Escape quotes
      t.amount.toFixed(2).replace('.', ','), // Format for Brazilian locale
      t.bankAccount
    ]);

    // Criar conteúdo CSV
    const csvContent = [
      headers.join(';'),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(';'))
    ].join('\n');

    // Adicionar BOM para suportar caracteres especiais no Excel
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });

    // Criar link de download
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `alugueis_${months[month - 1]}_${year}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Button
      onClick={handleExport}
      variant="outline"
      size="sm"
      className="flex items-center gap-2"
      disabled={transactions.length === 0}
    >
      <Download className="h-4 w-4" />
      Exportar CSV
    </Button>
  );
}
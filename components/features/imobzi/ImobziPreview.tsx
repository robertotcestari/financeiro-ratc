'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  FileText, 
  AlertCircle, 
  CheckCircle, 
  Info,
  TrendingUp,
  TrendingDown,
  RefreshCw
} from 'lucide-react';
import type { ImobziDataFormatted } from '@/lib/features/imobzi/api';

type PreviewTransaction = ImobziDataFormatted & { isDuplicate: boolean };
type PreviewData = {
  summary: {
    total: number;
    new?: number;
    duplicates?: number;
    totalValue?: number;
  };
  transactions: PreviewTransaction[];
};

interface ImobziPreviewProps {
  accountName: string;
  previewData: PreviewData | null;
  selectedTransactions: string[];
  onTransactionSelection: (transactionIds: string[]) => void;
}

export default function ImobziPreview({
  accountName,
  previewData,
  selectedTransactions,
  onTransactionSelection,
}: ImobziPreviewProps) {
  if (!previewData) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">
            Carregando dados...
          </p>
        </CardContent>
      </Card>
    );
  }

  const { summary, transactions } = previewData;

  // Handle select all/none
  const handleSelectAll = () => {
    const allIds = transactions.map((_, index) => index.toString());
    onTransactionSelection(allIds);
  };

  const handleSelectNone = () => {
    onTransactionSelection([]);
  };

  const handleSelectNonDuplicates = () => {
    const nonDuplicateIds = transactions
      .map((tx, index) => (!tx.isDuplicate ? index.toString() : null))
      .filter((id): id is string => id !== null);
    onTransactionSelection(nonDuplicateIds);
  };

  // Handle individual transaction toggle
  const handleTransactionToggle = (transactionId: string) => {
    if (selectedTransactions.includes(transactionId)) {
      onTransactionSelection(
        selectedTransactions.filter(id => id !== transactionId)
      );
    } else {
      onTransactionSelection([...selectedTransactions, transactionId]);
    }
  };

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  // Get transaction type icon
  const getTypeIcon = (type: string) => {
    const typeLower = type.toLowerCase();
    if (typeLower.includes('income') || typeLower.includes('receita')) {
      return <TrendingUp className="h-4 w-4 text-green-600" />;
    } else if (typeLower.includes('expense') || typeLower.includes('despesa')) {
      return <TrendingDown className="h-4 w-4 text-red-600" />;
    } else {
      return <RefreshCw className="h-4 w-4 text-blue-600" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Account Info */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Conta Selecionada</AlertTitle>
        <AlertDescription>{accountName}</AlertDescription>
      </Alert>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total de Transações
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.total}</div>
            <p className="text-xs text-muted-foreground">
              Encontradas no período
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Novas Transações
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {summary.new || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Prontas para importar
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Duplicadas
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {summary.duplicates || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Já existem no sistema
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Valor Total
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(summary.totalValue || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Saldo do período
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Transações Encontradas</CardTitle>
            <div className="flex gap-2">
              <button
                onClick={handleSelectAll}
                className="text-xs text-blue-600 hover:underline"
              >
                Selecionar Todas
              </button>
              <span className="text-xs text-muted-foreground">|</span>
              <button
                onClick={handleSelectNone}
                className="text-xs text-blue-600 hover:underline"
              >
                Desmarcar Todas
              </button>
              <span className="text-xs text-muted-foreground">|</span>
              <button
                onClick={handleSelectNonDuplicates}
                className="text-xs text-blue-600 hover:underline"
              >
                Apenas Novas
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {transactions.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <Checkbox
                        checked={selectedTransactions.length === transactions.length}
                        onCheckedChange={(checked) => {
                          if (checked) handleSelectAll();
                          else handleSelectNone();
                        }}
                      />
                    </TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((transaction: PreviewTransaction, index: number) => {
                    const isSelected = selectedTransactions.includes(index.toString());
                    const isIncome = transaction.type.toLowerCase().includes('income') || 
                                    transaction.type.toLowerCase().includes('receita');
                    
                    return (
                      <TableRow
                        key={index}
                        className={transaction.isDuplicate ? 'opacity-50' : ''}
                      >
                        <TableCell>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => handleTransactionToggle(index.toString())}
                            disabled={transaction.isDuplicate}
                          />
                        </TableCell>
                        <TableCell>{formatDate(transaction.date)}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <p className="font-medium">{transaction.description}</p>
                            {transaction.propertyName && (
                              <Badge variant="outline" className="text-xs">
                                🏢 {transaction.propertyName}
                              </Badge>
                            )}
                            {transaction.originalDescription && transaction.originalDescription !== transaction.description && (
                              <p className="text-xs text-muted-foreground italic">
                                Original: {transaction.originalDescription}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {getTypeIcon(transaction.type)}
                            <span className="text-sm">{transaction.type}</span>
                          </div>
                        </TableCell>
                        <TableCell className={cn(
                          "text-right font-medium",
                          isIncome ? "text-green-600" : "text-red-600"
                        )}>
                          {formatCurrency(Math.abs(transaction.value))}
                        </TableCell>
                        <TableCell>
                          {transaction.isDuplicate ? (
                            <Badge variant="secondary">Duplicada</Badge>
                          ) : (
                            <Badge variant="default">Nova</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="rounded-lg border bg-muted/50 p-8 text-center">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-2 text-sm text-muted-foreground">
                Nenhuma transação encontrada no período selecionado
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status Messages */}
      {summary.duplicates > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Transações Duplicadas</AlertTitle>
          <AlertDescription>
            {summary.duplicates} transações já existem no sistema e não serão importadas novamente.
          </AlertDescription>
        </Alert>
      )}

      {/* Action Summary */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            {selectedTransactions.length} transações selecionadas para importação
          </Badge>
        </div>
      </div>
    </div>
  );
}

// Helper function (should be imported from utils)
function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

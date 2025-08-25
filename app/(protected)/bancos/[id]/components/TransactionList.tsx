'use client';

import { Transaction } from '@/app/generated/prisma';
import { useState, useMemo, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { processUnprocessedTransactions, deleteTransactions, createTransactionAction } from '../actions';
import { toast } from 'sonner';
import {
  ChevronLeft,
  ChevronRight,
  Trash2,
  Edit2,
  Plus,
} from 'lucide-react';
import { useTransactionEditing } from './hooks/useTransactionEditing';
import { TransactionEditDialog } from './TransactionEditDialog';
import { TransactionAddDialog } from './TransactionAddDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type RowSelectionState,
} from '@tanstack/react-table';

type SerializedTransaction = Omit<Transaction, 'amount' | 'balance'> & {
  amount: number;
  balance: number;
  isProcessed: boolean;
};

interface TransactionListProps {
  transactions: SerializedTransaction[];
  bankAccountId?: string;
  searchParams?: {
    mes?: string;
    ano?: string;
  };
  initialBalance?: number;
}

export function TransactionList({
  transactions,
  bankAccountId,
  searchParams,
  initialBalance = 0,
}: TransactionListProps) {
  const router = useRouter();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [filterType, setFilterType] = useState<
    'all' | 'income' | 'expense' | 'unprocessed'
  >('all');
  const [isPending, startTransition] = useTransition();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const {
    isDialogOpen,
    editingTransaction,
    isPending: isEditPending,
    openEditDialog,
    closeEditDialog,
    saveTransaction,
  } = useTransactionEditing(bankAccountId || '');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(date));
  };

  // Column definitions
  const columns = useMemo<ColumnDef<SerializedTransaction>[]>(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <input
            type="checkbox"
            checked={table.getIsAllPageRowsSelected()}
            onChange={(e) => table.toggleAllPageRowsSelected(e.target.checked)}
            className="rounded border-gray-300 w-4 h-4"
          />
        ),
        cell: ({ row }) => {
          // Don't show checkbox for virtual balance rows
          if (
            row.original.id === 'initial-balance' ||
            row.original.id === 'final-balance'
          ) {
            return null;
          }
          return (
            <input
              type="checkbox"
              checked={row.getIsSelected()}
              onChange={(e) => row.toggleSelected(e.target.checked)}
              className="rounded border-gray-300 w-4 h-4"
            />
          );
        },
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: 'date',
        header: 'Data',
        cell: ({ getValue }) => formatDate(getValue() as Date),
        sortingFn: 'datetime',
      },
      {
        accessorKey: 'description',
        header: 'Descrição',
        cell: ({ getValue, row }) => {
          return (
            <div className="max-w-md px-2 py-1">
              <div className="text-xs break-words whitespace-normal">
                {getValue() as string}
              </div>
              {row.original.ofxTransId && (
                <div className="text-xs text-gray-500 mt-1">
                  ID: {row.original.ofxTransId}
                </div>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: 'amount',
        header: 'Valor',
        cell: ({ getValue }) => {
          const value = getValue() as number;
          return (
            <span
              className={`${
                value >= 0 ? 'text-green-600' : 'text-red-600'
              } px-2 py-1 inline-block`}
            >
              {formatCurrency(value)}
            </span>
          );
        },
      },
      {
        accessorKey: 'balance',
        header: 'Saldo',
        cell: ({ getValue, row }) => {
          const value = getValue() as number;
          const isVirtualRow =
            row.original.id === 'initial-balance' ||
            row.original.id === 'final-balance';
          return (
            <span className={isVirtualRow ? 'font-semibold' : ''}>
              {formatCurrency(value)}
            </span>
          );
        },
      },
      {
        accessorKey: 'isProcessed',
        header: 'Status',
        cell: ({ getValue, row }) => {
          // Don't show badge for virtual balance rows
          if (
            row.original.id === 'initial-balance' ||
            row.original.id === 'final-balance'
          ) {
            return null;
          }
          return (
            <Badge
              variant={getValue() ? 'default' : 'secondary'}
              className={
                getValue()
                  ? 'text-xs font-normal px-2 py-0.5 bg-green-100 text-green-700 hover:bg-green-100'
                  : 'text-xs font-normal px-2 py-0.5'
              }
            >
              {getValue() ? 'Processada' : 'Não Processada'}
            </Badge>
          );
        },
      },
      {
        id: 'actions',
        header: 'Ações',
        cell: ({ row }) => {
          const isVirtualRow =
            row.original.id === 'initial-balance' ||
            row.original.id === 'final-balance';

          if (isVirtualRow) {
            return null;
          }

          return (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => openEditDialog(row.original)}
              className="h-7 w-7 p-0"
            >
              <Edit2 className="h-3 w-3" />
            </Button>
          );
        },
      },
    ],
    [openEditDialog]
  );

  // Filter data based on type
  const filteredData = useMemo(() => {
    let filtered = transactions;
    if (filterType === 'income')
      filtered = transactions.filter((t) => t.amount > 0);
    else if (filterType === 'expense')
      filtered = transactions.filter((t) => t.amount < 0);
    else if (filterType === 'unprocessed')
      filtered = transactions.filter((t) => !t.isProcessed);

    // Add virtual initial and final balance rows if we have a month filter
    if (
      searchParams?.mes &&
      (filterType === 'all' || filterType === 'unprocessed')
    ) {
      const initialBalanceRow: SerializedTransaction = {
        id: 'initial-balance',
        date: new Date(
          searchParams.ano
            ? parseInt(searchParams.ano)
            : new Date().getFullYear(),
          searchParams.mes ? parseInt(searchParams.mes) - 1 : 0,
          0,
          23,
          59,
          59
        ),
        description: 'SALDO ANTERIOR',
        amount: 0,
        balance: initialBalance,
        isProcessed: true,
        bankAccountId: bankAccountId || '',
        ofxTransId: null,
        ofxAccountId: null,
        importBatchId: null,
        isDuplicate: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Calculate final balance
      const transactionsSum = filtered.reduce((sum, t) => sum + t.amount, 0);
      const finalBalance = initialBalance + transactionsSum;

      const finalBalanceRow: SerializedTransaction = {
        id: 'final-balance',
        date: new Date(
          searchParams.ano
            ? parseInt(searchParams.ano)
            : new Date().getFullYear(),
          searchParams.mes ? parseInt(searchParams.mes) : 0,
          0,
          23,
          59,
          59
        ),
        description: 'SALDO FINAL',
        amount: 0,
        balance: finalBalance,
        isProcessed: true,
        bankAccountId: bankAccountId || '',
        ofxTransId: null,
        ofxAccountId: null,
        importBatchId: null,
        isDuplicate: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      return [initialBalanceRow, ...filtered, finalBalanceRow];
    }

    return filtered;
  }, [transactions, filterType, searchParams, initialBalance, bankAccountId]);

  // Table instance
  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      rowSelection,
    },
    enableRowSelection: (row) =>
      row.original.id !== 'initial-balance' &&
      row.original.id !== 'final-balance',
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    initialState: {
      pagination: {
        pageSize: 200,
      },
    },
  });

  const totalIncome = transactions
    .filter((t) => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = transactions
    .filter((t) => t.amount < 0)
    .reduce((sum, t) => sum + t.amount, 0);

  const unprocessedCount = transactions.filter((t) => !t.isProcessed).length;

  const handleProcessUnprocessed = async () => {
    if (!bankAccountId) return;

    startTransition(async () => {
      const result = await processUnprocessedTransactions(bankAccountId);

      if (result.success) {
        toast.success(result.message || 'Transações processadas com sucesso');
      } else {
        toast.error(result.error || 'Erro ao processar transações');
      }
    });
  };

  const handleAddTransaction = async (description: string, amount: number, date: Date) => {
    if (!bankAccountId) return;

    setIsAdding(true);
    try {
      const result = await createTransactionAction(
        description,
        amount,
        date,
        bankAccountId
      );

      if (result.success) {
        toast.success(result.message || 'Transação adicionada com sucesso');
        setIsAddDialogOpen(false);
        router.refresh();
      } else {
        toast.error(result.error || 'Erro ao adicionar transação');
      }
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (!bankAccountId) return;

    const selectedRows = table.getFilteredSelectedRowModel().rows;
    const transactionIds = selectedRows
      .filter(
        (row) =>
          row.original.id !== 'initial-balance' &&
          row.original.id !== 'final-balance'
      )
      .map((row) => row.original.id);

    if (transactionIds.length === 0) {
      toast.error('Nenhuma transação válida selecionada');
      return;
    }

    setIsDeleting(true);
    try {
      const result = await deleteTransactions(transactionIds, bankAccountId);

      if (result.success) {
        toast.success(result.message || 'Transações removidas com sucesso');
        setRowSelection({});
        router.refresh();
      } else {
        toast.error(result.error || 'Erro ao remover transações');
      }
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };

  // Month navigation functions
  const navigateMonth = (direction: 'prev' | 'next') => {
    if (!bankAccountId) return;

    const now = new Date();
    const currentMonth = searchParams?.mes
      ? parseInt(searchParams.mes)
      : now.getMonth() + 1;
    const currentYear = searchParams?.ano
      ? parseInt(searchParams.ano)
      : now.getFullYear();

    let newMonth = currentMonth;
    let newYear = currentYear;

    if (direction === 'prev') {
      if (currentMonth === 1) {
        newMonth = 12;
        newYear = currentYear - 1;
      } else {
        newMonth = currentMonth - 1;
      }
    } else {
      if (currentMonth === 12) {
        newMonth = 1;
        newYear = currentYear + 1;
      } else {
        newMonth = currentMonth + 1;
      }
    }

    const params = new URLSearchParams();
    params.set('mes', newMonth.toString());
    params.set('ano', newYear.toString());

    router.push(`/bancos/${bankAccountId}?${params.toString()}`);
  };

  // Get current month name
  const getCurrentMonthName = () => {
    const monthNum = searchParams?.mes ? parseInt(searchParams.mes) : null;
    if (!monthNum) return 'Todos os meses';

    const monthNames = [
      'Janeiro',
      'Fevereiro',
      'Março',
      'Abril',
      'Maio',
      'Junho',
      'Julho',
      'Agosto',
      'Setembro',
      'Outubro',
      'Novembro',
      'Dezembro',
    ];
    return monthNames[monthNum - 1];
  };

  const getCurrentYear = () => {
    return searchParams?.ano || new Date().getFullYear().toString();
  };

  const selectedCount = Object.keys(rowSelection).length;

  return (
    <div className="bg-white rounded-lg shadow-md">
      {/* Selection Toolbar */}
      {selectedCount > 0 && (
        <div className="bg-blue-50 border-b border-blue-200 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-blue-700">
              {selectedCount}{' '}
              {selectedCount === 1
                ? 'transação selecionada'
                : 'transações selecionadas'}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRowSelection({})}
              >
                Limpar Seleção
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setIsDeleteDialogOpen(true)}
                disabled={isDeleting}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Remover Selecionadas
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="p-6 border-b border-gray-200">
        {/* Month Navigation */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Button
              onClick={() => navigateMonth('prev')}
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0 rounded-full"
              title="Mês anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="px-4 py-2 bg-gray-50 rounded-lg border text-center shadow-sm min-w-[150px]">
              <div className="text-sm font-semibold text-gray-900">
                {getCurrentMonthName()}
              </div>
              <div className="text-xs text-gray-500 font-medium">
                {getCurrentYear()}
              </div>
            </div>

            <Button
              onClick={() => navigateMonth('next')}
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0 rounded-full"
              title="Próximo mês"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => setIsAddDialogOpen(true)}
              variant="outline"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-1" />
              Nova Transação
            </Button>
            
            {unprocessedCount > 0 && bankAccountId && (
              <Button
                onClick={handleProcessUnprocessed}
                disabled={isPending}
                variant="outline"
                size="sm"
              >
                {isPending
                  ? 'Processando...'
                  : `Processar ${unprocessedCount} Não Processadas`}
              </Button>
            )}
          </div>
        </div>

        {/* Header with search and filters */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Transações (
            {
              table
                .getFilteredRowModel()
                .rows.filter(
                  (row) =>
                    row.original.id !== 'initial-balance' &&
                    row.original.id !== 'final-balance'
                ).length
            }
            )
          </h2>

          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <input
              type="text"
              placeholder="Buscar por descrição..."
              value={globalFilter ?? ''}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="max-w-sm px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />

            {/* Filter */}
            <Select
              value={filterType}
              onValueChange={(value) =>
                setFilterType(
                  value as 'all' | 'income' | 'expense' | 'unprocessed'
                )
              }
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar por tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="income">Entradas</SelectItem>
                <SelectItem value="expense">Saídas</SelectItem>
                <SelectItem value="unprocessed">Não Processadas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Summary */}
        <div
          className={`mt-4 grid gap-4 ${
            searchParams?.mes
              ? 'grid-cols-2 md:grid-cols-5'
              : 'grid-cols-1 md:grid-cols-3'
          }`}
        >
          {searchParams?.mes && (
            <div className="text-center">
              <p className="text-sm text-gray-600">Saldo Anterior</p>
              <p
                className={`text-lg font-semibold ${
                  initialBalance >= 0 ? 'text-blue-600' : 'text-orange-600'
                }`}
              >
                {formatCurrency(initialBalance)}
              </p>
            </div>
          )}
          <div className="text-center">
            <p className="text-sm text-gray-600">Entradas</p>
            <p className="text-lg font-semibold text-green-600">
              {formatCurrency(totalIncome)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Saídas</p>
            <p className="text-lg font-semibold text-red-600">
              {formatCurrency(totalExpense)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Saldo do Período</p>
            <p
              className={`text-lg font-semibold ${
                totalIncome + totalExpense >= 0
                  ? 'text-green-600'
                  : 'text-red-600'
              }`}
            >
              {formatCurrency(totalIncome + totalExpense)}
            </p>
          </div>
          {searchParams?.mes && (
            <div className="text-center">
              <p className="text-sm text-gray-600">Saldo Final</p>
              <p
                className={`text-lg font-semibold ${
                  initialBalance + totalIncome + totalExpense >= 0
                    ? 'text-green-600'
                    : 'text-red-600'
                }`}
              >
                {formatCurrency(initialBalance + totalIncome + totalExpense)}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Transactions Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${
                      header.column.id === 'amount' ||
                      header.column.id === 'balance' ||
                      header.column.id === 'isProcessed'
                        ? 'text-right'
                        : 'text-left'
                    }`}
                  >
                    {header.isPlaceholder ? null : (
                      <div
                        {...{
                          className: `${
                            header.column.getCanSort()
                              ? 'cursor-pointer select-none flex items-center gap-1'
                              : 'flex items-center'
                          } ${
                            header.column.id === 'amount' ||
                            header.column.id === 'balance' ||
                            header.column.id === 'isProcessed'
                              ? 'justify-end'
                              : ''
                          }`,
                          onClick: header.column.getToggleSortingHandler(),
                        }}
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                        {{
                          asc: ' 🔼',
                          desc: ' 🔽',
                        }[header.column.getIsSorted() as string] ?? null}
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {table.getRowModel().rows.map((row) => {
              const isVirtualRow =
                row.original.id === 'initial-balance' ||
                row.original.id === 'final-balance';
              return (
                <tr
                  key={row.id}
                  className={
                    isVirtualRow
                      ? 'bg-gray-100 font-semibold'
                      : 'hover:bg-gray-50'
                  }
                >
                  {row.getVisibleCells().map((cell) => {
                    // Special rendering for virtual balance rows
                    const isVirtualRow =
                      row.original.id === 'initial-balance' ||
                      row.original.id === 'final-balance';
                    if (isVirtualRow) {
                      if (cell.column.id === 'date') {
                        return (
                          <td
                            key={cell.id}
                            className="px-6 py-4 text-sm text-gray-700"
                          >
                            -
                          </td>
                        );
                      }
                      if (cell.column.id === 'amount') {
                        return (
                          <td
                            key={cell.id}
                            className="px-6 py-4 text-sm text-right text-gray-700"
                          >
                            -
                          </td>
                        );
                      }
                      if (cell.column.id === 'isProcessed') {
                        return (
                          <td
                            key={cell.id}
                            className="px-6 py-4 text-sm text-center"
                          >
                            -
                          </td>
                        );
                      }
                    }

                    return (
                      <td
                        key={cell.id}
                        className={`px-6 py-4 text-sm ${
                          isVirtualRow ? 'text-gray-700' : ''
                        } ${
                          cell.column.id === 'amount' ||
                          cell.column.id === 'balance' ||
                          cell.column.id === 'isProcessed'
                            ? 'text-right'
                            : 'text-left'
                        } ${
                          !isVirtualRow && cell.column.id === 'amount'
                            ? 'font-medium'
                            : !isVirtualRow && cell.column.id === 'date'
                            ? 'whitespace-nowrap text-gray-900'
                            : !isVirtualRow
                            ? 'text-gray-900'
                            : ''
                        }`}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>

        {table.getRowModel().rows.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">
              {globalFilter || filterType !== 'all'
                ? 'Nenhuma transação encontrada com os filtros aplicados.'
                : 'Nenhuma transação encontrada.'}
            </p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {table.getPageCount() > 1 && (
        <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200">
          <div className="flex items-center gap-2">
            <button
              className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              {'<<'}
            </button>
            <button
              className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              {'<'}
            </button>
            <button
              className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              {'>'}
            </button>
            <button
              className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              {'>>'}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-700">
              Página{' '}
              <strong>
                {table.getState().pagination.pageIndex + 1} de{' '}
                {table.getPageCount()}
              </strong>
            </span>
            <Select
              value={String(table.getState().pagination.pageSize)}
              onValueChange={(value) => table.setPageSize(Number(value))}
            >
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[20, 50, 100, 200].map((pageSize) => (
                  <SelectItem key={pageSize} value={String(pageSize)}>
                    {pageSize} itens
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Remoção</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover {selectedCount}{' '}
              {selectedCount === 1 ? 'transação' : 'transações'}? Esta ação não
              pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSelected}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? 'Removendo...' : 'Remover'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Transaction Edit Dialog */}
      <TransactionEditDialog
        isOpen={isDialogOpen}
        onClose={closeEditDialog}
        transaction={editingTransaction || { id: '', description: '', amount: 0 }}
        onSave={saveTransaction}
        isLoading={isEditPending}
      />

      {/* Transaction Add Dialog */}
      <TransactionAddDialog
        isOpen={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        onSave={handleAddTransaction}
        isLoading={isAdding}
      />
    </div>
  );
}

'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { useState, useTransition, useEffect, useRef, useCallback } from 'react';
import {
  categorizeOneAction,
  bulkCategorizeAction,
  markReviewedAction,
} from '../actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Category {
  id: string;
  name: string;
  level: number;
  parent: { name: string } | null;
}

interface Property {
  id: string;
  code: string;
  city: string;
}

interface Transaction {
  id: string;
  year: number;
  month: number;
  details: string | null;
  notes: string | null;
  isTransfer: boolean;
  isReviewed: boolean;
  transaction: {
    id: string;
    date: Date;
    description: string;
    amount: number;
    bankAccount: {
      name: string;
      bankName: string;
    };
  };
  category: {
    id: string;
    name: string;
    type: string;
    parent: {
      name: string;
    } | null;
  };
  property: {
    code: string;
    city: string;
  } | null;
  transfer: {
    originAccount: { name: string };
    destinationAccount: { name: string };
    amount: number;
  } | null;
}

interface Props {
  transactions: Transaction[];
  currentPage: number;
  totalPages: number;
  totalCount: number;
  categories?: Category[];
  properties?: Property[];
}

export default function TransactionTable({
  transactions,
  currentPage,
  totalPages,
  totalCount,
  categories = [],
  properties = [],
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState<string>('');
  const [editingProperty, setEditingProperty] = useState<string>('');
  const [bulkCategory, setBulkCategory] = useState<string>('');
  const [bulkProperty, setBulkProperty] = useState<string>('');
  const editingRef = useRef<HTMLTableRowElement>(null);

  // Memoized save handler to satisfy hooks dependency rules
  const saveEdit = useCallback(() => {
    if (!editingId || !editingCategory) return;

    startTransition(async () => {
      const propertyId = properties.find((p) => p.code === editingProperty)?.id;
      await categorizeOneAction({
        id: editingId,
        categoryId: editingCategory,
        propertyId,
      });
      // Inline reset to avoid referencing cancelEdit before declaration
      setEditingId(null);
      setEditingCategory('');
      setEditingProperty('');
    });
  }, [
    editingId,
    editingCategory,
    editingProperty,
    properties,
    startTransition,
  ]);

  const goToPage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', page.toString());
    router.push(`/transacoes?${params.toString()}`);
  };

  // Handle click outside to save and close editing
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        editingId &&
        editingRef.current &&
        !editingRef.current.contains(event.target as Node)
      ) {
        // Auto-save when clicking outside
        saveEdit();
      }
    };

    if (editingId) {
      document.addEventListener('mousedown', handleClickOutside);
      return () =>
        document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [editingId, editingCategory, editingProperty, saveEdit]);

  // Handle escape key to cancel editing
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (editingId && event.key === 'Escape') {
        cancelEdit();
      }
    };

    if (editingId) {
      document.addEventListener('keydown', handleEscapeKey);
      return () => document.removeEventListener('keydown', handleEscapeKey);
    }
  }, [editingId]);

  const getCategoryDisplay = (category: Transaction['category']) => {
    if (category.parent) {
      return `${category.parent.name} > ${category.name}`;
    }
    return category.name;
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'INCOME':
        return 'text-green-600 bg-green-50';
      case 'EXPENSE':
        return 'text-red-600 bg-red-50';
      case 'TRANSFER':
        return 'text-blue-600 bg-blue-50';
      case 'ADJUSTMENT':
        return 'text-yellow-600 bg-yellow-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'INCOME':
        return 'Receita';
      case 'EXPENSE':
        return 'Despesa';
      case 'TRANSFER':
        return 'Transferência';
      case 'ADJUSTMENT':
        return 'Ajuste';
      default:
        return type;
    }
  };

  const toggleSelection = (id: string) => {
    const newSelection = new Set(selectedIds);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedIds(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === transactions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(transactions.map((t) => t.id)));
    }
  };

  const startEdit = (transaction: Transaction) => {
    setEditingId(transaction.id);
    setEditingCategory(transaction.category.id);
    setEditingProperty(transaction.property?.code || '');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingCategory('');
    setEditingProperty('');
  };

  // saveEdit now memoized above

  const handleMarkReviewed = async (id: string, reviewed: boolean) => {
    startTransition(async () => {
      await markReviewedAction({ id, reviewed });
    });
  };

  const handleBulkCategorize = async () => {
    if (!bulkCategory || selectedIds.size === 0) return;

    startTransition(async () => {
      const propertyId = properties.find((p) => p.code === bulkProperty)?.id;
      await bulkCategorizeAction({
        ids: Array.from(selectedIds),
        categoryId: bulkCategory,
        propertyId,
        markReviewed: false,
      });
      setSelectedIds(new Set());
      setBulkCategory('');
      setBulkProperty('');
    });
  };

  const handleBulkMarkReviewed = async () => {
    if (selectedIds.size === 0) return;

    startTransition(async () => {
      await bulkCategorizeAction({
        ids: Array.from(selectedIds),
        categoryId:
          bulkCategory ||
          transactions.find((t) => selectedIds.has(t.id))?.category.id ||
          '',
        markReviewed: true,
      });
      setSelectedIds(new Set());
    });
  };

  const groupedCategories = categories.reduce((acc, category) => {
    const categoryDisplay =
      category.level === 1
        ? category.name
        : `${category.parent?.name} > ${category.name}`;

    if (!acc[category.level]) {
      acc[category.level] = [];
    }
    acc[category.level].push({
      ...category,
      displayName: categoryDisplay,
    });
    return acc;
  }, {} as Record<number, Array<Category & { displayName: string }>>);

  const sortedCategories = Object.keys(groupedCategories)
    .sort((a, b) => parseInt(a) - parseInt(b))
    .flatMap((level) => groupedCategories[parseInt(level)]);

  return (
    <div className="overflow-hidden">
      {/* Barra de ações em lote */}
      {selectedIds.size > 0 && (
        <div className="px-6 py-4 bg-blue-50 border-b border-blue-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-blue-900">
                {selectedIds.size}{' '}
                {selectedIds.size === 1
                  ? 'transação selecionada'
                  : 'transações selecionadas'}
              </span>

              <select
                value={bulkCategory}
                onChange={(e) => setBulkCategory(e.target.value)}
                className="text-sm border border-blue-300 rounded-md px-3 py-1 bg-white"
              >
                <option value="">Selecione categoria...</option>
                {sortedCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.displayName}
                  </option>
                ))}
              </select>

              <select
                value={bulkProperty}
                onChange={(e) => setBulkProperty(e.target.value)}
                className="text-sm border border-blue-300 rounded-md px-3 py-1 bg-white"
              >
                <option value="">Propriedade (opcional)</option>
                {properties.map((property) => (
                  <option key={property.id} value={property.code}>
                    {property.code} - {property.city}
                  </option>
                ))}
              </select>

              <Button
                onClick={handleBulkCategorize}
                disabled={!bulkCategory || isPending}
                variant="default"
                size="sm"
              >
                Aplicar Categoria
              </Button>

              <Button
                onClick={handleBulkMarkReviewed}
                disabled={isPending}
                variant="default"
                size="sm"
                className="bg-green-600 hover:bg-green-700"
              >
                Marcar como Revisado
              </Button>
            </div>

            <Button
              onClick={() => setSelectedIds(new Set())}
              variant="ghost"
              size="sm"
            >
              Limpar seleção
            </Button>
          </div>
        </div>
      )}

      {/* Header da tabela */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Transações</h3>
          <div className="text-sm text-gray-500">
            Página {currentPage} de {totalPages}
          </div>
        </div>
      </div>

      {/* Tabela */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-center">
                <Input
                  type="checkbox"
                  checked={
                    selectedIds.size === transactions.length &&
                    transactions.length > 0
                  }
                  onChange={toggleSelectAll}
                  className="rounded border-gray-300 w-4 h-4"
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Data
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Descrição
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Conta
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Categoria
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Propriedade
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Valor
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {transactions.map((transaction) => (
              <tr
                key={transaction.id}
                className="hover:bg-gray-50"
                ref={editingId === transaction.id ? editingRef : null}
              >
                <td className="px-6 py-4 text-center">
                  <Input
                    type="checkbox"
                    checked={selectedIds.has(transaction.id)}
                    onChange={() => toggleSelection(transaction.id)}
                    className="rounded border-gray-300 w-4 h-4"
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatDate(transaction.transaction.date)}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  <div
                    className="max-w-xs truncate"
                    title={transaction.transaction.description}
                  >
                    {transaction.transaction.description}
                  </div>
                  {transaction.details && (
                    <div
                      className="text-xs text-gray-500 mt-1"
                      title={transaction.details}
                    >
                      {transaction.details}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <div>{transaction.transaction.bankAccount.name}</div>
                  <div className="text-xs text-gray-500">
                    {transaction.transaction.bankAccount.bankName}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {editingId === transaction.id ? (
                    <select
                      value={editingCategory}
                      onChange={(e) => setEditingCategory(e.target.value)}
                      className="text-sm border border-gray-300 rounded px-2 py-1 w-full"
                    >
                      {sortedCategories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.displayName}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div
                      onDoubleClick={() => startEdit(transaction)}
                      className="cursor-pointer"
                    >
                      <span
                        className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(
                          transaction.category.type
                        )}`}
                      >
                        {getTypeLabel(transaction.category.type)}
                      </span>
                      <div className="text-sm text-gray-900 mt-1">
                        {getCategoryDisplay(transaction.category)}
                      </div>
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {editingId === transaction.id ? (
                    <select
                      value={editingProperty}
                      onChange={(e) => setEditingProperty(e.target.value)}
                      className="text-sm border border-gray-300 rounded px-2 py-1 w-full"
                    >
                      <option value="">Nenhuma</option>
                      {properties.map((property) => (
                        <option key={property.id} value={property.code}>
                          {property.code} - {property.city}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div
                      onDoubleClick={() => startEdit(transaction)}
                      className="cursor-pointer"
                    >
                      {transaction.property ? (
                        <div>
                          <div className="font-medium">
                            {transaction.property.code}
                          </div>
                          <div className="text-xs text-gray-500">
                            {transaction.property.city}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                  <div
                    className={`font-medium ${
                      transaction.transaction.amount >= 0
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}
                  >
                    {formatCurrency(transaction.transaction.amount)}
                  </div>
                  {transaction.isTransfer && transaction.transfer && (
                    <div className="text-xs text-gray-500 mt-1">
                      {transaction.transfer.originAccount.name} →{' '}
                      {transaction.transfer.destinationAccount.name}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <div className="flex flex-col items-center space-y-1">
                    {transaction.isReviewed ? (
                      <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Revisado
                      </span>
                    ) : (
                      <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        Pendente
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <div className="flex items-center justify-center space-x-2">
                    {editingId === transaction.id ? (
                      <>
                        <Button
                          onClick={saveEdit}
                          disabled={isPending}
                          variant="ghost"
                          size="sm"
                          className="text-green-600 hover:text-green-800"
                        >
                          Salvar
                        </Button>
                        <Button
                          onClick={cancelEdit}
                          variant="ghost"
                          size="sm"
                          className="text-gray-600 hover:text-gray-800"
                        >
                          Cancelar
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          onClick={() => startEdit(transaction)}
                          variant="ghost"
                          size="sm"
                          className="text-blue-600 hover:text-blue-800"
                        >
                          Editar
                        </Button>
                        {!transaction.isReviewed && (
                          <Button
                            onClick={() =>
                              handleMarkReviewed(transaction.id, true)
                            }
                            disabled={isPending}
                            variant="ghost"
                            size="sm"
                            className="text-green-600 hover:text-green-800"
                          >
                            ✓
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="px-6 py-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Mostrando {(currentPage - 1) * 50 + 1} até{' '}
              {Math.min(currentPage * 50, totalCount)} de{' '}
              {totalCount.toLocaleString('pt-BR')} transações
            </div>
            <div className="flex space-x-2">
              <Button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                variant="outline"
                size="sm"
              >
                Anterior
              </Button>

              {/* Páginas */}
              <div className="flex space-x-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  return (
                    <Button
                      key={pageNum}
                      onClick={() => goToPage(pageNum)}
                      variant={pageNum === currentPage ? 'default' : 'outline'}
                      size="sm"
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>

              <Button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                variant="outline"
                size="sm"
              >
                Próximo
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Mensagem quando não há transações */}
      {transactions.length === 0 && (
        <div className="px-6 py-12 text-center">
          <div className="text-gray-500">
            <svg
              className="mx-auto h-12 w-12 text-gray-400 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <p className="text-lg font-medium text-gray-900 mb-2">
              Nenhuma transação encontrada
            </p>
            <p className="text-gray-500">
              Tente ajustar os filtros ou verifique se há dados importados no
              sistema.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

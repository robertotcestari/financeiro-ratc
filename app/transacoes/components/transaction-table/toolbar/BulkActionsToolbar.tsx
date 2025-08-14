'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
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
import { Loader2, Trash2 } from 'lucide-react';
import type { RowSelectionState, Table } from '@tanstack/react-table';
import type { Transaction } from '../types';

interface BulkActionsToolbarProps {
  rowSelection: RowSelectionState;
  table: Table<Transaction>;
  isGeneratingAI: boolean;
  isPending: boolean;
  categoryOptions: ComboboxOption[];
  propertyOptions: ComboboxOption[];
  bulkCategory: string;
  bulkProperty: string;
  setBulkCategory: (value: string) => void;
  setBulkProperty: (value: string) => void;
  handleGenerateSuggestions: () => Promise<void>;
  handleGenerateAISuggestions: () => Promise<void>;
  handleApplySuggestions: () => Promise<void>;
  handleBulkCategorize: () => Promise<void>;
  handleBulkMarkReviewed: () => Promise<void>;
  handleBulkDelete: () => Promise<void>;
  clearSelection: () => void;
}

export function BulkActionsToolbar({
  rowSelection,
  table,
  isGeneratingAI,
  isPending,
  categoryOptions,
  propertyOptions,
  bulkCategory,
  bulkProperty,
  setBulkCategory,
  setBulkProperty,
  handleGenerateSuggestions,
  handleGenerateAISuggestions,
  handleApplySuggestions,
  handleBulkCategorize,
  handleBulkMarkReviewed,
  handleBulkDelete,
  clearSelection,
}: BulkActionsToolbarProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const selectedCount = Object.keys(rowSelection).length;
  
  if (selectedCount === 0) return null;

  const selectedRows = table.getSelectedRowModel().rows;
  const selectedWithSuggestions = selectedRows.filter(row => 
    row.original.suggestions?.length > 0
  );

  return (
    <div className="px-6 py-4 bg-blue-50 border-b border-blue-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium text-blue-900">
            {selectedCount}{' '}
            {selectedCount === 1
              ? 'transação selecionada'
              : 'transações selecionadas'}
          </span>

          <Button
            onClick={handleGenerateSuggestions}
            disabled={isPending || isGeneratingAI}
            variant="default"
            size="sm"
          >
            Gerar Sugestões ({selectedCount})
          </Button>

          <Button
            onClick={handleGenerateAISuggestions}
            disabled={isPending || isGeneratingAI}
            variant="default"
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            {isGeneratingAI ? (
              <>
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                Processando...
              </>
            ) : (
              <>Gerar Sugestões IA ({selectedCount})</>
            )}
          </Button>

          {selectedWithSuggestions.length > 0 && (
            <Button
              onClick={handleApplySuggestions}
              disabled={isPending || isGeneratingAI}
              variant="default"
              size="sm"
              className="bg-yellow-600 hover:bg-yellow-700"
            >
              Aplicar Sugestões ({selectedWithSuggestions.length})
            </Button>
          )}

          <Combobox
            options={categoryOptions}
            value={bulkCategory}
            onValueChange={setBulkCategory}
            placeholder="Selecione categoria..."
            searchPlaceholder="Buscar categoria..."
            emptyMessage="Nenhuma categoria encontrada."
            clearLabel="Selecione categoria..."
            className="w-64 text-sm"
          />

          <Combobox
            options={propertyOptions}
            value={bulkProperty}
            onValueChange={setBulkProperty}
            placeholder="Propriedade (opcional)"
            searchPlaceholder="Buscar propriedade..."
            emptyMessage="Nenhuma propriedade encontrada."
            clearLabel="Propriedade (opcional)"
            className="w-48 text-sm"
          />

          <Button
            onClick={handleBulkCategorize}
            disabled={!bulkCategory || isPending || isGeneratingAI}
            variant="default"
            size="sm"
          >
            Aplicar Categoria
          </Button>

          <Button
            onClick={handleBulkMarkReviewed}
            disabled={isPending || isGeneratingAI}
            variant="default"
            size="sm"
            className="bg-green-600 hover:bg-green-700"
          >
            Marcar como Revisado
          </Button>

          <Button
            onClick={() => setShowDeleteConfirm(true)}
            disabled={isPending || isGeneratingAI}
            variant="destructive"
            size="sm"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Deletar ({selectedCount})
          </Button>
        </div>

        <Button
          onClick={clearSelection}
          variant="ghost"
          size="sm"
        >
          Limpar seleção
        </Button>
      </div>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription className="py-3">
              Tem certeza que deseja excluir {selectedCount}{' '}
              {selectedCount === 1 ? 'transação selecionada' : 'transações selecionadas'}?
              <br />
              <span className="font-semibold text-red-600">Esta ação não pode ser desfeita.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel className="mt-0">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                await handleBulkDelete();
                setShowDeleteConfirm(false);
              }}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Excluir {selectedCount === 1 ? 'Transação' : `${selectedCount} Transações`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
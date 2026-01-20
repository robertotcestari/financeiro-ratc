import { useTransition, useCallback } from 'react';
import { toast } from 'sonner';
import {
  generateSuggestionsAction,
  applySuggestionsAction,
  dismissSuggestionsAction,
} from '../../../actions';
import type { Transaction } from '../types';
import type { RowSelectionState, Table } from '@tanstack/react-table';

export interface UseSuggestionsReturn {
  isPending: boolean;
  handleGenerateSuggestions: (selectedIds: string[]) => Promise<void>;
  handleApplySuggestions: (table: Table<Transaction>) => Promise<void>;
  handleDismissSuggestions: (table: Table<Transaction>) => Promise<void>;
}

export function useSuggestions(
  setRowSelection: (value: RowSelectionState) => void
): UseSuggestionsReturn {
  const [isPending, startTransition] = useTransition();

  const handleGenerateSuggestions = useCallback(
    async (selectedIds: string[]) => {
      if (selectedIds.length === 0) return;

      toast.info(`Gerando sugestões para ${selectedIds.length} transações...`, {
        duration: 5000,
        id: 'rule-generating',
      });

      startTransition(async () => {
        try {
          const result = await generateSuggestionsAction({
            transactionIds: selectedIds,
          });
          if (result.success) {
            const suggested = result.suggested || 0;

            if (suggested > 0) {
              toast.success(
                `${suggested} sugestões criadas para ${result.processed} transações processadas`,
                { id: 'rule-generating' }
              );
            } else {
              toast.info(
                `Nenhuma regra correspondente encontrada para as ${result.processed} transações analisadas`,
                { id: 'rule-generating' }
              );
            }
            setRowSelection({});
          } else {
            toast.error(result.error || 'Erro ao gerar sugestões', {
              id: 'rule-generating',
            });
          }
        } catch (error) {
          console.error('Error generating rule suggestions:', error);
          toast.error('Ocorreu um erro inesperado ao gerar sugestões', {
            id: 'rule-generating',
          });
        }
      });
    },
    [setRowSelection]
  );

  const handleApplySuggestions = useCallback(
    async (table: Table<Transaction>) => {
      const selectedRows = table.getSelectedRowModel().rows;
      const suggestionIds = selectedRows
        .flatMap((row) => row.original.suggestions || [])
        .map((suggestion) => suggestion.id);

      if (suggestionIds.length === 0) return;

      startTransition(async () => {
        await applySuggestionsAction({ suggestionIds });
        setRowSelection({});
      });
    },
    [setRowSelection]
  );

  const handleDismissSuggestions = useCallback(
    async (table: Table<Transaction>) => {
      const selectedRows = table.getSelectedRowModel().rows;
      const suggestionIds = selectedRows
        .flatMap((row) => row.original.suggestions || [])
        .map((suggestion) => suggestion.id);

      if (suggestionIds.length === 0) return;

      startTransition(async () => {
        await dismissSuggestionsAction({ suggestionIds });
        setRowSelection({});
      });
    },
    [setRowSelection]
  );

  return {
    isPending,
    handleGenerateSuggestions,
    handleApplySuggestions,
    handleDismissSuggestions,
  };
}

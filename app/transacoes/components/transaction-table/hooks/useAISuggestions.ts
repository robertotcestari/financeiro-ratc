import { useState, useTransition, useCallback } from 'react';
import { toast } from 'sonner';
import { 
  generateSuggestionsAction, 
  applySuggestionsAction,
  generateBulkAISuggestionsAction 
} from '../../../actions';
import type { Transaction } from '../types';
import type { RowSelectionState, Table } from '@tanstack/react-table';

export interface UseAISuggestionsReturn {
  isGeneratingAI: boolean;
  isPending: boolean;
  handleGenerateSuggestions: (selectedIds: string[]) => Promise<void>;
  handleGenerateAISuggestions: (selectedIds: string[]) => Promise<void>;
  handleApplySuggestions: (table: Table<Transaction>) => Promise<void>;
}

export function useAISuggestions(
  setRowSelection: (value: RowSelectionState) => void
): UseAISuggestionsReturn {
  const [isPending, startTransition] = useTransition();
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  const handleGenerateSuggestions = useCallback(async (selectedIds: string[]) => {
    if (selectedIds.length === 0) return;

    toast.info(`Gerando sugestões para ${selectedIds.length} transações...`, {
      duration: 5000,
      id: 'rule-generating',
    });

    startTransition(async () => {
      try {
        const result = await generateSuggestionsAction({ transactionIds: selectedIds });
        if (result.success) {
          if (result.suggested && result.suggested > 0) {
            toast.success(`${result.suggested} sugestões criadas para ${result.processed} transações processadas`, {
              id: 'rule-generating',
            });
          } else {
            toast.info(`Nenhuma sugestão encontrada para as ${result.processed} transações analisadas`, {
              id: 'rule-generating',
            });
          }
          setRowSelection({});
        } else {
          toast.error(result.error || "Erro ao gerar sugestões", {
            id: 'rule-generating',
          });
        }
      } catch (error) {
        console.error('Error generating rule suggestions:', error);
        toast.error("Ocorreu um erro inesperado ao gerar sugestões", {
          id: 'rule-generating',
        });
      }
    });
  }, [setRowSelection]);

  const handleGenerateAISuggestions = useCallback(async (selectedIds: string[]) => {
    if (selectedIds.length === 0) return;

    setIsGeneratingAI(true);
    toast.info(`Enviando ${selectedIds.length} transações para análise de IA...`, {
      duration: 10000,
      id: 'ai-generating',
    });

    try {
      const result = await generateBulkAISuggestionsAction({ transactionIds: selectedIds });
      if (result.success) {
        toast.success(result.message || `${result.suggested} sugestões criadas para ${result.processed} transações`, {
          id: 'ai-generating',
        });
        setRowSelection({});
      } else {
        toast.error(result.error || "Ocorreu um erro ao gerar as sugestões de IA", {
          id: 'ai-generating',
        });
      }
    } catch (error) {
      console.error('Error generating AI suggestions:', error);
      toast.error("Ocorreu um erro inesperado. Verifique o console para mais detalhes.", {
        id: 'ai-generating',
      });
    } finally {
      setIsGeneratingAI(false);
    }
  }, [setRowSelection]);

  const handleApplySuggestions = useCallback(async (table: Table<Transaction>) => {
    const selectedRows = table.getSelectedRowModel().rows;
    const suggestionIds = selectedRows
      .flatMap(row => row.original.suggestions)
      .map(suggestion => suggestion.id);
      
    if (suggestionIds.length === 0) return;

    startTransition(async () => {
      await applySuggestionsAction({ suggestionIds });
      setRowSelection({});
    });
  }, [setRowSelection]);

  return {
    isGeneratingAI,
    isPending,
    handleGenerateSuggestions,
    handleGenerateAISuggestions,
    handleApplySuggestions,
  };
}
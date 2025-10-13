'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { TransactionSearchParams } from '../../../types';

interface ExportTransactionsButtonProps {
  filters: TransactionSearchParams;
  disabled?: boolean;
}

function buildQueryString(filters: TransactionSearchParams): string {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value) {
      params.set(key, value);
    }
  });

  return params.toString();
}

function inferFilename(disposition: string | null): string | undefined {
  if (!disposition) return undefined;

  const match = /filename="?(?<filename>[^";]+)"?/i.exec(disposition);
  return match?.groups?.filename;
}

export function ExportTransactionsButton({
  filters,
  disabled = false,
}: ExportTransactionsButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const queryString = useMemo(() => buildQueryString(filters), [filters]);

  const handleExport = async () => {
    try {
      setIsExporting(true);

      const url = `/api/transacoes/export${queryString ? `?${queryString}` : ''}`;
      const response = await fetch(url, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error('Falha ao exportar transações');
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      const filename =
        inferFilename(response.headers.get('Content-Disposition')) ??
        'transacoes.csv';
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);

      toast({
        title: 'Exportação iniciada',
        description: 'O arquivo CSV está sendo baixado.',
      });
    } catch (error) {
      console.error(error);
      toast({
        title: 'Erro ao exportar',
        description:
          error instanceof Error
            ? error.message
            : 'Não foi possível gerar o CSV.',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      onClick={handleExport}
      variant="outline"
      size="sm"
      className="flex items-center gap-2"
      disabled={disabled || isExporting}
    >
      {isExporting ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Download className="h-4 w-4" />
      )}
      Exportar CSV
    </Button>
  );
}

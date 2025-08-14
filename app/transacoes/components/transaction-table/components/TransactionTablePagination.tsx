'use client';

import { Button } from '@/components/ui/button';
import { useRouter, useSearchParams } from 'next/navigation';

interface TransactionTablePaginationProps {
  currentPage: number;
  totalPages: number;
  totalCount: number;
}

export function TransactionTablePagination({ 
  currentPage, 
  totalPages, 
  totalCount 
}: TransactionTablePaginationProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const goToPage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', page.toString());
    router.push(`/transacoes?${params.toString()}`);
  };

  if (totalPages <= 1) return null;

  return (
    <div className="px-6 py-4 border-t border-gray-200">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-700">
          Mostrando {(currentPage - 1) * 200 + 1} até{' '}
          {Math.min(currentPage * 200, totalCount)} de{' '}
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

          {/* Pages */}
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
  );
}
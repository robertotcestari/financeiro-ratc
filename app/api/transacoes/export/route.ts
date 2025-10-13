import { NextRequest, NextResponse } from 'next/server';
import { Readable } from 'node:stream';
import { getCurrentUser } from '@/lib/core/auth/auth-utils';
import {
  parseTransactionSearchParams,
  resolveTransactionFilters,
} from '@/app/(protected)/transacoes/utils/filters';
import type { TransactionSearchParams } from '@/app/(protected)/transacoes/types';
import {
  fetchTransactionsForExport,
  buildTransactionsCsvStream,
  buildTransactionsExportFilename,
} from '@/lib/features/transactions/export-transactions';

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const rawFilters: TransactionSearchParams = parseTransactionSearchParams(
      request.nextUrl.searchParams
    );
    const currentYear = new Date().getFullYear();
    const filters = resolveTransactionFilters(rawFilters, currentYear);

    const rows = await fetchTransactionsForExport(filters);
    const stream = buildTransactionsCsvStream(rows);
    const filename = buildTransactionsExportFilename(filters);

    return new Response(Readable.toWeb(stream), {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Erro ao exportar transações:', error);
    return NextResponse.json(
      { error: 'Falha ao gerar exportação' },
      { status: 500 }
    );
  }
}

import { prisma } from '@/lib/database/client';
import Link from 'next/link';
import TransactionFilters from './components/TransactionFilters';
import TransactionTable from './components/TransactionTable';

interface SearchParams {
  categoria?: string;
  conta?: string;
  mes?: string;
  ano?: string;
  status?: string;
  page?: string;
}

interface Props {
  searchParams: Promise<SearchParams>;
}

export default async function TransacoesPage({ searchParams }: Props) {
  const resolvedParams = await searchParams;
  // Buscar todas as categorias para o filtro
  const categories = await prisma.category.findMany({
    orderBy: [{ level: 'asc' }, { orderIndex: 'asc' }, { name: 'asc' }],
    include: {
      parent: true,
    },
  });

  // Buscar todas as contas bancárias para o filtro
  const bankAccounts = await prisma.bankAccount.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  });

  // Buscar todas as propriedades para o formulário de edição
  const properties = await prisma.property.findMany({
    orderBy: { code: 'asc' },
  });

  // Construir filtros da query
  const page = parseInt(resolvedParams.page || '1');
  const pageSize = 50;
  const skip = (page - 1) * pageSize;

  const where: Record<string, unknown> = {};

  if (resolvedParams.categoria) {
    where.categoryId = resolvedParams.categoria;
  }

  if (resolvedParams.conta) {
    where.transaction = {
      bankAccountId: resolvedParams.conta,
    };
  }

  if (resolvedParams.mes && resolvedParams.ano) {
    where.year = parseInt(resolvedParams.ano);
    where.month = parseInt(resolvedParams.mes);
  } else if (resolvedParams.ano) {
    where.year = parseInt(resolvedParams.ano);
  }

  // Filtro de Status
  if (resolvedParams.status === 'pendentes') {
    where.isReviewed = false;
  } else if (resolvedParams.status === 'revisados') {
    where.isReviewed = true;
  }

  // Buscar transações unificadas com paginação
  const [transactions, totalCount] = await Promise.all([
    prisma.unifiedTransaction.findMany({
      where,
      include: {
        transaction: {
          include: {
            bankAccount: true,
          },
        },
        category: {
          include: {
            parent: true,
          },
        },
        property: true,
        transfer: {
          include: {
            originAccount: true,
            destinationAccount: true,
          },
        },
      },
      orderBy: [
        { transaction: { date: 'desc' } },
        { transaction: { id: 'desc' } },
      ],
      skip,
      take: pageSize,
    }),
    prisma.unifiedTransaction.count({ where }),
  ]);

  const totalPages = Math.ceil(totalCount / pageSize);

  // Serialize to plain objects (no Prisma Decimal instances) for client component
  const safeTransactions = transactions.map((t) => ({
    id: t.id,
    year: t.year,
    month: t.month,
    details: t.details,
    notes: t.notes,
    isTransfer: t.isTransfer,
    isReviewed: t.isReviewed,
    transaction: {
      id: t.transaction.id,
      date: t.transaction.date,
      description: t.transaction.description,
      amount: Number(t.transaction.amount),
      bankAccount: {
        name: t.transaction.bankAccount.name,
        bankName: t.transaction.bankAccount.bankName,
      },
    },
    category: {
      id: t.category.id,
      name: t.category.name,
      type: t.category.type,
      parent: t.category.parent ? { name: t.category.parent.name } : null,
    },
    property: t.property
      ? { code: t.property.code, city: t.property.city }
      : null,
    transfer: t.transfer
      ? {
          originAccount: { name: t.transfer.originAccount.name },
          destinationAccount: { name: t.transfer.destinationAccount.name },
          amount: Number(t.transfer.amount),
        }
      : null,
  }));

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Transações Categorizadas
            </h1>
            <p className="text-gray-600">
              {totalCount.toLocaleString('pt-BR')} transações encontradas
            </p>
          </div>
          <Link
            href="/"
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            ← Voltar
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <TransactionFilters
            categories={categories}
            bankAccounts={bankAccounts}
            searchParams={resolvedParams}
          />
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <TransactionTable
            transactions={safeTransactions}
            currentPage={page}
            totalPages={totalPages}
            totalCount={totalCount}
            categories={categories}
            properties={properties}
          />
        </div>
      </div>
    </div>
  );
}

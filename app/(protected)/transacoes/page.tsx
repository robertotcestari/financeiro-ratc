import { prisma } from '@/lib/core/database/client';
import Link from 'next/link';
import TransactionFilters from './components/TransactionFilters';
import TransactionTable from './components/transaction-table';
import { isPendingTransaction } from '@/lib/core/database/transactions';
import type { Prisma } from '@/app/generated/prisma';
import { redirect } from 'next/navigation';

type PTWithIncludes = Prisma.ProcessedTransactionGetPayload<{
  include: {
    transaction: { include: { bankAccount: true } };
    category: { include: { parent: true } };
    property: true;
    suggestions: {
      select: {
        id: true;
        confidence: true;
        createdAt: true;
        source: true;
        reasoning: true;
        rule: true;
        suggestedCategory: {
          select: {
            id: true;
            name: true;
            type: true;
            parent: { select: { name: true } };
          };
        };
        suggestedProperty: {
          select: { id: true; code: true; city: true };
        };
      };
    };
  };
}>;

interface SearchParams {
  categoria?: string;
  conta?: string;
  mes?: string;
  ano?: string;
  status?: string;
  sugestoes?: string;
  busca?: string;
  page?: string;
}

interface Props {
  searchParams: Promise<SearchParams>;
}

export default async function TransacoesPage({ searchParams }: Props) {
  const resolvedParams = await searchParams;

  // Aplicar filtros padrão do Inbox (mês atual + "pendentes") quando necessário
  const filterKeys: Array<keyof SearchParams> = [
    'categoria',
    'conta',
    'mes',
    'ano',
    'status',
    'sugestoes',
    'busca',
  ];

  // Verifica se há parâmetros de filtro definidos
  const hasAnyFilterParam = filterKeys.some((k) => {
    const v = (resolvedParams as Record<string, string | undefined>)[k];
    return v !== undefined && v !== null && v !== '';
  });

  // Aplica filtros padrão do inbox quando:
  // 1. Não há nenhum parâmetro de filtro, OU
  // 2. Há apenas paginação sem filtros
  const hasOnlyPagination = !hasAnyFilterParam && resolvedParams.page;

  if (!hasAnyFilterParam || hasOnlyPagination) {
    const now = new Date();
    // Calcular mês anterior
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1);
    const year = previousMonth.getFullYear();
    const month = previousMonth.getMonth() + 1;

    const params = new URLSearchParams();

    // Preserva paginação caso exista
    if (resolvedParams.page) params.set('page', resolvedParams.page);

    // Define filtros padrão do inbox (apenas mês anterior - deixa status desmarcado)
    params.set('ano', year.toString());
    params.set('mes', month.toString());

    redirect(`/transacoes?${params.toString()}`);
  }

  // Garantir que ano tenha valor padrão se não especificado
  const currentYear = new Date().getFullYear();
  const effectiveFilters = {
    ...resolvedParams,
    ano: resolvedParams.ano || currentYear.toString(),
  };

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

  // Construir filtros da query usando effectiveFilters
  const page = parseInt(effectiveFilters.page || '1');
  const pageSize = 200;
  const skip = (page - 1) * pageSize;

  const where: Record<string, unknown> = {};

  if (effectiveFilters.categoria) {
    where.categoryId = effectiveFilters.categoria;
  }

  if (effectiveFilters.conta) {
    where.transaction = {
      bankAccountId: effectiveFilters.conta,
    };
  }

  if (effectiveFilters.mes && effectiveFilters.ano) {
    where.year = parseInt(effectiveFilters.ano);
    where.month = parseInt(effectiveFilters.mes);
  } else if (effectiveFilters.ano) {
    where.year = parseInt(effectiveFilters.ano);
  }

  // Construir filtros AND e OR separadamente
  const andConditions: Prisma.ProcessedTransactionWhereInput[] = [];
  const orConditions: Prisma.ProcessedTransactionWhereInput[] = [];

  // Filtro de Status (Pendentes = isReviewed=false OR categoryId IS NULL OR transactionId IS NULL)
  if (effectiveFilters.status === 'pendentes') {
    orConditions.push(
      { isReviewed: false },
      { categoryId: null },
      { transactionId: null }
    );
  } else if (effectiveFilters.status === 'revisados') {
    andConditions.push({ isReviewed: true });
  }

  // Filtro de Sugestões
  if (effectiveFilters.sugestoes === 'com-sugestoes') {
    andConditions.push({
      suggestions: {
        some: {
          isApplied: false,
        },
      },
    });
  } else if (effectiveFilters.sugestoes === 'aplicado-via-regra') {
    andConditions.push({
      suggestions: {
        some: {
          isApplied: true,
        },
      },
    });
  }

  // Filtro de Busca Textual
  if (effectiveFilters.busca) {
    const searchTerm = effectiveFilters.busca.trim();
    const searchConditions = {
      OR: [
        {
          transaction: {
            description: {
              contains: searchTerm,
            },
          },
        },
        {
          details: {
            contains: searchTerm,
          },
        },
      ],
    };

    // Se houver filtro de status pendentes, combinar com AND
    if (effectiveFilters.status === 'pendentes') {
      where.AND = [{ OR: orConditions }, searchConditions];
    } else {
      andConditions.push(searchConditions);
    }
  } else if (orConditions.length > 0) {
    where.OR = orConditions;
  }

  // Aplicar condições AND se não houver conflito com busca e status pendentes
  if (andConditions.length > 0 && !effectiveFilters.busca) {
    where.AND = andConditions;
  } else if (
    andConditions.length > 0 &&
    effectiveFilters.busca &&
    effectiveFilters.status !== 'pendentes'
  ) {
    where.AND = andConditions;
  }

  // Buscar transações processadas com paginação
  const [transactions, totalCount] = await Promise.all([
    prisma.processedTransaction.findMany({
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
        suggestions: {
          select: {
            id: true,
            confidence: true,
            createdAt: true,
            source: true,
            reasoning: true,
            rule: true,
            suggestedCategory: {
              select: {
                id: true,
                name: true,
                type: true,
                parent: { select: { name: true } },
              },
            },
            suggestedProperty: {
              select: { id: true, code: true, city: true },
            },
          },
          where: { isApplied: false },
          orderBy: [{ confidence: 'desc' }, { createdAt: 'desc' }],
        },
      },
      orderBy: [
        { transaction: { date: 'desc' } },
        { transaction: { id: 'desc' } },
      ],
      skip,
      take: pageSize,
    }),
    prisma.processedTransaction.count({ where }),
  ]);

  const totalPages = Math.ceil(totalCount / pageSize);

  // Serialize to plain objects (no Prisma Decimal instances) for client component
  const safeTransactions = transactions.map((t: PTWithIncludes) => {
    const pending = isPendingTransaction({
      isReviewed: t.isReviewed,
      categoryId: t.categoryId,
      transactionId: t.transactionId,
    });

    const tx = t.transaction
      ? {
          id: t.transaction.id,
          date: t.transaction.date,
          description: t.transaction.description,
          amount: Number(t.transaction.amount),
          bankAccount: {
            name: t.transaction.bankAccount.name,
            bankName: t.transaction.bankAccount.bankName,
          },
        }
      : {
          id: '—',
          date: new Date(0),
          description: '(sem transação bancária)',
          amount: 0,
          bankAccount: {
            name: 'N/D',
            bankName: 'N/D',
          },
        };

    const category = t.category
      ? {
          id: t.category.id,
          name: t.category.name,
          type: t.category.type,
          parent: t.category.parent ? { name: t.category.parent.name } : null,
        }
      : {
          id: 'uncategorized',
          name: 'Sem Categoria',
          type: 'UNCATEGORIZED' as const,
          parent: null,
        };

    return {
      id: t.id,
      year: t.year,
      month: t.month,
      details: t.details,
      // notes removido do schema
      isReviewed: t.isReviewed,
      isPending: pending,
      transaction: tx,
      category,
      property: t.property
        ? { code: t.property.code, city: t.property.city }
        : null,
      suggestions: t.suggestions.map((s) => ({
        id: s.id,
        confidence: s.confidence,
        createdAt: s.createdAt,
        source: s.source,
        reasoning: s.reasoning,
        rule: s.rule
          ? {
              id: s.rule.id,
              name: s.rule.name,
              description: s.rule.description,
            }
          : null,
        suggestedCategory: s.suggestedCategory
          ? {
              id: s.suggestedCategory.id,
              name: s.suggestedCategory.name,
              type: s.suggestedCategory.type,
              parent: s.suggestedCategory.parent
                ? { name: s.suggestedCategory.parent.name }
                : null,
            }
          : null,
        suggestedProperty: s.suggestedProperty
          ? {
              id: s.suggestedProperty.id,
              code: s.suggestedProperty.code,
              city: s.suggestedProperty.city,
            }
          : null,
      })),
    };
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="py-8 pb-24">
        <div className="container mx-auto px-4 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Transações Processadas
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
        </div>

        <div className="px-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <TransactionFilters
              categories={categories}
              bankAccounts={bankAccounts}
              searchParams={effectiveFilters}
            />
          </div>
        </div>

        <div className="px-4">
          <div className="bg-white shadow-sm border border-gray-200 rounded-lg">
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
    </div>
  );
}

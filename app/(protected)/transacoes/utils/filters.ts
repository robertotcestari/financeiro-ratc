import type { Prisma } from '@/app/generated/prisma';
import type { TransactionSearchParams } from '../types';

export const TRANSACTION_ORDER_BY: Prisma.ProcessedTransactionOrderByWithRelationInput[] =
  [
    { transaction: { date: 'desc' } },
    { transaction: { id: 'desc' } },
  ];

/**
 * Normaliza filtros aplicando valores padrão necessários.
 */
export function resolveTransactionFilters(
  params: TransactionSearchParams,
  currentYear: number
): TransactionSearchParams {
  return {
    ...params,
    ano: params.ano || currentYear.toString(),
  };
}

const SEARCH_PARAM_KEYS: Array<keyof TransactionSearchParams> = [
  'categoria',
  'conta',
  'propriedade',
  'mes',
  'ano',
  'status',
  'sugestoes',
  'busca',
  'page',
];

/**
 * Converte `URLSearchParams` em objeto tipado, descartando valores vazios.
 */
export function parseTransactionSearchParams(
  params: URLSearchParams
): TransactionSearchParams {
  const result: TransactionSearchParams = {};

  for (const key of SEARCH_PARAM_KEYS) {
    const value = params.get(key);
    if (value && value.trim() !== '') {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Constrói o objeto `where` utilizado para consultar ProcessedTransactions,
 * replicando as mesmas regras aplicadas na página de transações.
 */
export function buildProcessedTransactionWhere(
  filters: TransactionSearchParams
): Prisma.ProcessedTransactionWhereInput {
  const where: Prisma.ProcessedTransactionWhereInput = {};
  const andConditions: Prisma.ProcessedTransactionWhereInput[] = [];
  const orConditions: Prisma.ProcessedTransactionWhereInput[] = [];

  if (filters.categoria) {
    where.categoryId = filters.categoria;
  }

  if (filters.conta) {
    where.transaction = {
      bankAccountId: filters.conta,
    };
  }

  if (filters.propriedade) {
    where.propertyId = filters.propriedade;
  }

  if (filters.mes && filters.ano) {
    where.year = parseInt(filters.ano, 10);
    where.month = parseInt(filters.mes, 10);
  } else if (filters.ano) {
    where.year = parseInt(filters.ano, 10);
  }

  if (filters.status === 'pendentes') {
    orConditions.push(
      { isReviewed: false },
      { categoryId: null },
      { transactionId: null }
    );
  } else if (filters.status === 'revisados') {
    andConditions.push({ isReviewed: true });
  }

  if (filters.sugestoes === 'com-sugestoes') {
    andConditions.push({
      suggestions: {
        some: {
          isApplied: false,
          source: 'RULE',
        },
      },
    });
  } else if (filters.sugestoes === 'aplicado-via-regra') {
    andConditions.push({
      suggestions: {
        some: {
          isApplied: true,
          source: 'RULE',
        },
      },
    });
  }

  if (filters.busca) {
    const searchTerm = filters.busca.trim();
    const searchConditions: Prisma.ProcessedTransactionWhereInput = {
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

    if (filters.status === 'pendentes') {
      where.AND = [{ OR: orConditions }, searchConditions];
    } else {
      andConditions.push(searchConditions);
    }
  } else if (orConditions.length > 0) {
    where.OR = orConditions;
  }

  if (andConditions.length > 0 && !filters.busca) {
    where.AND = andConditions;
  } else if (
    andConditions.length > 0 &&
    filters.busca &&
    filters.status !== 'pendentes'
  ) {
    where.AND = andConditions;
  }

  return where;
}

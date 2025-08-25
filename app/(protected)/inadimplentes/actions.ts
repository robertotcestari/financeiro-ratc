'use server';

import { createInadimplente, listInadimplentes, toggleInadimplenteSettled, InadimplenteData } from '@/lib/core/database/inadimplentes';
import { prisma } from '@/lib/core/database/client';

export async function getProperties() {
  return prisma.property.findMany({
    orderBy: { code: 'asc' },
    select: { id: true, code: true, address: true, city: true },
  });
}

export async function listItems() {
  return listInadimplentes();
}

export async function createItem(data: InadimplenteData) {
  return createInadimplente(data);
}

export async function setSettled(id: string, settled: boolean) {
  await toggleInadimplenteSettled(id, settled);
}

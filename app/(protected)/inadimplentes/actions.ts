'use server';

import { createInadimplente, listInadimplentes, toggleInadimplenteSettled, deleteInadimplente, InadimplenteData } from '@/lib/core/database/inadimplentes';
import { prisma } from '@/lib/core/database/client';
import { revalidatePath } from 'next/cache';

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
  const result = await createInadimplente(data);
  revalidatePath('/inadimplentes');
  return result;
}

export async function setSettled(id: string, settled: boolean) {
  await toggleInadimplenteSettled(id, settled);
  revalidatePath('/inadimplentes');
}

export async function deleteItem(id: string) {
  await deleteInadimplente(id);
  revalidatePath('/inadimplentes');
}

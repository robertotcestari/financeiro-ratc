import { prisma } from './client';

export interface InadimplenteData {
  propertyId: string;
  tenant: string;
  amount: number; // BRL amount
  dueDate: string; // ISO date string
  settled: boolean;
}

export async function listInadimplentes(): Promise<Array<{ id: string; data: InadimplenteData }>> {
  const rows = await prisma.meta.findMany({
    where: { type: 'INADIMPLENTES' as any },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map((r) => ({ id: r.id, data: r.data as unknown as InadimplenteData }));
}

export async function createInadimplente(data: InadimplenteData) {
  const row = await prisma.meta.create({
    data: { type: 'INADIMPLENTES' as any, data },
  });
  return { id: row.id };
}

export async function toggleInadimplenteSettled(id: string, settled: boolean) {
  const row = await prisma.meta.findUnique({ where: { id } });
  if (!row) throw new Error('not_found');
  const data = row.data as unknown as InadimplenteData;
  data.settled = settled;
  await prisma.meta.update({ where: { id }, data: { data } });
}

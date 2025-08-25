import { prisma } from './client';
import crypto from 'node:crypto';

export interface InadimplenteData {
  propertyId: string;
  tenant: string;
  amount: number; // BRL amount
  dueDate: string; // ISO date string
  settled: boolean;
}

type InadimplenteItem = { id: string; data: InadimplenteData };

function safeJsonParse<T = unknown>(s: string): T | undefined {
  try {
    return JSON.parse(s) as T;
  } catch {
    return undefined;
  }
}

function parseItemsFromData(data: unknown): InadimplenteItem[] {
  const parsed = typeof data === 'string' ? safeJsonParse(data) : data;
  if (Array.isArray(parsed)) return parsed as InadimplenteItem[];
  if (
    parsed &&
    typeof parsed === 'object' &&
    'items' in parsed &&
    Array.isArray((parsed as { items?: unknown }).items)
  ) {
    return (parsed as { items: unknown[] }).items as InadimplenteItem[];
  }
  return [];
}

async function getContainerRow(): Promise<{
  id: string;
  items: InadimplenteItem[];
} | null> {
  const rows = await prisma.$queryRaw<Array<{ id: string; data: unknown }>>`
    SELECT id, data FROM meta WHERE type = ${'INADIMPLENTES'} ORDER BY createdAt DESC LIMIT 1
  `;
  const row = rows[0];
  if (!row) return null;
  const items = parseItemsFromData(row.data);
  return { id: row.id, items };
}

export async function listInadimplentes(): Promise<
  Array<{ id: string; data: InadimplenteData }>
> {
  // Prefer container row with array of items
  const container = await getContainerRow();
  // If a container row exists, always trust it — even if empty
  if (container) return container.items;

  // Fallback (legacy): multiple rows, each with a single item payload
  const rows = await prisma.$queryRaw<Array<{ id: string; data: unknown }>>`
    SELECT id, data
    FROM meta
    WHERE type = ${'INADIMPLENTES'}
    ORDER BY createdAt DESC
  `;
  return rows.map((r) => ({
    id: r.id,
    data:
      typeof r.data === 'string'
        ? (JSON.parse(r.data) as InadimplenteData)
        : (r.data as InadimplenteData),
  }));
}

export async function createInadimplente(data: InadimplenteData) {
  const newItem: InadimplenteItem = { id: crypto.randomUUID(), data };
  const container = await getContainerRow();
  if (!container) {
    const rowId = crypto.randomUUID();
    await prisma.$executeRaw`
      INSERT INTO meta (id, type, data, createdAt, updatedAt)
      VALUES (${rowId}, ${'INADIMPLENTES'}, ${JSON.stringify([
      newItem,
    ])}, NOW(), NOW())
    `;
    return { id: newItem.id };
  }

  const items = [...container.items, newItem];
  await prisma.$executeRaw`
    UPDATE meta SET data = ${JSON.stringify(
      items
    )}, updatedAt = NOW() WHERE id = ${container.id}
  `;
  return { id: newItem.id };
}

export async function toggleInadimplenteSettled(id: string, settled: boolean) {
  // Try container first
  const container = await getContainerRow();
  if (container) {
    const idx = container.items.findIndex((it) => it.id === id);
    if (idx === -1) throw new Error('not_found');
    const nextItems = container.items.slice();
    nextItems[idx] = { id, data: { ...nextItems[idx].data, settled } };
    await prisma.$executeRaw`
      UPDATE meta SET data = ${JSON.stringify(
        nextItems
      )}, updatedAt = NOW() WHERE id = ${container.id}
    `;
    return;
  }

  // Fallback (legacy): item stored as single row
  const rows = await prisma.$queryRaw<Array<{ data: unknown }>>`
    SELECT data FROM meta WHERE id = ${id} LIMIT 1
  `;
  const row = rows[0];
  if (!row) throw new Error('not_found');
  const dataObj: InadimplenteData =
    typeof row.data === 'string'
      ? (JSON.parse(row.data) as InadimplenteData)
      : (row.data as InadimplenteData);
  dataObj.settled = settled;
  await prisma.$executeRaw`
    UPDATE meta SET data = ${JSON.stringify(
      dataObj
    )}, updatedAt = NOW() WHERE id = ${id}
  `;
}

export async function deleteInadimplente(id: string) {
  // Try container first
  const container = await getContainerRow();
  if (container) {
    const idx = container.items.findIndex((it) => it.id === id);
    if (idx === -1) throw new Error('not_found');
    const nextItems = container.items.filter((it) => it.id !== id);
    await prisma.$executeRaw`
      UPDATE meta SET data = ${JSON.stringify(
        nextItems
      )}, updatedAt = NOW() WHERE id = ${container.id}
    `;
    return;
  }

  // Fallback (legacy): item stored as single row
  const rows = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM meta WHERE id = ${id} LIMIT 1
  `;
  const row = rows[0];
  if (!row) throw new Error('not_found');
  await prisma.$executeRaw`
    DELETE FROM meta WHERE id = ${id}
  `;
}

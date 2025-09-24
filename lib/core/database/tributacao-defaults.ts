import crypto from 'node:crypto';

import { prisma } from './client';

const META_TYPE = 'TRIBUTACAO_DEFAULTS';

export interface TributacaoDefaultValues {
  condominio: number;
  iptu: number;
  nonTaxable: number;
  forceZero: boolean;
}

type ContainerData = {
  entries: Record<string, TributacaoDefaultValues>;
};

type ContainerRow = {
  id: string;
  data: unknown;
};

function sanitizeNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.max(value, 0);
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) return Math.max(parsed, 0);
  }
  return 0;
}

function sanitizeBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return normalized === 'true' || normalized === '1' || normalized === 'yes';
  }
  return false;
}

function parseContainerData(data: unknown): ContainerData {
  const parsed = typeof data === 'string' ? safeJsonParse<ContainerData>(data) : (data as ContainerData);
  if (parsed && typeof parsed === 'object' && 'entries' in parsed) {
    const entries: Record<string, TributacaoDefaultValues> = {};
    const rawEntries = (parsed as ContainerData).entries || {};
    for (const [propertyId, values] of Object.entries(rawEntries)) {
      entries[propertyId] = {
        condominio: sanitizeNumber(values?.condominio),
        iptu: sanitizeNumber(values?.iptu),
        nonTaxable: sanitizeNumber(values?.nonTaxable),
        forceZero: sanitizeBoolean(values?.forceZero),
      };
    }
    return { entries };
  }
  return { entries: {} };
}

function safeJsonParse<T>(value: string): T | undefined {
  try {
    return JSON.parse(value) as T;
  } catch {
    return undefined;
  }
}

async function getContainer(): Promise<{
  id: string;
  entries: Record<string, TributacaoDefaultValues>;
} | null> {
  const rows = await prisma.$queryRaw<ContainerRow[]>`
    SELECT id, data FROM meta WHERE type = ${META_TYPE} ORDER BY createdAt DESC LIMIT 1
  `;

  const row = rows[0];
  if (!row) return null;

  const container = parseContainerData(row.data);
  return { id: row.id, entries: container.entries };
}

export async function getTributacaoDefaults(): Promise<
  Record<string, TributacaoDefaultValues>
> {
  const container = await getContainer();
  if (!container) return {};
  return container.entries;
}

export async function updateTributacaoDefault(
  propertyId: string,
  values: TributacaoDefaultValues
) {
  const payload: TributacaoDefaultValues = {
    condominio: sanitizeNumber(values.condominio),
    iptu: sanitizeNumber(values.iptu),
    nonTaxable: sanitizeNumber(values.nonTaxable),
    forceZero: sanitizeBoolean(values.forceZero),
  };

  const container = await getContainer();

  if (!container) {
    const id = crypto.randomUUID();
    const entries: ContainerData = {
      entries: {
        [propertyId]: payload,
      },
    };
    await prisma.$executeRaw`
      INSERT INTO meta (id, type, data, createdAt, updatedAt)
      VALUES (${id}, ${META_TYPE}, ${JSON.stringify(entries)}, NOW(), NOW())
    `;
    return;
  }

  const nextEntries = {
    ...container.entries,
    [propertyId]: payload,
  };

  await prisma.$executeRaw`
    UPDATE meta SET data = ${JSON.stringify({ entries: nextEntries })}, updatedAt = NOW()
    WHERE id = ${container.id}
  `;
}

export type TributacaoNumericField = 'condominio' | 'iptu' | 'nonTaxable';

export type TributacaoDefaultField = TributacaoNumericField | 'forceZero';

export async function updateTributacaoDefaultField(
  propertyId: string,
  field: TributacaoNumericField,
  value: number
) {
  const current = await getContainer();
  const entry = current?.entries[propertyId] ?? {
    condominio: 0,
    iptu: 0,
    nonTaxable: 0,
    forceZero: false,
  };

  await updateTributacaoDefault(propertyId, {
    ...entry,
    [field]: sanitizeNumber(value),
  });
}

export async function updateTributacaoZeroFlag(
  propertyId: string,
  forceZero: boolean
) {
  const current = await getContainer();
  const entry = current?.entries[propertyId] ?? {
    condominio: 0,
    iptu: 0,
    nonTaxable: 0,
    forceZero: false,
  };

  await updateTributacaoDefault(propertyId, {
    ...entry,
    forceZero: sanitizeBoolean(forceZero),
  });
}

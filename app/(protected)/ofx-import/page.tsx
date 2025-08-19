import React from 'react';
import OfxImportWizard from '@/components/features/ofx/OfxImportWizard';
import { getBankAccounts } from '@/app/(protected)/cadastros/contas/actions';
import { getCategoriesHierarchy } from '@/app/(protected)/categorias/actions';
import { getProperties } from '@/app/(protected)/imoveis/actions';
import type { BankAccount, Category, Property } from '@/app/generated/prisma';

export const dynamic = 'force-dynamic';

export default async function OfxImportPage() {
  // Fetch data on the server for initial wizard props
  const [accounts, categories, properties] = await Promise.all([
    getBankAccounts(),
    getCategoriesHierarchy(),
    getProperties(),
  ]);

  const initialAccounts = accounts.map((a: BankAccount) => ({
    id: a.id,
    name: a.name,
    bankName: a.bankName,
    accountType: a.accountType as unknown as
      | 'CHECKING'
      | 'SAVINGS'
      | 'INVESTMENT'
      | string,
    isActive: a.isActive,
  }));

  const categoryOptions = categories.map((c: Category) => ({
    id: c.id,
    name: c.name,
    type: c.type as unknown as 'INCOME' | 'EXPENSE' | 'TRANSFER' | string,
  }));

  const propertyOptions = properties.map((p: Property) => ({
    id: p.id,
    code: p.code,
  }));

  return (
    <main className="container mx-auto px-4 py-6">
      <h1 className="mb-4 text-xl font-semibold">Importação OFX</h1>
      <OfxImportWizard
        initialAccounts={initialAccounts}
        categories={categoryOptions}
        properties={propertyOptions}
      />
    </main>
  );
}

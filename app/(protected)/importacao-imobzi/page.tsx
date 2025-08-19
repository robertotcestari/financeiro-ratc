import React from 'react';
import ImobziImportWizard from '@/components/features/imobzi/ImobziImportWizard';
import { getBankAccounts } from '@/app/(protected)/cadastros/contas/actions';
import type { BankAccount } from '@/app/generated/prisma';

export const dynamic = 'force-dynamic';

export default async function ImobziImportPage() {
  // Fetch bank accounts for the wizard
  const accounts = await getBankAccounts();

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

  return (
    <main className="container mx-auto px-4 py-6">
      <h1 className="mb-4 text-xl font-semibold">Importação Imobzi</h1>
      <ImobziImportWizard initialAccounts={initialAccounts} />
    </main>
  );
}

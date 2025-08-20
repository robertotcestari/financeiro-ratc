import { Suspense } from 'react';
import { BanksList } from './components/BanksList';
import { BanksListSkeleton } from './components/BanksListSkeleton';

export const dynamic = 'force-dynamic';

export default function BancosPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Bancos</h1>

        <Suspense key="banks-list" fallback={<BanksListSkeleton />}>
          <BanksList />
        </Suspense>
      </div>
    </div>
  );
}

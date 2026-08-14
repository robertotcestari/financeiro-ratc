import { notFound } from 'next/navigation';
import { PayablesNav } from '../components/PayablesNav';
import { PayableDetail } from '../components/PayableDetail';
import { getPayableAction } from '../actions';

export const dynamic = 'force-dynamic';

export default async function PayableDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const payable = await getPayableAction(id);
  if (!payable) notFound();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto space-y-6 px-4 py-8">
        <PayablesNav current="/contas-a-pagar" />
        <PayableDetail payable={payable} />
      </div>
    </div>
  );
}

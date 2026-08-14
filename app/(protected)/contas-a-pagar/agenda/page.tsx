import { PayablesNav } from '../components/PayablesNav';
import { PaymentCalendar } from '../components/PaymentCalendar';
import { getAgendaAction } from '../actions';

export const dynamic = 'force-dynamic';

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ ano?: string; mes?: string }>;
}) {
  const params = await searchParams;
  const now = new Date();
  const year = Number(params.ano) || now.getFullYear();
  const month = Number(params.mes) || now.getMonth() + 1;
  const items = await getAgendaAction(year, month);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto space-y-6 px-4 py-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Agenda de pagamentos</h1>
          <p className="text-gray-600">Parcelas em aberto no mês</p>
        </div>
        <PayablesNav current="/contas-a-pagar/agenda" />
        <PaymentCalendar year={year} month={month} items={items} />
      </div>
    </div>
  );
}

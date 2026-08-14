import { PayablesNav } from './components/PayablesNav';
import { PayablesFilters } from './components/PayablesFilters';
import { PayablesTable } from './components/PayablesTable';
import {
  getPayableSummaryAction,
  getPayablesFormData,
  listInstallmentsAction,
} from './actions';
import { formatCurrency } from '@/lib/formatters';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { PayableInstallmentStatus } from '@/app/generated/prisma';

export const dynamic = 'force-dynamic';

type SearchParams = {
  status?: string;
  vendorId?: string;
  propertyId?: string;
  categoryId?: string;
  dueFrom?: string;
  dueTo?: string;
  overdue?: string;
  busca?: string;
  showCanceled?: string;
};

export default async function ContasAPagarPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const status = params.status as PayableInstallmentStatus | undefined;

  const [items, summary, formData] = await Promise.all([
    listInstallmentsAction({
      status: status || undefined,
      vendorId: params.vendorId,
      propertyId: params.propertyId,
      categoryId: params.categoryId,
      dueFrom: params.dueFrom,
      dueTo: params.dueTo,
      overdue:
        params.overdue === 'true'
          ? true
          : params.overdue === 'false'
            ? false
            : undefined,
      hideCanceled: params.showCanceled !== 'true' && status !== 'CANCELED',
      search: params.busca,
    }),
    getPayableSummaryAction(),
    getPayablesFormData(),
  ]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto space-y-6 px-4 py-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Contas a pagar</h1>
          <p className="text-gray-600">
            Vencimentos, baixas e vínculo com transações bancárias
          </p>
        </div>
        <PayablesNav current="/contas-a-pagar" />

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-gray-600">A vencer</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-700">
                {formatCurrency(summary.dueThisMonth.amount)}
              </div>
              <div className="text-sm text-gray-500">
                {summary.dueThisMonth.count} parcela(s)
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-gray-600">Atrasadas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(summary.overdue.amount)}
              </div>
              <div className="text-sm text-gray-500">
                {summary.overdue.count} parcela(s)
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-gray-600">Pagas no mês</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-700">
                {formatCurrency(summary.paidThisMonth.amount)}
              </div>
              <div className="text-sm text-gray-500">
                {summary.paidThisMonth.count} baixa(s)
              </div>
            </CardContent>
          </Card>
        </div>

        <PayablesFilters
          filters={{
            status: params.status ?? '',
            vendorId: params.vendorId ?? '',
            propertyId: params.propertyId ?? '',
            categoryId: params.categoryId ?? '',
            dueFrom: params.dueFrom ?? '',
            dueTo: params.dueTo ?? '',
            overdue: params.overdue ?? '',
            busca: params.busca ?? '',
            showCanceled: params.showCanceled ?? '',
          }}
          vendors={formData.vendors.map((vendor) => ({
            value: vendor.id,
            label: vendor.name,
          }))}
          properties={formData.properties.map((property) => ({
            value: property.id,
            label: property.code,
          }))}
          categories={formData.categories.map((category) => ({
            value: category.id,
            label: category.name,
          }))}
        />

        <PayablesTable items={items} />
      </div>
    </div>
  );
}

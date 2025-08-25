'use client';

import { useState } from 'react';
import { type ImobziInvoiceFormatted } from '@/lib/features/imobzi/invoices';
import { Button } from '@/components/ui/button';
import { CheckCircle2 } from 'lucide-react';
import PaymentModal from './PaymentModal';
import { useRouter } from 'next/navigation';

interface ImobziPendingRentsProps {
  invoices: ImobziInvoiceFormatted[];
}

export default function ImobziPendingRents({ invoices: initialInvoices }: ImobziPendingRentsProps) {
  const [invoices, setInvoices] = useState(initialInvoices);
  const [selectedInvoice, setSelectedInvoice] = useState<ImobziInvoiceFormatted | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const router = useRouter();

  const handlePaymentClick = (invoice: ImobziInvoiceFormatted) => {
    setSelectedInvoice(invoice);
    setIsModalOpen(true);
  };

  const handlePaymentSuccess = () => {
    // Refresh the page to get updated data
    router.refresh();
    // Remove the paid invoice from the list
    if (selectedInvoice) {
      setInvoices(invoices.filter(inv => inv.id !== selectedInvoice.id));
    }
  };
  if (invoices.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Aluguéis Pendentes - Imobzi
        </h2>
        <p className="text-gray-500 text-center">
          Nenhum aluguel pendente encontrado para este período.
        </p>
      </div>
    );
  }

  const totalValue = invoices.reduce((sum, invoice) => sum + invoice.value, 0);
  const overdueCount = invoices.filter(inv => inv.daysOverdue && inv.daysOverdue > 0).length;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">
            Aluguéis Pendentes - Imobzi
          </h2>
          <div className="flex gap-6 text-sm">
            <div>
              <span className="text-gray-500">Total pendente:</span>
              <span className="ml-2 font-semibold text-gray-900">
                R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Quantidade:</span>
              <span className="ml-2 font-semibold text-gray-900">{invoices.length}</span>
            </div>
            {overdueCount > 0 && (
              <div>
                <span className="text-gray-500">Em atraso:</span>
                <span className="ml-2 font-semibold text-red-600">{overdueCount}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Inquilino
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Propriedade
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Vencimento
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Valor
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {invoices.map((invoice) => {
              // Parse date string as local date (not UTC)
              const [year, month, day] = invoice.dueDate.split('-').map(Number);
              const dueDate = new Date(year, month - 1, day);
              const isOverdue = invoice.daysOverdue && invoice.daysOverdue > 0;
              
              return (
                <tr key={invoice.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {invoice.tenantName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {invoice.propertyName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={isOverdue ? 'text-red-600' : 'text-gray-900'}>
                      {dueDate.toLocaleDateString('pt-BR')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {isOverdue ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        {invoice.daysOverdue} dias em atraso
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        Pendente
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    R$ {invoice.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <Button
                      size="sm"
                      variant="outline"
                      className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                      onClick={() => handlePaymentClick(invoice)}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Quitar
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <PaymentModal
        invoice={selectedInvoice}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onSuccess={handlePaymentSuccess}
      />
    </div>
  );
}
/**
 * API module for fetching invoice data from Imobzi
 */

import { getImobziAuthToken } from './auth';

export interface ImobziInvoice {
  invoice_id: string;
  due_date: string;
  total_value: number;
  status: string;
  description?: string;
  contact?: {
    name: string;
    type: string;
  };
  property?: {
    address: string;
    address_complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    code?: string;
  };
  lease?: {
    contract_type: string;
    code: string;
  };
}

export interface ImobziInvoiceFormatted {
  id: string;
  tenantName: string;
  propertyName: string;
  dueDate: string;
  value: number;
  status: string;
  daysOverdue?: number;
  description?: string;
  propertyDetails?: {
    address: string;
    city?: string;
    state?: string;
  };
  contactDetails?: {
    name: string;
    type: string;
  };
}

/**
 * Fetch pending invoices from Imobzi API
 * @param month - Month (1-12)
 * @param year - Year (e.g., 2025)
 * @returns Promise with formatted invoice data
 */
export async function getImobziPendingInvoices(
  month: number,
  year: number
): Promise<ImobziInvoiceFormatted[]> {
  try {
    const token = await getImobziAuthToken();
    
    // Calculate start and end dates for the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0); // Last day of the month
    
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    
    console.log('Fetching Imobzi invoices for period:', {
      month,
      year,
      startDate: startDateStr,
      endDate: endDateStr
    });
    
    const url = `https://my.imobzi.com/v1/invoices?order_by=date&sort_by=asc&status=pending&payment_methods_available=all_payments&payment_method=all_payments&start_at=${startDateStr}&end_at=${endDateStr}&page=1&contract_type=all`;
    
    const response = await fetch(url, {
      headers: {
        'accept': 'application/json, text/plain, */*',
        'authorization': token,
        'content-type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch Imobzi invoices: ${response.statusText}`);
    }

    const data = await response.json();
    const invoices: ImobziInvoice[] = data.invoices || data || [];

    // Format and calculate days overdue
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day for accurate comparison
    
    const formattedData: ImobziInvoiceFormatted[] = invoices.map((invoice) => {
      // Parse date string as local date (not UTC)
      const [year, month, day] = invoice.due_date.split('-').map(Number);
      const dueDate = new Date(year, month - 1, day);
      const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // Build property name from address and city
      let propertyName = 'Não informado';
      if (invoice.property?.address) {
        propertyName = invoice.property.address;
        if (invoice.property.address_complement) {
          propertyName += ` ${invoice.property.address_complement}`;
        }
        if (invoice.property.city) {
          propertyName += ` - ${invoice.property.city}`;
        }
      }
      
      return {
        id: invoice.invoice_id,
        tenantName: invoice.contact?.name || 'Não informado',
        propertyName: propertyName,
        dueDate: invoice.due_date,
        value: invoice.total_value || 0,
        status: invoice.status,
        daysOverdue: daysOverdue > 0 ? daysOverdue : undefined,
        description: invoice.description,
        propertyDetails: invoice.property ? {
          address: invoice.property.address,
          city: invoice.property.city,
          state: invoice.property.state,
        } : undefined,
        contactDetails: invoice.contact ? {
          name: invoice.contact.name,
          type: invoice.contact.type,
        } : undefined,
      };
    });

    // Sort by due date (oldest first)
    formattedData.sort((a, b) => {
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });

    return formattedData;
  } catch (error) {
    console.error('Error fetching Imobzi pending invoices:', error);
    throw new Error(
      `Failed to fetch Imobzi pending invoices: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    );
  }
}

/**
 * Get a summary of pending invoices
 */
export async function getImobziPendingInvoicesSummary(
  month: number,
  year: number
) {
  const invoices = await getImobziPendingInvoices(month, year);
  
  const summary = {
    total: invoices.length,
    totalValue: 0,
    overdue: 0,
    overdueValue: 0,
  };

  const today = new Date();
  
  invoices.forEach((invoice) => {
    summary.totalValue += invoice.value;
    
    if (invoice.daysOverdue && invoice.daysOverdue > 0) {
      summary.overdue++;
      summary.overdueValue += invoice.value;
    }
  });

  return {
    summary,
    invoices,
  };
}

/**
 * Mark an invoice as paid in Imobzi
 * @param invoiceId - The invoice ID to mark as paid
 * @param paidDate - The date when the invoice was paid (YYYY-MM-DD format)
 * @param invoiceData - The original invoice data
 * @returns Promise with the result
 */
export async function markInvoiceAsPaid(
  invoiceId: string,
  paidDate: string,
  invoiceData: ImobziInvoiceFormatted
): Promise<{ success: boolean; message?: string }> {
  try {
    const token = await getImobziAuthToken();
    
    // Sicredi account details (fixed as per requirement)
    const sicrediAccount = {
      db_id: 5253871883517952,
      account_number: "44319-0",
      account_type: "others",
      active: true,
      agency: "3003",
      balance: 0, // Will be updated by Imobzi
      created_at: "2023-03-23T12:03:11.825866Z",
      default: false,
      description: "Sicredi",
      favorite: false,
      name: "Sicredi",
      has_transactions: true,
      has_integration: false,
      initial_value: 38994.74,
      start_at: "2023-03-23",
      bank: {
        code: "748",
        db_id: 5759180434571264,
        logo_url: null,
        name: "Banco Cooperativo Sicredi S. A."
      }
    };

    const payload = {
      invoice_id: invoiceId,
      total_value: invoiceData.value,
      status: "paid",
      due_date: invoiceData.dueDate,
      description: invoiceData.description || `Aluguel - ${invoiceData.tenantName}`,
      charge_fee_value: 0,
      payment_method: "transference",
      paid_at: paidDate,
      payment_methods_available: "transference",
      payment_maximum_installments: null,
      interest_value: 0,
      difference_value: 0,
      account: sicrediAccount,
      bank_slip_id: null,
      bank_slip_url: null,
      onlending_split: false,
      category: "Terceiros (Administração)",
      subcategory: "Recebimento de Aluguel",
      send_receipt_tenant: false
    };

    const url = `https://my.imobzi.com/v1/invoice/${invoiceId}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'accept': 'application/json, text/plain, */*',
        'authorization': token,
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to mark invoice as paid: ${response.statusText} - ${errorText}`);
    }

    return {
      success: true,
      message: 'Fatura quitada com sucesso',
    };
  } catch (error) {
    console.error('Error marking invoice as paid:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Erro ao quitar fatura',
    };
  }
}
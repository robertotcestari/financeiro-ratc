/**
 * API module for fetching data from Imobzi
 */

import { getImobziAuthToken } from './auth';

export interface ImobziTransaction {
  total_value: number;
  transaction_type: string;
  paid_at: string;
  due_date?: string;
  contact: {
    name: string;
  };
  description?: string;
  reference?: string;
  property?: {
    id: string;
    name: string;
  };
}

export interface ImobziDataFormatted {
  value: number;
  type: string;
  date: string;
  name: string | null; // Contact/Tenant name
  description: string; // Full description with tenant name
  propertyId?: string;
  propertyName?: string;
  originalDescription?: string; // Original description from Imobzi if any
}

/**
 * Fetch transactions from Imobzi API
 * @param startDate - Start date in YYYY-MM-DD format
 * @param endDate - End date in YYYY-MM-DD format
 * @param accountId - Optional specific account ID
 * @returns Promise with formatted transaction data
 */
export async function getImobziTransactions(
  startDate: string,
  endDate: string,
  accountId?: string
): Promise<ImobziDataFormatted[]> {
  try {
    const token = await getImobziAuthToken();
    const accountIdToUse = accountId || process.env.IMOBZI_ACCOUNT_ID || '6029003447074816';
    
    const url = `https://api.imobzi.app/v1/financial/transactions?start_at=${startDate}&end_at=${endDate}&periodType=this_month&order_by=due_date&sort_by=desc&page=1&account_id=${accountIdToUse}`;
    
    const response = await fetch(url, {
      headers: {
        Authorization: token,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch Imobzi data: ${response.statusText}`);
    }

    const data = await response.json();
    const transactions: ImobziTransaction[] = data.transactions || [];

    // Format and sanitize the data
    const formattedData: ImobziDataFormatted[] = transactions.map((transaction) => {
      const contactName = transaction.contact?.name;
      const hasValidContact = contactName && contactName !== 'Not found';
      
      // Generate description based on transaction type and contact
      let description = '';
      
      // Determine base description from transaction type
      const transactionType = transaction.transaction_type?.trim().toLowerCase() || '';
      let typeDescription = '';
      
      switch (transactionType) {
        case 'transference':
        case 'transfer':
          typeDescription = 'Transferência';
          break;
        case 'expense':
          typeDescription = 'Despesa';
          break;
        case 'income':
          typeDescription = 'Receita';
          break;
        case 'rent':
        case 'aluguel':
          typeDescription = 'Aluguel';
          break;
        default:
          typeDescription = transaction.transaction_type || 'Transação';
      }
      
      // Build final description with tenant/contact name
      if (hasValidContact) {
        // For rent/income, format as "Aluguel - [Tenant Name]"
        if (transactionType.includes('income') || transactionType.includes('rent') || transactionType.includes('aluguel')) {
          description = `Aluguel - ${contactName}`;
        } else {
          description = `${typeDescription} - ${contactName}`;
        }
      } else {
        // Use provided description or type description
        const baseDescription = transaction.description || typeDescription;
        // If it's an expense and description is too generic, improve it
        if (transactionType === 'expense' || transactionType.includes('despesa')) {
          const normalized = baseDescription.trim().toLowerCase();
          description = normalized === 'despesa' ? 'Despesa - Tarifa Bancária' : baseDescription;
        } else {
          description = baseDescription;
        }
      }
      
      // Add property name if available and not already in description
      if (transaction.property?.name && !description.includes(transaction.property.name)) {
        description = `${description} (${transaction.property.name})`;
      }

      return {
        value: Number(transaction.total_value) || 0,
        type: transaction.transaction_type || 'unknown',
        date: transaction.paid_at || transaction.due_date || '',
        name: hasValidContact ? contactName : null,
        description,
        originalDescription: transaction.description,
        propertyId: transaction.property?.id,
        propertyName: transaction.property?.name,
      };
    });

    // Sort by date (oldest first)
    formattedData.sort((a, b) => {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

    return formattedData;
  } catch (error) {
    console.error('Error fetching Imobzi transactions:', error);
    throw new Error(
      `Failed to fetch Imobzi transactions: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    );
  }
}

/**
 * Get a summary of transactions for preview
 */
export async function getImobziTransactionsSummary(
  startDate: string,
  endDate: string,
  accountId?: string
) {
  const transactions = await getImobziTransactions(startDate, endDate, accountId);
  
  const summary = {
    total: transactions.length,
    income: 0,
    expense: 0,
    transfer: 0,
    totalValue: 0,
    incomeValue: 0,
    expenseValue: 0,
  };

  transactions.forEach((transaction) => {
    const type = transaction.type.toLowerCase();
    const value = Math.abs(transaction.value);
    
    if (type.includes('income') || type.includes('receita')) {
      summary.income++;
      summary.incomeValue += value;
      summary.totalValue += value;
    } else if (type.includes('expense') || type.includes('despesa')) {
      summary.expense++;
      summary.expenseValue += value;
      summary.totalValue -= value;
    } else if (type.includes('transfer')) {
      summary.transfer++;
    }
  });

  return {
    summary,
    transactions,
  };
}

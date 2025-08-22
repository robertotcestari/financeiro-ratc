import type { Transaction } from '../types';
import type { Category, Property } from '../types';

interface OptimisticUpdate {
  categoryId?: string | null;
  propertyId?: string | null;
  details?: string | null;
}

export function applyOptimisticUpdates(
  transactions: Transaction[],
  optimisticUpdates: Map<string, OptimisticUpdate>,
  categories: Category[],
  properties: Property[]
): Transaction[] {
  if (optimisticUpdates.size === 0) {
    return transactions;
  }
  
  return transactions.map(transaction => {
    const optimisticUpdate = optimisticUpdates.get(transaction.id);
    if (!optimisticUpdate) {
      return transaction;
    }
    
    // Find the updated category
    let updatedCategory = transaction.category;
    if (optimisticUpdate.categoryId !== undefined) {
      if (optimisticUpdate.categoryId) {
        const found = categories.find(c => c.id === optimisticUpdate.categoryId);
        if (found) {
          updatedCategory = {
            id: found.id,
            name: found.name,
            type: found.type,
            parent: found.parent ? { name: found.parent.name } : null
          };
        }
      } else {
        updatedCategory = { 
          id: 'uncategorized', 
          name: 'Sem categoria', 
          type: 'UNCATEGORIZED',
          parent: null 
        };
      }
    }
    
    // Find the updated property
    let updatedProperty = transaction.property;
    if (optimisticUpdate.propertyId !== undefined) {
      if (optimisticUpdate.propertyId) {
        const found = properties.find(p => p.id === optimisticUpdate.propertyId);
        if (found) {
          updatedProperty = {
            code: found.code,
            city: found.city
          };
        }
      } else {
        updatedProperty = null;
      }
    }
    
    // Apply optimistic updates to the transaction
    return {
      ...transaction,
      category: updatedCategory,
      property: updatedProperty,
      details: optimisticUpdate.details !== undefined 
        ? optimisticUpdate.details 
        : transaction.details,
    };
  });
}
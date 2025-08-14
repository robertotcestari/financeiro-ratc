'use client';

import React from 'react';
import { FormDescription, FormLabel } from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Building } from 'lucide-react';
import type { RuleFormReturn } from './form-types';

interface BankAccount {
  id: string;
  name: string;
  bankName: string;
  accountType: string;
  isActive: boolean;
}

interface AccountCriteriaFormProps {
  form: RuleFormReturn;
  bankAccounts: BankAccount[];
}

export default function AccountCriteriaForm({
  form,
  bankAccounts,
}: AccountCriteriaFormProps) {
  const criteria = form.watch('criteria') || {};
  const selectedAccounts = criteria.accounts || [];
  
  // Derive useAccounts directly from form state
  const useAccounts = Array.isArray(criteria.accounts);

  const handleAccountsToggle = (enabled: boolean) => {
    if (!enabled) {
      const currentCriteria = form.getValues('criteria');
      const newCriteria = { ...currentCriteria };
      delete newCriteria.accounts;
      form.setValue('criteria', newCriteria);
    } else {
      form.setValue('criteria.accounts', [], {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      });
    }
  };

  const handleAccountToggle = (accountId: string, checked: boolean) => {
    const currentAccounts = form.getValues('criteria.accounts') || [];

    if (checked) {
      form.setValue('criteria.accounts', [...currentAccounts, accountId]);
    } else {
      form.setValue(
        'criteria.accounts',
        currentAccounts.filter((id: string) => id !== accountId)
      );
    }
  };

  const handleSelectAll = () => {
    const activeAccountIds = bankAccounts
      .filter((account) => account.isActive)
      .map((account) => account.id);
    form.setValue('criteria.accounts', activeAccountIds);
  };

  const handleSelectNone = () => {
    form.setValue('criteria.accounts', []);
  };

  const getAccountTypeLabel = (accountType: string): string => {
    const types: Record<string, string> = {
      CHECKING: 'Conta Corrente',
      SAVINGS: 'Poupança',
      INVESTMENT: 'Investimento',
    };
    return types[accountType] || accountType;
  };

  const getDescription = (): string => {
    if (selectedAccounts.length === 0) {
      return 'Aplicar em todas as contas';
    }

    const selectedAccountNames = bankAccounts
      .filter((account) => selectedAccounts.includes(account.id))
      .map((account) => account.name);

    if (selectedAccountNames.length === 1) {
      return `Aplicar apenas em: ${selectedAccountNames[0]}`;
    }

    if (
      selectedAccountNames.length ===
      bankAccounts.filter((a) => a.isActive).length
    ) {
      return 'Aplicar em todas as contas ativas';
    }

    return `Aplicar em ${selectedAccountNames.length} contas selecionadas`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <Building className="h-5 w-5 text-muted-foreground" />
        <h4 className="text-sm font-medium">Critérios de Conta</h4>
      </div>

      <div className="space-y-4 pl-7">
        <div className="flex items-center justify-between">
          <div>
            <FormLabel>Filtrar por Contas Específicas</FormLabel>
            <FormDescription className="text-xs">
              Aplicar apenas em transações de contas bancárias específicas.
            </FormDescription>
          </div>
          <Switch
            checked={useAccounts}
            onCheckedChange={handleAccountsToggle}
          />
        </div>

        {useAccounts && (
          <div className="space-y-4">
            {/* Quick Actions */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-xs text-primary hover:underline"
              >
                Selecionar todas
              </button>
              <span
                aria-hidden="true"
                className="text-xs text-muted-foreground"
              >
                •
              </span>
              <button
                type="button"
                onClick={handleSelectNone}
                className="text-xs text-primary hover:underline"
              >
                Limpar seleção
              </button>
            </div>

            {/* Account List */}
            <div className="space-y-3">
              {bankAccounts
                .filter((account) => account.isActive)
                .map((account) => (
                  <div key={account.id} className="flex items-center space-x-3">
                    <Checkbox
                      id={`account-${account.id}`}
                      aria-label={account.name}
                      aria-labelledby={`account-name-${account.id}`}
                      checked={selectedAccounts.includes(account.id)}
                      onCheckedChange={(checked) =>
                        handleAccountToggle(account.id, checked as boolean)
                      }
                    />
                    <label
                      htmlFor={`account-${account.id}`}
                      className="flex-1 text-sm cursor-pointer"
                    >
                      <div
                        id={`account-name-${account.id}`}
                        className="font-medium"
                      >
                        {account.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {(() => {
                          const bankLabel = (account.bankName || '').trim();
                          const typeLabel = (
                            getAccountTypeLabel(account.accountType) || ''
                          ).trim();
                          if (!bankLabel && !typeLabel) return '•';
                          if (bankLabel && typeLabel)
                            return `${bankLabel} • ${typeLabel}`;
                          if (bankLabel) return `${bankLabel} • `;
                          return ` • ${typeLabel}`;
                        })()}
                      </div>
                    </label>
                  </div>
                ))}
            </div>

            {bankAccounts.filter((a) => a.isActive).length === 0 && (
              <FormDescription className="text-xs text-amber-600">
                Nenhuma conta ativa encontrada. Verifique se existem contas
                cadastradas no sistema.
              </FormDescription>
            )}

            {/* Description Preview */}
            <FormDescription className="text-xs bg-muted p-2 rounded">
              <strong>Resumo:</strong> {getDescription()}
            </FormDescription>
          </div>
        )}
      </div>
    </div>
  );
}

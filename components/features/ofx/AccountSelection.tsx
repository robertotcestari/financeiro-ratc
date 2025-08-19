'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import { cn } from '@/lib/utils';

type AccountType = 'CHECKING' | 'SAVINGS' | 'INVESTMENT' | string;

export interface MinimalBankAccount {
  id: string;
  name: string;
  bankName: string;
  accountType: AccountType;
  isActive: boolean;
}

export interface CreateBankAccountData {
  name: string;
  bankName: string;
  accountType: AccountType;
  isActive?: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export interface CreateResult {
  success: boolean;
  account?: MinimalBankAccount;
  error?: string;
}

export interface AccountSelectionProps {
  className?: string;
  /**
   * Initial list of bank accounts for selection. Typically provided by server.
   */
  initialAccounts: MinimalBankAccount[];
  /**
   * Called when the user confirms a selection with a valid account id.
   */
  onConfirm?: (bankAccountId: string) => void | Promise<void>;
  /**
   * Validate a selected account (optional). If omitted, confirm will proceed without server validation.
   */
  onValidateSelection?: (bankAccountId: string) => Promise<ValidationResult>;
  /**
   * Create a new bank account inline. Should call server and return created account or error.
   */
  onCreateNewAccount?: (data: CreateBankAccountData) => Promise<CreateResult>;
  /**
   * Optional OFX context for persistence (can be leveraged by parent alongside onConfirm)
   */
  ofxAccountId?: string;
  ofxBankId?: string;
  /**
   * Preselected bank account id (e.g., from existing mapping)
   */
  defaultSelectedId?: string;
  /**
   * Show search input to filter accounts
   */
  enableSearch?: boolean;
}

export function AccountSelection({
  className,
  initialAccounts,
  onConfirm,
  onValidateSelection,
  ofxAccountId,
  ofxBankId,
  defaultSelectedId,
}: AccountSelectionProps) {
  const [selectedId, setSelectedId] = React.useState<string>(
    defaultSelectedId ?? ''
  );
  const [validating, setValidating] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Convert accounts to ComboboxOption format
  const accountOptions: ComboboxOption[] = React.useMemo(() => {
    return initialAccounts
      .filter(acc => acc.isActive) // Only show active accounts
      .map(acc => ({
        value: acc.id,
        label: `${acc.bankName} • ${acc.name} (${acc.accountType})`,
        keywords: [acc.name, acc.bankName, acc.accountType]
      }));
  }, [initialAccounts]);

  async function handleConfirm() {
    setError(null);
    if (!selectedId) {
      setError('Selecione uma conta bancária.');
      return;
    }
    try {
      setValidating(true);
      if (onValidateSelection) {
        const res = await onValidateSelection(selectedId);
        if (!res.isValid) {
          setError(res.error ?? 'Conta inválida.');
          return;
        }
      }
      await onConfirm?.(selectedId);
    } finally {
      setValidating(false);
    }
  }

  return (
    <div className={cn('w-full max-w-xl space-y-4', className)}>
      <div className="rounded-md border bg-card p-4">
        <div className="mb-4 space-y-1">
          <div className="text-base font-medium">
            Selecionar Conta Bancária
          </div>
          <div className="text-xs text-muted-foreground">
            {ofxAccountId ? (
              <span>
                Associar arquivo OFX (Conta: <strong>{ofxAccountId}</strong>
                {ofxBankId ? ` • Banco: ${ofxBankId}` : ''})
              </span>
            ) : (
              <span>
                Escolha uma conta para associar as transações importadas
              </span>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="account-select">Conta Bancária</Label>
            <Combobox
              options={accountOptions}
              value={selectedId}
              onValueChange={(value) => {
                setSelectedId(value);
                setError(null);
              }}
              placeholder="Selecione uma conta..."
              searchPlaceholder="Buscar conta..."
              emptyMessage="Nenhuma conta encontrada."
              className="w-full"
              allowClear={false}
              data-testid="account-select"
            />
          </div>

          {error && (
            <div
              role="alert"
              className="text-xs text-destructive"
              data-testid="selection-error"
            >
              {error}
            </div>
          )}

          <div className="pt-2">
            <Button
              type="button"
              onClick={() => void handleConfirm()}
              disabled={validating || !selectedId}
              data-testid="confirm-selection"
            >
              {validating ? 'Validando...' : 'Confirmar Seleção'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AccountSelection;
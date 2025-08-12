'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  onCreateNewAccount: (data: CreateBankAccountData) => Promise<CreateResult>;
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
  onCreateNewAccount,
  ofxAccountId,
  ofxBankId,
  defaultSelectedId,
  enableSearch = true,
}: AccountSelectionProps) {
  const [accounts, setAccounts] = React.useState<MinimalBankAccount[]>(() =>
    sortAccounts(initialAccounts)
  );
  const [query, setQuery] = React.useState('');
  const [selectedId, setSelectedId] = React.useState<string | ''>(
    defaultSelectedId ?? ''
  );
  const [validating, setValidating] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Inline create form state
  const [showCreate, setShowCreate] = React.useState(false);
  const [createData, setCreateData] = React.useState<CreateBankAccountData>({
    name: '',
    bankName: '',
    accountType: 'CHECKING',
    isActive: true,
  });
  const [creating, setCreating] = React.useState(false);
  const [createError, setCreateError] = React.useState<string | null>(null);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return accounts;
    return accounts.filter((a) => {
      return (
        a.name.toLowerCase().includes(q) ||
        a.bankName.toLowerCase().includes(q) ||
        a.accountType.toLowerCase().includes(q)
      );
    });
  }, [accounts, query]);

  function onSelectChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setSelectedId(e.target.value);
    setError(null);
  }

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

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(null);

    // Basic client-side validation
    if (!createData.name.trim() || !createData.bankName.trim()) {
      setCreateError('Nome e Banco são obrigatórios.');
      return;
    }

    try {
      setCreating(true);
      const result = await onCreateNewAccount({
        name: createData.name.trim(),
        bankName: createData.bankName.trim(),
        accountType: createData.accountType,
        isActive: createData.isActive ?? true,
      });

      if (!result.success || !result.account) {
        setCreateError(result.error ?? 'Erro ao criar conta.');
        return;
      }

      // Inject new account, keep sorted, select it
      setAccounts((prev) => sortAccounts([result.account!, ...prev]));
      setSelectedId(result.account.id);
      setShowCreate(false);
      // Reset form
      setCreateData({
        name: '',
        bankName: '',
        accountType: 'CHECKING',
        isActive: true,
      });
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className={cn('w-full max-w-xl space-y-4', className)}>
      <div className="rounded-md border bg-card p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="space-y-1">
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

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setShowCreate((v) => !v)}
            data-testid="toggle-create"
          >
            {showCreate ? 'Cancelar' : 'Nova Conta'}
          </Button>
        </div>

        {enableSearch && (
          <div className="mb-3">
            <Label htmlFor="account-search" className="sr-only">
              Pesquisar
            </Label>
            <Input
              id="account-search"
              data-testid="account-search"
              placeholder="Pesquisar por nome, banco ou tipo..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="account-select">Conta Bancária</Label>
          <select
            id="account-select"
            data-testid="account-select"
            className="w-full rounded-md border bg-background p-2 text-sm"
            value={selectedId}
            onChange={onSelectChange}
          >
            <option value="">-- Selecione --</option>
            {filtered.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.isActive ? '' : '[Inativa] '}
                {acc.bankName} • {acc.name} ({acc.accountType})
              </option>
            ))}
          </select>

          {error ? (
            <div
              role="alert"
              className="text-xs text-destructive"
              data-testid="selection-error"
            >
              {error}
            </div>
          ) : null}

          <div className="pt-2">
            <Button
              type="button"
              onClick={() => void handleConfirm()}
              disabled={validating}
              data-testid="confirm-selection"
            >
              {validating ? 'Validando...' : 'Confirmar Seleção'}
            </Button>
          </div>
        </div>
      </div>

      {showCreate && (
        <div
          className="rounded-md border bg-card p-4"
          data-testid="create-form"
        >
          <div className="mb-3 text-sm font-medium">Criar Nova Conta</div>
          <form onSubmit={(e) => void handleCreate(e)} className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="create-name">Nome</Label>
                <Input
                  id="create-name"
                  data-testid="create-name"
                  value={createData.name}
                  onChange={(e) =>
                    setCreateData((d) => ({ ...d, name: e.target.value }))
                  }
                  placeholder="Ex.: Conta Principal"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="create-bank">Banco</Label>
                <Input
                  id="create-bank"
                  data-testid="create-bank"
                  value={createData.bankName}
                  onChange={(e) =>
                    setCreateData((d) => ({ ...d, bankName: e.target.value }))
                  }
                  placeholder="Ex.: Banco XYZ"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="create-type">Tipo da Conta</Label>
                <select
                  id="create-type"
                  data-testid="create-type"
                  className="w-full rounded-md border bg-background p-2 text-sm"
                  value={createData.accountType}
                  onChange={(e) =>
                    setCreateData((d) => ({
                      ...d,
                      accountType: e.target.value,
                    }))
                  }
                >
                  {ACCOUNT_TYPE_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    data-testid="create-active"
                    checked={createData.isActive ?? true}
                    onChange={(e) =>
                      setCreateData((d) => ({
                        ...d,
                        isActive: e.target.checked,
                      }))
                    }
                  />
                  Ativa
                </label>
              </div>
            </div>

            {createError ? (
              <div
                role="alert"
                className="text-xs text-destructive"
                data-testid="create-error"
              >
                {createError}
              </div>
            ) : null}

            <div className="flex gap-2 pt-2">
              <Button
                type="submit"
                disabled={creating}
                data-testid="create-submit"
              >
                {creating ? 'Criando...' : 'Criar Conta'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowCreate(false)}
              >
                Fechar
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

const ACCOUNT_TYPE_OPTIONS: AccountType[] = [
  'CHECKING',
  'SAVINGS',
  'INVESTMENT',
];

function sortAccounts(list: MinimalBankAccount[]): MinimalBankAccount[] {
  // Active first (desc), then bankName asc, then name asc
  return [...list].sort((a, b) => {
    if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
    const bankCmp = a.bankName.localeCompare(b.bankName, 'pt-BR');
    if (bankCmp !== 0) return bankCmp;
    return a.name.localeCompare(b.name, 'pt-BR');
  });
}

export default AccountSelection;

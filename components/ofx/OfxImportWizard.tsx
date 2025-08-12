'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import OfxFileUpload from '@/components/ofx/OfxFileUpload';
import type { OFXParseResult, OFXTransaction } from '@/lib/ofx/types';
import AccountSelection, {
  type MinimalBankAccount,
  type CreateBankAccountData,
  type CreateResult,
  type ValidationResult,
} from '@/components/ofx/AccountSelection';
import OfxImportPreview, {
  type CategoryOption,
  type PropertyOption,
  type TransactionAction,
  type PreviewRow,
} from '@/components/ofx/OfxImportPreview';
import OfxImportResult from '@/components/ofx/OfxImportResult';
import {
  validateAccountSelection as validateAccount,
  createNewBankAccount,
} from '@/app/actions/account-selection';
import { getPreviewBalances } from '@/app/ofx-import/actions';

type Step = 1 | 2 | 3 | 4;

export interface OfxImportWizardProps {
  className?: string;
  initialAccounts: MinimalBankAccount[];
  categories: CategoryOption[];
  properties: PropertyOption[];
}

export function OfxImportWizard({
  className,
  initialAccounts,
  categories,
  properties,
}: OfxImportWizardProps) {
  const [step, setStep] = React.useState<Step>(1);

  // Step 1 - file (handled only for validation; no need to store file state here)
  const [parseResult, setParseResult] = React.useState<OFXParseResult | null>(
    null
  );

  // Step 2 - account
  const [selectedAccountId, setSelectedAccountId] = React.useState<string>('');

  // Step 3 - preview
  const [previewRows, setPreviewRows] = React.useState<PreviewRow[]>([]);
  const [previewBalances, setPreviewBalances] = React.useState<{
    beforeStart: number;
    beforeEnd: number;
  } | null>(null);

  // Step 4 - result
  const [resultSummary, setResultSummary] = React.useState<{
    totalTransactions: number;
    validTransactions: number;
    invalidTransactions: number;
    duplicateTransactions: number;
    uniqueTransactions: number;
    categorizedTransactions: number;
    uncategorizedTransactions: number;
  } | null>(null);
  const [imported, setImported] = React.useState<
    { id?: string; date: Date | string; description: string; amount: number }[]
  >([]);
  const [skipped, setSkipped] = React.useState<
    { id?: string; date: Date | string; description: string; amount: number }[]
  >([]);
  const [failed, setFailed] = React.useState<
    {
      transaction: {
        id?: string;
        date: Date | string;
        description: string;
        amount: number;
      };
      error: { type?: string; code: string; message: string };
    }[]
  >([]);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  // Breadcrumb/steps metadata
  const steps: { id: Step; label: string }[] = [
    { id: 1, label: 'Arquivo OFX' },
    { id: 2, label: 'Selecionar Conta' },
    { id: 3, label: 'Prévia e Revisão' },
    { id: 4, label: 'Resultado' },
  ];

  function goNext() {
    setStep((s) => Math.min(4, s + 1) as Step);
  }
  function goPrev() {
    setStep((s) => Math.max(1, s - 1) as Step);
  }
  function goTo(target: Step) {
    setStep(target);
  }

  // Helper para obter o nome da conta selecionada
  const selectedAccount = React.useMemo(() => {
    return initialAccounts.find((acc) => acc.id === selectedAccountId) || null;
  }, [selectedAccountId, initialAccounts]);
  // Handlers for Step 1
  function handleValidated(result: OFXParseResult) {
    setParseResult(result);
    // Auto-advance only if success and at least one account/transaction present
    if (result.success && (result.transactions?.length ?? 0) > 0) {
      setStep(2);
    }
  }

  // Handlers for Step 2
  async function validateAccountSelection(
    bankAccountId: string
  ): Promise<ValidationResult> {
    try {
      const result = await validateAccount(bankAccountId);
      return result;
    } catch {
      return { isValid: false, error: 'Falha ao validar conta' };
    }
  }
  async function createNewAccount(
    data: CreateBankAccountData
  ): Promise<CreateResult> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await createNewBankAccount(data as any);
      if (result.success && result.account) {
        return {
          success: true,
          account: {
            id: result.account.id,
            name: result.account.name,
            bankName: result.account.bankName,
            accountType: result.account.accountType,
            isActive: result.account.isActive,
          },
        };
      }
      return { success: false, error: result.error || 'Falha ao criar conta' };
    } catch {
      return { success: false, error: 'Falha ao criar conta' };
    }
  }

  async function handleConfirmAccount(bankAccountId: string) {
    setSelectedAccountId(bankAccountId);
    // Generate client-side preview rows (placeholder; server duplicate detection can be integrated later)
    if (parseResult?.success) {
      const rows = mapTransactionsToPreviewRows(parseResult.transactions);
      setPreviewRows(rows);

      // Compute date range and fetch balances for info card
      if (rows.length > 0) {
        const dates = rows.map((r) =>
          r.date instanceof Date ? r.date : new Date(r.date)
        );
        const start = new Date(Math.min(...dates.map((d) => d.getTime())));
        const end = new Date(Math.max(...dates.map((d) => d.getTime())));
        try {
          const balances = await getPreviewBalances(
            bankAccountId,
            start.toISOString(),
            end.toISOString()
          );
          setPreviewBalances({
            beforeStart: balances.beforeStart,
            beforeEnd: balances.beforeEnd,
          });
        } catch {
          setPreviewBalances(null);
        }
      }
      setStep(3);
    }
  }

  // Handlers for Step 3
  async function handlePreviewConfirm(
    confirmedActions: Record<string, TransactionAction>,
    updatedRows: Array<
      PreviewRow & {
        selectedCategoryId: string | null;
        selectedPropertyId: string | null;
        action: TransactionAction;
      }
    >
  ) {
    // Compute a client-side "result" view; in real flow we'd call ImportService on server.
    const importedRows = updatedRows.filter((r) => r.action === 'import');
    const skippedRows = updatedRows.filter((r) => r.action === 'skip');
    // For UI-only path, we won't create "failed" rows here.
    const failedRows: typeof failed = [];

    setImported(
      importedRows.map((r) => ({
        id: r.transactionId,
        date: r.date,
        description: r.description,
        amount: r.amount,
      }))
    );
    setSkipped(
      skippedRows.map((r) => ({
        id: r.transactionId,
        date: r.date,
        description: r.description,
        amount: r.amount,
      }))
    );
    setFailed(failedRows);
    setErrorMessage(null);

    // Quick summary derivation
    const total = updatedRows.length;
    const duplicates = updatedRows.filter((r) => r.isDuplicate).length;
    const unique = total - duplicates;
    const categorized = updatedRows.filter(
      (r) => !!r.selectedCategoryId
    ).length;

    setResultSummary({
      totalTransactions: total,
      validTransactions: total,
      invalidTransactions: 0,
      duplicateTransactions: duplicates,
      uniqueTransactions: unique,
      categorizedTransactions: categorized,
      uncategorizedTransactions: total - categorized,
    });

    setStep(4);
  }

  // Helpers
  function mapTransactionsToPreviewRows(
    transactions: OFXTransaction[]
  ): PreviewRow[] {
    return transactions.map((t) => {
      // Simple, client-only initial recommendations:
      const recommended: TransactionAction =
        Math.abs(t.amount) > 0 ? 'import' : 'skip';
      return {
        transactionId: t.transactionId,
        accountId: t.accountId,
        date: t.date instanceof Date ? t.date : new Date(t.date),
        description: t.description,
        amount: t.amount,
        isDuplicate: false,
        recommendedAction: recommended,
        duplicateConfidence: undefined,
        duplicateReason: undefined,
        initialCategoryId: null,
        initialPropertyId: null,
      };
    });
  }

  return (
    <div className={cn('w-full space-y-6', className)}>
      <Header steps={steps} current={step} onNavigate={goTo} />

      <div className="rounded-md border bg-card p-4">
        {step === 1 ? (
          <section aria-label="Enviar arquivo OFX" className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Envie o arquivo .ofx para iniciar a importação.
            </div>
            <OfxFileUpload onValidated={handleValidated} />
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => goPrev()}
                disabled
              >
                Voltar
              </Button>
              <Button
                type="button"
                onClick={() => goNext()}
                disabled={
                  !parseResult?.success ||
                  (parseResult?.transactions?.length ?? 0) === 0
                }
              >
                Próximo
              </Button>
            </div>
          </section>
        ) : null}

        {step === 2 ? (
          <section aria-label="Selecionar conta bancária" className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Selecione a conta bancária para associar as transações importadas.
            </div>
            <AccountSelection
              initialAccounts={initialAccounts}
              defaultSelectedId={selectedAccountId || undefined}
              onValidateSelection={validateAccountSelection}
              onCreateNewAccount={createNewAccount}
              onConfirm={handleConfirmAccount}
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => goPrev()}
              >
                Voltar
              </Button>
              <Button
                type="button"
                onClick={() => {
                  if (selectedAccountId) {
                    // Ensure preview exists even when bypassing the inner confirm (safety)
                    if (parseResult?.success && previewRows.length === 0) {
                      setPreviewRows(
                        mapTransactionsToPreviewRows(parseResult.transactions)
                      );
                    }
                    goNext();
                  }
                }}
                disabled={!selectedAccountId}
              >
                Próximo
              </Button>
            </div>
          </section>
        ) : null}

        {step === 3 ? (
          <section
            aria-label="Prévia e revisão de importação"
            className="space-y-4"
          >
            <div className="text-sm text-muted-foreground">
              Revise as transações detectadas, ajuste categorias e pule
              duplicadas antes de confirmar.
            </div>
            <OfxImportPreview
              rows={previewRows}
              categories={categories}
              properties={properties}
              balances={previewBalances ?? undefined}
              summaryHint={{
                totalTransactions: previewRows.length,
                duplicateTransactions: previewRows.filter((r) => r.isDuplicate)
                  .length,
                uniqueTransactions:
                  previewRows.length -
                  previewRows.filter((r) => r.isDuplicate).length,
              }}
              accountName={
                selectedAccount
                  ? `${selectedAccount.bankName} • ${selectedAccount.name} (${selectedAccount.accountType})`
                  : undefined
              }
              onConfirm={handlePreviewConfirm}
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => goPrev()}
              >
                Voltar
              </Button>
            </div>
          </section>
        ) : null}

        {step === 4 && resultSummary ? (
          <section aria-label="Resultado da importação" className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Importação concluída. Veja o resumo abaixo.
            </div>
            <OfxImportResult
              summary={resultSummary}
              imported={imported}
              skipped={skipped}
              failed={failed}
              errorMessage={errorMessage}
              onDone={() => {
                // Reset wizard to step 1
                setParseResult(null);
                setSelectedAccountId('');
                setPreviewRows([]);
                setResultSummary(null);
                setImported([]);
                setSkipped([]);
                setFailed([]);
                setErrorMessage(null);
                setStep(1);
              }}
              onViewTransactions={() => {
                // Placeholder for navigation to transactions page
                // Could use next/navigation useRouter here
                // For now, no-op
              }}
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => goPrev()}
              >
                Voltar
              </Button>
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}

function Header({
  steps,
  current,
  onNavigate,
}: {
  steps: { id: Step; label: string }[];
  current: Step;
  onNavigate: (s: Step) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      {/* Breadcrumb-like pills */}
      <div className="flex flex-wrap items-center gap-2">
        {steps.map((s, idx) => {
          const isActive = s.id === current;
          const isDone = s.id < current;
          return (
            <button
              key={s.id}
              type="button"
              className={cn(
                'rounded-full border px-3 py-1 text-xs',
                isActive
                  ? 'border-primary bg-primary/10 text-primary'
                  : isDone
                  ? 'border-emerald-600/40 bg-emerald-600/10 text-emerald-800'
                  : 'border-muted-foreground/30 bg-muted/30 text-muted-foreground'
              )}
              onClick={() => onNavigate(s.id)}
              aria-current={isActive ? 'step' : undefined}
            >
              <span className="font-medium">{idx + 1}.</span> {s.label}
            </button>
          );
        })}
      </div>

      {/* Progress indicator */}
      <div className="h-1 w-full overflow-hidden rounded bg-muted">
        <div
          className="h-full bg-primary transition-[width] duration-300 ease-out"
          style={{ width: `${((current - 1) / (steps.length - 1)) * 100}%` }}
          aria-hidden
        />
      </div>
    </div>
  );
}

export default OfxImportWizard;

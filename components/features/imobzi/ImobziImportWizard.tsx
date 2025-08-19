'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Loader2 } from 'lucide-react';
import ImobziAccountSelection from '@/components/features/imobzi/ImobziAccountSelection';
import ImobziPreview from '@/components/features/imobzi/ImobziPreview';
import ImobziResult from '@/components/features/imobzi/ImobziResult';
import { previewImobziTransactions, importImobziTransactions } from '@/app/(protected)/importacao-imobzi/actions';
import type { ImobziDataFormatted } from '@/lib/features/imobzi/api';

type Step = 1 | 2 | 3;

export interface MinimalBankAccount {
  id: string;
  name: string;
  bankName: string;
  accountType: string;
  isActive: boolean;
}

export interface ImobziImportWizardProps {
  className?: string;
  initialAccounts: MinimalBankAccount[];
}

export function ImobziImportWizard({
  className,
  initialAccounts,
}: ImobziImportWizardProps) {
  const [step, setStep] = React.useState<Step>(1);
  const [isLoading, setIsLoading] = React.useState(false);

  // Step 1 - Account and date selection
  const [selectedAccountId, setSelectedAccountId] = React.useState<string>('');
  const [startDate, setStartDate] = React.useState<string>('');
  const [endDate, setEndDate] = React.useState<string>('');

  // Types for preview data
  type PreviewTransaction = ImobziDataFormatted & { isDuplicate: boolean };
  type PreviewSummary = {
    total: number;
    income?: number;
    expense?: number;
    transfer?: number;
    totalValue?: number;
    incomeValue?: number;
    expenseValue?: number;
    duplicates: number;
    new: number;
  };
  type PreviewData = {
    summary: PreviewSummary;
    transactions: PreviewTransaction[];
    bankAccount?: { id: string; name: string; bankName: string };
  };

  // Step 2 - Preview data
  const [previewData, setPreviewData] = React.useState<PreviewData | null>(null);
  const [selectedTransactions, setSelectedTransactions] = React.useState<string[]>([]);

  // Step 3 - Result data
  type ImportResultSummary = {
    totalTransactions?: number;
    importedTransactions: number;
    duplicateTransactions: number;
    errorTransactions: number;
  };
  type ImportResult = {
    success: boolean;
    summary?: ImportResultSummary;
    error?: string;
  };
  const [resultData, setResultData] = React.useState<ImportResult | null>(null);

  // Error handling
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  // Initialize dates to last month
  React.useEffect(() => {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDayOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    
    setStartDate(lastMonth.toISOString().split('T')[0]);
    setEndDate(lastDayOfLastMonth.toISOString().split('T')[0]);
  }, []);

  // Breadcrumb/steps metadata
  const steps: { id: Step; label: string }[] = [
    { id: 1, label: 'Configuração' },
    { id: 2, label: 'Prévia e Revisão' },
    { id: 3, label: 'Resultado' },
  ];

  function goNext() {
    setStep((s) => Math.min(3, s + 1) as Step);
  }
  
  function goPrev() {
    setStep((s) => Math.max(1, s - 1) as Step);
  }
  
  function goTo(target: Step) {
    setStep(target);
  }

  // Helper to get selected account
  const selectedAccount = React.useMemo(() => {
    return initialAccounts.find((acc) => acc.id === selectedAccountId) || null;
  }, [selectedAccountId, initialAccounts]);

  // Handler for Step 1 - Account and date selection
  async function handleAccountConfirm(
    bankAccountId: string,
    startDate: string,
    endDate: string
  ) {
    setSelectedAccountId(bankAccountId);
    setErrorMessage(null);
    setIsLoading(true);
    
    try {
      const result = await previewImobziTransactions(
        startDate,
        endDate,
        bankAccountId
      );

      if (result.success && result.data) {
        setPreviewData(result.data as PreviewData);
        // Select all non-duplicate transactions by default
        const nonDuplicateIds = result.data.transactions
          .map((tx: PreviewTransaction, index: number) => (!tx.isDuplicate ? index.toString() : null))
          .filter((id): id is string => id !== null);
        setSelectedTransactions(nonDuplicateIds);
        goNext();
      } else {
        setErrorMessage(result.error || 'Erro ao buscar transações do Imobzi');
      }
    } catch (error) {
      console.error('Error fetching Imobzi preview:', error);
      setErrorMessage('Erro ao conectar com o Imobzi. Verifique suas credenciais.');
    } finally {
      setIsLoading(false);
    }
  }

  // Handler for Step 2 - Preview confirmation
  async function handlePreviewConfirm() {
    setErrorMessage(null);
    setIsLoading(true);
    
    try {
      const result = await importImobziTransactions(
        startDate,
        endDate,
        selectedAccountId,
        selectedTransactions
      );

      if (result.success) {
        setResultData(result as ImportResult);
        goNext();
      } else {
        setErrorMessage(result.error || 'Erro ao importar transações');
      }
    } catch (error) {
      console.error('Error importing transactions:', error);
      setErrorMessage('Erro ao importar transações. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  }

  // Handler for updating selected transactions
  function handleTransactionSelection(transactionIds: string[]) {
    setSelectedTransactions(transactionIds);
  }

  // Handler for reset/restart
  function handleReset() {
    setStep(1);
    setSelectedAccountId('');
    setPreviewData(null);
    setResultData(null);
    setErrorMessage(null);
    setSelectedTransactions([]);
  }

  // Handler for date changes
  function handleDateChange(newStartDate: string, newEndDate: string) {
    setStartDate(newStartDate);
    setEndDate(newEndDate);
  }

  return (
    <div className={cn('w-full space-y-6', className)}>
      <Header steps={steps} current={step} onNavigate={goTo} />

      <div className="rounded-md border bg-card p-4">
        {step === 1 ? (
          <section aria-label="Configuração da importação" className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Selecione a conta bancária e o período para importar os dados do Imobzi.
            </div>
            <ImobziAccountSelection
              accounts={initialAccounts}
              selectedAccountId={selectedAccountId}
              startDate={startDate}
              endDate={endDate}
              onSelectAccount={setSelectedAccountId}
              onDateChange={handleDateChange}
            />
            {errorMessage && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}
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
                onClick={() => {
                  if (selectedAccountId && startDate && endDate) {
                    handleAccountConfirm(selectedAccountId, startDate, endDate);
                  }
                }}
                disabled={!selectedAccountId || !startDate || !endDate || isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Buscando...
                  </>
                ) : (
                  'Buscar Transações'
                )}
              </Button>
            </div>
          </section>
        ) : null}

        {step === 2 ? (
          <section aria-label="Prévia e revisão" className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Revise as transações que serão importadas do Imobzi.
            </div>
            <ImobziPreview
              accountName={
                selectedAccount
                  ? `${selectedAccount.bankName} • ${selectedAccount.name} (${selectedAccount.accountType})`
                  : 'Conta não selecionada'
              }
              previewData={previewData}
              selectedTransactions={selectedTransactions}
              onTransactionSelection={handleTransactionSelection}
            />
            {errorMessage && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => goPrev()}
                disabled={isLoading}
              >
                Voltar
              </Button>
              <Button
                type="button"
                onClick={handlePreviewConfirm}
                disabled={selectedTransactions.length === 0 || isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importando...
                  </>
                ) : (
                  `Importar ${selectedTransactions.length} Transações`
                )}
              </Button>
            </div>
          </section>
        ) : null}

        {step === 3 && resultData ? (
          <section aria-label="Resultado da importação" className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Processo de importação finalizado.
            </div>
            <ImobziResult
              result={{
                success: resultData.success,
                message: resultData.success 
                  ? 'Importação concluída com sucesso'
                  : 'Erro na importação',
                details: {
                  imported: resultData.summary?.importedTransactions || 0,
                  skipped: resultData.summary?.duplicateTransactions || 0,
                  errors: resultData.summary?.errorTransactions || 0,
                }
              }}
              onReset={handleReset}
              onViewTransactions={() => {
                window.location.href = '/transacoes';
              }}
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={handleReset}
              >
                Nova Importação
              </Button>
              <Button
                type="button"
                onClick={() => {
                  window.location.href = '/transacoes';
                }}
              >
                Ver Transações
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
              onClick={() => {
                // Only allow navigation to completed steps
                if (isDone) {
                  onNavigate(s.id);
                }
              }}
              disabled={!isDone && !isActive}
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

export default ImobziImportWizard;

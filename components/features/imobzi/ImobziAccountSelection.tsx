'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Building2, CreditCard, TrendingUp, Calendar } from 'lucide-react';

interface BankAccount {
  id: string;
  name: string;
  bankName: string;
  accountType: string;
  isActive: boolean;
}

interface ImobziAccountSelectionProps {
  accounts: BankAccount[];
  selectedAccountId: string;
  startDate: string;
  endDate: string;
  onSelectAccount: (accountId: string) => void;
  onDateChange: (startDate: string, endDate: string) => void;
}

export default function ImobziAccountSelection({
  accounts,
  selectedAccountId,
  startDate,
  endDate,
  onSelectAccount,
  onDateChange,
}: ImobziAccountSelectionProps) {
  // Helper to set last month dates
  const setLastMonth = () => {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDayOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    
    const start = lastMonth.toISOString().split('T')[0];
    const end = lastDayOfLastMonth.toISOString().split('T')[0];
    
    onDateChange(start, end);
  };
  // Filter only active accounts
  const activeAccounts = React.useMemo(
    () => accounts.filter((acc) => acc.isActive),
    [accounts]
  );

  // Group accounts by bank
  const groupedAccounts = React.useMemo(() => {
    const groups: Record<string, BankAccount[]> = {};
    activeAccounts.forEach((account) => {
      if (!groups[account.bankName]) {
        groups[account.bankName] = [];
      }
      groups[account.bankName].push(account);
    });
    return groups;
  }, [activeAccounts]);

  function getAccountIcon(accountType: string) {
    switch (accountType.toUpperCase()) {
      case 'CHECKING':
        return <CreditCard className="h-4 w-4" />;
      case 'SAVINGS':
        return <Building2 className="h-4 w-4" />;
      case 'INVESTMENT':
        return <TrendingUp className="h-4 w-4" />;
      default:
        return <CreditCard className="h-4 w-4" />;
    }
  }

  function getAccountTypeLabel(accountType: string) {
    switch (accountType.toUpperCase()) {
      case 'CHECKING':
        return 'Conta Corrente';
      case 'SAVINGS':
        return 'Poupança';
      case 'INVESTMENT':
        return 'Investimento';
      default:
        return accountType;
    }
  }

  if (activeAccounts.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">
            Nenhuma conta bancária ativa encontrada.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Date Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Período de Importação
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate">Data Inicial</Label>
              <Input
                type="date"
                id="startDate"
                value={startDate}
                onChange={(e) => onDateChange(e.target.value, endDate)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="endDate">Data Final</Label>
              <Input
                type="date"
                id="endDate"
                value={endDate}
                onChange={(e) => onDateChange(startDate, e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={setLastMonth}
            className="mt-3"
          >
            Mês Anterior
          </Button>
        </CardContent>
      </Card>

      {/* Account Selection */}
      <RadioGroup
        value={selectedAccountId}
        onValueChange={onSelectAccount}
        className="space-y-3"
      >
        {Object.entries(groupedAccounts).map(([bankName, bankAccounts]) => (
          <div key={bankName} className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">
              {bankName}
            </h3>
            {bankAccounts.map((account) => (
              <Card
                key={account.id}
                className={cn(
                  'cursor-pointer transition-colors hover:bg-accent',
                  selectedAccountId === account.id && 'border-primary bg-primary/5'
                )}
                onClick={() => onSelectAccount(account.id)}
              >
                <CardContent className="flex items-center space-x-3 p-4">
                  <RadioGroupItem value={account.id} id={account.id} />
                  <Label
                    htmlFor={account.id}
                    className="flex flex-1 cursor-pointer items-center justify-between"
                  >
                    <div className="flex items-center space-x-3">
                      {getAccountIcon(account.accountType)}
                      <div>
                        <p className="font-medium">{account.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {getAccountTypeLabel(account.accountType)}
                        </p>
                      </div>
                    </div>
                    {selectedAccountId === account.id && (
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                    )}
                  </Label>
                </CardContent>
              </Card>
            ))}
          </div>
        ))}
      </RadioGroup>

      {selectedAccountId && startDate && endDate && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <p className="text-sm">
                <span className="font-medium">Conta:</span>{' '}
                {activeAccounts.find((acc) => acc.id === selectedAccountId)?.name}
              </p>
              <p className="text-sm">
                <span className="font-medium">Período:</span>{' '}
                {new Date(startDate).toLocaleDateString('pt-BR')} até{' '}
                {new Date(endDate).toLocaleDateString('pt-BR')}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

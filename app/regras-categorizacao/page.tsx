import { Metadata } from 'next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { listRulesAction } from '@/lib/actions/rule-management-actions';
import { getFormCategories, getFormProperties, getFormBankAccounts } from '@/lib/database/form-data';
import RulesListClient from './components/RulesListClient';

export const metadata: Metadata = {
  title: 'Regras de Categorização | Financeiro RATC',
  description: 'Gerencie regras automáticas para categorização de transações.',
};

export default async function RuleManagementPage() {
  // Load rules data and form data in parallel with error handling
  let initialData = { rules: [], total: 0 };
  let formData = { categories: [], properties: [], bankAccounts: [] };
  let errorMessage = '';

  try {
    const [rulesResult, categories, properties, bankAccounts] = await Promise.all([
      listRulesAction({}, 50, 0),
      getFormCategories(),
      getFormProperties(),
      getFormBankAccounts(),
    ]);
    
    initialData = rulesResult.success ? rulesResult.data! : { rules: [], total: 0 };
    formData = { categories, properties, bankAccounts };
  } catch (error) {
    console.error('Error loading rules page:', error);
    errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
  }

  // If there's an error, show error page
  if (errorMessage) {
    return (
      <div className="container mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h2 className="text-red-800 font-semibold">Erro ao carregar página</h2>
          <p className="text-red-700 text-sm mt-1">
            Ocorreu um erro ao carregar os dados. Verifique a conexão com o banco de dados.
          </p>
          <p className="text-red-600 text-xs mt-2 font-mono">
            {errorMessage}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Regras de Categorização</h1>
          <p className="text-muted-foreground mt-1">
            Configure regras automáticas para categorizar transações com base em critérios personalizados.
          </p>
        </div>
        <Link href="/regras-categorizacao/nova">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nova Regra
          </Button>
        </Link>
      </div>

      {/* Rules List */}
      <RulesListClient 
        initialRules={initialData.rules} 
        total={initialData.total}
        formData={formData}
      />

    </div>
  );
}
import { Suspense } from 'react';
import { Metadata } from 'next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import RulesList from './components/RulesList';
import CreateRuleDialog from './components/CreateRuleDialog';
import { listRulesAction } from '@/lib/actions/rule-management-actions';
import { getFormCategories, getFormProperties, getFormBankAccounts } from '@/lib/core/database/form-data';

export const metadata: Metadata = {
  title: 'Regras de Categorização | Financeiro RATC',
  description: 'Gerencie regras automáticas para categorização de transações.',
};

export default async function RuleManagementPage() {
  // Load initial data in parallel
  const [rulesResult, categories, properties, bankAccounts] = await Promise.all([
    listRulesAction({}, 50, 0),
    getFormCategories(),
    getFormProperties(),
    getFormBankAccounts(),
  ]);
  
  const initialData = rulesResult.success ? rulesResult.data! : { rules: [], total: 0 };
  const formData = { categories, properties, bankAccounts };

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
        <CreateRuleDialog formData={formData}>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nova Regra
          </Button>
        </CreateRuleDialog>
      </div>

      {/* Rules List */}
      <Card>
        <CardHeader>
          <CardTitle>Regras Ativas</CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div>Carregando regras...</div>}>
            <RulesList initialData={initialData} formData={formData} />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
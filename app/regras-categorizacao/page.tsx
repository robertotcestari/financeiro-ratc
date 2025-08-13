import { Metadata } from 'next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { listRulesAction } from '@/lib/actions/rule-management-actions';

export const metadata: Metadata = {
  title: 'Regras de Categorização | Financeiro RATC',
  description: 'Gerencie regras automáticas para categorização de transações.',
};

export default async function RuleManagementPage() {
  // Load rules data with error handling
  let initialData = { rules: [], total: 0 };
  let errorMessage = '';

  try {
    const rulesResult = await listRulesAction({}, 50, 0);
    initialData = rulesResult.success ? rulesResult.data! : { rules: [], total: 0 };
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
      <Card>
        <CardHeader>
          <CardTitle>Regras Ativas ({initialData.total})</CardTitle>
        </CardHeader>
        <CardContent>
          {initialData.rules.length > 0 ? (
            <div className="space-y-4">
              {initialData.rules.map((rule) => (
                <div key={rule.id} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">{rule.name}</h3>
                      {rule.description && (
                        <p className="text-sm text-gray-600 mt-1">{rule.description}</p>
                      )}
                      <div className="flex items-center mt-2 space-x-2 text-xs text-gray-500">
                        <span>Categoria: {rule.category?.name || 'Não definida'}</span>
                        {rule.property && (
                          <span>• Propriedade: {rule.property.code}</span>
                        )}
                        <span>• Prioridade: {rule.priority}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${rule.isActive ? 'bg-green-500' : 'bg-red-500'}`} />
                      <span className="text-xs text-gray-500">
                        {rule.isActive ? 'Ativa' : 'Inativa'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                🔧
              </div>
              <h3 className="text-lg font-semibold mb-2">Nenhuma regra criada</h3>
              <p className="text-muted-foreground">
                Crie sua primeira regra para automatizar a categorização de transações.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
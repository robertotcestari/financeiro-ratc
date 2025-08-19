import { Metadata } from 'next';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getFormCategories, getFormProperties, getFormBankAccounts } from '@/lib/core/database/form-data';
import CreateRuleForm, { type FormData } from './components/CreateRuleForm';

export const metadata: Metadata = {
  title: 'Nova Regra de Categorização | Financeiro RATC',
  description: 'Crie uma nova regra automática para categorização de transações.',
};

export default async function NovaRegraPage() {
  // Load form data in parallel with error handling
  let formData: FormData = { categories: [], properties: [], bankAccounts: [] };
  let errorMessage = '';

  try {
    const [categories, properties, bankAccounts] = await Promise.all([
      getFormCategories(),
      getFormProperties(),
      getFormBankAccounts(),
    ]);
    
    formData = { 
      categories: categories as FormData['categories'], 
      properties: properties as FormData['properties'], 
      bankAccounts: bankAccounts as FormData['bankAccounts'] 
    };
  } catch (error) {
    console.error('Error loading rule form data:', error);
    errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
  }

  // If there's an error, show error page
  if (errorMessage) {
    return (
      <div className="container mx-auto p-6">
        {/* Breadcrumb navigation */}
        <nav className="flex items-center space-x-2 text-sm text-muted-foreground mb-6">
          <Link href="/regras-categorizacao" className="flex items-center hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Regras
          </Link>
          <span>/</span>
          <span className="text-foreground font-medium">Nova Regra</span>
        </nav>
        
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h2 className="text-red-800 font-semibold">Erro ao carregar formulário</h2>
          <p className="text-red-700 text-sm mt-1">
            Ocorreu um erro ao carregar os dados do formulário. Verifique a conexão com o banco de dados.
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
      {/* Breadcrumb navigation */}
      <nav className="flex items-center space-x-2 text-sm text-muted-foreground mb-6">
        <Link href="/regras-categorizacao" className="flex items-center hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Regras
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">Nova Regra</span>
      </nav>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Nova Regra de Categorização</h1>
        <p className="text-muted-foreground mt-2">
          Configure uma nova regra automática para categorizar transações com base em critérios personalizados.
        </p>
      </div>

      {/* Rule Creation Form */}
      <Card className="max-w-4xl">
        <CardHeader>
          <CardTitle>Configuração da Regra</CardTitle>
          <CardDescription>
            Preencha os campos abaixo para definir os critérios da sua regra de categorização automática.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CreateRuleForm formData={formData} />
        </CardContent>
      </Card>

      {/* Debug info */}
      <Card className="max-w-4xl">
        <CardHeader>
          <CardTitle className="text-sm">Dados Carregados</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-gray-600">
          <p>Categorias: {formData.categories.length}</p>
          <p>Propriedades: {formData.properties.length}</p>
          <p>Contas bancárias: {formData.bankAccounts.length}</p>
        </CardContent>
      </Card>
    </div>
  );
}
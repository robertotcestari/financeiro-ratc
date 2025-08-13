'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { createRuleAction } from '@/lib/actions/rule-management-actions';
import type { CreateRuleRequest, UpdateRuleRequest } from '@/lib/database/rule-management';
import { Info } from 'lucide-react';

export type FormData = {
  categories: Array<{ id: string; name: string; level: number; orderIndex: number; parentId: string | null }>;
  properties: Array<{ id: string; code: string; description: string | null; city: string; address: string }>;
  bankAccounts: Array<{ id: string; name: string; bankName: string; accountType: string; isActive: boolean }>;
};

interface SimpleCreateRuleDialogProps {
  children: React.ReactNode;
  formData: FormData;
}

export default function SimpleCreateRuleDialog({ children, formData }: SimpleCreateRuleDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (data: CreateRuleRequest | UpdateRuleRequest) => {
    setIsSubmitting(true);

    try {
      const result = await createRuleAction(data as CreateRuleRequest);

      if (result.success) {
        toast({
          title: 'Regra criada',
          description: 'A regra foi criada com sucesso e está ativa.',
        });
        setOpen(false);
        // The page will be revalidated by the server action
        window.location.reload();
      } else {
        toast({
          title: 'Erro',
          description: result.error || 'Falha ao criar regra.',
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro inesperado.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Regra de Categorização</DialogTitle>
          <DialogDescription>
            Configure uma nova regra automática para categorizar transações com base em critérios personalizados.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          const name = formData.get('name') as string;
          const description = formData.get('description') as string;
          const categoryId = formData.get('categoryId') as string;
          
          if (!name.trim()) {
            toast({
              title: 'Erro',
              description: 'Nome da regra é obrigatório.',
              variant: 'destructive',
            });
            return;
          }
          
          if (!categoryId) {
            toast({
              title: 'Erro', 
              description: 'Categoria é obrigatória.',
              variant: 'destructive',
            });
            return;
          }

          handleSubmit({
            name,
            description,
            categoryId,
            priority: 0,
            criteria: {}
          });
        }} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="rule-name" className="text-sm font-medium">Nome da Regra</label>
            <input
              id="rule-name"
              name="name"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Ex: Aluguel Mensal"
              required
            />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="rule-description" className="text-sm font-medium">Descrição (Opcional)</label>
            <textarea
              id="rule-description"
              name="description"
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Descrição da regra..."
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="rule-category" className="text-sm font-medium">Categoria</label>
            <select
              id="rule-category"
              name="categoryId"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              required
            >
              <option value="">Selecione uma categoria...</option>
              {formData.categories
                .filter(cat => cat.level === 3) // Only leaf categories
                .sort((a, b) => a.orderIndex - b.orderIndex)
                .map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
            </select>
          </div>

          <div className="bg-blue-50 p-3 rounded text-sm text-blue-700 flex items-start gap-2">
            <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
            Versão simplificada funcional. Critérios avançados serão adicionados em breve.
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <button type="button" className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2" onClick={() => setOpen(false)}>
              Cancelar
            </button>
            <button type="submit" disabled={isSubmitting} className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
              {isSubmitting ? 'Criando...' : 'Criar Regra'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
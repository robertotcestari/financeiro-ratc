'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { updateRuleAction } from '@/lib/actions/rule-management-actions';
import type { UpdateRuleRequest, RuleWithRelations } from '@/lib/core/database/rule-management';
import type { FormData } from '../../../components/CreateRuleDialog';
import RuleForm from '../../../components/RuleForm';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  rule: RuleWithRelations;
  formData: FormData;
}

export default function RuleEditPage({ rule, formData }: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const handleSubmit = async (data: UpdateRuleRequest) => {
    setIsSubmitting(true);

    try {
      const result = await updateRuleAction(rule.id, data);

      if (result.success && result.data) {
        toast({
          title: 'Regra atualizada',
          description: 'A regra foi atualizada com sucesso.',
        });
        router.push('/regras-categorizacao');
      } else {
        toast({
          title: 'Erro',
          description: result.error || 'Falha ao atualizar regra.',
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

  const handleCancel = () => {
    router.push('/regras-categorizacao');
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCancel}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para Regras
          </Button>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">
          Editar Regra: {rule.name}
        </h1>
        <p className="text-gray-600 mt-2">
          Modifique os critérios e configurações desta regra de categorização.
        </p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <RuleForm
          rule={rule}
          formData={formData}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          onCancel={handleCancel}
        />
      </div>
    </div>
  );
}
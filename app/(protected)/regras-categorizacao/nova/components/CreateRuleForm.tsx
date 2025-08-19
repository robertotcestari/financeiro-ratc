'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { createRuleAction } from '@/lib/actions/rule-management-actions';
import type { CreateRuleRequest, UpdateRuleRequest } from '@/lib/core/database/rule-management';
import RuleForm from '../../components/RuleForm';

export type FormData = {
  categories: Array<{ id: string; name: string; level: number; orderIndex: number; parentId: string | null }>;
  properties: Array<{ id: string; code: string; description: string | null; city: string; address: string }>;
  bankAccounts: Array<{ id: string; name: string; bankName: string; accountType: string; isActive: boolean }>;
};

interface CreateRuleFormProps {
  formData: FormData;
}

export default function CreateRuleForm({ formData }: CreateRuleFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const handleSubmit = async (data: CreateRuleRequest | UpdateRuleRequest) => {
    setIsSubmitting(true);

    try {
      const result = await createRuleAction(data as CreateRuleRequest);

      if (result.success) {
        toast({
          title: 'Regra criada',
          description: 'A regra foi criada com sucesso e está ativa.',
        });
        
        // Navigate back to the main rules page
        router.push('/regras-categorizacao');
        router.refresh(); // Refresh to show the new rule
      } else {
        toast({
          title: 'Erro',
          description: result.error || 'Falha ao criar regra.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error creating rule:', error);
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
    <RuleForm
      formData={formData}
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
      onCancel={handleCancel}
    />
  );
}
'use client';

import React from 'react';

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
import type { CreateRuleRequest, UpdateRuleRequest } from '@/lib/core/database/rule-management';
import RuleForm from './RuleForm';

export type FormData = {
  categories: Array<{ id: string; name: string; level: number; orderIndex: number; parentId: string | null }>;
  properties: Array<{ id: string; code: string; description: string | null; city: string; address: string }>;
  bankAccounts: Array<{ id: string; name: string; bankName: string; accountType: string; isActive: boolean }>;
};

interface CreateRuleDialogProps {
  children: React.ReactNode;
  formData: FormData;
}

export default function CreateRuleDialog({ children, formData }: CreateRuleDialogProps) {
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
      <DialogContent className="w-[70vw] !max-w-none max-h-[90vh] overflow-y-auto" style={{ width: '70vw', maxWidth: 'none' }}>
        <DialogHeader>
          <DialogTitle>Nova Regra de Categorização</DialogTitle>
          <DialogDescription>
            Configure uma nova regra automática para categorizar transações com base em critérios personalizados.
          </DialogDescription>
        </DialogHeader>
        
        <RuleForm
          formData={formData}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          onCancel={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
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
import { updateRuleAction } from '@/lib/actions/rule-management-actions';
import type { UpdateRuleRequest, RuleWithRelations } from '@/lib/database/rule-management';
import RuleForm from './RuleForm';
import type { FormData } from './CreateRuleDialog';

interface EditRuleDialogProps {
  rule: RuleWithRelations;
  formData: FormData;
  children: React.ReactNode;
  onRuleUpdated: (rule: RuleWithRelations) => void;
}

export default function EditRuleDialog({ rule, formData, children, onRuleUpdated }: EditRuleDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  // Handle keyboard shortcut for form submission
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check for Cmd+Enter (Mac) or Ctrl+Enter (Windows/Linux)
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter' && open) {
        event.preventDefault();
        // Trigger form submission by finding and clicking the submit button
        const submitButton = document.querySelector('button[type="submit"]') as HTMLButtonElement;
        if (submitButton && !isSubmitting) {
          submitButton.click();
        }
      }
    };

    if (open) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, isSubmitting]);

  const handleSubmit = async (data: UpdateRuleRequest) => {
    setIsSubmitting(true);

    try {
      const result = await updateRuleAction(rule.id, data);

      if (result.success && result.data) {
        toast({
          title: 'Regra atualizada',
          description: 'A regra foi atualizada com sucesso.',
        });
        onRuleUpdated(result.data);
        setOpen(false);
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="w-[70vw] !max-w-none max-h-[90vh] overflow-y-auto" style={{ width: '70vw', maxWidth: 'none' }}>
        <DialogHeader>
          <DialogTitle>Editar Regra: {rule.name}</DialogTitle>
          <DialogDescription>
            Modifique os critérios e configurações desta regra de categorização.
          </DialogDescription>
        </DialogHeader>
        
        <RuleForm
          rule={rule}
          formData={formData}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          onCancel={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
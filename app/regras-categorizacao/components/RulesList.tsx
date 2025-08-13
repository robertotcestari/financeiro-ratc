'use client';

import React from 'react';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import {
  MoreHorizontal,
  Edit,
  TestTube,
  Trash2,
  Calendar,
  DollarSign,
  MessageSquare,
  Building,
} from 'lucide-react';
import {
  deleteRuleAction,
  toggleRuleStatusAction,
} from '@/lib/actions/rule-management-actions';
import type { RuleWithRelations } from '@/lib/database/rule-management';
import type { RuleCriteria } from '@/lib/database/rule-types';
import EditRuleDialog from './EditRuleDialog';
import TestRuleDialog from './TestRuleDialog';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { FormData } from './CreateRuleDialog';

interface RulesListProps {
  initialData: {
    rules: RuleWithRelations[];
    total: number;
  };
  formData: FormData;
}

export default function RulesList({ initialData, formData }: RulesListProps) {
  const [rules, setRules] = useState(initialData.rules);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [ruleToDelete, setRuleToDelete] = useState<RuleWithRelations | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const handleToggleRule = async (rule: RuleWithRelations, isActive: boolean) => {
    const result = await toggleRuleStatusAction(rule.id, isActive);
    
    if (result.success) {
      setRules(prev => prev.map(r => 
        r.id === rule.id ? { ...r, isActive } : r
      ));
      toast({
        title: 'Status atualizado',
        description: `Regra ${isActive ? 'ativada' : 'desativada'} com sucesso.`,
      });
    } else {
      toast({
        title: 'Erro',
        description: result.error || 'Falha ao atualizar status da regra.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteRule = async () => {
    if (!ruleToDelete) return;

    setIsDeleting(true);
    const result = await deleteRuleAction(ruleToDelete.id);

    if (result.success) {
      setRules(prev => prev.filter(r => r.id !== ruleToDelete.id));
      toast({
        title: 'Regra excluída',
        description: 'A regra foi excluída com sucesso.',
      });
    } else {
      toast({
        title: 'Erro',
        description: result.error || 'Falha ao excluir regra.',
        variant: 'destructive',
      });
    }

    setIsDeleting(false);
    setDeleteDialogOpen(false);
    setRuleToDelete(null);
  };

  const formatCriteria = (criteria: RuleCriteria): string => {
    const parts: string[] = [];

    if (criteria.date?.dayRange) {
      const { start, end } = criteria.date.dayRange;
      parts.push(`Dia ${start === end ? start : `${start}-${end}`}`);
    }

    if (criteria.date?.months && criteria.date.months.length > 0) {
      const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      const months = criteria.date.months.map(m => monthNames[m - 1]).join(', ');
      parts.push(`Meses: ${months}`);
    }

    if (criteria.value) {
      const { min, max, operator } = criteria.value;
      if (operator === 'between' && min != null && max != null) {
        parts.push(`Valor: R$ ${min.toLocaleString()} - R$ ${max.toLocaleString()}`);
      } else if (min != null) {
        parts.push(`Valor > R$ ${min.toLocaleString()}`);
      } else if (max != null) {
        parts.push(`Valor < R$ ${max.toLocaleString()}`);
      }
    }

    if (criteria.description?.keywords && criteria.description.keywords.length > 0) {
      const keywordText = criteria.description.keywords.map(k => `"${k}"`).join(` ${criteria.description.operator === 'and' ? '&' : '|'} `);
      parts.push(`Palavras: ${keywordText}`);
    }

    if (criteria.accounts && criteria.accounts.length > 0) {
      parts.push(`${criteria.accounts.length} conta(s)`);
    }

    return parts.length > 0 ? parts.join(' • ') : 'Sem critérios definidos';
  };

  const getCriteriaIcons = (criteria: RuleCriteria) => {
    const icons = [];
    if (criteria.date) icons.push(<Calendar key="date" className="h-3 w-3" />);
    if (criteria.value) icons.push(<DollarSign key="value" className="h-3 w-3" />);
    if (criteria.description) icons.push(<MessageSquare key="desc" className="h-3 w-3" />);
    if (criteria.accounts) icons.push(<Building key="acc" className="h-3 w-3" />);
    return icons;
  };

  if (rules.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 mb-4">
          <TestTube className="h-16 w-16 mx-auto" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Nenhuma regra criada</h3>
        <p className="text-muted-foreground">
          Crie sua primeira regra para automatizar a categorização de transações.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {rules.map((rule) => (
          <Card key={rule.id} className={`transition-colors ${!rule.isActive ? 'opacity-60' : ''}`}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${rule.isActive ? 'bg-green-500' : 'bg-red-500'}`} />
                  <div>
                    <CardTitle className="text-lg">{rule.name}</CardTitle>
                    {rule.description && (
                      <CardDescription className="mt-1">
                        {rule.description}
                      </CardDescription>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={rule.isActive}
                    onCheckedChange={(checked) => handleToggleRule(rule, checked)}
                  />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <EditRuleDialog 
                        rule={rule} 
                        formData={formData}
                        onRuleUpdated={(updatedRule) => {
                          setRules(prev => prev.map(r => r.id === rule.id ? updatedRule : r));
                        }}
                      >
                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                          <Edit className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                      </EditRuleDialog>
                      <TestRuleDialog rule={rule}>
                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                          <TestTube className="h-4 w-4 mr-2" />
                          Testar
                        </DropdownMenuItem>
                      </TestRuleDialog>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onSelect={() => {
                          setRuleToDelete(rule);
                          setDeleteDialogOpen(true);
                        }}
                        className="text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                {/* Target */}
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">
                    Categoria: {rule.category?.name || 'Não definida'}
                  </Badge>
                  {rule.property && (
                    <Badge variant="outline">
                      Propriedade: {rule.property.code}
                    </Badge>
                  )}
                </div>

                {/* Criteria */}
                <div className="flex items-start space-x-2">
                  <div className="flex space-x-1 mt-0.5">
                    {getCriteriaIcons(rule.criteria as RuleCriteria)}
                  </div>
                  <p className="text-sm text-muted-foreground flex-1">
                    {formatCriteria(rule.criteria as RuleCriteria)}
                  </p>
                </div>

                {/* Metadata */}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center space-x-4">
                    <span>Prioridade: {rule.priority}</span>
                    <span>
                      Criada {formatDistanceToNow(rule.createdAt, { 
                        addSuffix: true, 
                        locale: ptBR 
                      })}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a regra &quot;{ruleToDelete?.name}&quot;?
              Esta ação não pode ser desfeita e todas as sugestões geradas por esta regra serão removidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteRule}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
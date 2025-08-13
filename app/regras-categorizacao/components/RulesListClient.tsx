'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import type { RuleWithRelations } from '@/lib/database/rule-management';
import EditRuleDialog from './EditRuleDialog';
import type { FormData } from './CreateRuleDialog';
import { useToast } from '@/hooks/use-toast';
import { toggleRuleStatusAction, deleteRuleAction } from '@/lib/actions/rule-management-actions';

interface RulesListClientProps {
  initialRules: RuleWithRelations[];
  total: number;
  formData: FormData;
}

export default function RulesListClient({ initialRules, total, formData }: RulesListClientProps) {
  const [rules, setRules] = useState(initialRules);
  const { toast } = useToast();

  const handleRuleUpdated = (updatedRule: RuleWithRelations) => {
    setRules(prev => prev.map(rule => rule.id === updatedRule.id ? updatedRule : rule));
  };

  const handleToggleStatus = async (ruleId: string, isActive: boolean) => {
    try {
      const result = await toggleRuleStatusAction(ruleId, !isActive);
      
      if (result.success && result.data) {
        setRules(prev => prev.map(rule => 
          rule.id === ruleId ? result.data! : rule
        ));
        toast({
          title: !isActive ? 'Regra ativada' : 'Regra desativada',
          description: `A regra foi ${!isActive ? 'ativada' : 'desativada'} com sucesso.`,
        });
      } else {
        toast({
          title: 'Erro',
          description: result.error || 'Falha ao alterar status da regra.',
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro inesperado.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteRule = async (ruleId: string, ruleName: string) => {
    if (!confirm(`Tem certeza que deseja excluir a regra "${ruleName}"? Esta ação não pode ser desfeita.`)) {
      return;
    }

    try {
      const result = await deleteRuleAction(ruleId);
      
      if (result.success) {
        setRules(prev => prev.filter(rule => rule.id !== ruleId));
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
    } catch {
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro inesperado.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Regras Ativas ({total})</CardTitle>
      </CardHeader>
      <CardContent>
        {rules.length > 0 ? (
          <div className="space-y-4">
            {rules.map((rule) => (
              <div key={rule.id} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
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
                  
                  <div className="flex items-center space-x-3">
                    {/* Status indicator */}
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${rule.isActive ? 'bg-green-500' : 'bg-red-500'}`} />
                      <span className="text-xs text-gray-500">
                        {rule.isActive ? 'Ativa' : 'Inativa'}
                      </span>
                    </div>
                    
                    {/* Action buttons */}
                    <div className="flex items-center space-x-1">
                      {/* Edit button */}
                      <EditRuleDialog 
                        rule={rule} 
                        formData={formData}
                        onRuleUpdated={handleRuleUpdated}
                      >
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </EditRuleDialog>

                      {/* Toggle status button */}
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleToggleStatus(rule.id, rule.isActive)}
                      >
                        {rule.isActive ? (
                          <ToggleRight className="h-4 w-4 text-green-600" />
                        ) : (
                          <ToggleLeft className="h-4 w-4 text-gray-400" />
                        )}
                      </Button>

                      {/* Delete button */}
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleDeleteRule(rule.id, rule.name)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
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
  );
}
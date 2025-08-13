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

  // Calculate summary statistics for active rules
  const activeRules = rules.filter(r => r.isActive);
  const getRulesSummary = () => {
    const summary = {
      totalActive: activeRules.length,
      withDescription: 0,
      withValue: 0,
      withDate: 0,
      withAccount: 0,
      keywords: new Set<string>(),
      categories: new Set<string>(),
    };

    activeRules.forEach(rule => {
      const criteria = rule.criteria as any;
      
      if (criteria?.description?.keywords) {
        summary.withDescription++;
        criteria.description.keywords.forEach((kw: string) => 
          summary.keywords.add(kw.toLowerCase())
        );
      }
      
      if (criteria?.value) {
        summary.withValue++;
      }
      
      if (criteria?.date) {
        summary.withDate++;
      }
      
      if (criteria?.accounts && criteria.accounts.length > 0) {
        summary.withAccount++;
      }
      
      if (rule.category?.name) {
        summary.categories.add(rule.category.name);
      }
    });

    return summary;
  };

  const summary = getRulesSummary();

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
        <div className="space-y-3">
          <CardTitle>Regras Cadastradas ({total})</CardTitle>
          {summary.totalActive > 0 && (
            <div className="text-sm text-muted-foreground space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-medium">{summary.totalActive} regras ativas</span>
                {summary.totalActive < total && (
                  <span className="text-xs">({total - summary.totalActive} inativas)</span>
                )}
              </div>
              
              <div className="flex flex-wrap gap-3 text-xs">
                {summary.withDescription > 0 && (
                  <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded">
                    {summary.withDescription} com palavras-chave
                  </span>
                )}
                {summary.withValue > 0 && (
                  <span className="bg-green-50 text-green-700 px-2 py-1 rounded">
                    {summary.withValue} com critério de valor
                  </span>
                )}
                {summary.withDate > 0 && (
                  <span className="bg-purple-50 text-purple-700 px-2 py-1 rounded">
                    {summary.withDate} com critério de data
                  </span>
                )}
                {summary.withAccount > 0 && (
                  <span className="bg-orange-50 text-orange-700 px-2 py-1 rounded">
                    {summary.withAccount} com conta específica
                  </span>
                )}
              </div>

              {summary.keywords.size > 0 && (
                <div className="pt-2 border-t">
                  <div className="text-xs text-gray-600 mb-1">Palavras-chave monitoradas:</div>
                  <div className="flex flex-wrap gap-1">
                    {Array.from(summary.keywords).slice(0, 10).map(keyword => (
                      <span key={keyword} className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs">
                        {keyword}
                      </span>
                    ))}
                    {summary.keywords.size > 10 && (
                      <span className="text-xs text-gray-500">
                        +{summary.keywords.size - 10} mais
                      </span>
                    )}
                  </div>
                </div>
              )}

              {summary.categories.size > 0 && (
                <div className="text-xs text-gray-600">
                  <span>Categorias alvo: </span>
                  <span className="text-gray-800">
                    {Array.from(summary.categories).slice(0, 3).join(', ')}
                    {summary.categories.size > 3 && ` +${summary.categories.size - 3} mais`}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {rules.length > 0 ? (
          <div className="space-y-4">
            {rules.map((rule) => {
              const criteria = rule.criteria as any;
              const getCriteriaDetails = () => {
                const details = [];
                
                // Description criteria
                if (criteria?.description?.keywords && criteria.description.keywords.length > 0) {
                  const operator = criteria.description.operator === 'and' ? 'E' : 'OU';
                  const caseSensitive = criteria.description.caseSensitive ? '(case sensitive)' : '';
                  details.push({
                    type: 'Palavras-chave',
                    value: `${criteria.description.keywords.join(` ${operator} `)} ${caseSensitive}`,
                    color: 'blue'
                  });
                }
                
                // Value criteria
                if (criteria?.value) {
                  let valueText = '';
                  const formatValue = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
                  
                  if (criteria.value.operator === 'between' && criteria.value.min != null && criteria.value.max != null) {
                    valueText = `Entre ${formatValue(criteria.value.min)} e ${formatValue(criteria.value.max)}`;
                  } else if (criteria.value.operator === 'gt' && criteria.value.min != null) {
                    valueText = `Maior que ${formatValue(criteria.value.min)}`;
                  } else if (criteria.value.operator === 'gte' && criteria.value.min != null) {
                    valueText = `Maior ou igual a ${formatValue(criteria.value.min)}`;
                  } else if (criteria.value.operator === 'lt' && criteria.value.max != null) {
                    valueText = `Menor que ${formatValue(criteria.value.max)}`;
                  } else if (criteria.value.operator === 'lte' && criteria.value.max != null) {
                    valueText = `Menor ou igual a ${formatValue(criteria.value.max)}`;
                  } else if (criteria.value.operator === 'eq' && criteria.value.min != null) {
                    valueText = `Igual a ${formatValue(criteria.value.min)}`;
                  } else if (criteria.value.min != null && criteria.value.max != null) {
                    valueText = `Entre ${formatValue(criteria.value.min)} e ${formatValue(criteria.value.max)}`;
                  } else if (criteria.value.min != null) {
                    valueText = `Mínimo: ${formatValue(criteria.value.min)}`;
                  } else if (criteria.value.max != null) {
                    valueText = `Máximo: ${formatValue(criteria.value.max)}`;
                  }
                  
                  if (valueText) {
                    details.push({
                      type: 'Valor',
                      value: valueText,
                      color: 'green'
                    });
                  }
                }
                
                // Date criteria
                if (criteria?.date) {
                  const dateParts = [];
                  if (criteria.date.dayRange) {
                    dateParts.push(`Dias ${criteria.date.dayRange.start}-${criteria.date.dayRange.end}`);
                  }
                  if (criteria.date.months && criteria.date.months.length > 0) {
                    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
                    const monthsText = criteria.date.months.map((m: number) => monthNames[m - 1]).join(', ');
                    dateParts.push(`Meses: ${monthsText}`);
                  }
                  if (dateParts.length > 0) {
                    details.push({
                      type: 'Data',
                      value: dateParts.join(' | '),
                      color: 'purple'
                    });
                  }
                }
                
                // Account criteria
                if (criteria?.accounts && criteria.accounts.length > 0) {
                  const accountNames = criteria.accounts.map((accId: string) => {
                    const account = formData.bankAccounts.find(acc => acc.id === accId);
                    return account ? account.name : accId;
                  });
                  details.push({
                    type: 'Contas',
                    value: accountNames.join(', '),
                    color: 'orange'
                  });
                }
                
                return details;
              };
              
              const criteriaDetails = getCriteriaDetails();
              
              return (
              <div key={rule.id} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium">{rule.name}</h3>
                    {rule.description && (
                      <p className="text-sm text-gray-600 mt-1">{rule.description}</p>
                    )}
                    
                    {/* Criteria details */}
                    {criteriaDetails.length > 0 && (
                      <div className="mt-3 space-y-1">
                        {criteriaDetails.map((detail, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-xs">
                            <span className={`
                              px-1.5 py-0.5 rounded font-medium whitespace-nowrap
                              ${detail.color === 'blue' ? 'bg-blue-50 text-blue-700' : ''}
                              ${detail.color === 'green' ? 'bg-green-50 text-green-700' : ''}
                              ${detail.color === 'purple' ? 'bg-purple-50 text-purple-700' : ''}
                              ${detail.color === 'orange' ? 'bg-orange-50 text-orange-700' : ''}
                            `}>
                              {detail.type}:
                            </span>
                            <span className="text-gray-700 flex-1">{detail.value}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <div className="flex items-center mt-3 space-x-2 text-xs text-gray-500 pt-2 border-t">
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
            );
            })}
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
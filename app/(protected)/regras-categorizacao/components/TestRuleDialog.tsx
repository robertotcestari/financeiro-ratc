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
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Loader2, 
  TestTube, 
  CheckCircle, 
  XCircle, 
  Calendar,
  DollarSign,
  Building,
  FileText,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';
import { previewRuleAction, getRuleStatsAction } from '@/lib/actions/rule-management-actions';
import type { RuleWithRelations } from '@/lib/core/database/rule-management';
import type { RuleCriteria } from '@/lib/core/database/rule-types';
import type { TransactionMatch } from '@/lib/core/database/rule-testing';

interface TestRuleDialogProps {
  rule: RuleWithRelations;
  children: React.ReactNode;
}

interface RuleStats {
  totalSuggestions: number;
  appliedSuggestions: number;
  pendingSuggestions: number;
  successRate: number;
}

export default function TestRuleDialog({ rule, children }: TestRuleDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [matchedTransactions, setMatchedTransactions] = useState<TransactionMatch[]>([]);
  const [ruleStats, setRuleStats] = useState<RuleStats | null>(null);
  const [testLimit] = useState(50);
  const { toast } = useToast();

  const handleTestRule = async () => {
    setIsLoading(true);
    
    try {
      // Get rule preview and stats in parallel
      const [previewResult, statsResult] = await Promise.all([
        previewRuleAction({
          ruleId: rule.id,
        }),
        getRuleStatsAction(rule.id),
      ]);

      if (previewResult.success && previewResult.data) {
        setMatchedTransactions(previewResult.data.matches || []);
      } else {
        toast({
          title: 'Erro no teste',
          description: previewResult.error || 'Falha ao testar regra.',
          variant: 'destructive',
        });
      }

      if (statsResult.success && statsResult.data) {
        setRuleStats(statsResult.data);
      }
    } catch {
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro inesperado ao testar a regra.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen && matchedTransactions.length === 0) {
      handleTestRule();
    }
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('pt-BR').format(new Date(date));
  };

  const getCriteriaIcons = (criteria: RuleCriteria) => {
    const icons = [];
    if (criteria.date) icons.push(<Calendar key="date" className="h-3 w-3" />);
    if (criteria.value) icons.push(<DollarSign key="value" className="h-3 w-3" />);
    if (criteria.description) icons.push(<FileText key="desc" className="h-3 w-3" />);
    if (criteria.accounts) icons.push(<Building key="acc" className="h-3 w-3" />);
    return icons;
  };

  const getMatchStatusIcon = (matched: boolean) => {
    if (matched) {
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    }
    return <XCircle className="h-4 w-4 text-red-600" />;
  };

  const getConfidenceBadge = (confidence?: number) => {
    if (!confidence) return null;
    
    const percentage = Math.round(confidence * 100);
    const variant = percentage >= 90 ? 'default' : percentage >= 70 ? 'secondary' : 'outline';
    
    return (
      <Badge variant={variant} className="text-xs">
        {percentage}%
      </Badge>
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="w-[70vw] !max-w-none max-h-[90vh] overflow-y-auto" style={{ width: '70vw', maxWidth: 'none' }}>
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <TestTube className="h-5 w-5" />
            <span>Testar Regra: {rule.name}</span>
          </DialogTitle>
          <DialogDescription>
            Visualize quais transações seriam afetadas por esta regra e seu desempenho histórico.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Rule Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Resumo da Regra</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${rule.isActive ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className="font-medium">{rule.name}</span>
                  <Badge variant="outline">Prioridade: {rule.priority}</Badge>
                </div>
                <div className="flex space-x-1">
                  {getCriteriaIcons(rule.criteria as RuleCriteria)}
                </div>
              </div>

              <div className="flex space-x-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Categoria: </span>
                  <span className="font-medium">{rule.category?.name || 'Não definida'}</span>
                </div>
                {rule.property && (
                  <div>
                    <span className="text-muted-foreground">Propriedade: </span>
                    <span className="font-medium">{rule.property.code}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Performance Stats */}
          {ruleStats && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center space-x-2">
                  <TrendingUp className="h-4 w-4" />
                  <span>Desempenho Histórico</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {ruleStats.totalSuggestions}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Sugestões geradas
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {ruleStats.appliedSuggestions}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Aplicadas
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-amber-600">
                      {ruleStats.pendingSuggestions}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Pendentes
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {Math.round(ruleStats.successRate * 100)}%
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Taxa de sucesso
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Test Results */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-sm">Transações de Teste</CardTitle>
                <CardDescription>
                  Mostrando até {testLimit} transações recentes que seriam avaliadas por esta regra.
                </CardDescription>
              </div>
              <Button 
                onClick={handleTestRule} 
                disabled={isLoading}
                size="sm"
                variant="outline"
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Testar Novamente
              </Button>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span className="ml-2">Testando regra...</span>
                </div>
              ) : matchedTransactions.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold mb-2">Nenhuma transação encontrada</h3>
                  <p className="text-sm text-muted-foreground">
                    Esta regra não encontrou transações correspondentes nos dados recentes.
                    Isso pode indicar que os critérios são muito específicos ou que não há
                    dados suficientes para teste.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {matchedTransactions.map((match) => (
                    <div
                      key={match.transaction.id}
                      className={`p-3 rounded-lg border ${
                        match.confidence > 0.7 
                          ? 'bg-green-50 border-green-200' 
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            {getMatchStatusIcon(match.confidence > 0.7)}
                            <span className="text-sm font-medium">
                              {formatDate(new Date(match.transaction.transaction?.date || match.transaction.createdAt))}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {match.transaction.transaction?.bankAccount?.name || 'N/A'}
                            </Badge>
                            {getConfidenceBadge(match.confidence)}
                          </div>
                          <p className="text-sm mb-1 font-medium">
                            {match.transaction.transaction?.description || match.transaction.details || 'N/A'}
                          </p>
                          <div className="flex items-center justify-between">
                            <span className={`text-sm font-mono ${
                              Number(match.transaction.transaction?.amount || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {formatCurrency(Number(match.transaction.transaction?.amount || 0))}
                            </span>
                            {(match.transaction.category || match.transaction.property) && (
                              <div className="text-xs text-muted-foreground">
                                {match.transaction.category && (
                                  <span>Categoria atual: {match.transaction.category.name}</span>
                                )}
                                {match.transaction.property && (
                                  <span className="ml-2">
                                    Propriedade: {match.transaction.property.code}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {matchedTransactions.length >= testLimit && (
                    <div className="text-center py-2">
                      <p className="text-xs text-muted-foreground">
                        Mostrando primeiras {testLimit} transações. 
                        Pode haver mais transações que atendem aos critérios.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
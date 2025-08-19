'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  ArrowRight,
  RotateCcw,
} from 'lucide-react';

interface ImobziResultProps {
  result: {
    success: boolean;
    message: string;
    details?: {
      imported?: number;
      skipped?: number;
      errors?: number;
    };
  };
  onReset: () => void;
  onViewTransactions: () => void;
}

export default function ImobziResult({
  result,
  onReset,
  onViewTransactions,
}: ImobziResultProps) {
  const details = result.details || {
    imported: 0,
    skipped: 0,
    errors: 0,
  };

  const total = details.imported + details.skipped + details.errors;

  return (
    <div className="space-y-4">
      {/* Main Result Alert */}
      <Alert
        variant={result.success ? 'default' : 'destructive'}
        className={result.success ? 'border-green-600' : ''}
      >
        {result.success ? (
          <CheckCircle2 className="h-4 w-4 text-green-600" />
        ) : (
          <XCircle className="h-4 w-4" />
        )}
        <AlertTitle>
          {result.success ? 'Importação Concluída' : 'Erro na Importação'}
        </AlertTitle>
        <AlertDescription>{result.message}</AlertDescription>
      </Alert>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Importados
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {details.imported}
            </div>
            <p className="text-xs text-muted-foreground">
              Registros importados com sucesso
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Ignorados
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {details.skipped}
            </div>
            <p className="text-xs text-muted-foreground">
              Registros duplicados ou inválidos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Erros
            </CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {details.errors}
            </div>
            <p className="text-xs text-muted-foreground">
              Registros com erro na importação
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Resumo da Importação
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Total de registros processados:
              </span>
              <Badge variant="secondary">{total}</Badge>
            </div>
            
            {details.imported > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Taxa de sucesso:
                </span>
                <Badge variant="outline" className="text-green-600">
                  {total > 0
                    ? Math.round((details.imported / total) * 100)
                    : 0}%
                </Badge>
              </div>
            )}

            {result.success && details.imported > 0 && (
              <Alert className="mt-4">
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  Os {details.imported} registros foram importados com sucesso
                  e já estão disponíveis no sistema.
                </AlertDescription>
              </Alert>
            )}

            {details.errors > 0 && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {details.errors} registros não puderam ser importados devido a erros.
                  Verifique os dados e tente novamente.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={onReset}
          className="flex items-center gap-2"
        >
          <RotateCcw className="h-4 w-4" />
          Nova Importação
        </Button>
        
        {result.success && details.imported > 0 && (
          <Button
            onClick={onViewTransactions}
            className="flex items-center gap-2"
          >
            Ver Transações
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
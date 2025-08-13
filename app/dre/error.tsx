'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, RefreshCw, Calculator, ArrowLeft } from 'lucide-react'
import { logger } from '@/lib/logger'
import Link from 'next/link'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function DREError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error with DRE context
    logger.error('DRE (Financial Statements) error occurred', {
      error,
      errorName: error.name,
      errorMessage: error.message,
      errorDigest: error.digest,
      section: 'dre',
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      timestamp: new Date().toISOString(),
    })
  }, [error])

  const isCalculationError = error.message?.toLowerCase().includes('calculation') || 
                            error.message?.toLowerCase().includes('cálculo') ||
                            error.message?.toLowerCase().includes('saldo') ||
                            error.message?.toLowerCase().includes('decimal')
  
  const isDateError = error.message?.toLowerCase().includes('data') ||
                     error.message?.toLowerCase().includes('date') ||
                     error.message?.toLowerCase().includes('período')

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <AlertTriangle className="h-12 w-12 text-red-500" />
          </div>
          <CardTitle className="text-xl text-red-600">
            Erro na Geração do DRE
          </CardTitle>
          <CardDescription className="text-gray-600">
            Ocorreu um problema ao gerar o Demonstrativo de Resultado do Exercício.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-700">
              <strong>Erro:</strong> {error.message || 'Erro desconhecido ao gerar DRE'}
            </p>
            {error.digest && (
              <p className="text-sm text-red-600 mt-1">
                <strong>ID:</strong> {error.digest}
              </p>
            )}
          </div>

          {isCalculationError && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-orange-800 mb-2">
                Problema nos cálculos financeiros:
              </h4>
              <ul className="text-sm text-orange-700 space-y-1">
                <li>• Verifique se existem transações categorizadas no período</li>
                <li>• Pode haver valores inconsistentes nas categorias</li>
                <li>• Tente um período menor para identificar o problema</li>
                <li>• Verifique se há transferências não balanceadas</li>
              </ul>
            </div>
          )}

          {isDateError && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-orange-800 mb-2">
                Problema com período selecionado:
              </h4>
              <ul className="text-sm text-orange-700 space-y-1">
                <li>• Verifique se a data inicial é anterior à data final</li>
                <li>• Certifique-se que as datas estão no formato correto</li>
                <li>• Tente selecionar um período com transações existentes</li>
                <li>• O período pode ser muito longo para processar</li>
              </ul>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-800 mb-2">
              Seus dados financeiros estão seguros:
            </h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Todas as transações e categorizações estão preservadas</li>
              <li>• Este é apenas um erro de processamento do relatório</li>
              <li>• Os cálculos podem ser refeitos a qualquer momento</li>
              <li>• Você pode acessar transações individuais normalmente</li>
            </ul>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-green-800 mb-2">
              Alternativas disponíveis:
            </h4>
            <ul className="text-sm text-green-700 space-y-1">
              <li>• Tente um período menor (por exemplo, apenas 1 mês)</li>
              <li>• Verifique se há transações não categorizadas</li>
              <li>• Acesse o relatório de integridade primeiro</li>
              <li>• Consulte transações por conta individual</li>
            </ul>
          </div>

          <div className="flex flex-col gap-3 pt-2">
            <Button 
              onClick={reset} 
              className="w-full"
              variant="default"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Tentar gerar DRE novamente
            </Button>
            
            <Button 
              onClick={() => window.location.href = '/dre'} 
              variant="outline"
              className="w-full"
            >
              <Calculator className="w-4 h-4 mr-2" />
              Selecionar novo período
            </Button>

            <div className="flex gap-3">
              <Link href="/integridade" className="flex-1">
                <Button variant="outline" className="w-full">
                  Ver integridade
                </Button>
              </Link>
              <Link href="/transacoes" className="flex-1">
                <Button variant="outline" className="w-full">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Ver transações
                </Button>
              </Link>
            </div>
          </div>

          <div className="text-xs text-gray-500 text-center pt-2">
            Para relatórios complexos, recomendamos verificar a integridade dos dados primeiro.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}